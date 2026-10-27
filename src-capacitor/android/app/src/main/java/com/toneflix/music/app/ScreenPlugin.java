package com.toneflix.music.app;

import android.graphics.Rect;
import androidx.core.view.DisplayCutoutCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Where the camera cutout sits on the top edge, in CSS pixels, so the web app
 * can lay the header out beside it now that the status bar is hidden.
 */
@CapacitorPlugin(name = "Screen")
public class ScreenPlugin extends Plugin {

    @PluginMethod
    public void cutout(PluginCall call) {
        getBridge().executeOnMainThread(() -> {
            JSObject result = new JSObject();
            WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(getActivity().getWindow().getDecorView());
            DisplayCutoutCompat cutout = insets == null ? null : insets.getDisplayCutout();
            float density = getContext().getResources().getDisplayMetrics().density;

            if (cutout != null) {
                for (Rect rect : cutout.getBoundingRects()) {
                    // Only one on the top edge matters for the header
                    if (rect.top <= 0 && !rect.isEmpty()) {
                        result.put("left", rect.left / density);
                        result.put("right", rect.right / density);
                        result.put("bottom", rect.bottom / density);
                        break;
                    }
                }
            }

            call.resolve(result);
        });
    }
}
