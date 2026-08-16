# Feature: Browser Fullscreen & PWA Status-Bar Focus Mode

**Type:** feature  
**Date:** 2026-07-31  
**Status:** implemented  
**Trello:** #136 https://trello.com/c/wwxdYFNn

## Summary

Two independent focus improvements. Desktop: a button in the navbar on all pages that calls the browser's Fullscreen API, removing browser chrome (address bar, tabs, OS taskbar) while keeping the app's own navbar and recitation bar always visible. Mobile/tablet installed PWA: change the manifest display mode so the OS status bar (clock, wifi, battery) is hidden by default with no user action needed.

This replaces the approach from the reverted PR #155, which incorrectly hid the app's own nav and recitation bar instead of using the browser's native fullscreen.

## Root Cause / Approach

PR #155 toggled `NavOverlayContext`'s `overlayVisible` to hide the app's navbar and recitation bar — the same tap-to-toggle mechanism used on mobile. That is the wrong target. Focus mode on desktop should remove **browser** chrome via `document.documentElement.requestFullscreen()`, not app chrome. The app's navbar and recitation bar must always be visible on desktop.

For mobile/tablet PWA: the manifest currently uses `display: "standalone"`, which preserves the OS status bar. Changing to `"fullscreen"` removes it on Android. For iOS, `appleWebApp.statusBarStyle: "black-translucent"` + `viewport-fit: "cover"` makes the bar transparent/overlapping; safe-area padding on the navbar prevents content being hidden behind the notch.

## Decision Tree / Algorithm

| Platform | Trigger | Mechanism | App nav visible? |
|---|---|---|---|
| Desktop (≥1367px) | Click button in Nav | `requestFullscreen()` / `exitFullscreen()` | Yes — always |
| Mobile/Tablet PWA | Install | `manifest.display: "fullscreen"` (Android) | Yes |
| Mobile/Tablet PWA | Install | `statusBarStyle: "black-translucent"` + `viewport-fit: cover` (iOS) | Yes |
| Mobile/Tablet browser | — | No change | Yes |

Button visibility:
| Condition | Button |
|---|---|
| Desktop (≥1367px), not fullscreen | `Maximize2` icon |
| Desktop (≥1367px), fullscreen | `Minimize2` icon |
| Mobile or tablet | Hidden |
| `document.fullscreenEnabled === false` | Hidden (API unavailable) |

## Verified Test Cases

1. Desktop user clicks Maximize2 → browser enters fullscreen, button switches to Minimize2, navbar and recitation bar remain visible.
2. Desktop user presses Esc or clicks Minimize2 → browser exits fullscreen, button switches back to Maximize2.
3. Desktop user opens a non-reader page (e.g. marks, plans) → button is still present (all pages).
4. Mobile/tablet user opens PWA (installed) → status bar absent; no button shown.
5. Mobile/tablet browser (non-installed) → no change; no button shown.

## Files to Change

- `app/hooks/use-is-desktop-up.ts` — **new file**: `(min-width: 1367px)` query, same `useIsomorphicLayoutEffect` pattern as `use-is-tablet.ts`
- `app/components/nav/Nav.tsx` — add fullscreen toggle button (desktop only, all pages); track state via `fullscreenchange` event; add `pt-[env(safe-area-inset-top)]` to `<nav>` for iOS notch safety
- `app/manifest.ts` — `display: "standalone"` → `"fullscreen"`
- `app/layout.tsx` — `statusBarStyle: "default"` → `"black-translucent"`; add `viewportFit: "cover"` to the `viewport` export

## Constraints

- `viewport-fit: "cover"` extends the viewport into the device notch/safe area. The navbar **must** carry `padding-top: env(safe-area-inset-top, 0px)` (Tailwind arbitrary value: `pt-[env(safe-area-inset-top,0px)]`) or the top of the navbar will be hidden behind the iOS status bar on notched iPhones. No other component currently needs this because the navbar sits at the very top.
- `display: "fullscreen"` in the manifest only affects installed PWA on Android (and some Chromium-based desktop browsers). iOS Safari ignores it and always treats PWA as `standalone`. The `statusBarStyle: "black-translucent"` change handles iOS.
- `document.exitFullscreen()` is only callable when `document.fullscreenElement` is non-null. `requestFullscreen()` is only callable when `document.fullscreenEnabled` is true. Both conditions must be guarded.
- The `fullscreenchange` event fires on both enter and exit (including Esc key). The button state must derive from `document.fullscreenElement`, not from local toggle logic, to stay in sync when the user presses Esc.
- `NavOverlayContext` is unchanged. This feature does not touch `overlayVisible`, `isOverlayMode`, or any tap-to-toggle behavior.

## What NOT to Do

- Do NOT hide the app's navbar or recitation bar — that was the wrong approach in PR #155.
- Do NOT use `NavOverlayContext` or extend `isOverlayMode` for this feature.
- Do NOT add hover-reveal hotzone divs, `mouseenter`/`mouseleave` handlers, or localStorage persistence.
- Do NOT gate the fullscreen button to `/pages/` only — it should appear on all routes on desktop.
- Do NOT use `isOverlayMode` as a proxy for "desktop focus is on" — the two systems are independent.

## Decisions Made

- Fullscreen button visible on all pages (not reader-only), because fullscreen is a browser-level affordance not tied to any single route.
- `useIsDesktopUp` hook needed (same as reverted PR, but that specific hook was correct — only the overlay mechanism was wrong). Recreate it with the same `(min-width: 1367px)` query.
- No ADR: the Fullscreen API and safe-area-inset patterns are standard Web APIs with no project-specific encoding contract or non-obvious invariant.

