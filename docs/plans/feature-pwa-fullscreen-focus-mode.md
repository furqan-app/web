---
title: "Feature: Browser Fullscreen Focus Mode (desktop)"
type: feature
date: 2026-07-31
status: implemented
area: pwa
issue: 800
---

# Feature: Browser Fullscreen Focus Mode (desktop)

## Summary

Desktop (≥1367px): a button in the navbar on all pages calls the browser's Fullscreen API, removing browser chrome (address bar, tabs, OS taskbar) while keeping the app's own navbar and recitation bar always visible.

Mobile/tablet installed PWA (`app/manifest.ts`): uses `display: "fullscreen"` with `@media (display-mode: fullscreen)` top-clearance floors on `.fq-safha-header` (`0.75rem`) and `.fq-search-sheet-header` (`1rem`), plus `env(safe-area-inset-*)` on `Nav.tsx`, `Sidebar.tsx`, `SettingsSidebar.tsx`, `SearchBar.tsx`, and `components/ui/sheet.tsx`.

Android Capacitor shell: `StatusBarTogglePlugin` toggles the system status bar in sync with the reader's `NavOverlayContext`, while `MainActivity.java` + `SystemBarInsetsHelper.java` keep WebView height invariant (`0px` Mushaf shift) across status-bar toggles and consume `systemBars`/`displayCutout` as `Insets.NONE` so CSS `env(safe-area-inset-*)` stays `0px`.

## Root Cause / Approach

