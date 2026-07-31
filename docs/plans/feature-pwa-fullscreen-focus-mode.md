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
