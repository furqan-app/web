# Quran Font Size: Minimum Floor for Short Viewports

**Type:** bug  
**Date:** 2026-07-01  
**Status:** implemented

## Summary

`FONT_V1` word font-size and derived spacing are pure `vh` values with no lower bound. Short viewports (including DevTools docked open) shrink text indefinitely. Fix: 24px flat minimum floor via CSS `max()`, propagated to derived spacing. See [ADR 0006](../architecture/adr/0006-quran-font-size-minimum-floor.md).

## Changes

**`app/constants/font.ts`** — add:
- `minFontSizePx = 24`
- `minLineGapPx = 24 * 0.417 ≈ 10.01`
- `minHeadingBlockPx = 2*24 + 10.01 = 58.01`
- `getWordFontSizeCss(scale)` → `` `max(${minFontSizePx}px, ${getWordFontSizeByScale(scale)}vh)` ``

**`app/components/QuranSafha.tsx`**:
- Word font-size class: `md:text-[${getWordFontSizeByScale(scale)}vh]` → `md:text-[${getWordFontSizeCss(scale)}]` (e.g. `max(24px,3.1vh)`)
- Regenerate `tailwindFontUtility` safelist to new `max(24px,{vh}vh)` strings for scales 1–10.
- `--fq-line-gap`: `{lineGapVh}vh` → `max(6.67px, {lineGapVh}vh)`
- `--fq-heading-h`: `{headingBlockVh}vh` → `max(38.67px, {headingBlockVh}vh)`

`QuranLine.tsx` needs no changes — it consumes the custom properties and inherits the floor automatically.

## Constraints

- Floor is flat (24px) across all `quranFontScale` values — do not scale it per level.
- Any change to `minFontSizePx` must regenerate the `tailwindFontUtility` safelist in the same commit.
- Use `max()`, not `clamp()` — no upper bound needed.
- Below ~774px viewport at default scale, the floor may reintroduce a few px of scroll. Accepted (ADR 0006).
