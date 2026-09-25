package app.furqan;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure window decor carries the brand navy background (#16232F)
        getWindow().getDecorView().setBackgroundColor(0xFF16232F);

        // Ensure light (white) text and icons on the dark navy status bar and navigation bar.
        // WebView renders edge-to-edge; web CSS env(safe-area-inset-*) handles safe spacing.
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }
    }
}
