# Quran Safha: Fit Viewport With No Scroll (Default Font Scale)

**Type:** bug  
**Date:** 2026-07-01  
**Status:** implemented

## Root Cause

At default font scale, 15-slot pages (surah heading + text lines) overflowed the viewport by ~70px. Word font-size scales with `vh` (`FONT_V1`), but all other vertical spacing — line gaps, heading block, card/wrapper padding — was fixed `px`/`rem`. Total content height = `15 × fontSizePx + 14 × gapPx`; with `gapPx` fixed, a 15-slot page at 1440×900 measured 850px against a 780px budget. See [ADR 0004](../architecture/adr/0004-quran-safha-viewport-fit.md).

## Approach

Convert all vertical spacing below the nav to `vh`-derived values using the same scale, calibrated so 15 slots fit within `100vh − 56px nav` at default scale with margin down to ~700px viewport.

`baseScaleViewHeight` tuned from 3.4 → 2.9 (default → 3.1vh) during calibration — the only intentional font size change.

### New constants (`app/constants/font.ts`)

```
lineGapRatio = 0.417
getLineGapVh(scale)     → getWordFontSizeByScale(scale) * 0.417     // e.g. 3.1 × 0.417 ≈ 1.29vh
getHeadingBlockVh(scale) → 2 × fontSizeVh + lineGapVh               // e.g. 7.49vh
```

### `app/components/QuranSafha.tsx`

- Set CSS custom properties on content root: `--fq-line-gap: {lineGapVh}vh`, `--fq-heading-h: {headingBlockVh}vh`.
- Card content padding: `py-6` → `py-5`.
- Header `mb-4` / footer `mt-4` → `style={{ margin: "var(--fq-line-gap)" }}`.

### `app/[locale]/pages/[id]/page.tsx`

- Wrapper: `py-8` → `py-4`; `items-start` → `items-center`.

### `app/components/QuranLine.tsx`

- Word-line row: `mb-4` → `style={{ marginBottom: 'var(--fq-line-gap)' }}`.
- Surah-heading block: `text-3xl` h1 + Bismillah SVG resized to total `var(--fq-heading-h)`. Bismillah SVG must scale by `height` with `width: auto`.

## Constraints

- Do not change `FONT_V1.baseScaleViewHeight` further — it's settled at 2.9.
- Any new vertical spacing in `QuranSafha`/`QuranLine` must be `vh`-derived from `FONT_V1`/CSS custom properties — fixed `px`/`rem` re-introduces the overflow.
- Higher font scales (2–10) may still overflow — explicitly out of scope (ADR 0004).
- Nav bar's 56px is the one accepted fixed-px term in the budget.
- No changes to `Nav.tsx` or `QuranWord.tsx`.
