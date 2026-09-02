---
title: Fix Tajweed Mushaf Font Size to Match Regular Mushaf
type: bug
date: 2026-07-14
status: implemented
area: rendering
---

# Fix Tajweed Mushaf Font Size to Match Regular Mushaf

> The desktop `FONT_V1` / `lineGapRatio` scale model this plan tuned was later replaced wholesale by ADR 0054's per-band size contracts (`reader-line-rhythm.md`). The **tajweed-specific** CSS overrides below (the `0.85` glyph-density factor, the gap compensation, the mobile `0.88` scale) are the enduring part of this plan; the regular-mushaf `lineGapRatio` change and the CSS-variable simplification are historical (see Revision History).

## Summary

The tajweed (COLRv1 colour-glyph) mushaf page rendered visibly smaller and, in early attempts, narrower than the regular page at the same setting. The final fix is **CSS-only**, scoped to `.fq-quran-safha.fq-tajweed` / `.fq-content:has(.fq-tajweed)`:

- **Desktop:** `font-size = base × 0.85` (glyph-density match — COLRv1 glyphs are ~2.56× their CSS em-box vs the regular font's ~1.92×, and 0.85 ≈ 1.92 / 2.56), with the inter-line gap **compensated up** so the 15 line boxes + 14 gaps sum to the same page height as regular. No explicit width — the card sizes to its widest COLRv1 line.
- **Mobile:** `font-size = var(--fq-mobile-font) × 0.88` (COLRv1 lines have no kashida justification, so a line wider than ~14.7× font-size overflows at the regular size) + `padding-block-start: 1em` (COLRv1 glyphs extend ~1.56× past their line box and the first line's ink otherwise laps into the header band). No gap compensation — mobile distributes lines with `space-between` (`--fq-line-gap: 0px`), so flexbox redistributes freed vertical space automatically.

## Root Cause

The regular mushaf's fill depends on three values scaling together — `font-size`, `--fq-line-gap`, `--fq-heading-h`. The original `--fq-tajweed-scale: 0.7` correction only scaled `font-size`, leaving 70%-sized text in 100%-sized spacing. Scaling all three by one factor `s` was then tried (`s = 0.77`, mathematically derived) and **rejected** — any `font-size` reduction shrinks the card, because the card is `md:w-auto` and COLRv1 lines don't stretch full-width, so shorter lines → narrower card. The final approach keeps `font-size × 0.85` (for visual glyph parity, not fill) and compensates the *gap* instead.

## Decision Tree

```
tajweedMode = false → regular rules unchanged
tajweedMode = true →
  Desktop single:  font-size = var(--fq-word-base) × 0.85
                   --fq-line-gap (on .fq-content:has(.fq-tajweed)) = var(--fq-word-base) × 0.5607
  Desktop double:  font-size = min(var(--fq-word-base), var(--fq-dv-word)) × 0.85
                   --fq-line-gap = min(word-base × 0.5607, dv-word × 0.5777)   (0.5777 compensates
                     double-view's 0.417 base-gap ratio vs single-view's 0.40)
  Mobile:          font-size = var(--fq-mobile-font) × 0.88
                   padding-block-start: 1em on .fq-quran-safha.fq-tajweed
                   (no gap/heading override — mobile uses space-between)
  width:           no override anywhere — card sizes to content
```

Gap-compensation derivation (single-view): `15·fs + 14·(0.40·fs) = 20.6·fs` (regular); `15·(0.85·fs) + 14·new_gap = 20.6·fs` → `new_gap = (20.6 − 12.75) / 14 = 0.5607·fs` (~35% larger than the regular gap).

## Calibration

- Mobile `0.88`: effective divisor ≈ 16.7, font ≈ 21.9px on a 390px phone; median tajweed lines fill ~93% of card width, rare wider lines clip invisibly via `overflow-hidden`. **Deliberately not calibrated to the worst-case line-width ratio (22.73)** — that would leave typical lines at ~70% width, which looks worse than the rare clip.
- Desktop `0.85`: `regular_glyph_visual_ratio / tajweed_glyph_visual_ratio = 1.92 / 2.56`.
- A forced `width: 14.7 × font-size` on the tajweed card was tried and rejected — 14.7 is the theoretical worst case, most pages' lines are narrower, so it made the tajweed container *wider* than the regular card and centred lines away from the edges.

## Files to Change

- `app/globals.css`:
  - `@media (min-width: 768px)`: `font-size: calc(var(--fq-word-base) * 0.85)` on `.fq-quran-safha.fq-tajweed` (single) and `calc(min(var(--fq-word-base), var(--fq-dv-word)) * 0.85)` (double) — no width override; `.fq-content:has(.fq-tajweed) { --fq-line-gap: calc(var(--fq-word-base) * 0.5607); }`; the double-view block gets `:root[data-safha-view="double"] .fq-spread .fq-content:has(.fq-tajweed) { --fq-line-gap: min(calc(var(--fq-word-base) * 0.5607), calc(var(--fq-dv-word) * 0.5777)) !important; }`.
  - `@media (max-width: 767px)`: `.fq-quran-safha.fq-tajweed { font-size: calc(var(--fq-mobile-font) * 0.88); padding-block-start: 1em; }`.
  - Remove the dead `line-height: 1` rule on `.fq-tajweed > .fq-safha-row` and the stale "do not scale tajweed font-size" comment.

No JS changes; no `font.ts` changes for the tajweed sizing.

## Constraints

- Do not modify `FONT_V1` / the inline-style computation in `QuranSafha.tsx` / any mobile `--fq-line-gap: 0px` rule for the tajweed sizing.
- `--fq-tajweed-scale` / per-`.fq-tajweed` overrides are CSS-only — never hardcode a scale inline or add a JS-side tajweed calculation.
- No explicit `width` on `.fq-quran-safha.fq-tajweed`, `.fq-content`, or the card wrapper — the card sizes to its widest COLRv1 line.
- Do not change `align-items: center` on `.fq-spread .fq-quran-safha`, or the mobile 28px cap logic (`0.88` applies to the already-capped `var(--fq-mobile-font)`).
- Do not touch the `font-palette` / `@font-palette-values` rules — unrelated.
- Do not calibrate the mobile scale to the worst-case line-width ratio (22.73).
- `:has()` requires Chrome 105+ / Safari 15.4+ / Firefox 121+ — acceptable for this app's user base.
- All constraints from `tajweed-mushaf-mode.md` remain in force.

## What NOT to Do

- Do not scale `font-size` for tajweed *without* the gap compensation — 70%-sized text in 100%-sized spacing is the original broken state.
- Do not use a whole-page `s < 1.0` factor across all three layout values — it shrinks the card (no kashida justification → shorter lines → narrower `md:w-auto` card).
- Do not remove the `0.85` font-size scaling (load-bearing for visual glyph-size parity) or the `0.5607`/`0.5777` gap compensation.
- Do not add gap compensation on mobile — `space-between` handles it. Do not add a `--fq-mobile-font-tajweed` custom property — a `calc()` override on `font-size` is enough.
- Do not set `line-height: 1` on `.fq-tajweed > .fq-safha-row` — the COLRv1 font's natural line-height already resolves to exactly 1.0× (a no-op).
- Do not introduce a `FONT_V2` constant / JS calc for tajweed.
- Do not modify the mobile `--fq-line-gap: 0px` / `--fq-heading-h` rules.

## Decisions Made

- Tajweed sizing is a CSS-only, `.fq-tajweed`-scoped correction: `font-size × 0.85` on desktop (glyph parity) with the gap compensated up (`0.5607·fs` single / `min(0.5607, 0.5777)` double) so page height matches regular; `font-size × 0.88` + `padding-block-start: 1em` on mobile.
- No explicit width on the tajweed card — a forced worst-case width was tried and rejected.
- Mobile scale targets "most lines fit" (~0.88), not the worst-case line; rare outliers clip invisibly under `overflow-hidden`.

## Revision History

- 2026-07-14 — folded Addendum 1. **Supersedes the base plan's `--fq-tajweed-scale: 0.77` whole-page scale** — it shrank the `md:w-auto` card (COLRv1 has no kashida, so shorter lines → narrower card). Replaced by removing the tajweed `font-size` overrides and adding `font-size: calc(var(--fq-word-base) * 0.85)` (glyph-density match, 1.92 / 2.56).
- 2026-07-18 — folded Addendum 2 (desktop regular mushaf): `FONT_V1.lineGapRatio` 0.38 → ~0.40; the `QuranSafhaViewToggle` + `RecitationPlayButton` row removed from `ReaderPage` (frees ~44px so scales 2–3 fit at 768px); the `--fq-line-gap` / `--fq-heading-h` JS inline vars derived via CSS from the `-base` pair instead (5 vars → 3). **Later subsumed by ADR 0054** (`reader-line-rhythm.md`), which replaced the `FONT_V1` scale model with per-band contracts and desktop presets — the `lineGapRatio` value and the variable simplification no longer describe current code.
- 2026-07-18 — folded Addendum 3: the view toggle removed in Addendum 2 was placed in `SettingsSidebar` as a `hidden lg:block` "Page View" section (double-page view is CSS-gated at `min-width: 1024px`, so below `lg` the control would be inert). (The settings sheet was later redesigned again — see `design-migration/4.3`.)
- 2026-07-18 — folded Addendum 4. **Supersedes Addendum 1's "font-size 0.85 alone"** — the 0.85 factor also shrank every line box, so the tajweed page was shorter than regular. Fix: keep `0.85` for glyph parity, **compensate `--fq-line-gap` up** to `0.5607·fs` (single) / `min(0.5607·word-base, 0.5777·dv-word)` (double) so the 15-line + 14-gap total matches regular; no explicit width (a forced `14.7·fs` width was rejected).
- 2026-07-19 — folded Addendum 5 (mobile): `.fq-quran-safha.fq-tajweed { font-size: calc(var(--fq-mobile-font) * 0.88); padding-block-start: 1em; }` — COLRv1 lines overflowed the card at the regular mobile size (no kashida), and the first line's ink lapped into the header band. Mobile needs no gap compensation (`space-between`).
