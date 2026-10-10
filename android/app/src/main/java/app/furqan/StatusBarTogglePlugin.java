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

    // Single source of truth for the bar's visibility, read by MainActivity's
    // insets listener below. Without this the listener re-applies the stale
    // full top padding after an explicit hide (its getInsets() does not track
    // visibility on this path), resurrecting the empty navy band.
    private static volatile boolean statusBarVisible = true;

    public static boolean isStatusBarVisible() {
        return statusBarVisible;
    }

    // Band + icon colors follow the app theme (spike #766): the reserved
    // system-bar zones must read as app chrome, not as a fixed navy slab.
    // Values mirror the web --background tokens (light/gold) and the existing
    // shell navy (dark). Every layer that can paint these zones is themed
    // together (decor, window bar colors, contrast enforcement) because the
    // visible owner differs per device/OS (window background vs system scrim).
    private void applyColors(String theme, WindowInsetsControllerCompat controller, View decorView, android.view.Window window) {
        int bg;
        boolean lightBars;
        if ("gold".equals(theme)) {
            bg = 0xFFEEE5CE;
            lightBars = true;
        } else if ("light".equals(theme)) {
            bg = 0xFFEEF2F7;
            lightBars = true;
        } else {
            bg = 0xFF16232F;
            lightBars = false;
        }
        decorView.setBackgroundColor(bg);
        // The padding zones belong to the content view, which carries the
        // theme's own navy android:background (styles.xml) — painting only the
        // decor leaves them navy. Paint both.
        View content = decorView.findViewById(android.R.id.content);
        if (content != null) {
            content.setBackgroundColor(bg);
        }
        window.setStatusBarColor(bg);
        window.setNavigationBarColor(bg);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }
        if (controller != null) {
            controller.setAppearanceLightStatusBars(lightBars);
            controller.setAppearanceLightNavigationBars(lightBars);
        }
    }

    private String optTheme(PluginCall call) {
        String theme = call.getString("theme");
        if (theme == null) {
            theme = "dark";
        }
        return theme;
    }

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
            statusBarVisible = visible;
            applyColors(optTheme(call), controller, decorView, activity.getWindow());
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
            // Padding math itself (flag-gated top, always-cleared cutout) lives
            // in the listener — the single owner — so this only retriggers it.
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

    // Theme-only sync (no visibility change): called when the user switches
    // theme mid-session so the bands follow without waiting for a toggle.
    @PluginMethod
    public void applyTheme(PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity attached");
            return;
        }
        activity.runOnUiThread(() -> {
            View decorView = activity.getWindow().getDecorView();
            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(activity.getWindow(), decorView);
            applyColors(optTheme(call), controller, decorView, activity.getWindow());
            call.resolve();
        });
    }
}
