import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { notify } from 'src/utils/helpers';
import { Track } from 'src/utils/models';
import { artistCredit } from 'src/utils/credits';
import { loadPlaylistRequest, loadTrackRequest } from 'src/utils/requests/requests';
import { audioEngine } from 'src/utils/audio-engine';
import { apiUrl } from 'src/utils/env';
import { AuthSession } from 'src/utils/auth-session';
import { PlayReporter } from 'src/utils/play-reporter';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import type { NativePlayerPlugin, NativeTrack } from 'src/utils/native-player';

export type RepeatMode = 'off' | 'all' | 'one';

/**
 * Restart the current track instead of going back when "previous" is
 * pressed this many seconds into it.
 */
const RESTART_AFTER = 3;

/**
 * Stop skipping after this many tracks in a row fail to play, so a broken
 * queue doesn't loop forever.
 */
const MAX_FAILED_IN_A_ROW = 3;

/** How many tracks to add each time the queue is topped up */
const UP_NEXT_BATCH = 10;

/** Queued tracks sent to the API so it doesn't suggest them again */
const MAX_EXCLUDED = 100;

/** Played tracks kept behind the current one before the oldest are dropped */
const KEEP_PLAYED = 50;

/** The request topping up the queue, shared by everyone waiting on it */
let extending: Promise<number> | null = null;

/**
 * Keep only what the queue needs to show and reload a track. Stream links
 * expire, so they are never kept and are fetched again when a track plays.
 */
const slim = (track: Track): Track =>
  ({
    id: track.id,
    slug: track.slug,
    title: track.title,
    imageUrl: track.imageUrl,
    duration: track.duration,
    artist: track.artist
      ? { id: track.artist.id, name: track.artist.name, username: track.artist.username }
      : undefined,
    artistId: track.artistId,
    featured: track.featured?.map(({ id, name, username }) => ({ id, name, username })),
    release: track.release
      ? { id: track.release.id, slug: track.release.slug, title: track.release.title, createdAt: track.release.createdAt }
      : undefined,
    album: track.album,
    explicit: track.explicit,
    createdAt: track.createdAt,
    liked: track.liked,
    saved: track.saved,
    likes: track.likes,
    locked: track.locked,
    tags: track.tags,
    playUrl: track.playUrl,
    temporary: track.temporary,
    project: track.project ? { id: track.project.id, slug: track.project.slug, title: track.project.title } : undefined,
  }) as Track;

/**
 * The installed app plays through the native player (native-player.ts), which
 * keeps going when the app is closed. The web plays through the audio engine.
 */
const isNative = !!import.meta.env.QUASAR_CAPACITOR_MODE;

/*
 * Capacitor plugins answer every method name, `then` included, so a promise
 * can't resolve to one directly: it would try to await the plugin. Wrapped.
 */
let nativeLoad: Promise<{ player: NativePlayerPlugin }> | null = null;

/** The native player, loaded once. Only used in the installed app. */
const native = () => (nativeLoad ??= import('src/utils/native-player').then((m) => ({ player: m.nativePlayer })));

/** Run a native player command, ignoring failures (the player reports those as events). */
const nativeCall = (command: (player: NativePlayerPlugin) => Promise<unknown>) =>
  native()
    .then(({ player }) => command(player))
    .catch(() => undefined);

/** Whether the native player has the queue, so play can resume instead of reloading */
let nativeLoaded = false;

/** Set once the store listens to the native player */
let nativeAttached = false;

const toNative = (track: Track): NativeTrack => ({
  id: String(track.id),
  title: track.title || '',
  artist: artistCredit(track),
  album: track.album?.title || '',
  artwork: track.imageUrl || '',
  duration: track.duration || 0,
  url: track.playUrl || '',
});

/** Hand the native player the API's address and the current sign-in, for fetching stream links. */
const configureNative = () =>
  nativeCall((player) => player.configure({ apiBase: apiUrl.replace(/\/+$/, ''), token: AuthSession.current().token }));

/**
 * Playback time changes several times a second. It lives outside the store's
 * state so those updates don't make the persisted state save every time.
 */
const clock = reactive({ position: 0, duration: 0, buffered: 0 });

/** Reports a play once the listener has heard enough of a track to count. */
const plays = new PlayReporter(() => Number(useBootstrapStore().configuration.stream_min_seconds) || 30);

