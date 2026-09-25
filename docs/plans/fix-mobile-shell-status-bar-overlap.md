---
title: Fix mobile shell status bar and navigation bar overlap in Capacitor
type: bug
date: 2026-09-24
status: implemented
area: pwa
issue: 700
adr: [0072]
---

# Fix mobile shell status bar and navigation bar overlap in Capacitor

## Summary

On Android mobile shells packaged with Capacitor 8, edge-to-edge rendering caused the system status bar to overlap top content (Basmala, title, overline on Home; surah header on Quran spread) and the bottom navigation bar to overlap the mushaf page number. An initial attempt in PR #685 to fix this via native `contentView.setPadding(...)` in `MainActivity.java` resulted in double-padding (~92px gap in the navbar and ~96px void below the recitation bar) because window insets were returned unconsumed and dispatched to the Chromium WebView. The final clean solution resolves this entirely at the native Android shell layer: `MainActivity.java` sets padding on `contentView` for system bars and display cutouts (and IME keyboard), and explicitly consumes them (`Insets.NONE`) before dispatching to the WebView. The WebView is thus bounded within safe bounds (preventing status/navigation bar overlap on all screens) while reporting `0px` for CSS `env(safe-area-inset-*)`, eliminating the double-padding in `<Nav>` and `<RecitationPlayerBar>`. Desktop web, mobile browsers, and Android standalone PWA remain 100% untouched.

## Root Cause / Approach

- **Root Cause**: Modern Android (API 35+ / Capacitor 8) enforces Edge-to-Edge display mode. In PR #685, setting native padding on `android.R.id.content` while returning `windowInsets` unconsumed passed the insets to Chromium, doubling the `env(safe-area-inset-*)` padding that `Nav` and `RecitationPlayerBar` already applied.
- **Approach**: Native Inset Consumption in `MainActivity.java`:
  1. Register `ViewCompat.setOnApplyWindowInsetsListener` on `contentView`.
  2. Query `systemBars` and `displayCutout` (plus `ime` for keyboard).
  3. Apply `v.setPadding(systemBars.left, systemBars.top, systemBars.right, bottomPadding)`.
  4. Return `WindowInsetsCompat.Builder` with `systemBars` and `displayCutout` set to `Insets.NONE`.
  5. Configure `WindowInsetsControllerCompat` to keep light (white) status and navigation bar icons on Furqan's `#16232F` navy bars.
  6. In `capacitor.config.ts`, remove the non-existent `SystemBars` plugin configuration.

## Decision Tree / Algorithm

| Platform & Environment | `env(safe-area-inset-*)` | Computed Reader Viewport | Computed Nav & Recitation Bar |
|---|---|---|---|
| **Standalone PWA (Android Chrome)** | `0px` | `inset: 0` inside browser viewport | Standard layout |
| **Mobile Browser (Android/iOS)** | `0px` | `inset: 0` inside browser viewport | Standard layout |
| **Desktop Web (≥1367px)** | `0px` | Unaffected (flow layout `min-h-[calc(100dvh-3.5rem)]`) | Standard layout |
| **Capacitor Android Shell** | `0px` (consumed natively) | Bounded inside `contentView` below status bar, above nav bar | Standard layout (0px CSS inset, no double padding) |
| **Capacitor iOS Shell & iOS PWA** | `~47px` top, `~34px` bottom | Standard safe-area behavior | Safe-area padding |

## Verified Test Cases

- **Capacitor Android Mushaf Reader**: Cold launch to `/ar/pages/580`. The surah header at the top is clearly below the status bar; the page number at the bottom sits cleanly above the navigation handle.
- **Capacitor Android Navbar**: Tap reader to toggle overlay. `<Nav>` displays at standard 56px height with no extra 46px void above icons.
- **Capacitor Android Recitation Bar**: Play recitation. Player bar displays compactly without an empty void below playback controls.
- **Capacitor Android Home Scroll**: Scroll home page down. Content stays within safe bounds without clashing with clock/battery icons.
- **Web & PWA regression test**: Web code is 100% untouched.

## Files to Change

- `android/app/src/main/java/app/furqan/MainActivity.java` — Pad `contentView` and consume `systemBars` & `displayCutout`; configure `WindowInsetsControllerCompat` for light icons.
- `android/app/src/main/res/values/colors.xml` — Add `furqan_navy` (`#16232F`).
- `android/app/src/main/res/values/styles.xml` — Set window background to `#16232F`.
- `capacitor.config.ts` — Remove non-existent `SystemBars` plugin block.
- `docs/architecture/decisions/pwa.md` — Update mobile shell decision entry.
- `docs/plans/INDEX.md` — Regenerated index.

## Constraints

- Zero visual or sizing regressions on desktop web, mobile web, or standalone Android PWA. Web code (`app/`, `components/`) remains 100% untouched.
- Preserves ADR 0044's initial containing block anchoring for the reader height on `<= 1366px`.
- Dark theme status bar icons (light text on dark background `#16232F`).
- Soft keyboard (IME) must resize / work properly without being blocked by system bar insets.
- Do not hide status bar (fullscreen immersive mode was explicitly rejected in ADR 0044 / #317 because tap-to-toggle overlay fights OS status bar).

## What NOT to Do

- Do NOT return unconsumed systemBars insets to the WebView — this causes double padding in CSS `env(safe-area-inset-*)`.
- Do NOT touch web application code (`app/`, `components/`) for this native Android shell fix.
- Do NOT add fullscreen/immersive flags (`View.SYSTEM_UI_FLAG_FULLSCREEN` or `WindowInsetsControllerCompat.hide()`) — reverts the hard-won PWA focus mode decision (#317).
- Do NOT hardcode pixel heights (e.g. `24dp` or `48dp`) — insets vary widely across notches, punch holes, and tablets. Always use dynamic window insets.

## Decisions Made

- Resolved at the native Android shell layer in `MainActivity.java` via Inset Consumption: `contentView` is padded to clear system bars and cutouts, while the dispatched `systemBars` and `displayCutout` are set to `Insets.NONE` so WebView receives zero insets.
- Preserves 100% of web and standalone PWA code untouched with zero risk of regressions across other platforms.

## Revision History

- 2026-09-24: Initial spec created for issue #678.
- 2026-09-25: Addendum 1 folded for issue #700 (resolved double-padding regression via native Inset Consumption with `WindowInsetsCompat.Builder`).

