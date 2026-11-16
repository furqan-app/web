package app.furqan;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    private final SystemBarInsetsHelper insetsHelper = new SystemBarInsetsHelper();

    private int readFallbackStatusBarHeight() {
        int resId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        return resId > 0 ? getResources().getDimensionPixelSize(resId) : 0;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // SPIKE (#766): register before super.onCreate — the bridge is created
        // at the end of super.onCreate, so registering after would miss it.
        registerPlugin(StatusBarTogglePlugin.class);
        super.onCreate(savedInstanceState);

        // Keep the window edge-to-edge across status-bar toggles on all Android
        // versions so hiding/showing the status bar never resizes or letterboxes
        // the root frame (#800).
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
            getWindow().setAttributes(lp);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }

        // Ensure window decor carries the brand navy background (#16232F)
        getWindow().getDecorView().setBackgroundColor(0xFF16232F);

        // Ensure light (white) text and icons on the dark navy status bar and navigation bar
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }

        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                // Use getInsetsIgnoringVisibility so hiding the status bar does
                // not drop bars.top to 0 and shrink WebView height (#800).
                Insets stableBars = windowInsets.getInsetsIgnoringVisibility(
                    WindowInsetsCompat.Type.systemBars()
                );
                Insets cut = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout());
                boolean keyboardVisible = windowInsets.isVisible(WindowInsetsCompat.Type.ime());
                int orientation = getResources().getConfiguration().orientation;
                SystemBarInsetsHelper.InsetsPadding padding = insetsHelper.resolve(
                    orientation,
                    stableBars.left,
                    stableBars.top,
                    stableBars.right,
                    stableBars.bottom,
                    cut.left,
                    cut.top,
                    cut.right,
                    cut.bottom,
                    StatusBarTogglePlugin.isStatusBarVisible(),
                    keyboardVisible,
                    readFallbackStatusBarHeight()
                );
                v.setPadding(padding.left, padding.top, padding.right, padding.bottom);

                // Consume systemBars and displayCutout so WebView does not receive them and apply double padding in CSS
                return new WindowInsetsCompat.Builder(windowInsets)
                    .setInsets(WindowInsetsCompat.Type.systemBars(), Insets.NONE)
                    .setInsets(WindowInsetsCompat.Type.displayCutout(), Insets.NONE)
                    .build();
            });
            ViewCompat.requestApplyInsets(contentView);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // WebView keeps cookie writes in memory; persist the session before the process can be killed.
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        PluginHandle handle = getBridge() != null ? getBridge().getPlugin("SocialLogin") : null;
        if (handle != null && handle.getInstance() instanceof SocialLoginPlugin) {
            ((SocialLoginPlugin) handle.getInstance()).handleGoogleLoginIntent(requestCode, data);
        }
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Marker method required by @capgo/capacitor-social-login
    }
}
