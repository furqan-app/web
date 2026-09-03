---
title: Reader Nav Overlay (mobile + tablet)
type: feature
date: 2026-07-20
status: implemented
area: nav
adr: [0027, 0043, 0044]
---

# Reader Nav Overlay (mobile + tablet)

> Started as a tablet-only effect; grew to cover mobile, then had its positioning and height mechanisms rebuilt (ADR 0043 CSS-gating, ADR 0044 ICB-anchored height). Several pieces that started here now live elsewhere: tablet double-page sizing → ADR 0054 / `reader-line-rhythm.md`; the swipe carousel → ADR 0028 / `reader-persistent-pager.md`; the printed-mushaf tablet visual / book-stack / mobile mushaf colours → `design-migration/5.1` (flattened, radial lighting removed); the "voice panel" persistent play control → `recitation-playback.md` Addendum 13 (`RecitationPlayerBar` / `RecitationReturnStrip`). See Revision History.

## Summary

On the Quran reader page at **mobile (≤767px)** and **tablet (1024–1366px)** widths, the navbar is hidden by default so the mushaf gets the full viewport. Tapping anywhere on the reader that is **not** Quran text toggles the navbar in as a fixed overlay from the top; it auto-hides after 3 seconds. Desktop (≥1367px) and the 768–1023px gap band are unchanged — nav always visible, static in flow. Word taps `stopPropagation()` so the mark modal opens with no nav toggle.

## Approach

### The overlay

