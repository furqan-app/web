# Mobile Safha: Full-Screen Sizing (Width-Driven Font + Flexbox Fill)

**Type:** feature
**Date:** 2026-07-03
**Status:** implemented

## Summary

On mobile (`<md`), the Safha card fills the full viewport edge-to-edge (no border/rounded corners/shadow — those stay `md:`-only), the reading font is derived from screen width (not user-scalable), and the 15-line budget fills all available height via flexbox distribution. Navigation is swipe-based; desktop arrow buttons are hidden. See [ADR 0011](../architecture/adr/0011-mobile-quran-font-scale-vw-formula.md) for the full decision record.

## Approach

### Font size: derived from line width

Every mushaf line justifies to the same width. Worst-case line-width/font-size ratio across all 604 pages: `14.42` (range 14.13–14.42). Dividing viewport width by `14.7` (leaving ~2% margin) gives a font size guaranteed to fill the width without overflow, capped at 28px to prevent over-scaling on tablet-width portrait viewports (e.g. a ~720px CSS viewport at DPR 2):

```css
--fq-mobile-font: min(calc((100vw - 24px) / 14.7), 28px);
```

`24px` = `px-3` padding on both sides of `.fq-content`. Recalibrate if that padding changes. `14.7` is the only calibrated number — revisit only if a future page font's justified width ratio exceeds its margin. 28px is derived from ~430px widest-common-phone width via the same `14.7` divisor.

When the cap applies (tablet-width portrait), lines no longer span the full container width — `align-items: center` on `.fq-quran-safha` shrink-wraps rows and centers the gap symmetrically:

```css
.fq-quran-safha {
  justify-content: space-between;
  align-items: center;
}
```

Do not add `width: 100%` on rows — that defeats `align-items: center`'s shrink-to-fit behavior.

### Height: distributed by flexbox

`.fq-quran-safha` is a full-height flex column (`flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column; justify-content: space-between`). `--fq-line-gap: 0 !important` on mobile; per-row `margin-bottom` zeroed via `.fq-quran-safha > * { margin-bottom: 0 !important }`.

Two backstops:
- **Never-wrap:** `.fq-quran-safha > .fq-safha-row { flex-wrap: nowrap }` and `> .fq-safha-row > div { flex-shrink: 0; white-space: nowrap }`. (`fq-safha-row` class on the word-row div in `QuranLine.tsx` — use this class, never positional `> div` selectors.)
- **Breathing room:** `padding-block: 0.5em` on `.fq-quran-safha`.

**Pages 1–2:** `justify-content: center; gap: 0.55em` via `fq-safha-center` class.

`--fq-heading-h: calc(var(--fq-mobile-font) * 2.4) !important`

### Layout

- Card: `w-full md:w-auto`, `h-[calc(100dvh-5.5rem)] md:h-auto` (`5.5rem` = nav `3.5rem` + page `py-4` top+bottom). Use `dvh` not `vh` — `100vh` resolves to the largest possible viewport (as if browser toolbar were hidden), while `100dvh` tracks the currently visible viewport; a `vh`/`dvh` mismatch on the same visual box causes a scrollbar on real mobile devices.
- Page container: `min-h-[calc(100dvh-3.5rem)]` (not `min-h-[calc(100vh-3.5rem)]`), `px-0 md:ps-14 md:pe-10`, `items-start md:items-center`, `gap-0 md:gap-8`.
- Card chrome (`rounded-none md:rounded-[20px]`, `md:border md:border-border`, `md:shadow-[...]`), inner decorative frame, and corner star ornaments get `hidden md:block`.
- Inner padding: `px-3 py-3 md:px-7 md:py-5`.
- Header grid: `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:grid-cols-3` — `minmax(0,1fr)` caps side tracks so long juz/hizb labels never push the surah glyph off-center.

### Navigation

`NavigationArrow` gets `hidden md:flex`. `QuranSwipeNav` (client component, previously `QuranPageShell` — renamed) wraps page children and handles `touchstart`/`touchend`: navigates via `useRouter().push()` when horizontal delta ≥ 50px and exceeds vertical delta. It receives pre-resolved `prevHref`/`nextHref` strings (plain `pageId ± 1`, not via `getNavigationHref` which is coupled to the desktop arrows' visual-flip logic and must not be reused for gestures/keyboard nav).

### Settings

`QuranFontScaleControls` wrapped in `hidden md:block` — font size is not user-scalable on mobile.

## Files Changed

- `app/globals.css` — mobile `@media (max-width: 767px)` block: `--fq-mobile-font` (with 28px cap), `--fq-line-gap`, `--fq-heading-h`, `.fq-quran-safha` flex/`space-between`/`align-items: center` rules, `fq-safha-row` never-wrap selectors, `fq-safha-center`
- `app/components/QuranSafha.tsx` — card chrome, `w-full md:w-auto`, `h-[calc(100dvh-5.5rem)] md:h-auto`, `fq-content`/`fq-quran-safha` classes, `fq-safha-center` on pages ≤ 2, `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]`
- `app/[locale]/pages/[id]/page.tsx` — `min-h-[calc(100dvh-3.5rem)]` (dvh), page container spacing, `NavigationArrow hidden md:flex`, `QuranSwipeNav` wrapper, locale-independent `nextPageId`/`prevPageId` for swipe
- `app/components/QuranSwipeNav.tsx` (renamed from `QuranPageShell.tsx`) — client component, swipe touch handling
- `app/components/QuranLine.tsx` — `fq-safha-row` class on word-row div
- `app/components/SettingsSidebar.tsx` — `hidden md:block` around font-scale controls
- `docs/architecture/adr/0011-mobile-quran-font-scale-vw-formula.md`, `docs/architecture/DECISIONS.md` — updated for cap + centering fix

## Constraints

- Desktop `md:` font class and inline `--fq-line-gap`/`--fq-heading-h` are untouched.
- `14.7` is the single calibrated constant. Do not tune it for one page.
- `24px` tracks `px-3` padding on both sides of `.fq-content` — update together.
- Do not reintroduce per-line `margin-bottom` on mobile.
- Do not use `dvh`/minus-chrome or slot-budget formula — width-driven flex-fill is intentional.
- Do not stretch rows to fill width (`justify`/`stretch`) — distorts mushaf justification.
- Do not reuse `getNavigationHref` for any gesture/keyboard navigation.
- `VerticalQuranPages.tsx`'s `h-[calc(100vh-3.5rem)]` is intentional (scrolling reader) — do not change it.
