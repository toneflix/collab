package com.toneflix.music.app;

import android.os.SystemClock;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Fetches each track's stream link from the API. Links expire, so they are
 * fetched when a track opens rather than when it is queued, and kept for ten
 * minutes so seeking doesn't fetch again (each fetch counts as a play).
 */
final class StreamLinks {

    /** Why a track can't play, worded for the listener. */
    static final class TrackException extends IOException {

        final boolean locked;
        /** A network hiccup that may pass, as opposed to the API refusing the track */
        final boolean temporary;

        TrackException(String message, boolean locked, boolean temporary) {
            super(message);
            this.locked = locked;
            this.temporary = temporary;
        }
    }

    /** Gets the API's copy of each track it fetches. Called on a loader thread. */
    interface OnResolved {
        void onResolved(String id, JSONObject track);
    }

    static final String LOAD_FAILED = "This track couldn't be loaded.";
    static final String UNPLAYABLE = "This track can't be played right now.";
    static final String PLAY_FAILED = "This track couldn't be played.";

    private static final long KEEP_MS = 10 * 60 * 1000;
    private static final int TIMEOUT_MS = 15000;

    private static final class Link {

        final String url;
        final long at;

        Link(String url, long at) {
            this.url = url;
            this.at = at;
        }
    }

    private final Map<String, Link> links = new ConcurrentHashMap<>();
    private final OnResolved onResolved;
    private volatile String apiBase;
    private volatile String token;

    StreamLinks(OnResolved onResolved) {
        this.onResolved = onResolved;
    }

    void configure(String apiBase, String token) {
        if (apiBase != null && apiBase.endsWith("/")) {
            apiBase = apiBase.substring(0, apiBase.length() - 1);
        }
        this.apiBase = apiBase;
        this.token = token;
    }

    /** Drops a link the stream server refused, so the next open fetches a fresh one. */
    void forget(String id) {
        links.remove(id);
    }

    /** The stream URL for a track. Blocks on the network, so only call it off the main thread. */
    String resolve(String id) throws TrackException {
        Link link = links.get(id);
        if (link != null && SystemClock.elapsedRealtime() - link.at < KEEP_MS) {
            return link.url;
        }

        JSONObject track = fetch(id);
        onResolved.onResolved(id, track);

        String url = track.isNull("streamUrl") ? "" : track.optString("streamUrl", "");
        if (url.isEmpty()) {
            if (track.optBoolean("locked", false)) {
                String title = track.isNull("title") ? "This track" : track.optString("title", "This track");
                throw new TrackException("\"" + title + "\" is part of a paid release. Buy it to listen.", true, false);
            }
            throw new TrackException(UNPLAYABLE, false, false);
        }

        links.put(id, new Link(url, SystemClock.elapsedRealtime()));
        return url;
    }

    private JSONObject fetch(String id) throws TrackException {
        String base = apiBase;
        if (base == null || base.isEmpty()) {
            throw new TrackException(LOAD_FAILED, false, false);
        }

        HttpURLConnection connection = null;
        try {
            String path = URLEncoder.encode(id, "UTF-8").replace("+", "%20");
            URL url = new URL(base + "/tracks/" + path + "?with=streamUrl,artist,release&mode=play");
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("X-Requested-With", "XMLHttpRequest");
            String bearer = token;
            if (bearer != null && !bearer.isEmpty()) {
                connection.setRequestProperty("Authorization", "Bearer " + bearer);
            }

            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new TrackException(LOAD_FAILED, false, false);
            }

            JSONObject data = new JSONObject(read(connection.getInputStream())).optJSONObject("data");
            if (data == null) {
                throw new TrackException(LOAD_FAILED, false, false);
            }
            return data;
        } catch (TrackException e) {
            throw e;
        } catch (IOException e) {
            throw new TrackException(LOAD_FAILED, false, true);
        } catch (JSONException e) {
            throw new TrackException(LOAD_FAILED, false, false);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static String read(InputStream in) throws IOException {
        try (InputStream stream = in) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int n;
            while ((n = stream.read(buffer)) != -1) {
                out.write(buffer, 0, n);
            }
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }
}
