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
            // Belt and suspenders: request a fresh dispatch AND fix the top
            // padding explicitly (0 while hidden, the real bar height while
            // shown), so the layout is correct even if the re-dispatch never
            // arrives. Only the top edge is touched — sides/bottom/cutout and
            // the IME path stay exactly as the listener computes them. The
            // height comes from the platform resource (all API levels) instead
            // of the newer ignoring-visibility API this project's core version
            // does not carry.
            View root = activity.findViewById(android.R.id.content);
            if (root != null) {
                root.requestApplyInsets();
                int barHeight = 0;
                int resId = activity.getResources().getIdentifier(
                    "status_bar_height", "dimen", "android");
                if (resId > 0) {
                    barHeight = activity.getResources().getDimensionPixelSize(resId);
                }
                root.setPadding(root.getPaddingLeft(), visible ? barHeight : 0,
                    root.getPaddingRight(), root.getPaddingBottom());
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