## Addendum — 2026-08-16: revert mobile/tablet status-bar hiding (#317)

**Status:** implemented

### Root Cause

Installed PWA `display: "fullscreen"` puts Android in immersive mode, which reveals the OS status bar on **any tap**, not only on an edge swipe — non-sticky immersive, not sticky immersive, and this isn't controllable from the web platform. `ReaderPager.tsx`'s tap-to-toggle handler (`toggleOverlay()`, used to show/hide the app's own nav and recitation bar) is an ordinary tap on the reader surface, so every tap that shows the app nav also surfaces the OS status bar as an uncontrollable side effect, then hides it again on the next tap/timeout. Confirmed on-device via screen recording: the status bar and the app nav/recitation bar toggle together on tap, exactly as designed for the nav, but the status-bar half of that coupling was never wanted. (The Quran text itself was verified pixel-identical between states — no font-size regression; this addendum is about the status-bar visibility toggle itself, not a sizing bug.)

This was underneath the original report that "the status bar toggling affects the reader" — extensive investigation (CSS font-size formula audit, live viewport-resize test, on-device recording frame comparison) ruled out an actual font/layout bug. The real issue is that `fullscreen` mode's immersive behavior — status bar reappearing on ordinary taps — was never the intended UX; the original goal ([this plan](feature-pwa-fullscreen-focus-mode.md)'s "Mobile/Tablet PWA" row) was simply "status bar hidden by default," not "status bar flickers with every tap."

### Approach

Revert the "Mobile/Tablet installed PWA" half of this plan only. Desktop's `requestFullscreen()` button is untouched — it has no OS status bar and no immersive-mode coupling.

| File | Before | After |
|---|---|---|
| `app/manifest.ts` | `display: "fullscreen"` | `display: "standalone"` |
| `app/layout.tsx` | `appleWebApp.statusBarStyle: "black-translucent"` | `appleWebApp.statusBarStyle: "default"` |

`viewport-fit: "cover"` and the `env(safe-area-inset-*)` padding in `Nav.tsx`, `Sidebar.tsx`, and `NavOverflowMenu.tsx` are left as-is: with the status bar always shown, `env(safe-area-inset-*)` resolves to `0px` (spec-defined — non-zero only when content actually extends under a system inset), so this padding becomes an inert no-op rather than a bug. Removing it isn't necessary and only adds unrelated diff.

`isStandaloneDisplayMode()` (`app/utils/platform.ts`) already checks for **both** `standalone` and `fullscreen` display-mode — see `docs/architecture/DECISIONS.md`'s "App Launch & Back Navigation" section. Every feature gated on it (back-exit guard, launch redirect, offline nav, the Settings first-run gate) keeps working unchanged after this revert, since `standalone` was already one of the two accepted states.

[ADR 0044](../architecture/adr/0044-viewport-units-are-unreliable-in-the-installed-pwa.md)'s ICB-anchored height fix (`position: fixed; inset: 0` instead of `100dvh`) is **kept**, not reverted — it was a real fix for a real race during the fullscreen launch transition, and it's a strictly more robust sizing approach that costs nothing to keep even though its original trigger (the immersive transition) no longer occurs. No code change needed there.

### Verified Test Cases

1. Installed Android PWA, any page → status bar always visible, never hides, never toggles on tap.
2. Tap the reader to show/hide the app's own nav/recitation bar (`NavOverlayContext`) → nav and recitation bar still toggle exactly as before; status bar no longer reacts to this tap at all.
3. iOS installed PWA → status bar renders opaque/default (not translucent), always visible, content does not draw underneath it.
4. Desktop → fullscreen button behavior fully unchanged (browser-level `requestFullscreen()`, untouched by this addendum).
5. `isStandaloneDisplayMode()`-gated features (back-exit guard toast, cold-launch-to-last-read-page redirect, offline reader fallback) → unchanged, since `standalone` was already a recognized display-mode.

### Files to Change

- `app/manifest.ts` — `display: "fullscreen"` → `"standalone"`
- `app/layout.tsx` — `appleWebApp.statusBarStyle: "black-translucent"` → `"default"`

### Constraints

- Do not touch `app/components/nav/Nav.tsx`'s fullscreen button or any desktop-only logic — unaffected by this addendum.
- Do not remove `viewport-fit: "cover"` or the `env(safe-area-inset-*)` padding — harmless no-ops now, and removing them is unnecessary scope.
- Do not revert or touch the ADR 0044 ICB height fix (`.fq-reader-pager-viewport`'s `position: fixed; inset: 0` in `globals.css`) — it stays, for the reason above.

### What NOT to Do

- Do NOT try to make Android's immersive mode "sticky" (edge-swipe-only reveal) via any web API — not controllable from a PWA manifest or web platform code; this is exactly why the fix is to stop using `fullscreen` mode at all rather than to fight its behavior.
- Do NOT reopen `NavOverlayContext`/`overlayVisible` — the app-nav tap-to-toggle behavior is correct and unrelated; only the OS status bar's coupling to it is the problem, and reverting `display: "fullscreen"` removes that coupling at the source.

### Decisions Made

- Full revert of Android `display` and iOS `statusBarStyle`, not a partial/JS-based workaround (e.g. re-hiding the status bar via `immersive` flags after each reveal) — no such API exists for installed web PWAs, so the only reliable fix is not entering fullscreen/immersive mode in the first place.
- `viewport-fit: "cover"` and safe-area padding kept rather than cleaned up, to keep this a minimal, low-risk two-line revert.
