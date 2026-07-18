# Fix Tajweed Mushaf Font Size to Match Regular Mushaf

**Type:** bug  
**Date:** 2026-07-14  
**Status:** implemented (Addendum 3)

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

---

## Addendum 2 — Desktop regular mushaf: line gap increase + UI cleanup (2026-07-18)

### Context

Scope is **desktop only, regular mushaf (non-tajweed), font scales 1–3**. Mobile is deferred. Tajweed mode spacing is a separate future pass.

### Goals

1. **CSS variable simplification** — `--fq-line-gap` and `--fq-heading-h` are set in JS to the same values as `--fq-line-gap-base` / `--fq-heading-base`. Remove the redundant pair from the JS inline style and derive them via CSS instead, keeping the `-base` variants as the stable references for the double-view `min()` expressions.

2. **Bigger line gap on desktop** — at scale 1 lines are visually too close. Increase `lineGapRatio` in `FONT_V1` from `0.38` to a calibrated value (start at `0.45`, adjust up/down until scales 1–3 fit without scroll at 768px+ viewport). The ratio applies proportionally to all scales, so the budget must be verified at scale 3 / 768px (the tightest combination).

3. **Remove toggle and play buttons from reader** — `QuranSafhaViewToggle` and `RecitationPlayButton` are rendered in a `hidden md:flex` row above the spread in `ReaderPage.tsx`. Removing them frees ~44px of vertical space in the flex column, which is the primary reason scales 2–3 currently push past the viewport edge. The toggle **behavior** (localStorage, CSS gate, double-page display) is unchanged — only the button is removed from this location; it will be placed elsewhere in a future task.

### Why removing the button row unlocks more line gap

`ReaderPage` uses a vertical flex column (`flex flex-col justify-center`) whose children are the button row and the spread. Both are centered together. At scale 3 / 800px, the combined block (button row 44px + spread card ~700px) is at the viewport limit — the card alone would have room for a bigger gap, but the button row consumes that slack. Removing it gives the card the full viewport budget.

### Decision Tree

```
JS inline style on .fq-content (QuranSafha.tsx + test-tajweed/page.tsx):
  BEFORE: 5 vars — --fq-word-base, --fq-line-gap, --fq-heading-h, --fq-line-gap-base, --fq-heading-base
  AFTER:  3 vars — --fq-word-base, --fq-line-gap-base, --fq-heading-base

CSS globals.css — new default rule (single-page desktop and standalone):
  .fq-content {
    --fq-line-gap: var(--fq-line-gap-base);
    --fq-heading-h: var(--fq-heading-base);
  }

Existing overrides are unchanged and still win:
  mobile:      --fq-line-gap: 0px !important
               --fq-heading-h: calc(var(--fq-mobile-font) * 2.4) !important
  double-view: --fq-line-gap: min(var(--fq-line-gap-base), ...) !important
               --fq-heading-h: min(var(--fq-heading-base), ...) !important
```

### Calibration target

At scale 3, 768px viewport (tightest case):

```
card_height = overhead + 15 × font_size + 14 × gap

overhead (desktop only — padding-block: 0.5em on .fq-quran-safha is a mobile-only rule and
does NOT apply at 768px+; double-view also does not apply here):
  = px-7×2 (56px, .fq-content horizontal padding contributes 0 vertical)
    + py-5×2 (40px, .fq-content vertical padding)
    + header band height (~32px)
    + footer band height (~32px)
    + 2 × gap (one gap between header and line 1, one between line 15 and footer,
               via the flex gap on .fq-spread .fq-quran-safha)
  = 120 + 2 × gap

font_size   = max(24px, 3.5vh) = 26.88px at 768px
gap         = lineGapRatio × 26.88px

card_height = 120 + 2×gap + 15×26.88 + 14×gap
            = 120 + 403.2 + 16×gap
            = 523.2 + 16×gap

Usable viewport = 768px − 56px (nav) = 712px
Max gap = (712 − 523.2) / 16 = 11.8px
Max ratio = 11.8 / 26.88 ≈ 0.439
```

**Note:** an earlier draft of this calculation incorrectly included `padding-block: 0.5em` on `.fq-quran-safha` as desktop overhead — that rule is scoped to `@media (max-width: 767px)` and does not apply on desktop. The real ceiling is ~0.44, not 0.41.

**Calibrated starting value: `lineGapRatio = 0.40`** — gives a visible increase from 0.38 while leaving ~4px of margin against the 768px constraint. Adjust up toward 0.43 or down to 0.39 after visual browser test. Verify actual header/footer band heights in DevTools before finalizing, as the 32px estimate is approximate.

