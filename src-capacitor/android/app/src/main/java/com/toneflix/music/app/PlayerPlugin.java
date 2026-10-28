package com.toneflix.music.app;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONException;

/**
 * The web app's handle on the native music player (PlayerEngine). Each new
 * plugin instance, as when the app is reopened, attaches to the player that
 * is already running, so getState picks up where playback is.
 */
@CapacitorPlugin(name = "Player")
public class PlayerPlugin extends Plugin implements PlayerEngine.Events {

    private PlayerEngine engine;

    @Override
    public void load() {
        engine = PlayerEngine.get(getContext());
        engine.attach(this);
    }

    @Override
    protected void handleOnDestroy() {
        engine.detach(this);
    }

    @Override
    public void emit(String event, JSObject data) {
        notifyListeners(event, data);
    }

    @PluginMethod
    public void configure(PluginCall call) {
        engine.configure(call.getString("apiBase", ""), call.getString("token"));
        call.resolve();
    }

    @PluginMethod
    public void setQueue(PluginCall call) {
        List<JSObject> tracks = new ArrayList<>();
        JSArray list = call.getArray("tracks", new JSArray());
        try {
            for (int i = 0; i < list.length(); i++) {
                tracks.add(JSObject.fromJSONObject(list.getJSONObject(i)));
            }
        } catch (JSONException e) {
            call.reject("Invalid tracks", e);
            return;
        }

        int index = call.getInt("index", 0);
        boolean autoplay = call.getBoolean("autoplay", false);
        boolean reload = call.getBoolean("reload", false);
        double position = call.getDouble("position", 0.0);
        engine.run(() -> {
            engine.setQueue(tracks, index, autoplay, reload, position);
            call.resolve();
        });
    }

    @PluginMethod
    public void play(PluginCall call) {
        engine.run(() -> {
            engine.play();
            call.resolve();
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        engine.run(() -> {
            engine.pause();
            call.resolve();
        });
    }

    @PluginMethod
    public void seek(PluginCall call) {
        double position = call.getDouble("position", 0.0);
        engine.run(() -> {
            engine.seek(position);
            call.resolve();
        });
    }

    @PluginMethod
    public void next(PluginCall call) {
        engine.run(() -> {
            engine.next();
            call.resolve();
        });
    }

    @PluginMethod
    public void previous(PluginCall call) {
        engine.run(() -> {
            engine.previous();
            call.resolve();
        });
    }

    @PluginMethod
    public void setRepeat(PluginCall call) {
        String mode = call.getString("mode", "off");
        engine.run(() -> {
            engine.setRepeat(mode);
            call.resolve();
        });
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        float volume = call.getFloat("volume", 1f);
        engine.run(() -> {
            engine.setVolume(volume);
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        engine.run(() -> {
            engine.stop();
            call.resolve();
        });
    }

    @PluginMethod
    public void getState(PluginCall call) {
        engine.run(() -> call.resolve(engine.getState()));
    }
}
