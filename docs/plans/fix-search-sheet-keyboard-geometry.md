---
title: Fix search sheet blank space with soft keyboard in the native shell
type: bug
date: 2026-09-27
status: implemented
area: search
---

# Fix search sheet blank space with soft keyboard in the native shell

## Summary

In the Capacitor Android shell (Play build, verified on the 1.9.4 AAB), opening the search overlay and focusing the input shows a large blank area consuming real layout space instead of the result rows; closing the keyboard restores the normal layout. The standalone PWA on the same class of device is unaffected, and search data itself is healthy (the "view all N results" footer renders its count). The cause class is keyboard/viewport geometry: the top-anchored sheet was sized with a full-screen viewport unit, while the native shell lacked `adjustResize` window soft input mode and web viewport interactive-widget synchronization. The fix re-anchors the sheet to the initial containing block with a single scroll container, configures `android:windowSoftInputMode="adjustResize"` on `MainActivity`, sets `interactiveWidget: "resizes-content"` on the web viewport, and adjusts native insets padding to prevent double-shrink blank areas.

## Root Cause / Approach

Traced on `origin/main` (verified 2026-09-27 and 2026-10-08):

- `SearchBar` renders a Radix `Sheet`, `side="top"`, with `h-screen` (`100vh`) and nested scrollers: the base `SheetContent` variant carries `overflow-y-auto` and the sheet body adds its own `flex-1 overflow-y-auto` container.
- `android/app/src/main/AndroidManifest.xml` previously set no `windowSoftInputMode`, defaulting to `adjustUnspecified` where the OS suppressed `WindowInsetsCompat.Type.ime()` dispatches. The insets listener in `MainActivity.java` received `ime.bottom = 0`, leaving the virtual keyboard as an unaccommodated floating overlay across the lower half of the screen across all input surfaces (`SearchBar`, `AyahPicker` / `Sidebar`, `HomeSearch`).
- Viewport metadata (`app/layout.tsx`) set only `themeColor` + `viewportFit: cover` with no `interactive-widget` mode — Chrome PWA handled viewport resizing differently than the embedded Android WebView.
- Full-viewport heights must anchor to the initial containing block, never to viewport units (`decisions/reader.md`, ADR 0044), and a `SheetContent` that overrides positioning must not leave a viewport-unit height to compute on its own (`decisions/nav.md`, sheet `top`/`h-full` sizing).
- When `adjustResize` is configured, Android already resizes the window when the soft keyboard appears. Adding `ime.bottom` view padding on top of an already resized window shrinks the WebView twice, leaving a giant empty padding area between content and the keyboard. When the keyboard is visible, `bottomPadding` must be `0` (relying on window resizing) and restore to `systemBars.bottom` when dismissed.

Approach: apply the sanctioned ICB pattern to the search sheet (top + bottom anchoring, `height: auto`, one scroll container), configure native `windowSoftInputMode="adjustResize"`, add `interactiveWidget: "resizes-content"` to the viewport metadata, and zero out `bottomPadding` in `MainActivity.java` when the keyboard is visible.

## Decision Tree / Algorithm

The exact on-device geometry was verified on physical hardware behind the device gate:

1. **Web CSS ICB Anchoring:** In `SearchBar.tsx`, drop `h-screen`; anchor `top-0 bottom-0` with `height: auto` (`decisions/nav.md` sheet rule) and collapse the two nested `overflow-y-auto` regions into a single scroll container (input row + footer `shrink-0`).
2. **Native Window Mode:** In `AndroidManifest.xml`, configure `android:windowSoftInputMode="adjustResize"` on `MainActivity`.
3. **Viewport Resizing:** In `app/layout.tsx`, add `interactiveWidget: "resizes-content"` to `viewport` so Chromium WebView resizes the CSS layout viewport and ICB for fixed dialogs.
4. **Insets Synchronization:** In `MainActivity.java`, check `windowInsets.isVisible(WindowInsetsCompat.Type.ime())`. When the soft keyboard is visible, set `bottomPadding = 0` (relying on the window resize) instead of `ime.bottom` (preventing double-shrink blank areas). When dismissed, restore `bottomPadding = systemBars.bottom`.