1. **Desktop Focus Mode:** Focus mode on desktop removes **browser** chrome via `document.documentElement.requestFullscreen()`, not app chrome; the app's navbar and recitation bar stay visible (replaced the reverted PR #155 approach).
2. **Android Capacitor Shell (#766, #800):** `MainActivity.java` previously read `windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())` instead of `getInsetsIgnoringVisibility(...)`, so hiding the status bar in `StatusBarTogglePlugin` dropped `bars.top` to `0` and collapsed `topPadding` to `cut.top`, resizing the WebView and shifting all 15 lines of `.fq-quran-safha` (`justify-content: space-between`). It also lacked `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)` and `layoutInDisplayCutoutMode` (`ALWAYS` on API 30+, `SHORT_EDGES` on API 28–29), allowing Android 9–14 to letterbox/resize the window when hiding the status bar. Delegating to `SystemBarInsetsHelper` with `getInsetsIgnoringVisibility(Type.systemBars())` plus a per-orientation cache and `status_bar_height` fallback for pre-API 30 keeps `topPadding` 100% constant across toggles.
3. **PWA Fullscreen Search Sheet (#800):** In `display: "fullscreen"`, Android Chrome reports `env(safe-area-inset-top) = 0px` with no OS status bar above the viewport. `SettingsSidebar` and `RecitationSettingsSheet` already clear the top edge (`pt-[max(1.25rem,calc(0.75rem+env(safe-area-inset-top,0px)))]`), and `.fq-safha-header` already carries a `0.75rem` `@media (display-mode: fullscreen)` floor. `SearchBar.tsx` rendered a fixed-`h-14` input row directly at `top: 0` with `p-0`, gluing the search input to the top bezel. Wrapping the `h-14` row in `.fq-search-sheet-header` with `pt-[env(safe-area-inset-top,0px)]` and a `1rem` `@media (display-mode: fullscreen)` floor in `app/globals.css` gives `SearchBar` matching top clearance in fullscreen PWA while remaining `0px` in Android Capacitor, desktop, and standard tabs.

## Decision Tree / Algorithm

Platform behavior:

| Platform | Trigger | Mechanism | App nav visible? |
|---|---|---|---|
| Desktop (≥1367px) | Click button in Nav | `requestFullscreen()` / `exitFullscreen()` | Yes — always |
| Mobile/Tablet PWA (installed) | Install | `manifest.display: "fullscreen"` + `@media (display-mode: fullscreen)` top floors on `.fq-safha-header` / `.fq-search-sheet-header` | Tap-toggles on reader |
| Android Capacitor shell | Reader tap (`overlayVisible`) | `StatusBarTogglePlugin` toggles status bar; `MainActivity` + `SystemBarInsetsHelper` lock `topPadding` constant | Tap-toggles on reader |
| Mobile/Tablet browser | — | Standard browser viewport | Tap-toggles on reader |

Desktop button visibility:

| Condition | Button |
|---|---|
| Desktop (≥1367px), not fullscreen | `Maximize2` icon |
| Desktop (≥1367px), fullscreen | `Minimize2` icon |
| Mobile or tablet | Hidden |
| `document.fullscreenEnabled === false` | Hidden (API unavailable) |

Android shell `SystemBarInsetsHelper.resolve(...)` top/bottom padding:

| Condition | `resolvedTop` | `topPadding` | `bottomPadding` |
|---|---|---|---|
| `statusBarVisible == true` | `stableTop` (caches per `orientation` if `> 0`) | `Math.max(cutTop, resolvedTop)` | `keyboardVisible ? 0 : Math.max(stableBottom, cutBottom)` |
| `statusBarVisible == false` & `stableTop > 0` (API 30+ `getInsetsIgnoringVisibility`) | `stableTop` (updates cache) | `Math.max(cutTop, resolvedTop)` | `keyboardVisible ? 0 : Math.max(stableBottom, cutBottom)` |
| `statusBarVisible == false` & `stableTop == 0` (API 24–29 fallback) | `cachedTop[orientation] > 0 ? cachedTop[orientation] : fallbackStatusBarTop` | `Math.max(cutTop, resolvedTop)` | `keyboardVisible ? 0 : Math.max(stableBottom, cutBottom)` |

## Verified Test Cases

1. Desktop clicks `Maximize2` → browser enters fullscreen, button switches to `Minimize2`, navbar and recitation bar remain visible.
2. Desktop presses Esc or clicks `Minimize2` → browser exits fullscreen, button switches back.
3. Desktop opens a non-reader page (marks, plans) → button still present (all pages).
4. Android Capacitor shell (`SystemBarInsetsHelperTest` — 5 JUnit cases):
   - Portrait with cutout (`cutTop=80, stableTop=100`): toggling `statusBarVisible` keeps `top=100` on both API 30+ and API 24–29.
   - Portrait without cutout (`cutTop=0, stableTop=72`): toggling `statusBarVisible` keeps `top=72` (`0px` delta).
   - Cold launch hidden on API 24–29 (`stableTop=0`, empty cache, `fallbackStatusBarTop=72`): resolves `top=72`, matching subsequent `statusBarVisible=true`.
   - Orientation change portrait ↔ landscape: per-orientation cache isolates portrait (`100`) and landscape (`64`).
   - Soft keyboard open/close: `bottom` switches `48 → 0 → 48` while `top` stays invariant (`100`).
5. PWA Search sheet (`SearchBar.test.tsx`): `.fq-search-sheet-header` wraps the `h-14` input row with `pt-[env(safe-area-inset-top,0px)]`, footer carries `pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]`, and `@media (display-mode: fullscreen)` adds `1rem` top floor without affecting Android Capacitor or desktop.
6. `isStandaloneDisplayMode()` (`app/utils/platform.test.ts` — 14 cases): recognizes `standalone`, `fullscreen`, iOS `navigator.standalone`, and Capacitor `isNativePlatform()`.

## Files to Change

- `app/hooks/use-is-desktop-up.ts` — `(min-width: 1367px)` query, `useIsomorphicLayoutEffect` pattern.
- `app/components/nav/Nav.tsx` — desktop fullscreen toggle button via `fullscreenchange`; `pt-[env(safe-area-inset-top,0px)]` on `<nav>`.
- `app/manifest.ts` — `display: "fullscreen"` (restored in #766, kept in #800).
- `app/layout.tsx` — `appleWebApp.statusBarStyle: "default"`; `viewportFit: "cover"`; `interactiveWidget: "resizes-content"`.
- `app/components/reader/ReaderPager.tsx` & `app/utils/platform.ts` — `setStatusBarVisible(overlayVisible)` bridge to `StatusBarTogglePlugin`.
- `android/app/src/main/java/app/furqan/StatusBarTogglePlugin.java` — native sticky status-bar hide/show + mushaf-paper theme color sync.
- `android/app/src/main/java/app/furqan/SystemBarInsetsHelper.java` — pure orientation-aware inset padding resolver + per-orientation status-bar height cache (#800).
- `android/app/src/main/java/app/furqan/MainActivity.java` — enable `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)`, set `layoutInDisplayCutoutMode` (`ALWAYS` on R+, `SHORT_EDGES` on P–Q), read `getInsetsIgnoringVisibility(WindowInsetsCompat.Type.systemBars())`, and delegate padding math to `SystemBarInsetsHelper` (#800).
- `android/app/src/test/java/app/furqan/SystemBarInsetsHelperTest.java` — JUnit unit tests covering all 5 Android inset cases (#800).
- `app/components/search/SearchBar.tsx` — wrap the `h-14` input row in `.fq-search-sheet-header` with `pt-[env(safe-area-inset-top,0px)]`, and add `pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]` to the results footer (#800).
- `app/components/search/SearchBar.test.tsx` — Vitest test asserting the wrapped `h-14` header and safe-area top/bottom classes (#800).
- `app/globals.css` — full-height compact `.fq-quran-safha` rules + `@media (display-mode: fullscreen)` top floors for `.fq-safha-header` (`0.75rem`) and `.fq-search-sheet-header` (`1rem`).
- `docs/architecture/decisions/pwa.md` — document `getInsetsIgnoringVisibility`, `setDecorFitsSystemWindows`, `layoutInDisplayCutoutMode`, orientation-cache invariant, and Fullscreen PWA Top-Clearance Floor (#800).

## Constraints

- `document.exitFullscreen()` is only callable when `document.fullscreenElement` is non-null; `requestFullscreen()` only when `document.fullscreenEnabled` is true. Guard both.
- The `fullscreenchange` event fires on enter and exit (including Esc). Button state must derive from `document.fullscreenElement`, not local toggle logic, to stay in sync when the user presses Esc.
- `NavOverlayContext` stays unchanged for desktop fullscreen — desktop fullscreen does not touch `overlayVisible`, `isOverlayMode`, or tap-to-toggle behaviour.
- Do not touch the desktop fullscreen button when working on mobile/PWA — they are independent.
- Do not remove `viewport-fit: "cover"` or `env(safe-area-inset-*)` padding.
- Do not revert or touch the [ADR 0044](../architecture/adr/0044-viewport-units-are-unreliable-in-the-installed-pwa.md) ICB height fix (`.fq-reader-pager-viewport`'s `position: fixed; inset: 0` in `globals.css`).
- Android Capacitor WebView must continue receiving `Insets.NONE` for `systemBars` and `displayCutout` so CSS `env(safe-area-inset-*)` stays `0px` (no double padding).
- `SearchBar` top clearance beyond `env(safe-area-inset-top, 0px)` must stay strictly scoped to `@media (display-mode: fullscreen)` so Android Capacitor, desktop, and standard browser tabs stay untouched.
- `SearchBar`'s inner `h-14` input row stays inside `.fq-search-sheet-header` (padding on the outer wrapper, never on the fixed-height `h-14` row) and keeps the single `.fq-scroll-nice` results container (`fix-search-sheet-keyboard-geometry.md`).

## What NOT to Do

- Do NOT hide the app's navbar or recitation bar on desktop — the wrong approach in PR #155.
- Do NOT use `NavOverlayContext` or extend `isOverlayMode` for desktop focus mode; do NOT use `isOverlayMode` as a proxy for "desktop focus is on".
- Do NOT add hover-reveal hotzone divs, `mouseenter`/`mouseleave` handlers, or localStorage persistence for desktop fullscreen.
- Do NOT gate the desktop fullscreen button to `/pages/` only — it appears on all routes on desktop.
- Do NOT use bare `windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())` for `MainActivity.java` padding — `bars.top` drops to `0` when the status bar hides. Always use `getInsetsIgnoringVisibility` plus the pre-API 30 per-orientation cache.
- Do NOT set `appleWebApp.statusBarStyle` to `"black-translucent"` on iOS PWA.
- Do NOT try to make Android PWA immersive mode toggle from JS via manifest changes unless explicitly revisiting `display: "standalone"` + Web Fullscreen API with user-gesture constraints.

## Decisions Made

- Desktop fullscreen button visible on all pages (not reader-only) — fullscreen is a browser-level affordance, not route-tied.
- `useIsDesktopUp` hook uses `(min-width: 1367px)`.
- Confirmed no existing unit/e2e test asserts `MainActivity.java` inset listener implementation (`app/utils/platform.test.ts` mocks `Capacitor.toNative` for `StatusBarToggle`), and existing search e2e specs query dialog/input/links by role and placeholder, unaffected by wrapping the input row.
- Confirmed `SettingsSidebar` (`pt-[max(1.25rem,calc(0.75rem+env(safe-area-inset-top,0px)))]` + `SheetPrimitive.Close` `top-[max(1rem,calc(0.5rem+env(safe-area-inset-top,0px)))]`) already clears the top edge in both PWA and Android Capacitor.
- Confirmed `StatusBarTogglePlugin.java` and `ReaderPager.tsx` require no changes for #800: `StatusBarTogglePlugin` still calls `root.requestApplyInsets()`, which now computes the exact same `topPadding` via `SystemBarInsetsHelper`.

## Revision History

- 2026-08-16 — Folded #317 Addendum. Reverted PWA `manifest.display` from `"fullscreen"` to `"standalone"` and `appleWebApp.statusBarStyle` from `"black-translucent"` to `"default"` because Android's non-sticky immersive mode surfaced the status bar on every tap.
- 2026-10-10 — Folded #766 Spike & Experiment B. **Supersedes #317's `"standalone"` manifest requirement:** restored `app/manifest.ts` to `display: "fullscreen"` (kept on-device with `0px` jump), added `.fq-safha-header` `0.75rem` `@media (display-mode: fullscreen)` top floor, rejected oversized reserved top/bottom slots (4rem/6rem dead space), restored full-height `space-between` `.fq-quran-safha`, and added Capacitor `StatusBarTogglePlugin`.
- 2026-11-16 — Folded #800 Addendum. **Supersedes #766's `getInsets(Type.systemBars())` assumption in `MainActivity.java`:** switched to `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)`, `layoutInDisplayCutoutMode` (`ALWAYS`/`SHORT_EDGES`), `getInsetsIgnoringVisibility(Type.systemBars())`, and `SystemBarInsetsHelper`'s per-orientation cache so toggling the status bar changes WebView height by `0px`; kept PWA `display: "fullscreen"` unchanged per owner confirmation and fixed `SearchBar` top bezel collision via `.fq-search-sheet-header` + `1rem` `@media (display-mode: fullscreen)` top floor.
