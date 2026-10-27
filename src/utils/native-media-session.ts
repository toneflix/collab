import { MediaSession } from '@capgo/capacitor-media-session';
import type { MediaSessionBridge } from 'src/utils/media-session';

/**
 * The installed app's media session: the notification and lock screen
 * player, with a foreground service that keeps music playing in the
 * background. Loaded only in the installed app.
 */
export const nativeSession = (): MediaSessionBridge => ({
  setMetadata: (metadata) => void MediaSession.setMetadata(metadata).catch(() => undefined),
  setPlaybackState: (playbackState) => void MediaSession.setPlaybackState({ playbackState }).catch(() => undefined),
  setPositionState: (state) => void MediaSession.setPositionState(state).catch(() => undefined),
  setActionHandler: (action, handler) =>
    void MediaSession.setActionHandler({ action }, handler && ((details) => handler({ seekTime: details.seekTime }))).catch(
      () => undefined,
    ),
});