## Verified Test Cases

Live walkthrough verified on physical device (vivo, Android 15 family) and CDP inspection:

1. **Search Overlay:** Home & Reader -> open search -> keyboard opens -> typed query ("البقرة") shows tappable surah/verse rows and "view all" footer above the keyboard, no blank space.
2. **Sidebar Search:** Reader -> open sidebar drawer -> tap search input -> keyboard opens -> surah list adjusts and scrolls smoothly above keyboard without overlap or clipping.
3. **Homepage Search:** Homepage -> tap search input -> keyboard opens -> typed query ("الكهف") filters rows cleanly above keyboard.
4. **Keyboard Dismissal:** Close keyboard on any screen -> padding smoothly restores to system navigation bar height (`systemBars.bottom`).
5. **Back Gesture:** Pressing system back with keyboard active dismisses keyboard first without closing active overlay or exiting reader (`close-overlays-on-back-swipe.md` behavior preserved).
6. **Web & PWA Regression:** Web and standalone Chrome PWA remain completely unaffected (zero negative interactions).

## Files to Change

- `app/components/search/SearchBar.tsx` — replace the sheet's `h-screen` with ICB anchoring (`top-0 bottom-0`, `height: auto` neutralizing the unit, per `decisions/nav.md`) and collapse the nested `overflow-y-auto` pair into one scroll container; input row and footer stay `shrink-0`.
- `android/app/src/main/AndroidManifest.xml` — set `android:windowSoftInputMode="adjustResize"` on `MainActivity`.
- `android/app/src/main/java/app/furqan/MainActivity.java` — calculate `bottomPadding = keyboardVisible ? 0 : systemBars.bottom`.
- `app/layout.tsx` — add `interactiveWidget: "resizes-content"` to `viewport`.
- `docs/architecture/decisions/pwa.md` — record `windowSoftInputMode="adjustResize"`, `interactiveWidget`, and insets handling invariants in the Mobile App Packaging section.

## Constraints

- ICB anchoring for full-viewport heights, never viewport units (`decisions/reader.md`, ADR 0044) — the core of this fix, not a style preference.
- Sheet sizing rule: any `top`/`bottom` override must neutralize the unit height in the same style (`height: auto`, `top` + `bottom` size the box — `decisions/nav.md`); do not reintroduce `calc(100dvh - …)` (forbidden there: goes stale across installed-shell transitions).
- Keep overlays at or below the Radix `z-50` ceiling (`decisions/pwa.md`); the current `!z-[52]` pair is out of scope unless the device shows a stacking defect — do not "fix" it opportunistically.
- Search payload invariants stay: `take: 10` overlay cap, 2-char gate via `isSearchQueryValid`, deterministic ordering (`decisions/search.md`).
- Styling standards: semantic tokens only, `start`/`end` logical properties, existing sheet enter/exit transitions within the Motion durations; no JS animation dependency.
- Display-mode/back-guard helpers stay single-sourced (`app/utils/platform.ts`, `useCloseOnBackGesture`); no re-derivation.
- Fix lands from updated `origin/main` in an isolated worktree (`../furqan-<slug>`); the investigation checkout is a stale branch and must not be the implement base.

## What NOT to Do

