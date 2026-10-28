package com.toneflix.music.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.datasource.HttpDataSource;
import androidx.media3.datasource.ResolvingDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.exoplayer.upstream.DefaultLoadErrorHandlingPolicy;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONException;

/**
 * The app's one music player, shared by PlayerPlugin and PlayerService. It
 * owns the ExoPlayer and the queue, so playback outlives the web view: while
 * the app is open the plugin drives it, and with the app closed it carries on
 * through the queue by itself. Everything here runs on the main thread.
 */
@OptIn(markerClass = UnstableApi.class)
final class PlayerEngine {

    /** Where events go; the plugin while the app is open, nowhere otherwise. */
    interface Events {
        void emit(String event, JSObject data);
    }

    private static final String SCHEME = "toneflix-track";
    private static final int MAX_FAILURES = 3;
    private static final long TICK_MS = 250;
    private static final long RESTART_AFTER_MS = 3000;

    /** Holds only the application context, which lives as long as the process */
    @SuppressLint("StaticFieldLeak")
    @Nullable
    private static PlayerEngine instance;

    static synchronized PlayerEngine get(Context context) {
        if (instance == null) {
            instance = new PlayerEngine(context.getApplicationContext());
        }
        return instance;
    }

    private final Context context;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final StreamLinks links;
    private final Runnable tick = this::tick;

    @Nullable
    private ExoPlayer player;

    @Nullable
    private SessionPlayer sessionPlayer;

    @Nullable
    private Events events;

    /** The tracks as the app sent them, matching the player's items one to one */
    private List<JSObject> tracks = new ArrayList<>();
    private String repeat = "off";
    private int failures;
    /** Tracks whose expired link was already fetched again once */
    private final Set<String> retried = new HashSet<>();
    /** Set while setQueue edits the playlist, so it doesn't report index changes the app made */
    private boolean editing;
    @Nullable
    private Boolean sentPlaying;
    @Nullable
    private Boolean sentLoading;

    private PlayerEngine(Context context) {
        this.context = context;
        this.links = new StreamLinks((id, track) -> main.post(() -> {
            try {
                JSObject data = new JSObject();
                data.put("id", id);
                data.put("track", JSObject.fromJSONObject(track));
                emit("resolved", data);
            } catch (JSONException ignored) {}
        }));
    }

