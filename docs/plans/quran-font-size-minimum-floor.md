# Quran Font Size: Minimum Floor for Short Viewports

**Type:** bug
**Date:** 2026-07-01
**Status:** implemented

## Summary

`FONT_V1`'s word font-size and its derived line-gap/heading-block spacing are pure `vh` values with no lower bound. Any viewport-height reduction — including DevTools docked open, not just a genuinely short window — shrinks the reading text indefinitely (e.g. ~12px at a 400px viewport), becoming uncomfortably small. Fix: add a flat 24px minimum floor via CSS `max()`, applied to font-size and proportionally to the derived spacing, per [ADR 0006](../architecture/adr/0006-quran-font-size-minimum-floor.md).

## Approach

Add to `FONT_V1` (`app/constants/font.ts`):
- `minFontSizePx = 24` — flat floor, same across all `quranFontScale` values (a readability minimum, not a per-scale preference).
- `minLineGapPx = minFontSizePx * lineGapRatio` → `24 * 0.417 ≈ 10.01`
- `minHeadingBlockPx = 2 * minFontSizePx + minLineGapPx` → `2*24 + 10.01 = 58.01`
- New helper `getWordFontSizeCss(scale)` returning the CSS value string `` `max(${minFontSizePx}px, ${getWordFontSizeByScale(scale)}vh)` `` for use in the Tailwind class.
- `getLineGapVh`/`getHeadingBlockVh` stay as-is (still needed elsewhere as raw numbers), but `QuranSafha.tsx` wraps their CSS custom property values in `max()` too, using the new min constants.

### `app/components/QuranSafha.tsx`

- Word font-size class: change `` md:text-[${FONT_V1.getWordFontSizeByScale(scale)}vh] `` to `` md:text-[${FONT_V1.getWordFontSizeCss(scale)}] ``, producing e.g. `md:text-[max(24px,3.1vh)]`.
- Regenerate `tailwindFontUtility` safelist array (per ADR 0005's obligation) to the new `max(24px,{vh}vh)` strings for `quranFontScale` 1–10 (base 2.9, so `3.1vh` through `4.9vh` wrapped).
- `--fq-line-gap` custom property: `max(6.67px, {lineGapVh}vh)` instead of a bare `{lineGapVh}vh`.
- `--fq-heading-h` custom property: `max(38.67px, {headingBlockVh}vh)` instead of a bare `{headingBlockVh}vh`.

### `app/components/QuranLine.tsx`

No changes needed — it already consumes `var(--fq-line-gap)` and `calc(var(--fq-heading-h) * ...)`, so the floor propagates automatically once the custom properties carry it.

### `app/constants/font.ts`

Add the three new constants and the `getWordFontSizeCss` helper as described above.

## Files to Change

- `app/constants/font.ts` — add `minFontSizePx`, `minLineGapPx`, `minHeadingBlockPx`, `getWordFontSizeCss`
- `app/components/QuranSafha.tsx` — use `getWordFontSizeCss` in the class template, regenerate `tailwindFontUtility` safelist, wrap `--fq-line-gap`/`--fq-heading-h` in `max()`

## Edge Cases

- **Below ~774px viewport height at default scale** (where 3.1vh dips under 24px): font clamps to 24px flat, layout may reintroduce a few px of scroll. Accepted per ADR 0006 — matches the existing ADR 0004 short-viewport trade-off, just now bounded by readability instead of being open-ended.
- **Higher `quranFontScale` values**: floor rarely engages since their natural vh value is already well above 24px at any reasonable viewport height; no special handling needed.
- **DevTools docked to the side** (reduces width, not height): unaffected by this fix — width-based shrinkage isn't part of the vh-based font system.

## Constraints

- The floor is flat (24px) across all `quranFontScale` values — do not scale it per font-scale level.
- Any future change to `minFontSizePx` must regenerate the `tailwindFontUtility` safelist in the same commit (same obligation as `baseScaleViewHeight` changes, per ADR 0005).
- Use `max()`, not `clamp()` — no upper bound is needed since `quranFontScale` already caps the top end.

## Decisions Made

- Flat 24px minimum font-size floor, chosen for comfortable Quranic text readability (see ADR 0006).
- Line-gap and heading-block spacing get proportional floors too, derived from the same 24px baseline via the existing ratios, so vertical rhythm stays consistent with the floored text instead of continuing to shrink independently.
- `max()` over `clamp()` — see ADR 0006 for the reasoning.
