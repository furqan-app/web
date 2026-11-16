package app.furqan;

import java.util.HashMap;
import java.util.Map;

/**
 * Pure padding resolver for {@link MainActivity}'s window-insets listener.
 * Keeps top padding invariant across status-bar show/hide toggles (using
 * ignoring-visibility insets plus a per-orientation cache for pre-API 30) so
 * WebView height never changes when toggling focus mode (#800).
 */
final class SystemBarInsetsHelper {

    static final class InsetsPadding {
        final int left;
        final int top;
        final int right;
        final int bottom;

        InsetsPadding(int left, int top, int right, int bottom) {
            this.left = left;
            this.top = top;
            this.right = right;
            this.bottom = bottom;
        }
    }

    private final Map<Integer, Integer> cachedTopByOrientation = new HashMap<>();

    InsetsPadding resolve(
        int orientation,
        int stableLeft,
        int stableTop,
        int stableRight,
        int stableBottom,
        int cutLeft,
        int cutTop,
        int cutRight,
        int cutBottom,
        boolean statusBarVisible,
        boolean keyboardVisible,
        int fallbackStatusBarTop
    ) {
        if (stableTop > 0) {
            cachedTopByOrientation.put(orientation, stableTop);
        }

        final int resolvedTop;
        if (stableTop > 0 || statusBarVisible) {
            resolvedTop = Math.max(0, stableTop);
        } else {
            Integer cached = cachedTopByOrientation.get(orientation);
            resolvedTop = (cached != null && cached > 0)
                ? cached
                : Math.max(0, fallbackStatusBarTop);
        }

        int top = Math.max(cutTop, resolvedTop);
        int bottom = keyboardVisible ? 0 : Math.max(stableBottom, cutBottom);
        int left = Math.max(stableLeft, cutLeft);
        int right = Math.max(stableRight, cutRight);
        return new InsetsPadding(left, top, right, bottom);
    }
}
