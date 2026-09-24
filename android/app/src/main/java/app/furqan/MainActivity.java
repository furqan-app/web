package app.furqan;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure window decor carries the brand navy background (#16232F)
        getWindow().getDecorView().setBackgroundColor(0xFF16232F);

        // Inset root content view by system bar and display cutout dimensions so the
        // hosted WebView never renders under the status bar, notch, or navigation bar.
        // Accommodate software keyboard (IME) so inputs don't over-lift or get obscured.
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (view, windowInsets) -> {
                Insets systemBars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                int bottomPadding = ime.bottom > 0 ? ime.bottom : systemBars.bottom;

                view.setPadding(systemBars.left, systemBars.top, systemBars.right, bottomPadding);
                view.setBackgroundColor(0xFF16232F);
                return windowInsets;
            });
            ViewCompat.requestApplyInsets(contentView);
        }
    }
}
