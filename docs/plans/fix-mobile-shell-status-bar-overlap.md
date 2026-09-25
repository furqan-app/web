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

On Android (and iOS) mobile shells packaged with Capacitor 8, edge-to-edge rendering caused the system status bar to overlap top content (Basmala, title, overline on Home; surah header on Quran spread) and the bottom navigation bar to overlap the mushaf page number. An initial attempt in PR #685 to fix this via native `contentView.setPadding(...)` in `MainActivity.java` resulted in double-padding (~92px gap in the navbar and ~96px void below the recitation bar) because window insets were still dispatched to the Chromium WebView. The final unified solution fixes this at the web layer: WebView runs edge-to-edge natively (with `#16232F` window decor and `WindowInsetsControllerCompat` ensuring light icons), `.fq-reader-pager-viewport` is inset via CSS `env(safe-area-inset-*)`, and an opaque status bar scrim prevents text from bleeding behind status bar icons on scrollable routes. Desktop, mobile web, and Android standalone PWA remain 100% unaffected (`env(...)` evaluates to `0px`).

## Root Cause / Approach

- **Root Cause**: Modern Android (API 35+ / Capacitor 8) enforces Edge-to-Edge display mode. In `app/globals.css`, `.fq-reader-pager-viewport` was `position: fixed !important; inset: 0 !important;` on `<= 1366px`, pinning it to coordinate `(0, 0)` and ignoring safe areas. Setting native padding on `android.R.id.content` in `MainActivity.java` while returning `windowInsets` unconsumed passed the insets to Chromium, doubling the `env(safe-area-inset-*)` padding that `Nav` and `RecitationPlayerBar` already applied.
- **Approach**: Unified edge-to-edge with web safe-area insets:
  1. In `MainActivity.java`, remove native `contentView` padding so WebView runs edge-to-edge naturally. Set `WindowInsetsControllerCompat` to keep light (white) status and navigation bar icons on Furqan's `#16232F` navy bars.
  2. In `app/globals.css`, update `.fq-reader-pager-viewport` from `inset: 0 !important;` to `top/bottom/left/right: env(safe-area-inset-*, 0px) !important;`.
  3. In `app/[locale]/layout.tsx`, add a fixed top status bar scrim (`h-[env(safe-area-inset-top,0px)] bg-background z-40 pointer-events-none`) so scrollable pages (Home, Settings, Marks) do not bleed text behind status bar icons.
  4. In `capacitor.config.ts`, remove the non-existent `SystemBars` plugin configuration.

## Decision Tree / Algorithm

| Platform & Environment | `env(safe-area-inset-*)` | Computed Reader Viewport | Computed Nav & Recitation Bar |
|---|---|---|---|
| **Standalone PWA (Android Chrome)** | `0px` | `top: 0px; bottom: 0px` (identical to `inset: 0`) | `paddingTop: 0px; paddingBottom: 0px` (standard height) |
| **Mobile Browser (Android/iOS)** | `0px` | `top: 0px; bottom: 0px` (identical to `inset: 0`) | `paddingTop: 0px; paddingBottom: 0px` (standard height) |
| **Desktop Web (≥1367px)** | `0px` | Unaffected (flow layout `min-h-[calc(100dvh-3.5rem)]`) | Standard layout |
| **Capacitor Android Shell** | `~46px` top, `~48px` bottom | Reader starts below status bar, ends above navigation bar | `Nav` 56px with background extending behind status bar; recitation bar sits flush above gesture handle |
| **Capacitor iOS Shell & iOS PWA** | `~47px` top, `~34px` bottom | Reader starts below notch/island, ends above home indicator | Identical safe-area padding |

## Verified Test Cases

- **Capacitor Android Mushaf Reader**: Cold launch to `/ar/pages/580`. The surah header at the top is clearly below the status bar; the page number at the bottom sits cleanly above the navigation handle.
- **Capacitor Android Navbar**: Tap reader to toggle overlay. `<Nav>` displays at standard 56px height with no extra 46px void above icons.
- **Capacitor Android Recitation Bar**: Play recitation. Player bar displays compactly without an empty void below playback controls.
- **Capacitor Android Home Scroll**: Scroll home page down. Content scrolls under the top status bar scrim without clashing with clock/battery icons.
- **Web & PWA regression test**: Verify `env(...)` evaluates to `0px` in standard browser, behaving identically to `inset: 0`.

## Files to Change

- `android/app/src/main/java/app/furqan/MainActivity.java` — Remove `contentView.setPadding`; configure `WindowInsetsControllerCompat` for light status/navigation bar icons.
- `android/app/src/main/res/values/colors.xml` — Add `furqan_navy` (`#16232F`).
- `android/app/src/main/res/values/styles.xml` — Set window background to `#16232F`.
- `app/globals.css` — Replace `inset: 0 !important;` on `.fq-reader-pager-viewport` with `top/bottom/left/right: env(safe-area-inset-*, 0px) !important;`.
- `app/[locale]/layout.tsx` — Add `fixed top-0 inset-x-0 h-[env(safe-area-inset-top,0px)] bg-background z-40 pointer-events-none` status bar scrim.
- `capacitor.config.ts` — Remove non-existent `SystemBars` plugin block.
- `docs/architecture/decisions/pwa.md` — Update mobile shell decision entry.
- `docs/plans/INDEX.md` — Regenerated index.

## Constraints

- Zero visual or sizing regressions on desktop web, mobile web, or standalone Android PWA (where `env(safe-area-inset-*)` must evaluate to `0px`).
- Preserves ADR 0044's initial containing block anchoring for the reader height on `<= 1366px`.
- Status bar scrim must be `pointer-events-none` and `z-40` so it does not block interactions or exceed the Radix ceiling (`z-50`).
- Dark theme status bar icons (light text on dark background `#16232F`).
- Do not hide status bar (fullscreen immersive mode was explicitly rejected in ADR 0044 / #317 because tap-to-toggle overlay fights OS status bar).

## What NOT to Do

- Do NOT keep native padding on `android.R.id.content` — this reintroduces double padding or breaks on devices querying `DisplayCutout`.
- Do NOT use hardcoded pixel offsets (e.g. `48px`) in CSS instead of `env(safe-area-inset-*)`.
- Do NOT add fullscreen/immersive flags (`View.SYSTEM_UI_FLAG_FULLSCREEN` or `WindowInsetsControllerCompat.hide()`) — reverts the hard-won PWA focus mode decision (#317).
- Do NOT modify desktop reader layout (`≥1367px`).

## Decisions Made

- Unified on CSS `env(safe-area-inset-*)` as the single cross-platform contract across Android and iOS Capacitor shells, eliminating brittle native letterbox padding.
- Retained `#16232F` window decor background natively while using a CSS status bar scrim for scrollable routes.

## Revision History

- 2026-09-24: Initial spec created for issue #678.
- 2026-09-25: Addendum 1 folded for issue #700 (**superseded native padding approach with web-layer safe-area insets on `.fq-reader-pager-viewport` and status bar scrim**).