### Files to Change

- `app/constants/font.ts` — change `lineGapRatio` from `0.38` to calibrated value (~`0.40`).
- `app/globals.css` — add `.fq-content { --fq-line-gap: var(--fq-line-gap-base); --fq-heading-h: var(--fq-heading-base); }` as a new rule in `@layer base` (place it before the mobile and double-view overrides so `!important` still wins). No other globals.css changes for this addendum.
- `app/components/QuranSafha.tsx` — remove `--fq-line-gap` and `--fq-heading-h` from the `.fq-content` inline style (lines 279–280). Keep `--fq-word-base`, `--fq-line-gap-base`, `--fq-heading-base`.
- `app/[locale]/test-tajweed/page.tsx` — same inline style simplification (lines 68–73): remove `--fq-line-gap` and `--fq-heading-h`, keep the 3 remaining vars.
- `app/components/reader/ReaderPage.tsx` — remove the `hidden md:flex items-center gap-2` div (lines 119–122) containing `QuranSafhaViewToggle` and `RecitationPlayButton`. Also remove the `gap-2` from the outer wrapper div (line 118) since there is no longer a second sibling above the spread.

### Constraints

- Do not touch mobile CSS — the `--fq-line-gap: 0px !important` and `space-between` rules are load-bearing for mobile layout and are out of scope here.
- Do not remove the toggle **behavior** (QuranSafhaViewContext, localStorage, CSS double-view gate) — only the button element is removed from ReaderPage.
- **Do not merge this addendum to production independently.** `QuranSafhaViewToggle` and `RecitationPlayButton` currently exist only in the removed row — deleting it without a replacement location is a production feature regression. This addendum must ship in the same release as the PR that places the toggle in its new location.
- Do not change `minFontSizePx` — the readability floor is unchanged.
- Increasing `lineGapRatio` also slightly increases `getHeadingBlockVh` (heading height = 2 × fontSize + lineGap). At 0.40 the delta is small (~0.5px per scale); verify surah-start pages still look correct after the change.
- The `.fq-content { --fq-line-gap: var(--fq-line-gap-base) }` rule must appear **before** the `@media (max-width: 767px)` and double-view blocks in globals.css so `!important` overrides win.

### What NOT to Do

- Do not remove `--fq-line-gap-base` or `--fq-heading-base` from JS — they are the stable references needed by the double-view `min()` expressions to avoid a circular CSS variable.
- Do not increase `lineGapRatio` above `0.416` without verifying scale 3 at 768px does not scroll.
- Do not add `gap-2` or any spacing between the outer flex column children after removing the button row — the spread should center alone with no sibling gap.
- After the CSS variable simplification, `--fq-line-gap` depends entirely on `--fq-line-gap-base` being injected by JS. If `--fq-line-gap-base` is absent (SSR edge case, test harness without the inline style), `--fq-line-gap` silently resolves to 0 and lines pack flush. This is a known, accepted trade-off of the simplification. If a rendering context is added in the future that does not go through `QuranSafha`'s inline style, it must set `--fq-line-gap-base` explicitly.

### Deferred / Future Notes

- **Mobile gap**: `lineGapRatio` change has no effect on the mobile line gap (`0px !important` wins), but it does shift `--fq-heading-h` (surah heading block height) on mobile. Revisit mobile spacing as a separate task.
- **Tajweed line gap on desktop**: COLRv1 glyphs extend ~2.56× beyond their CSS line boxes and visually overlap the gap even when it is technically present. A tajweed-specific gap increase (larger `--fq-line-gap` override under `.fq-tajweed`) is a separate calibration pass.
- **Scales 4–10**: left at "may scroll" per original design intent (ADR 0004). Only 1–3 are in scope for this addendum.
- **Toggle button new location**: resolved in Addendum 3 — moved to `SettingsSidebar`.

---

## Addendum 3 — Move view toggle to Settings sidebar (2026-07-18)

`QuranSafhaViewToggle` was removed from `ReaderPage` in Addendum 2 with no replacement, creating a temporary feature regression. This addendum adds it to `SettingsSidebar` as a desktop-only (`hidden lg:block`) section.

**Why `lg:` not `md:`:** double-page view is CSS-gated at `@media (min-width: 1024px)` — below `lg`, switching to double-page has no visible effect, so showing the control below that breakpoint would be confusing.

**File changed:** `app/components/SettingsSidebar.tsx` — import `QuranSafhaViewToggle`, add a new `hidden lg:block` section following the existing section pattern (h3 heading + `bg-muted` card). Section label: `t("pageView", "Page View")`. Placed after the font-size section and before Appearance.

---
