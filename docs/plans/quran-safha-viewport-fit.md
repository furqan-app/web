# Quran Safha: Fit Viewport With No Scroll (Default Font Scale)

**Type:** bug
**Date:** 2026-07-01
**Status:** implemented

## Summary

At the default font scale, `QuranSafha` pages with a surah heading overflow the viewport and force a scroll (see screenshot: Surah Al-An'am, page 128). Word font-size already scales with `vh` (`FONT_V1`), but every other piece of vertical spacing — per-line gaps, the surah-heading block, card padding, wrapper padding — is fixed `px`/`rem`. Fix: tie all of that spacing to the same `vh` budget as the font size, without changing the font size itself. See [ADR 0004](../architecture/adr/0004-quran-safha-viewport-fit.md) for the options considered.

## Root Cause

Measured via a real page load (page 128, 1440×900 viewport, default `quranFontScale`):

- `Nav` bar: 56px fixed
- Page wrapper (`page.tsx`): `py-8` = 64px fixed
- Card (`QuranSafha`): `py-6` padding = 48px fixed, borders 2px
- Header band + its `mb-4` gap: 29px + 16px, both fixed
- Footer band + its `mt-4` gap: 29px + 16px, both fixed
- Per text line: `mb-4` (16px fixed) between every line
- Surah-heading block (`h1` `text-3xl` + Bismillah SVG + margins): 97px fixed, also independent of font scale

Every mushaf page has at most 15 "line-slots": a normal text line is 1 slot, a surah-heading+Bismillah block is 2 slots (confirmed against the DB: `words.line_number` per page ranges 6–15, and pages with fewer real text lines are exactly the ones with a heading eating the rest of the budget). Total content height = `15 × fontSizePx + 14 × gapPx`. With `fontSizePx` scaling via `vh` but `gapPx` and all the surrounding chrome fixed, a 15-slot page at 1440×900 measured 850px tall against a 780px available budget (900 − 56 nav − 64 wrapper padding) — a 70px overflow, matching the observed scroll.

## Approach

Convert every vertical measurement below the nav to a `vh`-derived value using the same scale, calibrated so 15 slots fit within `100vh` minus the nav bar at the default scale, with a safety margin that holds down to ~700px viewport height. During calibration `baseScaleViewHeight` was tuned from 3.4 to 2.9 (default scale → 3.1vh) to make the 15-slot budget work; this was the only change to font sizing and it was intentional.

### New constants (`app/constants/font.ts`)

Add to `FONT_V1`:
- `lineGapRatio = 0.417` — per-line gap as a fraction of `fontSizeVh`
- `getLineGapVh(scale)` → `getWordFontSizeByScale(scale) * lineGapRatio`, e.g. at default scale: `3.1 × 0.417 ≈ 1.29vh`
- `getHeadingBlockVh(scale)` → `2 × getWordFontSizeByScale(scale) + getLineGapVh(scale)` (a heading block occupies exactly 2 line-slots), e.g. at default scale: `2×3.1 + 1.29 = 7.49vh`

These ratios were solved so `15 × fontSizeVh + 14 × lineGapVh` plus the reduced chrome budget (below) fits `100vh − 56px nav` with margin at both 900px and 700px viewport heights (verified by hand — see ADR 0004).

### `app/components/QuranSafha.tsx`

- Set CSS custom properties on the content root: `--fq-line-gap: {lineGapVh}vh`, `--fq-heading-h: {headingBlockVh}vh`, computed from `quranFontScale` via the new `FONT_V1` helpers.
- Reduce wrapper/card fixed padding to close the remaining budget gap:
  - Card content padding: `py-6` → `py-5`
  - Header band's `mb-4` and footer band's `mt-4` → inline `style={{ marginBottom/marginTop: "var(--fq-line-gap)" }}` instead of fixed (the CSS-var approach was chosen over Tailwind arbitrary values so the `max()` floor inherited by the custom property propagates automatically)
- No change to header/footer band's own text sizing (`text-[10px]`, `text-sm`) or padding (`pb-2`/`pt-2`) — small, fixed, and already a minor contributor (~29px each); not worth the added complexity.

### `app/[locale]/pages/[id]/page.tsx`

- Wrapper: `py-8` → `py-4`, keep `min-h-[calc(100vh-3.5rem)]` (not a hard cap), change `items-start` → `items-center`. The hard `h-` approach was considered but rejected: it clips overflow equally above and below at higher font scales, hiding the top of the card under the nav with no scroll path to reach it.

### `app/components/QuranLine.tsx`

- Word-line row: replace `mb-4` with `style={{ marginBottom: 'var(--fq-line-gap)' }}` (or an equivalent Tailwind arbitrary value reading the CSS var).
- Surah-heading block: replace `text-3xl` on the `h1` and the fixed-size Bismillah SVG + its `mb-4` wrapper with vh-based sizing that totals `var(--fq-heading-h)`, split proportionally to the current visual ratio (h1 ≈ 37% of the block height, Bismillah block ≈ 63%, reusing `--fq-line-gap` for the Bismillah wrapper's own bottom margin). The Bismillah SVG must scale by `height` with `width: auto` (it's rendered via `BismillahSVG` with fixed `width`/`height` attributes today) to preserve its aspect ratio.

## Files to Change

- `app/constants/font.ts` — add `lineGapRatio`, `getLineGapVh`, `getHeadingBlockVh`
- `app/components/QuranSafha.tsx` — CSS custom properties, `py-6`→`py-5`, header/footer gaps to vh
- `app/[locale]/pages/[id]/page.tsx` — `py-8`→`py-4`, `min-h-`→`h-`, `items-start`→`items-center`
- `app/components/QuranLine.tsx` — per-line gap and surah-heading block sized from the CSS custom properties

## Edge Cases

- **Pages 1–2 (Al-Fatiha, centered layout):** fewer real lines than 15 slots total — already fits comfortably under the new budget since it's strictly smaller than the 15-slot worst case; no special handling needed.
- **Higher `quranFontScale` values (2–10):** will still overflow into scroll — explicitly out of scope per this fix (see ADR 0004). The gap/heading ratios scale proportionally with the user's chosen size, so spacing rhythm stays consistent even when it no longer fits.
- **Very short viewports (<~700px):** a few px of scroll may reappear since the nav bar's fixed 56px becomes a larger fraction of the budget. Accepted trade-off (see ADR 0004) — not the primary use case for a reading app.

## Constraints

- Do not change `FONT_V1.baseScaleViewHeight` further to fix overflow — it was tuned to 2.9 during implementation to calibrate the 15-slot budget, and is now the settled base. Future overflow should be resolved by adjusting spacing ratios, not font size.
- Any new vertical spacing added to `QuranSafha`/`QuranLine` must be `vh`-derived from `FONT_V1`/the CSS custom properties, not fixed `px`/`rem` — otherwise the overflow bug returns.
- Do not touch `Nav.tsx` (global site chrome, out of scope).
- No changes to `QuranWord.tsx`.

## Decisions Made

- `baseScaleViewHeight` was tuned from 3.4 → 2.9 during calibration (the only intentional change to font size); see ADR 0004 for why this was acceptable and why further reductions are not.
- All vertical rhythm (line gap, heading block, card/wrapper padding) is `vh`-derived from the same scale as the font size, exposed via CSS custom properties on `QuranSafha`'s root.
- The nav bar's fixed 56px is the one accepted fixed-px term in the budget; fit is guaranteed at the default font scale down to ~700px viewport height, not for every possible viewport.
