package com.toneflix.music.app;

import android.app.PendingIntent;
import android.content.Intent;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

/**
 * Keeps music playing when the app is in the background or closed, and shows
 * the player in the notification, on the lock screen and to headsets. The
 * player and queue themselves live in PlayerEngine.
 */
@OptIn(markerClass = UnstableApi.class)
public class PlayerService extends MediaSessionService {

    @Nullable
    private MediaSession session;
    private boolean shuttingDown;

    @Override
    public void onCreate() {
        super.onCreate();

        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent activity = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        session = new MediaSession.Builder(this, PlayerEngine.get(this).sessionPlayer()).setSessionActivity(activity).build();
        addSession(session);
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return session;
    }

    /** Swiped away from recents: keep going if music is playing, otherwise stop and let go of the player. */
    @Override
    public void onTaskRemoved(@Nullable Intent rootIntent) {
        Player player = session != null ? session.getPlayer() : null;
        boolean playing = player != null && player.getPlayWhenReady()
            && player.getPlaybackState() != Player.STATE_ENDED && player.getPlaybackState() != Player.STATE_IDLE;

        if (!isPlaybackOngoing() || !playing) {
            shuttingDown = true;
            pauseAllPlayersAndStopSelf();
        }
    }

    @Override
    public void onDestroy() {
        if (session != null) {
            session.release();
            session = null;
        }
        if (shuttingDown) {
            PlayerEngine.get(this).shutdown();
        }
        super.onDestroy();
    }
}
