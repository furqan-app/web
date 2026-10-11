package app.furqan;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
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

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // SPIKE (#766): register before super.onCreate — the bridge is created
        // at the end of super.onCreate, so registering after would miss it.
        registerPlugin(StatusBarTogglePlugin.class);
        super.onCreate(savedInstanceState);

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
                Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
                Insets cut = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout());
                Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                boolean keyboardVisible = windowInsets.isVisible(WindowInsetsCompat.Type.ime());
                // SPIKE (#766): topPadding is permanently anchored to the status-bar/cutout height.
                // The status-bar toggles as a floating overlay above this reserved zone
                // (matching mushaf paper color), keeping WebView height constant so
                // space-between lines never jump.
                int topPadding = Math.max(cut.top, bars.top);
                int bottomPadding = keyboardVisible ? 0 : Math.max(bars.bottom, cut.bottom);
                v.setPadding(Math.max(bars.left, cut.left), topPadding,
                    Math.max(bars.right, cut.right), bottomPadding);

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
