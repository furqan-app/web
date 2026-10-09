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
                Insets systemBars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                boolean keyboardVisible = windowInsets.isVisible(WindowInsetsCompat.Type.ime());
                int bottomPadding = keyboardVisible ? 0 : systemBars.bottom;
                v.setPadding(systemBars.left, systemBars.top, systemBars.right, bottomPadding);

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
