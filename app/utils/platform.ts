// Single shared source of truth for platform/display-mode checks — every
// offline surface, the app-launch redirect, and the Android back-exit guard
// must import from here rather than re-deriving detection independently (see
// DECISIONS.md, "PWA & Offline Quran Page Caching").
export const isStandaloneDisplayMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // The manifest's `display` is "fullscreen" (status-bar hiding, see
  // feature-pwa-fullscreen-focus-mode.md) — platforms that honor it report
  // this mode instead of "standalone", so both must be checked (ADR 0014
  // Addendum 3).
  window.matchMedia("(display-mode: fullscreen)").matches ||
  // iOS Safari has no `display-mode: standalone` media query support.
  (navigator as unknown as { standalone?: boolean }).standalone === true;

// Used to scope the back-exit guard to Android — iOS has no back
// button/gesture to trap, and `window.close()` has no effect there (ADR 0040).
export const isAndroid = () => /Android/i.test(navigator.userAgent);
