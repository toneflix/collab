package com.toneflix.music.app;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins that live in this app, not in an npm package
        registerPlugin(PlayerPlugin.class);
        registerPlugin(PushSupportPlugin.class);
        registerPlugin(ScreenPlugin.class);
        registerPlugin(UploadsPlugin.class);
        super.onCreate(savedInstanceState);

        // Edge to edge on every Android version (15+ forces it); the web app pads
        // itself from the safe-area insets Capacitor passes in.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Draw beside a camera cutout too, so hiding the status bar frees its strip
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams params = getWindow().getAttributes();
            params.layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                ? WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                : WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(params);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);

        // Again on every return, since dialogs and other apps bring the bar back
        if (hasFocus) {
            hideStatusBar();
        }
    }

    /** Full screen: the status bar shows for a moment when people swipe down from the top. */
    private void hideStatusBar() {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());

        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.statusBars());
    }
}
