package com.toneflix.music.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Tells the web app whether Firebase is set up in this build. Builds without
 * google-services.json have no Firebase, and registering for push there
 * crashes the app.
 */
@CapacitorPlugin(name = "PushSupport")
public class PushSupportPlugin extends Plugin {

    @PluginMethod
    public void available(PluginCall call) {
        // The Google Services plugin adds this string; Firebase starts from it.
        int id = getContext().getResources().getIdentifier("google_app_id", "string", getContext().getPackageName());

        JSObject result = new JSObject();
        result.put("value", id != 0);
        call.resolve(result);
    }
}
