package app.furqan;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class SystemBarInsetsHelperTest {

    private static final int PORTRAIT = 1;
    private static final int LANDSCAPE = 2;

    @Test
    public void portraitWithCutoutKeepsTopConstantAcrossToggleOnApi30AndPreApi30() {
        SystemBarInsetsHelper helper = new SystemBarInsetsHelper();

        SystemBarInsetsHelper.InsetsPadding shown = helper.resolve(
            PORTRAIT, 0, 100, 0, 48, 0, 80, 0, 0, true, false, 72
        );
        assertEquals(100, shown.top);
        assertEquals(48, shown.bottom);

        // API 30+: getInsetsIgnoringVisibility keeps stableTop == 100 while hidden.
        SystemBarInsetsHelper.InsetsPadding hiddenApi30 = helper.resolve(
            PORTRAIT, 0, 100, 0, 48, 0, 80, 0, 0, false, false, 72
        );
        assertEquals(100, hiddenApi30.top);
        assertEquals(48, hiddenApi30.bottom);

        // API 24-29 fallback: stableTop drops to 0 when hidden; orientation cache holds 100.
        SystemBarInsetsHelper.InsetsPadding hiddenPreApi30 = helper.resolve(
            PORTRAIT, 0, 0, 0, 48, 0, 80, 0, 0, false, false, 72
        );
        assertEquals(100, hiddenPreApi30.top);
        assertEquals(48, hiddenPreApi30.bottom);
    }

    @Test
    public void portraitWithoutCutoutNeverDropsToZeroWhenHidden() {
        SystemBarInsetsHelper helper = new SystemBarInsetsHelper();

        SystemBarInsetsHelper.InsetsPadding shown = helper.resolve(
            PORTRAIT, 0, 72, 0, 48, 0, 0, 0, 0, true, false, 72
        );
        assertEquals(72, shown.top);

        SystemBarInsetsHelper.InsetsPadding hidden = helper.resolve(
            PORTRAIT, 0, 0, 0, 48, 0, 0, 0, 0, false, false, 72
        );
        assertEquals(72, hidden.top);
    }

    @Test
    public void coldLaunchHiddenBeforeVisibleFrameUsesFallbackHeight() {
        SystemBarInsetsHelper helper = new SystemBarInsetsHelper();

        SystemBarInsetsHelper.InsetsPadding hiddenCold = helper.resolve(
            PORTRAIT, 0, 0, 0, 48, 0, 0, 0, 0, false, false, 72
        );
        assertEquals(72, hiddenCold.top);

        SystemBarInsetsHelper.InsetsPadding shownAfter = helper.resolve(
            PORTRAIT, 0, 72, 0, 48, 0, 0, 0, 0, true, false, 72
        );
        assertEquals(72, shownAfter.top);
    }

    @Test
    public void orientationCacheIsIsolatedBetweenPortraitAndLandscape() {
        SystemBarInsetsHelper helper = new SystemBarInsetsHelper();

        helper.resolve(PORTRAIT, 0, 100, 0, 48, 0, 80, 0, 0, true, false, 72);
        SystemBarInsetsHelper.InsetsPadding landscapeShown = helper.resolve(
            LANDSCAPE, 0, 64, 0, 48, 80, 0, 0, 0, true, false, 64
        );
        assertEquals(64, landscapeShown.top);
        assertEquals(80, landscapeShown.left);

        SystemBarInsetsHelper.InsetsPadding landscapeHidden = helper.resolve(
            LANDSCAPE, 0, 0, 0, 48, 80, 0, 0, 0, false, false, 64
        );
        assertEquals(64, landscapeHidden.top);

        SystemBarInsetsHelper.InsetsPadding portraitHidden = helper.resolve(
            PORTRAIT, 0, 0, 0, 48, 0, 80, 0, 0, false, false, 72
        );
        assertEquals(100, portraitHidden.top);
    }

    @Test
    public void softKeyboardClearsBottomWithoutShiftingTop() {
        SystemBarInsetsHelper helper = new SystemBarInsetsHelper();

        SystemBarInsetsHelper.InsetsPadding imeOpen = helper.resolve(
            PORTRAIT, 0, 100, 0, 48, 0, 80, 0, 0, false, true, 72
        );
        assertEquals(100, imeOpen.top);
        assertEquals(0, imeOpen.bottom);

        SystemBarInsetsHelper.InsetsPadding imeClosed = helper.resolve(
            PORTRAIT, 0, 0, 0, 48, 0, 80, 0, 0, false, false, 72
        );
        assertEquals(100, imeClosed.top);
        assertEquals(48, imeClosed.bottom);
    }
}