/**
 * The one music player for the whole app. Everything that plays, pauses or
 * shows playback state goes through this store, and only this store talks
 * to the audio engine.
 */
export const usePlayerStore = defineStore('player', {
  persist: {
    pick: ['queue', 'index', 'source', 'volume', 'muted', 'repeat', 'shuffle', 'order', 'videos'],
  },

  state: () => ({
    /** The tracks lined up to play, in their original order */
    queue: [] as Track[],
    /** Position in `order` of the track that is playing */
    index: 0,
    /** Play order as indexes into `queue`; shuffled when shuffle is on */
    order: [] as number[],
    /** What the queue was started from, e.g. an album page, so its play button can show state */
    source: null as string | null,

    playing: false,
    loading: false,
    error: null as string | null,

    volume: 45,
    muted: false,
    repeat: 'off' as RepeatMode,
    shuffle: false,
    /** Whether Up Next shows a track's music video in place of its artwork */
    videos: true,

    failedInARow: 0,
    /** Bumped on every load, so a slow request for an old track can't take over */
    loadId: 0,
  }),

  getters: {
    position: () => clock.position,
    /** The audio's length once loaded, otherwise the length saved with the track */
    duration (): number {
      return clock.duration || this.current?.duration || 0;
    },
    buffered: () => clock.buffered,
    current (state): Track | null {
      const i = state.order[state.index];
      return i === undefined ? null : (state.queue[i] ?? null);
    },
    /** Playback never runs out: the queue is topped up, starts over, or a lone track loops */
    hasNext (state): boolean {
      return state.order.length > 0;
    },
    /** Whether the track playing is the last one queued */
    atEnd (state): boolean {
      return state.index >= state.order.length - 1;
    },
    /** The queue in play order, e.g. for an "Up next" list */
    ordered (state): Track[] {
      return state.order.map((i) => state.queue[i]).filter((t): t is Track => !!t);
    },
    progress (): number {
      return this.duration ? (clock.position / this.duration) * 100 : 0;
    },
  },

  actions: {
    /**
     * Connect the store to the audio engine. Called once by the player bar.
     */
    attach () {
      if (isNative) return this.attachNative();

      audioEngine.attach({
        onTime: (position, duration, buffered) => {
          clock.position = position;
          if (duration) clock.duration = duration;
          clock.buffered = buffered;
          if (this.playing) plays.tick(position);
        },
        onPlaying: () => {
          this.playing = true;
          this.loading = false;
          this.failedInARow = 0;
        },
        onPaused: () => {
          this.playing = false;
        },
        onWaiting: () => {
          this.loading = true;
        },
        onEnded: () => this.next(),
        onError: () => this.failed('This track couldn\'t be played.'),
      });
      audioEngine.setVolume(this.volume, this.muted);
      audioEngine.setLoop(this.repeat === 'one');
      audioEngine.setActions({
        play: () => this.play(),
        pause: () => this.pause(),
        next: () => this.next(),
        previous: () => this.previous(),
        seek: (seconds) => this.seek(seconds),
      });

      // A queue restored from the last visit is cued but doesn't play by itself.
      if (this.queue.length && this.order.length !== this.queue.length) {
        this.reorder();
      }
      this.playing = false;
      this.loading = false;
    },

    /**
     * Connect the store to the native player. When it is already playing,
     * e.g. it kept going while the app was closed, pick up where it is.
     */
    async attachNative () {
      if (nativeAttached) return;
      nativeAttached = true;

      this.playing = false;
      this.loading = false;
      if (this.queue.length && this.order.length !== this.queue.length) {
        this.reorder();
      }

      const { player } = await native();
      await configureNative();

      await Promise.all([
        player.addListener('state', ({ playing, loading }) => {
          this.playing = playing;
          this.loading = loading;
          if (playing) this.failedInARow = 0;
        }),
        player.addListener('time', ({ position, duration, buffered }) => {
          clock.position = position;
          if (duration) clock.duration = duration;
          clock.buffered = buffered;
          if (this.playing) plays.tick(position);
        }),
        player.addListener('index', ({ index, id }) => this.followNative(index, id)),
        player.addListener('resolved', ({ id, track }) => this.refresh(track as unknown as Track, id)),
        player.addListener('error', ({ message, locked, skipped }) => {
          this.error = message;
          if (!skipped) this.loading = this.playing = false;
          notify(skipped ? `${message} Skipping to the next one.` : message, locked ? 'info' : skipped ? 'warning' : 'error');
        }),
        player.addListener('queueEnd', () => void this.next()),
      ]);

      void nativeCall((p) => p.setVolume({ volume: this.muted ? 0 : this.volume / 100 }));
      void nativeCall((p) => p.setRepeat({ mode: this.repeat }));

      const state = await player.getState().catch(() => null);
      if (!state?.tracks.length) return;

      // The native player has a queue, maybe moved on while the app was closed: follow it.
      const ids = state.tracks.map((t) => t.id);
      const ours = this.ordered.map((t) => String(t.id));
      if (ids.join() !== ours.join()) {
        const known = new Map(this.queue.map((t) => [String(t.id), t]));
        this.queue = state.tracks.map(
          (t) =>
            known.get(t.id) ??
            ({ id: t.id, title: t.title, imageUrl: t.artwork, duration: t.duration, artist: { name: t.artist } } as unknown as Track),
        );
        this.order = this.queue.map((_, i) => i);
      }

      nativeLoaded = true;
      this.index = Math.min(state.index, this.order.length - 1);
      this.playing = state.playing;
      clock.position = state.position;
      clock.duration = state.duration;
    },

    /** The native player moved to another track, by itself or from the notification. */
    followNative (index: number, id: string) {
      const track = this.ordered[index];
      if (!track || String(track.id) !== id) return;

      this.index = index;
      this.error = null;
      clock.position = 0;
      clock.duration = track.duration || 0;
      plays.start(track.playUrl ? null : track.id);
      if (this.pruneTemporary()) this.syncNative();
      void this.topUp();
    },

    /** Keep the queue's copies of a track up to date (title, likes, locked state). */
    refresh (full: Track, id = String(full.id)) {
      this.queue.forEach((track, i) => {
        if (String(track.id) === id) this.queue[i] = slim(full);
      });
    },

    /**
     * Send the queue to the native player. With `reload` the current track
     * starts over; without it, whatever is playing carries on.
     */
    syncNative (autoplay = false, reload = false) {
      if (!isNative || (!nativeLoaded && !reload)) return;

      nativeLoaded = true;
      void configureNative();
      void nativeCall((p) =>
        p.setQueue({ tracks: this.ordered.map(toNative), index: this.index, autoplay, reload }),
      );
    },

    /**
     * Fill an empty queue with recommended tracks, without playing them.
     */
    async ensureQueue () {
      if (this.queue.length) return;
      const tracks = await this.fetchMore();
      if (tracks.length) this.setQueue(tracks, 0, 'radio');
    },

    /**
     * Replace the queue and start playing from a track in it.
     */
    playQueue (tracks: Track[], start: number | Track = 0, source: string | null = null) {
      if (!tracks.length) return;
      const startIndex =
        typeof start === 'number' ? start : Math.max(0, tracks.findIndex((t) => t.id === start.id));
      this.setQueue(tracks, startIndex, source);
      return this.load(true);
    },

    /**
     * Play or pause a whole list, e.g. an album's play button. Pressing it again
     * pauses; pressing it on another list starts that list.
     */
    toggleQueue (tracks: Track[], source: string) {
      if (this.source === source && this.current) {
        return this.toggle();
      }
      return this.playQueue(tracks, 0, source);
    },

    /**
     * Play or pause one track. When it isn't the current track it starts
     * playing, inside `context` when given (e.g. the list it was clicked in),
     * otherwise right after the current track.
     */
    toggleTrack (track: Track, context?: Track[], source?: string) {
      if (this.isCurrent(track)) {
        return this.toggle();
      }

      if (context?.length) {
        return this.playQueue(context, track, source ?? null);
      }

      const at = Math.min(this.index + 1, this.order.length);
      this.queue.push(slim(track));
      this.order.splice(at, 0, this.queue.length - 1);
      this.index = at;
      return this.load(true);
    },

    /**
     * Play temporary entries, e.g. a project's tracks, from one of them. They
     * go in right after the current track and leave the queue once something
     * else plays.
     */
    playTemporary (tracks: Track[], start: number, source: string) {
      const first = tracks[start];
      if (!first) return;

      const queued = this.ordered.findIndex((t) => t.id === first.id);
      if (queued >= 0) {
        this.index = queued;
        this.source = source;
        return this.load(true);
      }

      const at = Math.min(this.index + 1, this.order.length);
      const from = this.queue.length;

      this.queue.push(...tracks.map((track) => slim({ ...track, temporary: true })));
      this.order.splice(at, 0, ...tracks.map((_, i) => from + i));
      this.index = at + start;
      this.source = source;

      return this.load(true);
    },

    /**
     * Start a mix from a track: it plays first and tracks like it follow.
     */
    startMix (track: Track) {
      this.setQueue([track], 0, `mix:${track.id}`);

      const playing = this.load(true);
      void this.extend();

      return playing;
    },

    /**
     * Queue tracks to play right after the current one, in the order given.
     */
    playNext (...tracks: Track[]) {
      return this.enqueue(tracks, Math.min(this.index + 1, this.order.length));
    },

    /**
     * Queue tracks at the end of the queue.
     */
    addToQueue (...tracks: Track[]) {
      return this.enqueue(tracks, this.order.length);
    },

    /**
     * Put tracks at a position in the play order, in the order given. One
     * already waiting further down moves there instead of being queued twice,
     * and the current track stays where it is. An empty queue is cued with
     * them without playing.
     *
     * @returns How many tracks were queued.
     */
    enqueue (tracks: Track[], at: number) {
      if (!this.queue.length) {
        this.setQueue(tracks, 0, null);
        if (tracks.length) void this.load(false);
        return tracks.length;
      }

      let queued = 0;

      for (const track of tracks) {
        if (this.isCurrent(track)) continue;

        const waiting = this.order.findIndex((i, position) => position > this.index && this.queue[i]?.id === track.id);

        if (waiting >= 0) {
          const [entry] = this.order.splice(waiting, 1);
          if (waiting < at) at--;
          this.order.splice(at, 0, entry!);
        } else {
          this.queue.push(slim(track));
          this.order.splice(at, 0, this.queue.length - 1);
        }

        at++;
        queued++;
      }

      this.syncNative();
      return queued;
    },

    /**
     * Take a track out of the queue by its position in the play order. The
     * current track stays.
     */
    removeFromQueue (position: number) {
      if (position === this.index || position < 0 || position >= this.order.length) return;

      const removed = this.order[position]!;

      this.queue.splice(removed, 1);
      this.order = this.order
        .filter((_, i) => i !== position)
        .map((i) => (i > removed ? i - 1 : i));
      if (position < this.index) this.index--;

      this.syncNative();
    },

    /**
     * Drop temporary entries that don't belong with the current track: all of
     * them once a regular track plays, or another project's while one plays.
     *
     * @returns Whether anything was dropped.
     */
    pruneTemporary () {
      const current = this.current;
      const group = current?.temporary ? current.project?.slug : undefined;
      const keep = (track: Track) => !track.temporary || (!!group && track.project?.slug === group);
      if (this.queue.every(keep)) return false;

      const moved = new Map<number, number>();
      const queue: Track[] = [];
      this.queue.forEach((track, i) => {
        if (!keep(track)) return;
        moved.set(i, queue.length);
        queue.push(track);
      });

      const order: number[] = [];
      let index = 0;
      this.order.forEach((i, position) => {
        if (!moved.has(i)) return;
        if (position === this.index) index = order.length;
        order.push(moved.get(i)!);
      });

      this.queue = queue;
      this.order = order;
      this.index = index;
      return true;
    },

    setQueue (tracks: Track[], start: number, source: string | null) {
      this.queue = tracks.map(slim);
      this.source = source;
      this.reorder(start);
    },

    /**
     * Rebuild the play order. With shuffle on, the track at `keep` plays first
     * and the rest follow in random order.
     */
    reorder (keep?: number) {
      const current = keep ?? this.order[this.index] ?? 0;
      const rest = this.queue.map((_, i) => i).filter((i) => i !== current);

      if (this.shuffle) {
        for (let i = rest.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rest[i], rest[j]] = [rest[j]!, rest[i]!];
        }
        this.order = [current, ...rest];
        this.index = 0;
      } else {
        this.order = this.queue.map((_, i) => i);
        this.index = current;
      }
    },

    /**
     * Load the current track into the engine, fetching a fresh stream link.
     */
    async load (autoplay: boolean) {
      this.pruneTemporary();
      const track = this.current;
      if (!track) return;

      const id = ++this.loadId;
      void this.topUp();
      this.loading = true;
      this.error = null;
      clock.position = 0;
      clock.duration = track.duration || 0;
      plays.start(track.playUrl ? null : track.id);

      if (isNative) return this.loadNative(track, id, autoplay);
      audioEngine.stop();

      if (track.playUrl) {
        audioEngine.setTrack({ ...track, streamUrl: track.playUrl });
        audioEngine.setLoop(this.repeat === 'one');
        if (autoplay) await this.play();
        else this.loading = false;
        return;
      }

      let full: Track;
      try {
        full = await loadTrackRequest(String(track.id), { with: 'streamUrl,artist,release', mode: 'play' }).send();
      } catch {
        if (id === this.loadId) this.failed('This track couldn\'t be loaded.');
        return;
      }

      // Another track was picked while this one loaded.
      if (id !== this.loadId) return;

      // Keep the queue's copy up to date (title, likes, locked state).
      const i = this.order[this.index]!;
      this.queue[i] = slim(full);

      if (!full.streamUrl) {
        this.loading = false;
        this.playing = false;
        if (autoplay) {
          notify(
            full.locked
              ? `"${full.title}" is part of a paid release. Buy it to listen.`
              : 'This track can\'t be played right now.',
            'info',
          );
        }
        return;
      }

      audioEngine.setTrack(full);
      audioEngine.setLoop(this.repeat === 'one');
      if (autoplay) {
        await this.play();
      } else {
        this.loading = false;
      }
    },

    /**
     * Start the current track on the native player, which fetches its stream
     * link itself. A paid track is checked here first, so picking one says
     * why it won't play instead of skipping past it.
     */
    async loadNative (track: Track, id: number, autoplay: boolean) {
      if (track.locked) {
        let full: Track | null = null;
        try {
          full = await loadTrackRequest(String(track.id), { with: 'artist,release' }).send();
        } catch {
          // Let the player try; it reports what goes wrong.
        }
        if (id !== this.loadId) return;
        if (full) this.refresh(full);

        if (!full || full.locked) {
          this.loading = false;
          this.playing = false;
          // The previous track is still loaded natively; play should check this one again
          nativeLoaded = false;
          void nativeCall((p) => p.pause());
          if (autoplay) notify(`"${track.title}" is part of a paid release. Buy it to listen.`, 'info');
          return;
        }
      }

      if (!autoplay) this.loading = false;
      this.syncNative(autoplay, true);
    },

    async play () {
      if (!this.current) return;

      if (isNative) {
        if (!nativeLoaded) return this.load(true);
        void configureNative();
        return void nativeCall((p) => p.play());
      }

      if (!audioEngine.hasSource()) return this.load(true);

      try {
        await audioEngine.play();
      } catch (e) {
        this.loading = false;
        this.playing = false;
        // Browsers block playback that doesn't follow a click; that isn't an error.
        if ((e as DOMException)?.name !== 'NotAllowedError' && (e as DOMException)?.name !== 'AbortError') {
          this.failed('This track couldn\'t be played.');
        }
      }
    },

    pause () {
      if (isNative) return void nativeCall((p) => p.pause());
      audioEngine.pause();
    },

    toggle () {
      return this.playing ? this.pause() : this.play();
    },

    /**
     * Go to the next track. `auto` is set when the previous one finished.
     */
    async next () {
      if (!this.atEnd) {
        this.index++;
        return this.load(true);
      }

      if (this.repeat === 'off' && (await this.extend()) && !this.atEnd) {
        this.index++;
        return this.load(true);
      }

      // Nothing new to play: start the queue over, which loops a lone track.
      if (!this.order.length) return;
      if (this.shuffle) this.reorder(this.order[0]);
      this.index = 0;
      return this.load(true);
    },

    /**
     * Fetch more tracks while the last queued one plays, so the next one is
     * ready before it ends. Repeat modes keep the queue as it is.
     */
    topUp () {
      if (this.repeat === 'off' && this.atEnd) return this.extend();
    },

    /**
     * Add tracks like the current one to the end of the queue.
     *
     * @returns How many tracks were added.
     */
    extend (): Promise<number> {
      extending ??= this.fetchMore()
        .then((more) => {
          const known = new Set(this.queue.map((t) => t.id));
          const fresh = more.filter((t) => !known.has(t.id));
          const start = this.queue.length;

          this.queue.push(...fresh.map(slim));
          this.order.push(...fresh.map((_, i) => start + i));
          this.trim();
          this.syncNative();

          return fresh.length;
        })
        .finally(() => {
          extending = null;
        });

      return extending;
    },

    /**
     * Drop the oldest played tracks so an endless session keeps a small queue.
     */
    trim () {
      const drop = this.index - KEEP_PLAYED;
      if (drop <= 0) return;

      const dropped = new Set(this.order.slice(0, drop));
      const moved = new Map<number, number>();
      const queue: Track[] = [];

      this.queue.forEach((track, i) => {
        if (dropped.has(i)) return;
        moved.set(i, queue.length);
        queue.push(track);
      });

      this.queue = queue;
      this.order = this.order.slice(drop).map((i) => moved.get(i)!);
      this.index -= drop;
    },

    /**
     * Play the track at a position in the play order, e.g. from the queue list.
     */
    jumpTo (position: number) {
      if (position < 0 || position >= this.order.length) return;
      if (position === this.index) return this.toggle();
      this.index = position;
      return this.load(true);
    },

    previous () {
      if (this.position > RESTART_AFTER || this.index === 0) {
        return this.seek(0);
      }
      this.index--;
      return this.load(true);
    },

    seek (seconds: number) {
      const to = Math.max(0, Math.min(seconds, this.duration || seconds));
      if (isNative) void nativeCall((p) => p.seek({ position: to }));
      else audioEngine.seek(to);
      clock.position = to;
    },

    seekPercent (percent: number) {
      if (this.duration) this.seek((percent / 100) * this.duration);
    },

    setVolume (volume: number) {
      this.volume = Math.max(0, Math.min(100, Math.round(volume)));
      if (this.volume > 0) this.muted = false;
      this.applyVolume();
    },

    toggleMute () {
      this.muted = !this.muted;
      this.applyVolume();
    },

    applyVolume () {
      if (isNative) void nativeCall((p) => p.setVolume({ volume: this.muted ? 0 : this.volume / 100 }));
      else audioEngine.setVolume(this.volume, this.muted);
    },

    cycleRepeat () {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      this.repeat = modes[(modes.indexOf(this.repeat) + 1) % modes.length]!;
      if (isNative) void nativeCall((p) => p.setRepeat({ mode: this.repeat }));
      else audioEngine.setLoop(this.repeat === 'one');
      void this.topUp();
    },

    toggleShuffle () {
      this.shuffle = !this.shuffle;
      this.reorder();
      this.syncNative();
    },

    isCurrent (track?: Pick<Track, 'id'> | null) {
      return !!track && this.current?.id === track.id;
    },

    isPlaying (track?: Pick<Track, 'id'> | null) {
      return this.playing && this.isCurrent(track);
    },

    isPlayingSource (source: string) {
      return this.playing && this.source === source;
    },

    /**
     * Tracks like the current one that aren't queued yet. The API only comes
     * back empty when the current track is the only one there is.
     */
    async fetchMore (): Promise<Track[]> {
      const queued = [...new Set(this.ordered.filter((t) => !t.temporary).map((t) => t.id))].slice(-MAX_EXCLUDED);
      const similar = this.current && !this.current.temporary ? this.current.id : null;

      try {
        const { data } = await loadPlaylistRequest({
          randomize: true,
          with: 'artist',
          limit: UP_NEXT_BATCH,
          ...(similar ? { similar_to: similar } : {}),
          ...(queued.length ? { exclude: queued.join(',') } : {}),
        }).send();

        return data || [];
      } catch {
        return [];
      }
    },

    /**
     * A track failed: say so and move on, unless several have failed in a row.
     */
    failed (message: string) {
      this.loading = false;
      this.playing = false;
      this.error = message;
      this.failedInARow++;

      if (this.failedInARow >= MAX_FAILED_IN_A_ROW || !this.hasNext) {
        notify(message, 'error');
        this.failedInARow = 0;
        return;
      }

      notify(`${message} Skipping to the next one.`, 'warning');
      return this.next();
    },
  },
});
