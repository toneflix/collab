/**
 * What's playing, for the system: the notification and lock screen player,
 * headsets, media keys and the browser's own media controls.
 *
 * The web uses the browser's Media Session API. The installed app uses a
 * native media session instead, since Android's WebView doesn't show one. Its
 * foreground service also keeps music playing when the app is in the
 * background or the screen is off.
 */

export type SessionAction = 'play' | 'pause' | 'stop' | 'nexttrack' | 'previoustrack' | 'seekto' | 'seekbackward' | 'seekforward';

export type SessionActionDetails = { seekTime?: number | null; seekOffset?: number | null };

export type SessionMetadata = {
  title: string;
  artist: string;
  album: string;
  artwork: { src: string; sizes?: string; type?: string }[];
};

export interface MediaSessionBridge {
  setMetadata (metadata: SessionMetadata): void;
  setPlaybackState (state: 'none' | 'paused' | 'playing'): void;
  setPositionState (state: { duration: number; position: number; playbackRate: number }): void;
  setActionHandler (action: SessionAction, handler: ((details: SessionActionDetails) => void) | null): void;
}

/** The browser's Media Session API, where there is one. */
const browserSession = (): MediaSessionBridge | null => {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return null;
  const session = navigator.mediaSession;

  return {
    setMetadata: (metadata) => {
      if (typeof MediaMetadata !== 'undefined') session.metadata = new MediaMetadata(metadata);
    },
    setPlaybackState: (state) => (session.playbackState = state),
    setPositionState: (state) => {
      try {
        session.setPositionState(state);
      } catch {
        // Some browsers reject position updates
      }
    },
    setActionHandler: (action, handler) => {
      try {
        session.setActionHandler(action, handler as MediaSessionActionHandler | null);
      } catch {
        // Not every browser supports every action
      }
    },
  };
};

let bridge: Promise<MediaSessionBridge | null> | null = null;

/** The media session for where the app runs, loaded once. */
export const mediaSession = (): Promise<MediaSessionBridge | null> => {
  if (!bridge) {
    bridge = import.meta.env.QUASAR_CAPACITOR_MODE
      ? import('src/utils/native-media-session').then((m) => m.nativeSession())
      : Promise.resolve(browserSession());
  }

  return bridge;
};
