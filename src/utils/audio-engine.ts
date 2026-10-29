import { Track } from './models';
import { mediaSession, type SessionAction, type SessionActionDetails } from './media-session';
import { artistCredit } from './credits';

type EngineEvents = {
  onTime: (position: number, duration: number, buffered: number) => void;
  onPlaying: () => void;
  onPaused: () => void;
  onWaiting: () => void;
  onEnded: () => void;
  onError: () => void;
};

type MediaActions = {
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
};

/**
 * Plays audio with the browser's own <audio> element, which streams, seeks
 * with range requests and keeps playing in background tabs. It also feeds
 * the media session (see media-session.ts), so the notification and lock
 * screen player, headsets and media keys work, on the web and in the app.
 *
 * There is one element for the whole app, so two tracks can never play at once.
 */
class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private events: EngineEvents | null = null;
  private track: Track | null = null;
  /** True while we clear the source ourselves, so the browser's error for that is ignored */
  private clearing = false;

  get supported () {
    return typeof window !== 'undefined' && typeof Audio !== 'undefined';
  }

  private get element (): HTMLAudioElement | null {
    if (!this.audio && this.supported) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
    }
    return this.audio;
  }

  attach (events: EngineEvents) {
    const audio = this.element;
    if (!audio || this.events) {
      this.events = events;
      return;
    }
    this.events = events;

    const time = () => {
      const buffered = audio.buffered.length ? audio.buffered.end(audio.buffered.length - 1) : 0;
      this.events?.onTime(audio.currentTime, Number.isFinite(audio.duration) ? audio.duration : 0, buffered);
    };

    audio.addEventListener('timeupdate', time);
    audio.addEventListener('durationchange', () => {
      time();
      this.updatePosition();
    });
    audio.addEventListener('progress', time);
    audio.addEventListener('seeked', () => {
      time();
      this.updatePosition();
    });
    // The system player extrapolates progress from the last position we send,
    // so send the exact position before every play/pause change. Otherwise a
    // pause shows a stale position (0 on the first pause) and play jumps ahead.
    audio.addEventListener('playing', () => {
      this.events?.onPlaying();
      this.updatePosition();
      this.setPlaybackState('playing');
    });
    audio.addEventListener('pause', () => {
      this.events?.onPaused();
      this.updatePosition();
      this.setPlaybackState('paused');
    });
    audio.addEventListener('ratechange', () => this.updatePosition());
    audio.addEventListener('waiting', () => this.events?.onWaiting());
    audio.addEventListener('ended', () => this.events?.onEnded());
    audio.addEventListener('error', () => {
      if (this.clearing || !audio.getAttribute('src')) return;
      this.events?.onError();
    });
  }

  hasSource () {
    return !!this.element?.getAttribute('src');
  }

  setTrack (track: Track) {
    const audio = this.element;
    if (!audio) return;

    this.track = track;
    this.clearing = false;
    audio.src = track.streamUrl;
    audio.load();
    this.setMetadata(track);
  }

  /**
   * Stop and drop the current source, e.g. while the next track loads.
   */
  stop () {
    const audio = this.element;
    if (!audio || !this.hasSource()) return;

    this.clearing = true;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    this.clearing = false;
  }

  play () {
    return this.element?.play() ?? Promise.resolve();
  }

  pause () {
    this.element?.pause();
  }

  seek (seconds: number) {
    const audio = this.element;
    if (!audio || !this.hasSource()) return;
    audio.currentTime = seconds;
  }

  setVolume (volume: number, muted: boolean) {
    const audio = this.element;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, volume / 100));
    audio.muted = muted;
  }

  setLoop (loop: boolean) {
    if (this.element) this.element.loop = loop;
  }

  /**
   * Route lock-screen, headset and media-key controls to the player.
   */
  setActions (actions: MediaActions) {
    const handlers: [SessionAction, (details: SessionActionDetails) => void][] = [
      ['play', () => actions.play()],
      ['pause', () => actions.pause()],
      // Stop on the notification or a headset just pauses, so the queue stays
      ['stop', () => actions.pause()],
      ['nexttrack', () => actions.next()],
      ['previoustrack', () => actions.previous()],
      ['seekto', (d) => typeof d.seekTime === 'number' && actions.seek(d.seekTime)],
      ['seekbackward', (d) => actions.seek((this.element?.currentTime ?? 0) - (d.seekOffset || 10))],
      ['seekforward', (d) => actions.seek((this.element?.currentTime ?? 0) + (d.seekOffset || 10))],
    ];

    void mediaSession().then((session) => {
      for (const [action, handler] of handlers) session?.setActionHandler(action, handler);
    });
  }

  private setMetadata (track: Track) {
    const artwork = track.imageUrl
      ? ['96x96', '256x256', '512x512'].map((sizes) => ({ src: track.imageUrl, sizes }))
      : [];

    void mediaSession().then((session) =>
      session?.setMetadata({
        title: track.title,
        artist: artistCredit(track),
        album: track.album?.title || '',
        artwork,
      }),
    );
  }

  private setPlaybackState (state: 'none' | 'paused' | 'playing') {
    void mediaSession().then((session) => session?.setPlaybackState(state));
  }

  private updatePosition () {
    const audio = this.element;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;

    const state = {
      duration: audio.duration,
      position: Math.min(audio.currentTime, audio.duration),
      playbackRate: audio.playbackRate,
    };
    void mediaSession().then((session) => session?.setPositionState(state));
  }
}

export const audioEngine = new AudioEngine();
