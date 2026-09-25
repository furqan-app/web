---
title: Fix mobile shell status bar and navigation bar overlap in Capacitor
type: bug
date: 2026-09-24
status: implemented
area: pwa
issue: 678
adr: [0072]
---

# Fix mobile shell status bar and navigation bar overlap in Capacitor

## Summary

On Android (and iOS) mobile shells packaged with Capacitor 8, edge-to-edge rendering causes the system status bar to overlap top content (Basmala, title, overline on Home; surah header on Quran spread) and the bottom navigation bar to overlap the mushaf page number. Mobile web browsers and the installed standalone PWA are unaffected. Fix at the native shell layer in Android (`MainActivity.java`) by applying window insets padding to the root container with `#16232F` theme background, ensuring the WebView and all web routes remain strictly within safe system bounds without altering or risking regressions in web or PWA.

## Root Cause / Approach

- **Root Cause**: Modern Android (API 35+ / Capacitor 8) enforces Edge-to-Edge display mode. While standalone PWA runs in Chrome where window insets are handled by the browser chrome (reporting `env(safe-area-inset-top) = 0px` and starting web content below the status bar), Capacitor's `BridgeActivity` attaches the `CapacitorWebView` across the entire physical display window. In `app/globals.css`, `.fq-reader-pager-viewport` is `position: fixed !important; inset: 0 !important;` on `<= 1366px`, which pins it to coordinate `(0, 0)`. On scrollable pages, `<Nav>` is in-flow (`relative`), so scrolling moves page content directly behind the transparent status bar icons.
- **Approach**: Fix natively in the shell. In Android's `MainActivity.java`, apply `ViewCompat.setOnApplyWindowInsetsListener` to the decor/content view (`android.R.id.content`), retrieving system bar insets (`WindowInsetsCompat.Type.systemBars()`) and setting padding accordingly, while preserving IME (soft keyboard) insets. Set the window/root background to `#16232F` so the status bar and navigation bar have Furqan's brand dark background. In `capacitor.config.ts`, configure `SystemBars` plugin style to `DARK` (light text/icons on dark bar). This preserves 100% of web/PWA code untouched.

## Decision Tree / Algorithm

- If running in standalone PWA or standard mobile browser:
  - Browser handles system bars; web code remains completely untouched.
- If running in Capacitor Android shell:
  - `MainActivity.onCreate()` registers `setOnApplyWindowInsetsListener` on the root content view (`findViewById(android.R.id.content)`).
  - On inset dispatch, query `WindowInsetsCompat.Type.systemBars()`.
  - Apply `paddingTop = insets.top`, `paddingBottom = insets.bottom`, `paddingLeft = insets.left`, `paddingRight = insets.right`.
  - Return the original `windowInsets` so IME/keyboard resize transitions still propagate.
  - Set root window/view background to `#16232F`.
- If running in Capacitor iOS shell:
  - Ensure `UIViewControllerBasedStatusBarAppearance` is `true` in `Info.plist` with dark status bar style.
  - Capacitor's WKWebView respects safe area layout guides.

## Verified Test Cases

- **Home page in Android debug build**: Cold launch and scroll down. Basmala, title, search, and surah list never overlap with battery, clock, or notification icons.
- **Mushaf reader in Android debug build**: Navigate to any page (e.g. `/ar/pages/3`). The surah name ("البقرة") and juz marker ("جزء ١") sit clearly below the status bar. The page number ("٣") sits clearly above the bottom gesture navigation handle.
- **Tap to toggle overlay in reader**: Tapping the reader toggles the `<Nav>` overlay smoothly without layout jump or double-padding.
- **Keyboard in search**: Focusing the search bar on Home or in reader opens the software keyboard without clipping or broken layout.
- **Web & PWA regression test**: Verify web browser (`localhost:3000`) and installed PWA behavior are 100% unchanged.

## Files to Change

- `android/app/src/main/java/app/furqan/MainActivity.java` — Add window insets listener to pad root content view against `WindowInsetsCompat.Type.systemBars()`.
- `android/app/src/main/res/values/colors.xml` — Add `furqan_navy` (`#16232F`) if not present.
- `android/app/src/main/res/values/styles.xml` — Set window background / theme color.
- `capacitor.config.ts` — Configure `SystemBars` plugin with style `DARK`.
- `docs/plans/INDEX.md` — Regenerated index.

## Constraints

- Zero regressions on web or standalone PWA. Web code (`app/`, `components/`) must not be forked or touched for a Capacitor-specific issue.
- Dark theme status bar icons (light text on dark background `#16232F`).
- Soft keyboard (IME) must resize / work properly without being blocked by system bar insets.
- Do not hide status bar (fullscreen immersive mode was explicitly rejected in ADR 0044 / #317 because tap-to-toggle overlay fights OS status bar).

## What NOT to Do

- Do NOT add fullscreen/immersive flags (`View.SYSTEM_UI_FLAG_FULLSCREEN` or `WindowInsetsControllerCompat.hide()`) — reverts the hard-won PWA focus mode decision (#317).
- Do NOT hardcode pixel heights (e.g. `24dp` or `48dp`) — insets vary widely across notches, punch holes, and tablets. Always use dynamic window insets.
- Do NOT touch web reader layout rules (`.fq-reader-pager-viewport` ICB anchoring) unless proven strictly necessary.

## Decisions Made

- Resolved at the native shell layer rather than web CSS layer, respecting the constraint that web and PWA are completely healthy and should not be modified for a Capacitor-specific edge-to-edge phenomenon.
- Use `WindowInsetsCompat.Type.systemBars()` instead of deprecated `fitsSystemWindows` XML attribute to ensure compatibility with modern Android 15/16.

## Revision History

- 2026-09-24: Initial spec created for issue #678.
