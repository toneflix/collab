import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { notify } from 'src/utils/helpers';
import { Track } from 'src/utils/models';
import { loadPlaylistRequest, loadTrackRequest } from 'src/utils/requests/requests';
import { audioEngine } from 'src/utils/audio-engine';

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
    artist_id: track.artist_id,
    release: track.release
      ? { id: track.release.id, slug: track.release.slug, title: track.release.title, createdAt: track.release.createdAt }
      : undefined,
    explicit: track.explicit,
    createdAt: track.createdAt,
    liked: track.liked,
    likes: track.likes,
    locked: track.locked,
    tags: track.tags,
  }) as Track;

/**
 * Playback time changes several times a second. It lives outside the store's
 * state so those updates don't make the persisted state save every time.
 */
const clock = reactive({ position: 0, duration: 0, buffered: 0 });

/**
 * The one music player for the whole app. Everything that plays, pauses or
 * shows playback state goes through this store, and only this store talks
 * to the audio engine.
 */
export const usePlayerStore = defineStore('player', {
  persist: {
    pick: ['queue', 'index', 'source', 'volume', 'muted', 'repeat', 'shuffle', 'order'],
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
      audioEngine.attach({
        onTime: (position, duration, buffered) => {
          clock.position = position;
          if (duration) clock.duration = duration;
          clock.buffered = buffered;
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
      const track = this.current;
      if (!track) return;

      const id = ++this.loadId;
      void this.topUp();
      this.loading = true;
      this.error = null;
      clock.position = 0;
      clock.duration = track.duration || 0;
      audioEngine.stop();

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

    async play () {
      if (!this.current) return;
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
      audioEngine.seek(to);
      clock.position = to;
    },

    seekPercent (percent: number) {
      if (this.duration) this.seek((percent / 100) * this.duration);
    },

    setVolume (volume: number) {
      this.volume = Math.max(0, Math.min(100, Math.round(volume)));
      if (this.volume > 0) this.muted = false;
      audioEngine.setVolume(this.volume, this.muted);
    },

    toggleMute () {
      this.muted = !this.muted;
      audioEngine.setVolume(this.volume, this.muted);
    },

    cycleRepeat () {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      this.repeat = modes[(modes.indexOf(this.repeat) + 1) % modes.length]!;
      audioEngine.setLoop(this.repeat === 'one');
      void this.topUp();
    },

    toggleShuffle () {
      this.shuffle = !this.shuffle;
      this.reorder();
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
      const queued = [...new Set(this.ordered.map((t) => t.id))].slice(-MAX_EXCLUDED);

      try {
        const { data } = await loadPlaylistRequest({
          randomize: true,
          with: 'artist',
          limit: UP_NEXT_BATCH,
          ...(this.current ? { similar_to: this.current.id } : {}),
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
