package com.toneflix.music.app;

import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Starts and stops UploadService from the web app as uploads begin and end.
 */
@CapacitorPlugin(name = "Uploads")
public class UploadsPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        Intent intent = new Intent(getContext(), UploadService.class);
        intent.putExtra(UploadService.EXTRA_COUNT, call.getInt("count", 1));

        try {
            ContextCompat.startForegroundService(getContext(), intent);
            call.resolve();
        } catch (Exception e) {
            // Android only lets the app start this while it's in front; the upload still runs
            call.reject("Couldn't keep the upload running in the background", e);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), UploadService.class));
        call.resolve();
    }
}