- No changes to the search data path (`useSearch`, `/api/search/*`, offline index, normalization) — proven healthy by the rendering footer count.
- No `z-index` changes (overlay, content, nav) — the owner confirmed layout consumption, not a stacking defect.
- No `@capacitor/keyboard` plugin or resize-listener JS as the first resort — a native dependency needs its own design; the CSS anchoring + manifest attribute + viewport meta cover the observed branches.
- No fixed-pixel sheet heights and no `100dvh`/`100svh` replacements for `h-screen` — same stale-unit family, same bug.
- No Playwright soft-keyboard spec — unrunnable in CI; physical device gates are the coverage, stated explicitly so a later sweep does not file it as a gap.
- No keystore/secret handling of any kind — release signing is unrelated to this fix.
- No touching `[...nextauth]`, middleware matcher, `globPublicPatterns`, or precache sets.

## Decisions Made

- New focused bug plan, not an addendum: no active plan covers search-sheet keyboard geometry. `search-results-page.md` / `fix-search-debounce-lag.md` / `search-foundation.md` are data/paging concerns; `close-overlays-on-back-swipe.md` is back-gesture dismissal (its `useCloseOnBackGesture` wiring is preserved, not modified); `mobile-app-capacitor.md` is the shell-delivery umbrella with no sheet-geometry content.
- No new ADR: the fix applies two standing decisions (reader ICB anchoring, nav sheet sizing) to a new surface; the device-observed outcome gets a paragraph in `decisions/search.md`/`pwa.md`, not a new architectural rule.
- Sweep (3b, 2026-09-27): no e2e asserts soft-keyboard geometry (soft-keyboard terms appear in no search spec; `keyboard.*` hits are Escape/shortcut/arrow keys only) — nothing invalidated. No new `GET /api/*` (no SW `NetworkOnly` concern). No `useSession()`/`navigator.onLine` derivation. "Overlay trigger unchanged" verified by reading `SearchBar.tsx` on `origin/main`.
- Repro baseline established during planning: local `app-release (2)` AAB parses to `versionName 1.9.0` (binary-manifest string-pool read), Sept-25 file to `1.9.3`; a fresh CI dispatch (`Android release bundle`, run `36273919449`, `version-name=1.9.4`) built and its artifact manifest verified as `1.9.4` before this plan was written — the 1.9.0-vs-1.9.4 confusion was a stale default input (`version-name` defaults to `1.9.0`), not a code regression.
- Owner answers baked in: bug from home AND reader; blank consumes layout space; keyboard-closed layout normal; PWA unaffected. Step-3 live walkthrough is carried by the implementer behind the device gates above (precedent: `mobile-app-capacitor.md` POC gates), not pre-verified here.
- No GitHub issue filed with this plan; the implement step files/links it (`issue:` omitted).
- Implemented 2026-09-27: primary ICB-anchoring branch only (`bottom-0 h-auto`, single `fq-scroll-nice` scroller, no other class or logic touched); manifest `windowSoftInputMode` fallback deferred pending the owner device gate. Lint + `tsc --noEmit` clean; no new automated test (className-only change, soft-keyboard geometry unrunnable in CI — the device gates above are the coverage).
- Review (`/review-fq-work`, 5 findings) disposition: fixed `min-h-0` on the results container and neutralized root scrolling (`overflow-visible`, so the results container is the single scroller); the split-file note is covered by the inline comment citing both decisions; the decisions-file paragraph and device-gate evidence stay open until the owner confirms the winning branch on-device (recording either now would assert an unverified outcome).
- Refined 2026-10-08: On-device testing showed soft keyboard overlap across all shell inputs (`SearchBar`, `AyahPicker`, `HomeSearch`). Activated native `adjustResize` fallback combined with `interactiveWidget: "resizes-content"` and zeroed `bottomPadding` in `MainActivity.java` during keyboard presentation to avoid double-shrink blank areas. Verified on physical hardware.

## Revision History

- 2026-10-08: Folded Addendum (2026-10-08). **On-device testing confirmed the native fallback branch won**: added `android:windowSoftInputMode="adjustResize"` to `AndroidManifest.xml`, `interactiveWidget: "resizes-content"` to `app/layout.tsx`, and zeroed `bottomPadding` in `MainActivity.java` when IME is visible to prevent double-shrink blank areas.


