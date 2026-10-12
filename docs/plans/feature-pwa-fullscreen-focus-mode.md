---
title: "Feature: Browser Fullscreen Focus Mode (desktop)"
type: feature
date: 2026-07-31
status: implemented
area: pwa
---

# Feature: Browser Fullscreen Focus Mode (desktop)

## Summary

Desktop only: a button in the navbar on all pages that calls the browser's Fullscreen API, removing browser chrome (address bar, tabs, OS taskbar) while keeping the app's own navbar and recitation bar always visible.

The mobile/tablet installed-PWA half of this feature — hiding the OS status bar via `display: "fullscreen"` / `statusBarStyle: "black-translucent"` — was **reverted** (#317): Android's immersive mode re-showed the status bar on *any* tap, coupling it to the reader's tap-to-toggle nav. See Revision History.

This replaced the approach from the reverted PR #155, which incorrectly hid the app's own nav and recitation bar instead of using the browser's native fullscreen.

## Root Cause / Approach

PR #155 toggled `NavOverlayContext`'s `overlayVisible` to hide the app's navbar and recitation bar — the mobile tap-to-toggle mechanism. That is the wrong target. Focus mode on desktop removes **browser** chrome via `document.documentElement.requestFullscreen()`, not app chrome; the app's navbar and recitation bar stay visible.

The manifest stays `display: "standalone"` and `appleWebApp.statusBarStyle: "default"` — the OS status bar is always shown in the installed PWA. `viewport-fit: "cover"` and the `env(safe-area-inset-*)` padding on `Nav.tsx` / `Sidebar.tsx` / `NavOverflowMenu.tsx` remain: with the status bar always shown, `env(safe-area-inset-*)` resolves to `0px` (spec: non-zero only when content extends under a system inset), so they are inert no-ops, not bugs.

## Decision Tree / Algorithm

| Platform | Trigger | Mechanism | App nav visible? |
|---|---|---|---|
| Desktop (≥1367px) | Click button in Nav | `requestFullscreen()` / `exitFullscreen()` | Yes — always |
| Mobile/Tablet PWA (installed) | Install | `manifest.display: "standalone"` — OS status bar always shown | Yes |
| Mobile/Tablet browser | — | No change | Yes |

Button visibility:

| Condition | Button |
|---|---|
| Desktop (≥1367px), not fullscreen | `Maximize2` icon |
| Desktop (≥1367px), fullscreen | `Minimize2` icon |
| Mobile or tablet | Hidden |
| `document.fullscreenEnabled === false` | Hidden (API unavailable) |

## Verified Test Cases

1. Desktop clicks `Maximize2` → browser enters fullscreen, button switches to `Minimize2`, navbar and recitation bar remain visible.
2. Desktop presses Esc or clicks `Minimize2` → browser exits fullscreen, button switches back.
3. Desktop opens a non-reader page (marks, plans) → button still present (all pages).
4. Installed Android PWA, any page → status bar always visible, never hides, never toggles on tap.
5. Tap the reader to show/hide the app's own nav/recitation bar (`NavOverlayContext`) → nav and recitation bar toggle as before; the OS status bar does not react.
6. iOS installed PWA → status bar renders opaque/default (not translucent), always visible; content does not draw underneath it.
7. `isStandaloneDisplayMode()`-gated features (back-exit guard toast, cold-launch-to-last-read-page redirect, offline reader fallback) → unchanged (`standalone` was already a recognised display-mode; `isStandaloneDisplayMode()` still accepts both `standalone` and `fullscreen`).

## Files to Change

- `app/hooks/use-is-desktop-up.ts` — **new file**: `(min-width: 1367px)` query, same `useIsomorphicLayoutEffect` pattern as `use-is-tablet.ts`.
- `app/components/nav/Nav.tsx` — fullscreen toggle button (desktop only, all pages); track state via the `fullscreenchange` event; `pt-[env(safe-area-inset-top,0px)]` on `<nav>` for iOS notch safety (now an inert no-op).
- `app/manifest.ts` — `display: "standalone"` (unchanged from baseline).
- `app/layout.tsx` — `appleWebApp.statusBarStyle: "default"` (unchanged from baseline); `viewportFit: "cover"` on the `viewport` export.

## Constraints

- `document.exitFullscreen()` is only callable when `document.fullscreenElement` is non-null; `requestFullscreen()` only when `document.fullscreenEnabled` is true. Guard both.
- The `fullscreenchange` event fires on enter and exit (including Esc). Button state must derive from `document.fullscreenElement`, not local toggle logic, to stay in sync when the user presses Esc.
- `NavOverlayContext` is unchanged. This feature does not touch `overlayVisible`, `isOverlayMode`, or any tap-to-toggle behaviour.
- Do not touch the fullscreen button or any desktop-only logic when working on the mobile/PWA side — they are independent.
- Do not remove `viewport-fit: "cover"` or the `env(safe-area-inset-*)` padding — harmless no-ops now, removing them is unnecessary scope.
- Do not revert or touch the [ADR 0044](../architecture/adr/0044-viewport-units-are-unreliable-in-the-installed-pwa.md) ICB height fix (`.fq-reader-pager-viewport`'s `position: fixed; inset: 0` in `globals.css`) — it is a strictly more robust sizing approach and stays even though its original trigger (the immersive launch transition) no longer occurs.

## What NOT to Do

- Do NOT hide the app's navbar or recitation bar — the wrong approach in PR #155.
- Do NOT use `NavOverlayContext` or extend `isOverlayMode` for this feature; do NOT use `isOverlayMode` as a proxy for "desktop focus is on".
- Do NOT add hover-reveal hotzone divs, `mouseenter`/`mouseleave` handlers, or localStorage persistence.
- Do NOT gate the fullscreen button to `/pages/` only — it appears on all routes on desktop.
- Do NOT set the manifest to `display: "fullscreen"` or iOS `statusBarStyle: "black-translucent"` to hide the OS status bar — Android's non-sticky immersive mode reveals it on any tap (not controllable from a PWA), coupling it to the reader's tap-to-toggle nav (#317).
- Do NOT try to make Android immersive mode "sticky" (edge-swipe-only reveal) via any web API — no such control exists for installed web PWAs.

## Decisions Made

- Fullscreen button visible on all pages (not reader-only) — fullscreen is a browser-level affordance, not route-tied.
- `useIsDesktopUp` hook recreated with the `(min-width: 1367px)` query (the reverted PR #155's hook was correct; only its overlay mechanism was wrong).
- No ADR: the Fullscreen API and safe-area-inset patterns are standard Web APIs with no project-specific encoding contract.
- Mobile/tablet status-bar hiding is abandoned entirely, not worked around in JS — no web API re-hides an installed PWA's status bar after Android reveals it, so the only reliable fix is never entering `fullscreen`/immersive mode.

## Revision History

- 2026-10-10 — Spike Addendum (#766). **PWA parity measured on-device (LAN HTTPS install):** overlay show/hide moves the surah frame `0px` (frame-top 669→669, frame-bottom 1617→1617 at 1080×2392) — matches the native 1px result. System status bar stays hidden until an edge swipe (transient, overlays content, no resize) — the desired UX, not the #317 tap-coupling. **Header-top gap:** in `display: fullscreen` the OS inset is 0 so `env(safe-area-inset-top, 0px)` leaves the nav glued to the top edge (the old "inert no-op" verdict assumed `standalone`, where the always-visible status bar supplies the visual separation). Decision (user-confirmed): keep `fullscreen` + guarantee a `0.75rem` minimum top padding on `.fq-nav-overlay-page` scoped to `(display-mode: fullscreen)` only — `standalone`, browser tabs, and desktop are untouched. The padding is constant across transient-bar show/hide (Chrome delivers no resize and insets stay 0), so it cannot reintroduce a jump; verified on-device by screenshot.
  Correction (same day, user-confirmed): the glued element is the always-visible
  safha strip (juz | surah | hizb, `.fq-safha-header`, `pt-1`), not the `<nav>`
  overlay — the first attempt targeted `.fq-nav-overlay-page` and was reverted
  as wrong-target (it measured no change: `env()` already resolves to the live
  inset there, and a remote-computed-style probe confirmed `0px`). The
  `0.75rem` floor now applies to `.fq-safha-header`, same fullscreen-only
  scope, pure-CSS gate per ADR 0043.

## Experiment B — reserved-slot full-height page (2026-10-10, user-requested)

  Revert point: commit `spike(#766): checkpoint content-sized baseline` (this
  file + `app/globals.css` only). `git revert` / hard-reset to it if B fails.

  Hypothesis: both bars are already overlays (`Nav` fixed top-0 ≤1366px,
  `RecitationPlayerBar` fixed bottom-0) — nothing in flow pushes content. So a
  full-height page with permanently reserved top/bottom slots should toggle
  with zero jump: bars paint into their slots when shown, slots sit empty when
  hidden. Height resolves as `100%` down the ICB-anchored
  `.fq-reader-pager-viewport` chain — no viewport units (ADR 0044), no JS
  measuring (no stale-number class), pure-CSS gate (ADR 0043).

  Scope: compact phones only (the spike's ≤1023px band); tablet/desktop keep
  the validated content-sized layout. PWA first (headless + device), Android
  shell for parity confirm only.

  Slot sizes (spike constants, measured, not derived): top = nav `h-14`
  (3.5rem) + fullscreen strip floor; bottom = recitation bar height (measure
  headless per theme, take max). Known risks carried openly: dead space while
  hidden; frozen constants drift if bar content grows (long reciter name,
  expanded controls) or on rotation — resize/orientation re-verify on device.

  Measured 2026-10-10 (390x844 headless, dark/light/gold identical): nav 56px,
  recitation 90px → slots `4rem` / `6rem` (scale steps + breathing room).
  Small-phone `0.5em` gap floor kept as a minimum under space-between.

  Success: toggle jump ≤2px headless AND on-device, no bar/content overlap on
  any theme, strip/frame back to full-page rhythm. Fail: any of the above, or
  the dead space reads worse than content-sized — then revert to checkpoint,
  no second iteration in this spike.

  Outcome 2026-10-10: Oversized reserved padding (4rem top + 6rem bottom)
  created excessive dead space on-device with bars hidden (user-rejected on sight).
  Replaced by constant-viewport full-height architecture:
  - In Android shell, `MainActivity.java` anchors `topPadding` permanently to
    `Math.max(cut.top, bars.top)`. The WebView height remains 100% constant across
    status-bar toggle. When the status bar is hidden, the top band displays the
    underlying mushaf-paper background seamlessly.
  - In CSS, `.fq-quran-safha` returns to full-height (`flex: 1 1 0%`) with
    `justify-content: space-between` and `gap: 0`, filling the page height
    naturally without dead mid-screen float.
  - In PWA, `display: fullscreen` maintains the safe `0.75rem` top floor on
    `.fq-safha-header`, ensuring Android transient status-bar swipes overlay
    without window resize.
  - Short viewports (`<=700px`) retain reduced padding-block (`0.25em`) to
    comfortably fit all 15 lines without clipping on small devices (e.g. 360x640).

- 2026-08-16 — folded Addendum (#317). **Reverts the "Mobile/Tablet installed PWA" half of this plan:** `manifest.display` `"fullscreen"` → `"standalone"`, iOS `statusBarStyle` `"black-translucent"` → `"default"`. Android's non-sticky immersive mode surfaced the OS status bar on every ordinary tap, coupling it to `ReaderPager`'s `toggleOverlay()` tap handler. Extensive investigation ruled out a font/layout bug; the fix is to stop using `fullscreen` mode. Desktop's `requestFullscreen()` button, `viewport-fit: "cover"`, the safe-area padding (now inert no-ops), and the ADR 0044 ICB height fix are all kept.