`QuranSwipeNav` (the client component wrapping the whole reader) gets an `onClick` → `toggleOverlay()`. `overlayVisible` is a React `useState(false)` toggle (its initial value already matches SSR, so it carries no flash risk). Auto-hide: a `useRef`-stored `setTimeout` calls `hideOverlay()` 3s after `overlayVisible` becomes `true`, cleared on every toggle so rapid taps reset cleanly. `toggleOverlay` is guarded by `if (!isOverlayMode) return;` (still a JS hook — it only runs on a user interaction, which can't happen before hydration).

The overlay coordinates with the overlay-close-on-back guard (`close-overlays-on-back-swipe.md` / ADR 0055) — a back-swipe with the overlay open closes it, not the page.

### Positioning is CSS-`@media`-gated (ADR 0043)

`Nav`'s `position: relative → fixed` switch **cannot** be driven by a `matchMedia` hook: SSR has no `window`, so it always renders the `false` branch, the browser paints that raw HTML, and no layout effect can undo a paint that already happened — the nav rendered in flow for one frame, the page briefly scrolled, then snapped. So the breakpoint half of the decision lives in CSS `@media` with the exact widths the JS hooks encode; the route half (`isOnPagesRoute` from `usePathname()`) stays a class hook (pathname resolves identically on server and first client render).

`Nav.tsx` adds `isOnPagesRoute && "fq-nav-overlay-page"` and `isOnPagesRoute && overlayVisible && "fq-nav-visible"`. `app/globals.css`, beside the tablet block:

```css
@media (max-width: 767px), (min-width: 1024px) and (max-width: 1366px) {
  .fq-nav-overlay-page {
    position: fixed !important; top: 0 !important; inset-inline: 0 !important;
    z-index: 50 !important; transform: translateY(-100%);
    transition: transform 300ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  .fq-nav-overlay-page.fq-nav-visible { transform: translateY(0); }
}
```

`!important` is **required** — `globals.css` is one big `@layer base` block and loses to Tailwind's utility layer at equal specificity by source order, so `Nav`'s always-present `relative`/`z-10` utilities would otherwise win and the fixed positioning would silently never apply. (`transform` on `.fq-nav-visible` doesn't need `!important` — its two-class selector out-specifies.) `NavOverlayContext` keeps exporting `isOverlayMode` / `useIsMobile` / `useIsTablet` for the non-positioning consumers (the `toggleOverlay` guard, `QuranSafha`/`QuranWord`/`QuranLine` tap-vs-long-press branching).

### Reader height is ICB-anchored (ADR 0044)

Viewport units go **stale** in the installed PWA: a document whose first layout lands during Chrome's non-immersive → immersive fullscreen transition has its `dvh`/`vh` pinned to the transitional viewport and never re-resolved (measured on-device: `100dvh` read 888px while `position: fixed; inset: 0` on the same page read the correct 832px). It is a race, not a first-launch rule.

`ReaderPager`'s `w-full overflow-hidden` wrapper gets `.fq-reader-pager-viewport`, which becomes `position: fixed; inset: 0` on the **same** gated breakpoints — ICB-anchored, so it tracks the settled viewport correctly. The strip and three panels take `height: 100%` from it; below `.fq-reader-outer` the height travels by `align-items: stretch` (never `%` — `%` inside a flex-grown box resolves to `auto`, ADR 0036, and collapses the card). The mobile chain *centres* rather than stretches by default (`.fq-reader-spread-container` is `items-start`, `.fq-spread-col` is `items-center` — both flip to stretch only at `md:`), and the QuranSafha root between `.fq-spread` and `.fq-full-safha` is a plain block that passes no height down and needs an explicit `height: 100%`; `.fq-full-safha > div` needs `height: auto` so it stops opting out. The stale `min-height: 100dvh !important` / `height: 100dvh !important` declarations (mobile and tablet) are removed. `Sidebar.tsx`'s `height: calc(100dvh - …)` has the same failure mode and moves off viewport units too.

(The manifest is now `display: "standalone"` — the immersive transition that triggered this no longer occurs — but the ICB-anchored fix is a strictly more robust sizing approach and stays regardless: `feature-pwa-fullscreen-focus-mode.md` #317.)

## Decision Tree

| Condition | Nav | Reader height |
|---|---|---|
| Desktop ≥1367px, or the 768–1023px gap | `position: relative`, always visible — unchanged | `min-h-[calc(100dvh-3.5rem)]` flow layout — unchanged (no immersive transition at these sizes) |
| Mobile ≤767px or tablet 1024–1366px, **not** `/pages/` | `position: relative`, always visible (no `.fq-nav-overlay-page`) | flow layout |
| Mobile/tablet, `/pages/`, `overlayVisible = false` | `.fq-nav-overlay-page` → `position: fixed`, `translateY(-100%)` (hidden) | `.fq-reader-pager-viewport` is `position: fixed; inset: 0` (ICB-anchored), `height: 100%` + `align-items: stretch` below |
| Mobile/tablet, `/pages/`, `overlayVisible = true` | `.fq-nav-overlay-page.fq-nav-visible` → `translateY(0)`, 3s auto-hide timer | same |
| Tap a Quran word / verse-end marker | no nav toggle (`stopPropagation`) — mark modal / verse text opens | — |

## Verified Test Cases

- Load `/pages/1` on mobile (375px) / tablet (1280px): raw SSR HTML already carries `fq-nav-overlay-page` (no `fq-nav-visible`) → nav hidden above the viewport from the first paint, **no in-flow frame, no scrollbar**.
- Load `/pages/1` on desktop (1440px), or a non-`/pages/` route on mobile/tablet: nav `relative`, always visible — unchanged.
- Tap background → nav slides down (300ms cubic-bezier), 3s timer starts; tap again → slides up immediately, timer reset; wait 3s → auto-slides up.
- Back-swipe with the overlay open → overlay closes, page does not navigate (close-on-back guard).
- Installed PWA on the repro device (392×832): `scrollable: 0`, card 832, footer bottom 828 — measured; `position: fixed; inset: 0` read 832 while `100dvh` read 888 in the broken state.
- 360×640 / 430×932 / 1024×1366: `scrollable: 0`, footer inside the viewport. Desktop 1440×900: unchanged, nav in flow. Resize 832 → 700 after load: card follows, `scrollable: 0`.
- 800×1200 (768–1023 gap band): 1px of scroll — pre-existing (the 57px-nav vs `3.5rem` mismatch, fix gated ≥1367px), out of scope.

## Files to Change

- `app/components/nav/Nav.tsx` — `fq-nav-overlay-page` / `fq-nav-visible` classes; drop `isOverlayMode` from the destructure (keep `overlayVisible`). `paddingTop: env(safe-area-inset-top, 0px)` inline style stays.
- `app/components/QuranSwipeNav.tsx` — `onClick` → `toggleOverlay()`.
- `app/components/QuranSafha.tsx` / `QuranWord.tsx` / `QuranLine.tsx` — `stopPropagation()` on word/marker taps; tap-vs-long-press branching reads `isOverlayMode`. The card wrapper's `h-[calc(100dvh-5.5rem)]` must stop being a viewport unit on the gated breakpoints.
- `app/components/reader/ReaderPager.tsx` — `fq-reader-pager-viewport` on the `w-full overflow-hidden` wrapper; `fq-reader-panel` marker on `Panel`'s outer div. Marker classes only, no positioning in JSX (ADR 0043). Keep `min-h-[calc(100dvh-3.5rem)]` on the reader wrapper (correct for the fixed/out-of-flow case; only the *timing* of the nav leaving flow changed).
- `app/contexts/NavOverlayContext.tsx` — new (`overlayVisible`, `toggleOverlay`/`hideOverlay`, `isOverlayMode`, `useIsMobile`/`useIsTablet`). Mounted in `app/[locale]/layout.tsx`.
- `app/hooks/use-is-tablet.ts`, `app/hooks/use-is-mobile.ts` — `matchMedia`-backed; the CSS `@media` widths must stay numerically identical to `MOBILE_QUERY`/`TABLET_QUERY` (two — now three, with the ADR 0044 block — representations of the same breakpoints; ADR 0043's accepted trade-off, no shared constant).
- `app/globals.css` — the nav-overlay `@media` block (above); the ICB-anchored `.fq-reader-pager-viewport` block on the same breakpoint string; `height: 100%` on strip + panels; the 3-link stretch chain below `.fq-reader-outer`; remove the stale `100dvh` `min-height`/`height` declarations (mobile ~476/~491, tablet ~1114/~1149).
- `app/components/nav/Sidebar.tsx` — move its `height` off `100dvh` (same stale-launch clip as `fix-sidebar-bottom-clip.md`).
- `docs/architecture/adr/0027-tablet-swipe-carousel.md`, `adr/0043-breakpoint-positioning-must-be-css-gated.md`, `adr/0044-viewport-units-are-unreliable-in-the-installed-pwa.md`, `docs/architecture/DECISIONS.md`.

## Constraints

- Breakpoint-dependent positioning that must be correct on the first paint belongs in CSS `@media`, never a `matchMedia` hook — however it is timed, a layout effect cannot undo a paint that already happened (ADR 0043). `!important` is required inside the `@layer base` block.
- The CSS `@media` widths must stay numerically identical to `MOBILE_QUERY`/`TABLET_QUERY` in the JS hooks — do not try to unify them into a shared constant (ADR 0043's accepted trade-off).
- Below the gated breakpoints, use **no viewport unit** in the reader height chain — `.fq-reader-pager-viewport` is `position: fixed; inset: 0` (ICB-anchored) and height travels by `align-items: stretch`, never `%` (ADR 0044 / 0036).
- Keep `min-h-[calc(100dvh-3.5rem)]` on the reader wrapper — it is correct for the fixed/out-of-flow case; only the timing of the nav leaving flow changed.
- Do not touch the mobile font formula (`min(calc((100vw - 24px) / 14.7), 28px)`) — width-derived, measured correct (ADR 0011).
- `overlayVisible` stays a JS `useState(false)` toggle (initial value matches SSR); only the positioning is CSS-gated.
- Verify the PWA height fix on a **real device** — the race needs a real immersive-fullscreen transition and does not reproduce in DevTools emulation, `adb` cold launch, home/resume, or bfcache restore.

## What NOT to Do

- Do not gate `Nav`'s `relative → fixed` switch on a `matchMedia` hook, a layout effect, or a pre-hydration inline `<script>` — breakpoint width is fully expressible in CSS `@media`; the script escape hatch is only for state CSS can't see (`localStorage`).
- Do not touch `RecitationPlayerBar.tsx` / `PlansWidget.tsx` for the CSS-gating change — both are **always** `position: fixed` and only toggle `transform`/`opacity` on `isOverlayMode`, so neither affects document flow the way `Nav`'s switch does; their smaller visible-then-hidden flash is tracked separately.
- Do not use `%` below `.fq-reader-outer` for height — measured to collapse the card (`%` in a flex-grown box = `auto`).
- Do not change `display` in the manifest to fix the height race — it is `standalone` now and the ICB-anchored fix stands regardless.
- Do not remove `useIsMobile`/`useIsTablet`/`isOverlayMode` from `NavOverlayContext` — still needed for the non-positioning consumers.
- Do not add the nav overlay behaviour to non-`/pages/` routes or to desktop / the 768–1023px gap band.

## Decisions Made

- The nav overlay applies to mobile **and** tablet reader pages (started tablet-only) — desktop and the gap band keep the static nav.
- Positioning is CSS-`@media`-gated (ADR 0043); `overlayVisible` stays JS-driven; the route half stays a `usePathname()` class hook.
- Reader height on the gated breakpoints is ICB-anchored (`position: fixed; inset: 0`, ADR 0044) — no viewport units below `.fq-reader-outer`; the ADR 0044 fix stays even though the manifest is now `standalone`.
- The CSS/JS breakpoint duplication is accepted (ADR 0043) — no shared constant.

## Revision History

- 2026-07-20 → 2026-08 — the base plan (tablet-only overlay), the tablet full-screen safha sizing, the tablet "printed-mushaf" refinement + binding divider + book-stack, the tablet 3-panel carousel swipe ([ADR 0027](../architecture/adr/0027-tablet-swipe-carousel.md), incl. RTL `dir="ltr"` strip and swipe-feel tuning), the overlay auto-hide timer / ayah-end styling / opening-page centering, the modal-click-toggle / I-beam-cursor / focused-close-button bug fixes, and the "Mobile reader UX" addendum (nav overlay + mark-modal trigger + mushaf colours + book-stack extended to mobile). **Later superseded:** tablet sizing → ADR 0054 (`reader-line-rhythm.md`); the carousel → ADR 0028 (`reader-persistent-pager.md`); the printed-mushaf visual, book-stack, and mobile mushaf colours → `design-migration/5.1` (flat stage, radial lighting removed).
- 2026-08 — folded "Sync voice panel with nav overlay; voice panel becomes the reader's persistent play control" (incl. the stray post-`stop()` `timeupdate` bug fix). **Later superseded by `recitation-playback.md` Addendum 13** — global playback + the `RecitationReturnStrip` replaced the sync'd voice panel.
- 2026-08-15 — folded Addendum "CSS-gate nav overlay positioning" (#294, [ADR 0043](../architecture/adr/0043-breakpoint-positioning-must-be-css-gated.md)). **Supersedes the JS-hook-driven `position` switch** — SSR paints the `false` branch before any layout effect, so the nav rendered in flow for one frame and the page briefly scrolled. Moved the breakpoint half to a CSS `@media` block (`.fq-nav-overlay-page` / `.fq-nav-visible`, `!important` required in `@layer base`); `overlayVisible` stays a JS class toggle.
- 2026-08-15 — folded Addendum "Reader still scrolls in the installed PWA" (#304, [ADR 0044](../architecture/adr/0044-viewport-units-are-unreliable-in-the-installed-pwa.md)). **A different cause** from #294: `dvh`/`vh` pin to the transitional viewport during Chrome's fullscreen transition and never re-resolve. Fix: `.fq-reader-pager-viewport { position: fixed; inset: 0 }` (ICB-anchored) on the same gated breakpoints, `height: 100%` + a 3-link `align-items: stretch` chain below it, and the stale `100dvh` declarations removed. `Sidebar.tsx` moved off viewport units too.
