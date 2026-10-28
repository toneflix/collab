import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

/**
 * The installed app's music player: our own native plugin ("Player"), in
 * PlayerPlugin on Android (Media3) and on iOS (AVPlayer). It plays the queue,
 * shows the notification and lock screen player, answers headset buttons, and
 * keeps going after the app is closed (Android) or in the background (iOS).
 *
 * While the app is open the player store is in charge: it sends the queue and
 * every command here. With the app closed the native side carries on through
 * the queue on its own, fetching each track's stream link from the API itself,
 * since links expire. Loaded only in the installed app.
 */

/** A queued track, as the native player needs it. */
export type NativeTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** Cover image URL, or '' */
  artwork: string;
  /** Seconds, 0 when unknown */
  duration: number;
  /** An audio link to play as is, or '' to fetch the track's stream link from the API */
  url?: string;
};

export type NativeRepeat = 'off' | 'all' | 'one';

export type NativeState = {
  /** The queue as last sent, in play order. Empty when nothing is queued. */
  tracks: NativeTrack[];
  index: number;
  position: number;
  duration: number;
  playing: boolean;
};

export type NativePlayerEvents = {
  /** Playing or paused, and whether it is waiting on the network */
  state: {
    playing: boolean;
    loading: boolean
  };
  /** About four times a second while playing, and after seeks and pauses */
  time: {
    position: number;
    duration: number;
    buffered: number
  };
  /** The current track changed, by itself or after setQueue */
  index: {
    index: number;
    id: string
  };
  /** The API's copy of a track, fetched with its stream link */
  resolved: {
    id: string;
    track: Record<string, unknown>
  };
  /**
   * A track couldn't play. `skipped` is true when the player moved on to the
   * next one, false when it stopped after several failures in a row.
   */
  error: {
    index: number;
    id: string;
    message: string;
    locked: boolean;
    skipped: boolean
  };
  /** The last track finished, or next was pressed on it, with repeat off */
  queueEnd: Record<string, never>;
};

export interface NativePlayerPlugin {
  /** Where the API is (e.g. https://api.example.com/api) and the signed-in token, if any. */
  configure(options: {
    apiBase: string;
    token: string | null
  }): Promise<void>;
  /**
   * Replace the queue. When `reload` is false and the track at `index` is
   * the one already loaded, it keeps playing untouched; otherwise that track
   * loads from `position` (default 0) and plays when `autoplay` is set.
   */
  setQueue(options: {
    tracks: NativeTrack[];
    index: number;
    autoplay: boolean;
    reload: boolean;
    position?: number
  }): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(options: {
    position: number
  }): Promise<void>;
  /** The next track; at the end it wraps with repeat all, or sends queueEnd */
  next(): Promise<void>;
  /** Restart the track after 3 seconds in (or on the first), otherwise the one before */
  previous(): Promise<void>;
  setRepeat(options: {
    mode: NativeRepeat
  }): Promise<void>;
  /** 0 to 1 */
  setVolume(options: {
    volume: number
  }): Promise<void>;
  /** Stop and forget the queue; the notification goes away */
  stop(): Promise<void>;
  getState(): Promise<NativeState>;
  addListener<E extends keyof NativePlayerEvents>(
    event: E,
    listener: (data: NativePlayerEvents[E]) => void,
  ): Promise<PluginListenerHandle>;
}

export const nativePlayer = registerPlugin<NativePlayerPlugin>('Player');
