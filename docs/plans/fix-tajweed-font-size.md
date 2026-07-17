# Fix Tajweed Mushaf Font Size to Match Regular Mushaf

**Type:** bug  
**Date:** 2026-07-14  
**Status:** implemented (Addendum 1)

## Summary

At font scale = 1, the tajweed mushaf page looks noticeably smaller than the regular mushaf page. The existing `--fq-tajweed-scale: 0.7` correction (from tajweed-mushaf-mode.md Addendum 1) only scales `font-size` — it does not scale `--fq-line-gap` or `--fq-heading-h`. The result: 70%-sized text sitting in 100%-sized spacing, which makes the full page look smaller overall.

## Root Cause

The three layout values that determine page fill are:

| Value | Set where | Tajweed today | Expected |
|---|---|---|---|
| `font-size` | CSS `.fq-quran-safha.fq-tajweed` | `base × 0.7` | `base × s` |
| `--fq-line-gap` | inline style on `.fq-content` | `base × 0.417` (unchanged) | `base × 0.417 × s` |
| `--fq-heading-h` | inline style on `.fq-content` | `base × 2.417` (unchanged) | `base × 2.417 × s` |

All three must scale by the same factor `s` to preserve page-fill proportions. Today only `font-size` is corrected.

## Approach

Goal: **page-fill match** — the tajweed mushaf page fills the same container space as regular at the same font scale setting. Start with `s = 1.0` (no correction) and calibrate downward if COLRv1 glyphs visually overflow or look too large.

Scale `--fq-line-gap` and `--fq-heading-h` together with `font-size` using CSS `:has(.fq-tajweed)` scoped overrides on `.fq-content`. Keep `--fq-tajweed-scale` as the single knob.

## Decision Tree

```
tajweedMode = false → use regular rules unchanged
tajweedMode = true  → apply --fq-tajweed-scale to font-size, --fq-line-gap, --fq-heading-h

font-size rules (already exist, unchanged pattern):
  Mobile:           font-size = --fq-mobile-font × s
  Desktop single:   font-size = --fq-word-base × s
  Desktop double:   font-size = min(--fq-word-base, --fq-dv-word) × s

NEW — gap/heading rules (missing today):
  Mobile:           --fq-heading-h = --fq-mobile-font × 2.4 × s  (--fq-line-gap stays 0px)
  Desktop single:   --fq-line-gap  = --fq-line-gap-base × s
                    --fq-heading-h = --fq-heading-base × s
  Desktop double:   --fq-line-gap  = min(--fq-line-gap-base, --fq-dv-word × 0.417) × s
                    --fq-heading-h = min(--fq-heading-base, --fq-dv-word × 2.417) × s
```

## Calibration

Calibrated via browser testing against page 10 (15 full lines, no surah start):

- `s=1.0` → glyphs overflow badly (COLRv1 line-height box is ~1.42× regular, as expected)
- `s=0.82` → still slightly overflowing / cramped
- `s=0.75` → good, small gap at bottom
- `s=0.77` → fills identically to regular ✓

Mathematical derivation: `(15 + 14 × 0.417) / (1.42 × 15 + 14 × 0.417) = 20.838 / 27.138 ≈ 0.768`, rounded to `0.77`.

**Calibrated value: `--fq-tajweed-scale: 0.77`**

Note: individual tajweed lines are centered and do not stretch edge-to-edge (COLRv1 has no AAT kashida tables). This width difference is inherent to the font design and cannot be fixed with scaling.

## Files to Change

- `app/globals.css` — add `.fq-content:has(.fq-tajweed)` scoped overrides for `--fq-line-gap` and `--fq-heading-h` in each breakpoint block; change `--fq-tajweed-scale` from `0.7` to calibrated value.

No JS changes needed: the inline style values on `.fq-content` are the `*-base` source; CSS overrides those for the tajweed case.

## Constraints

- All constraints from `tajweed-mushaf-mode.md` remain in force (no new ADR needed).
- Do not modify `FONT_V1`, the `getLineGapVh` / `getHeadingBlockVh` formulas, or the inline style computation in `QuranSafha.tsx`.
- The `--fq-tajweed-scale` CSS variable stays as the single calibration knob — do not hardcode the scale inline.

## What NOT to Do

- Do not only scale `font-size` without scaling `--fq-line-gap` and `--fq-heading-h` — that is the original broken state.
- Do not use any font-size scaling override (s < 1.0) — any scale reduction shrinks the card width because the card is `md:w-auto` and COLRv1 has no kashida justification (lines don't stretch full-width, so shorter lines → narrower card).
- Do not set `line-height: 1` on `.fq-tajweed > .fq-safha-row` — the COLRv1 font's natural CSS line-height already resolves to exactly 1.0× font-size (confirmed by browser measurement); the rule is a no-op.
- Do not introduce a separate `FONT_V2` constant or JS calculation for tajweed — no correction is needed.
- Do not modify the mobile `--fq-line-gap: 0px` rule — mobile uses `space-between` for line distribution, not gap.

## Addendum 1 — Revised approach (2026-07-14)

The scale-based approach (s=0.77) was implemented but found to shrink the card width because:
1. `md:w-auto` makes the card size to content width
2. COLRv1 has no kashida justification → lines are their natural (shorter) width
3. Any font-size reduction makes those lines proportionally shorter → card narrows

**Final approach**: Remove all font-size overrides for `.fq-tajweed`. The COLRv1 font's CSS line boxes resolve to exactly 1.0× font-size (natural, same as the base font) — confirmed via browser measurement (`line-height: normal` produces the same row height as `line-height: 1`). The page fills identically to regular. Visual glyph overlap between adjacent lines is larger than regular (COLRv1 glyph bounding box ≈ 2.56× font-size vs regular ≈ 1.92×), but this is inherent to the font design and consistent with print tajweed mushaf typography.

**Files changed**: `app/globals.css` — removed the `.fq-tajweed`-scoped `font-size` overrides (mobile, desktop single, desktop double-view) and the dead `line-height: 1` rule; added `font-size: calc(var(--fq-word-base) * 0.87)` for desktop single-view and `font-size: calc(min(var(--fq-word-base), var(--fq-dv-word)) * 0.87)` for desktop double-view. Scale 0.87 ≈ regular_glyph_visual_ratio / tajweed_glyph_visual_ratio = 1.92 / 2.56, matching glyph density across both fonts. Mobile tajweed font-size is unchanged (left for a separate pass).
