// Single shared source of truth for platform/display-mode checks — every
// offline surface, the app-launch redirect, and the Android back-exit guard
// must import from here rather than re-deriving detection independently (see
// DECISIONS.md, "PWA & Offline Quran Page Caching").
import type { MouseEvent } from "react";

export const isStandaloneDisplayMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // The manifest's `display` is "fullscreen" (status-bar hiding, see
  // feature-pwa-fullscreen-focus-mode.md) — platforms that honor it report
  // this mode instead of "standalone", so both must be checked (ADR 0014
  // Addendum 3).
  window.matchMedia("(display-mode: fullscreen)").matches ||
  // iOS Safari has no `display-mode: standalone` media query support.
  (navigator as unknown as { standalone?: boolean }).standalone === true ||
  // Capacitor native shell (ADR 0072): the hosted shell runs the same app at
  // HTTPS inside a WebView, where no display-mode query ever matches — treat
  // the shell as standalone so every PWA-gated surface (first-run gate,
  // precache, downloads, back guards, guest marking) stays reachable there.
  isNativePlatform();

// Capacitor native-shell detection (ADR 0072, plan mobile-app-capacitor).
// Duck-typed on purpose: the web build carries no @capacitor/core dependency,
// and the bridge object only exists inside the shell's WebView.
export const isNativePlatform = () =>
  typeof window !== "undefined" &&
  (
    window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    }
  ).Capacitor?.isNativePlatform?.() === true;

// Used to scope the back-exit guard to Android — iOS has no back
// button/gesture to trap, and `window.close()` has no effect there (ADR 0040).
export const isAndroid = () => /Android/i.test(navigator.userAgent);

// SPIKE (#766): status-bar toggle for the Capacitor shell's reader focus mode.
// Calls the hand-rolled StatusBarToggle plugin through the injected bridge
// (no `@capacitor/core` dependency — same duck-typed pattern as
// `isNativePlatform` above; `toNative` with a null callback is safe, the
// bridge guards it). No-ops everywhere else (plain tabs, PWA, iOS) and on any
// bridge failure, so a missing/unreachable bridge can never break the reader:
// the bar simply stays shown, which is today's behavior.
export const setStatusBarVisible = (visible: boolean): void => {
  if (typeof window === "undefined" || !isNativePlatform()) return;
  const bridge = (
    window as unknown as {
      Capacitor?: {
        toNative?: (
          plugin: string,
          method: string,
          options: object,
          callback: null,
        ) => unknown;
      };
    }
  ).Capacitor;
  try {
    bridge?.toNative?.("StatusBarToggle", visible ? "show" : "hide", {}, null);
  } catch {
    // Native call failed — reader keeps working with the bar shown.
  }
};

// Offline route coverage (ADR 0014 Addendum 10, #591): in-app taps are RSC
// soft-navs, which fail for a never-visited page with no connection. When
// offline, prevent the soft nav and hard-navigate so the service worker serves
// the precached shell instead of error.tsx + a Sentry report. Returns true
// when it took over (the caller runs its online-only cleanup otherwise).
// Grant links must never pass through here — they stay online-only soft nav.
export const hardNavigateIfOffline = (
  e: MouseEvent<Element>,
  href: string,
): boolean => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    e.preventDefault();
    window.location.assign(href);
    return true;
  }
  return false;
};
