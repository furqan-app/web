package app.furqan;

import android.app.Activity;
import android.view.View;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// SPIKE (#766): hand-rolled status-bar toggle for the reader focus mode — no
// new dependency. The web side calls hide/show through the injected Capacitor
// bridge (see setStatusBarVisible in app/utils/platform.ts). Sticky behavior:
// a hidden bar reappears only as a transient edge-swipe, never pinned by an
// ordinary tap — the behavior the installed PWA cannot get from the web. Only
// the status bar is ever touched; the navigation bar and the insets-consumption
// contract (systemBars/displayCutout dispatched as Insets.NONE so the WebView
// sees zero insets) are unchanged, as is the light-icon configuration in
// MainActivity.
@CapacitorPlugin(name = "StatusBarToggle")
public class StatusBarTogglePlugin extends Plugin {

    private void apply(final boolean visible, final PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity attached");
            return;
        }
        activity.runOnUiThread(() -> {
            View decorView = activity.getWindow().getDecorView();
            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(activity.getWindow(), decorView);
            if (controller == null) {
                call.reject("No window insets controller");
                return;
            }
            if (visible) {
                controller.show(WindowInsetsCompat.Type.statusBars());
            } else {
                controller.setSystemBarsBehavior(
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.hide(WindowInsetsCompat.Type.statusBars());
            }
            // Re-run MainActivity's insets listener so contentView padding tracks
            // the new visibility. The system does not reliably re-dispatch here
            // (the listener consumes systemBars as Insets.NONE), and without
            // this the hidden bar leaves a stale navy band top and bottom.
            View root = activity.findViewById(android.R.id.content);
            if (root != null) {
                root.requestApplyInsets();
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void hide(PluginCall call) {
        apply(false, call);
    }

    @PluginMethod
    public void show(PluginCall call) {
        apply(true, call);
    }
}
