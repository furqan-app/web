import { isOverlayBackGuardArmed } from "@/app/utils/overlay-back-guard";
import { isNativePlatform, isAndroid } from "@/app/utils/platform";

/**
 * Exit the native app via Capacitor's App plugin.
 * Safe to call anywhere; no-op outside native Android.
 */
export async function exitNativeApp(): Promise<void> {
  if (typeof window === "undefined" || !isNativePlatform() || !isAndroid()) {
    return;
  }
  try {
    const { App } = await import("@capacitor/app");
    await App.exitApp();
  } catch {
    // Best-effort exit: swallow bridge failures or unhandled rejections
  }
}

/**
 * Delegator for the native hardware/gesture back button event in Capacitor Android.
 *
 * 1. If an overlay back guard is currently armed (e.g. MarkModal, Sidebar, SettingsSidebar,
 *    RecitationSettingsSheet, TafsirSheet), call window.history.back() so useCloseOnBackGesture
 *    intercepts and closes the top overlay without navigating the underlying page.
 * 2. If canGoBack is true (or outside reader with history), call window.history.back().
 *    - In the reader, this pops AndroidBackExitGuard's guard entry, firing its onPopState
 *      handler to show the exit toast on first press, or call exitNativeApp() on second press.
 *    - Outside the reader, this traverses back through standard web history.
 * 3. If at the history root outside the reader (canGoBack is false), call exitNativeApp() directly.
 */
export function handleNativeBackButton(canGoBack: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  if (isOverlayBackGuardArmed() || canGoBack) {
    window.history.back();
    return;
  }

  void exitNativeApp();
}