    /** Runs on the main thread, where the player lives. */
    void run(Runnable task) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            task.run();
        } else {
            main.post(task);
        }
    }

    void attach(Events events) {
        run(() -> this.events = events);
    }

    void detach(Events events) {
        run(() -> {
            if (this.events == events) this.events = null;
        });
    }

    void configure(String apiBase, @Nullable String token) {
        links.configure(apiBase, token);
    }

    /** What the media session controls; the notification's next and previous come back here. */
    Player sessionPlayer() {
        player();
        return sessionPlayer;
    }

    void setQueue(List<JSObject> list, int index, boolean autoplay, boolean reload, double position) {
        if (list.isEmpty()) {
            stop();
            return;
        }

        index = Math.max(0, Math.min(index, list.size() - 1));
        ExoPlayer p = player();
        MediaItem current = p.getCurrentMediaItem();
        boolean keep = !reload && current != null && current.mediaId.equals(idOf(list.get(index)));

        editing = true;
        try {
            if (keep) {
                // Swap the tracks around the current one so it plays on without rebuffering
                int at = p.getCurrentMediaItemIndex();
                int count = p.getMediaItemCount();
                if (at + 1 < count) p.removeMediaItems(at + 1, count);
                if (at > 0) p.removeMediaItems(0, at);
                p.addMediaItems(0, items(list.subList(0, index)));
                p.addMediaItems(index + 1, items(list.subList(index + 1, list.size())));
            } else {
                failures = 0;
                retried.clear();
                p.setMediaItems(items(list), index, (long) (Math.max(0, position) * 1000));
                p.prepare();
                p.setPlayWhenReady(autoplay);
            }
        } finally {
            editing = false;
        }

        tracks = new ArrayList<>(list);
        if (!keep) {
            emitIndex();
            emitTime();
        }
        startService();
    }

    void play() {
        ExoPlayer p = player();
        if (p.getMediaItemCount() == 0) return;

        if (p.getPlaybackState() == Player.STATE_IDLE) {
            p.prepare();
        } else if (p.getPlaybackState() == Player.STATE_ENDED) {
            p.seekToDefaultPosition(p.getCurrentMediaItemIndex());
        }
        p.play();
        startService();
    }

    void pause() {
        player().pause();
    }

    void seek(double position) {
        player().seekTo((long) (Math.max(0, position) * 1000));
    }

    /** The next track; at the end it wraps unless repeat is off, which ends the queue instead. */
    void next() {
        ExoPlayer p = player();
        int count = p.getMediaItemCount();
        if (count == 0) return;

        int index = p.getCurrentMediaItemIndex();
        if (index + 1 < count) {
            moveTo(index + 1);
        } else if (!repeat.equals("off")) {
            moveTo(0);
        } else {
            emit("queueEnd", new JSObject());
        }
    }

    /** Restarts the track a few seconds in or on the first one, otherwise goes back one. */
    void previous() {
        ExoPlayer p = player();
        if (p.getMediaItemCount() == 0) return;

        int index = p.getCurrentMediaItemIndex();
        if (p.getCurrentPosition() > RESTART_AFTER_MS || index == 0) {
            p.seekTo(0);
        } else {
            moveTo(index - 1);
        }
    }

    void setRepeat(String mode) {
        repeat = mode == null ? "off" : mode;
        int value = repeat.equals("one") ? Player.REPEAT_MODE_ONE : repeat.equals("all") ? Player.REPEAT_MODE_ALL : Player.REPEAT_MODE_OFF;
        player().setRepeatMode(value);
    }

    void setVolume(float volume) {
        player().setVolume(Math.max(0f, Math.min(1f, volume)));
    }

    /** Stops and forgets the queue; with nothing loaded the notification goes away. */
    void stop() {
        if (player != null) {
            player.stop();
            player.clearMediaItems();
        }
        tracks = new ArrayList<>();
        failures = 0;
        retried.clear();
        context.stopService(new Intent(context, PlayerService.class));
    }

    /** The app was swiped away while nothing was playing: let go of the player entirely. */
    void shutdown() {
        main.removeCallbacks(tick);
        if (player != null) {
            player.release();
            player = null;
            sessionPlayer = null;
        }
        tracks = new ArrayList<>();
        failures = 0;
        retried.clear();
        sentPlaying = null;
        sentLoading = null;
    }

    JSObject getState() {
        JSObject state = new JSObject();
        JSArray list = new JSArray();
        boolean queued = player != null && player.getMediaItemCount() > 0;

        if (queued) {
            for (JSObject track : tracks) list.put(track);
        }
        state.put("tracks", list);
        state.put("index", queued ? player.getCurrentMediaItemIndex() : 0);
        state.put("position", queued ? player.getCurrentPosition() / 1000.0 : 0);
        state.put("duration", queued ? duration() : 0);
        state.put("playing", queued && isPlaying());
        return state;
    }

    private ExoPlayer player() {
        if (player != null) return player;

        HttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15000)
            .setReadTimeoutMs(15000);
        ResolvingDataSource.Factory dataSource = new ResolvingDataSource.Factory(
            new DefaultDataSource.Factory(context, http),
            spec -> {
                if (!SCHEME.equals(spec.uri.getScheme())) return spec;
                String id = spec.uri.getLastPathSegment();
                return spec.withUri(Uri.parse(links.resolve(id == null ? "" : id)));
            }
        );
        DefaultMediaSourceFactory sources = new DefaultMediaSourceFactory(dataSource).setLoadErrorHandlingPolicy(new LoadPolicy());

        AudioAttributes audio = new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build();

        player = new ExoPlayer.Builder(context)
            .setMediaSourceFactory(sources)
            .setAudioAttributes(audio, true)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .build();
        player.setRepeatMode(repeat.equals("one") ? Player.REPEAT_MODE_ONE : repeat.equals("all") ? Player.REPEAT_MODE_ALL : Player.REPEAT_MODE_OFF);
        player.addListener(new Listener());
        sessionPlayer = new SessionPlayer(player, this);
        return player;
    }

    /** Starts PlayerService, which puts the player in a media session and the notification. */
    private void startService() {
        try {
            context.startService(new Intent(context, PlayerService.class));
        } catch (Exception ignored) {
            // Only allowed while the app is in front; the service is already up whenever it isn't
        }
    }

    private void moveTo(int index) {
        ExoPlayer p = player();
        p.seekTo(index, 0);
        if (p.getPlaybackState() == Player.STATE_IDLE) p.prepare();
        p.play();
    }

    private boolean isPlaying() {
        return player != null && player.getPlayWhenReady() && player.getPlaybackState() != Player.STATE_ENDED;
    }

    private double duration() {
        long ms = player.getDuration();
        if (ms != C.TIME_UNSET) return ms / 1000.0;

        int index = player.getCurrentMediaItemIndex();
        return index < tracks.size() ? tracks.get(index).optDouble("duration", 0) : 0;
    }

    private void tick() {
        emitTime();
        if (player != null && player.isPlaying()) {
            main.postDelayed(tick, TICK_MS);
        }
    }

    private void emitTime() {
        if (player == null || player.getMediaItemCount() == 0) return;

        JSObject data = new JSObject();
        data.put("position", player.getCurrentPosition() / 1000.0);
        data.put("duration", duration());
        data.put("buffered", player.getBufferedPosition() / 1000.0);
        emit("time", data);
    }

    private void emitIndex() {
        MediaItem item = player == null ? null : player.getCurrentMediaItem();
        if (item == null) return;

        JSObject data = new JSObject();
        data.put("index", player.getCurrentMediaItemIndex());
        data.put("id", item.mediaId);
        emit("index", data);
    }

    private void emitState() {
        boolean playing = isPlaying();
        boolean loading = player != null && player.getPlaybackState() == Player.STATE_BUFFERING;
        if (Boolean.valueOf(playing).equals(sentPlaying) && Boolean.valueOf(loading).equals(sentLoading)) return;

        sentPlaying = playing;
        sentLoading = loading;
        JSObject data = new JSObject();
        data.put("playing", playing);
        data.put("loading", loading);
        emit("state", data);
    }

    private void emit(String event, JSObject data) {
        if (events != null) events.emit(event, data);
    }

    /**
     * A track failed. An expired link gets one fresh fetch; otherwise the
     * player skips ahead, unless several failed in a row or there's nowhere to go.
     */
    private void onError(PlaybackException error) {
        ExoPlayer p = player();
        MediaItem item = p.getCurrentMediaItem();
        String id = item == null ? "" : item.mediaId;
        int index = p.getCurrentMediaItemIndex();

        StreamLinks.TrackException track = cause(error, StreamLinks.TrackException.class);
        if (track == null && cause(error, HttpDataSource.InvalidResponseCodeException.class) != null && retried.add(id)) {
            links.forget(id);
            p.prepare();
            return;
        }

        failures++;
        int count = p.getMediaItemCount();
        int next = index + 1 < count ? index + 1 : !repeat.equals("off") ? 0 : -1;
        boolean skip = failures < MAX_FAILURES && next >= 0;

        JSObject data = new JSObject();
        data.put("index", index);
        data.put("id", id);
        data.put("message", track != null ? track.getMessage() : StreamLinks.PLAY_FAILED);
        data.put("locked", track != null && track.locked);
        data.put("skipped", skip);
        emit("error", data);

        if (skip) {
            p.seekTo(next, 0);
            p.prepare();
            p.play();
        } else {
            p.pause();
        }
    }

    @Nullable
    private static <T extends Throwable> T cause(Throwable error, Class<T> type) {
        for (Throwable e = error; e != null; e = e.getCause()) {
            if (type.isInstance(e)) return type.cast(e);
        }
        return null;
    }

    private static String idOf(JSObject track) {
        return track.getString("id", "");
    }

    private static List<MediaItem> items(List<JSObject> list) {
        List<MediaItem> items = new ArrayList<>(list.size());
        for (JSObject track : list) items.add(item(track));
        return items;
    }

    /**
     * A queue entry: its own audio link when it has one, otherwise a placeholder
     * address the data source swaps for the track's stream link on open.
     */
    private static MediaItem item(JSObject track) {
        String id = idOf(track);
        String url = track.getString("url", "");
        Uri uri = url != null && !url.isEmpty()
            ? Uri.parse(url)
            : new Uri.Builder().scheme(SCHEME).authority("track").appendPath(id).build();
        MediaMetadata.Builder metadata = new MediaMetadata.Builder()
            .setTitle(track.getString("title", ""))
            .setArtist(track.getString("artist", ""))
            .setAlbumTitle(track.getString("album", ""));

        String artwork = track.getString("artwork", "");
        if (artwork != null && !artwork.isEmpty()) metadata.setArtworkUri(Uri.parse(artwork));

        double duration = track.optDouble("duration", 0);
        if (duration > 0) metadata.setDurationMs((long) (duration * 1000));

        return new MediaItem.Builder()
            .setMediaId(id)
            .setUri(uri)
            .setMediaMetadata(metadata.build())
            .build();
    }

    /**
     * Doesn't retry a track the API refused or a link the stream server
     * refused; those are handled in onError instead of retried blindly.
     */
    private static final class LoadPolicy extends DefaultLoadErrorHandlingPolicy {

        @Override
        public long getRetryDelayMsFor(LoadErrorInfo info) {
            StreamLinks.TrackException track = cause(info.exception, StreamLinks.TrackException.class);
            if (track != null && !track.temporary) return C.TIME_UNSET;
            if (cause(info.exception, HttpDataSource.InvalidResponseCodeException.class) != null) return C.TIME_UNSET;
            return super.getRetryDelayMsFor(info);
        }
    }

    private final class Listener implements Player.Listener {

        @Override
        public void onPlaybackStateChanged(int state) {
            if (state == Player.STATE_ENDED && player != null) {
                // Only reached with repeat off: the last track finished
                player.pause();
                emitState();
                emitTime();
                emit("queueEnd", new JSObject());
                return;
            }
            emitState();
        }

        @Override
        public void onPlayWhenReadyChanged(boolean playWhenReady, int reason) {
            emitState();
            if (!playWhenReady) emitTime();
        }

        @Override
        public void onIsPlayingChanged(boolean isPlaying) {
            emitState();
            main.removeCallbacks(tick);
            if (isPlaying) {
                failures = 0;
                retried.clear();
                main.post(tick);
            }
        }

        @Override
        public void onPositionDiscontinuity(Player.PositionInfo oldPosition, Player.PositionInfo newPosition, int reason) {
            if (reason == Player.DISCONTINUITY_REASON_SEEK) emitTime();
        }

        @Override
        public void onMediaItemTransition(@Nullable MediaItem item, int reason) {
            if (!editing && item != null) emitIndex();
        }

        @Override
        public void onPlayerError(PlaybackException error) {
            onError(error);
        }
    }
}
