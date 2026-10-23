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
    liked: track.liked,
    likes: track.likes,
    locked: track.locked,
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

    /** Set while fetching more tracks when the queue runs out */
    extending: false,
    failedInARow: 0,
    /** Bumped on every load, so a slow request for an old track can't take over */
    loadId: 0,
  }),

  getters: {
    position: () => clock.position,
    duration: () => clock.duration,
    buffered: () => clock.buffered,
    current (state): Track | null {
      const i = state.order[state.index];
      return i === undefined ? null : (state.queue[i] ?? null);
    },
    hasNext (state): boolean {
      return state.index < state.order.length - 1 || state.repeat === 'all';
    },
    progress (): number {
      return clock.duration ? (clock.position / clock.duration) * 100 : 0;
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
        onEnded: () => this.next(true),
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
      this.loading = true;
      this.error = null;
      clock.position = 0;
      clock.duration = track.duration || 0;
      audioEngine.stop();

      let full: Track;
      try {
        full = await loadTrackRequest(String(track.id), { with: 'streamUrl,artist', mode: 'play' }).send();
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
    async next (auto = false) {
      if (this.index < this.order.length - 1) {
        this.index++;
        return this.load(true);
      }

      if (this.repeat === 'all' && this.order.length) {
        if (this.shuffle) this.reorder(this.order[0]);
        this.index = 0;
        return this.load(true);
      }

      // The queue ran out: keep the music going with recommendations.
      if (this.extending) return;
      this.extending = true;
      const more = await this.fetchMore();
      this.extending = false;

      if (more.length) {
        const start = this.queue.length;
        this.queue.push(...more.map(slim));
        this.order.push(...more.map((_, i) => start + i));
        this.index++;
        return this.load(true);
      }

      if (auto) {
        this.playing = false;
        clock.position = 0;
      }
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

    async fetchMore (): Promise<Track[]> {
      try {
        const { data } = await loadPlaylistRequest({ randomize: true, with: 'artist' }).send();
        const known = new Set(this.queue.map((t) => t.id));
        return (data || []).filter((t) => !known.has(t.id));
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
      return this.next(true);
    },
  },
});
