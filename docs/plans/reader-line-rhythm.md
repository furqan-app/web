# Reader Rhythm: Claim the Unused Vertical Space Into Line Gaps (Desktop, Tablet)

**Type:** feature
**Date:** 2026-08-02
**Status:** implemented
**Trello:** [#172](https://trello.com/c/C12euyK1/172-reader-rhythm-claim-the-unused-vertical-space-into-line-gaps-desktop-tablet)

## Summary

On desktop the reader card was content-height, so the vertical space the page did not need sat as empty background above and below the book (measured 142px at 1440×900) while the lines stayed pinned at the flat `--fq-line-gap` floor. The card now stretches to the reader's height band and `space-between` hands that surplus to the inter-line gaps — the model mobile has used since [ADR 0011](../architecture/adr/0011-mobile-quran-font-scale-vw-formula.md), and the reason mobile reads like a printed mushaf. The page also gained a wider side margin and a desk margin above/below, both tuned with the user in the browser. See [ADR 0036](../architecture/adr/0036-reader-fills-height-band.md).

Reading font size is untouched (ADR 0004 still holds), tablet (1024–1366px) already filled its own card and is unchanged, and mobile is untouched.

## Approach

Three independent knobs, in the order they were settled with the user:

1. **Fill the band.** `.fq-reader-spread-container` becomes `flex: 1 1 auto` with `align-items: stretch`, and the explicit heights between it and the page wrapper are dropped so the stretch can pass through. `.fq-spread .fq-quran-safha` switches from `justify-content: flex-start` to `space-between`, keeping `gap: var(--fq-line-gap)` as the floor.
2. **Desk margin** (`padding-block` on the spread container) shortens the page back off the viewport edges: 64px at ≥1367px, 16px at 768–1023px.
3. **Page side margin** (`padding-inline` on `.fq-content`, ≥1367px only) widens the paper from 28px to 56px per side.

`height: 100%` cannot carry the stretch: inside a flex-grown box it resolves to `auto` — the same trap the earlier fixed-height attempt hit (DECISIONS.md, "Desktop spread"). The height has to arrive by `align-items: stretch` at every level, which is why the rule drops `md:h-full` rather than adding more of it.

## Why gated on `min-height: 800px`

The surplus is what pays for the taller card. Below 800px the 15 `vh`-derived lines already fill the band, so stretching buys no gap and only pushes the card under the fixed recitation bar. Short viewports keep the previous `flex-start` + floor-gap layout exactly.

The gate coincides with the recitation rail's own gate (≥1367px + ≥800px, [recitation-bar-vertical-rail.md](recitation-bar-vertical-rail.md)), which is what freed this space in the first place — that ticket removed the 104px bottom reserve for #172 to claim.

## The trade the user chose

Page height, text size and line gap are three quantities where any two fix the third — the card holds 15 line boxes plus 14 gaps plus fixed chrome. Measured at 1440×900:

| card height | text 27.9px (current) | text 30.6px | text 33px |
|---|---|---|---|
| 716px | gap 13.3px | gap 10.4px | gap 7.6px |
| 796px | gap 19.0px | gap 16.3px | gap 13.5px |

The user chose **716px height, text unchanged, gap 13.3px**, plus the wider paper. Width is the one free knob — page margin costs nothing in gap.

## Verified Measurements

Page 10 (15 full lines), regular mushaf, after the change:

| Viewport | Card | Line gap | Was | Notes |
|---|---|---|---|---|
| 1440×900 | 511×716 | 13.3px (0.48 em) | 11.2px | rail clear, no scroll |
| 1920×1080 | — | scales with band | 11.2px | same rule |
| 768×1024 | 522×860 | 19.4px (0.61 em) | 11.2px | 19px clearance under the bottom bar |
| 1280×800 (tablet) | 496×800 | 16.5px (0.51 em) | 16.5px | unchanged — tablet already filled |
| 1024×768 (tablet) | 496×768 | 15.7px | 15.7px | unchanged (gate off) |
| 1440×760 | 511×604 | 9.6px | 9.6px | gate off, card sits exactly on the bar |
| 390×844 (mobile) | 390×844 | 27px (1.08 em) | 27px | untouched |

Other surfaces checked at 1440×900: single-page view identical to double; surah-banner page (187) keeps both facing pages row-for-row aligned (all six pager panels measured identical); tajweed edition fills the same 716px card with its own larger floor (17.9px); Arabic/RTL identical; `/pages/vertical` (standalone `QuranSafha`, no `.fq-spread` ancestor) untouched at 466px wide / 11.2px gap.

## Files Changed

- `app/globals.css` — new `@media (min-width: 768px) and (min-height: 800px)` rhythm block (stretch chain, `space-between`, 76px bottom-bar reserve, skeleton mirror); a 768–1023px desk-margin block; desk margin + page side margin + `padding-bottom: 0` inside the existing `(min-width: 1367px) and (min-height: 800px)` group.
- `app/components/reader/QuranSpread.tsx` — `fq-spread-col` marker class on the spread column wrapper, so the stretch chain can target it without a positional selector.
- `docs/architecture/adr/0036-reader-fills-height-band.md`, `docs/architecture/DECISIONS.md` — record the supersede.

## Constraints

- The `gap` under `space-between` is load-bearing as a floor — flexbox only distributes positive free space, so a page taller than the band degrades to `flex-start` with the floor intact instead of overlapping lines.
- Every level between the spread container and the page wrapper must stay height-less at md+; re-adding `md:h-full` anywhere in that chain silently collapses the card back to content height.
- The 76px bottom reserve tracks the horizontal recitation bar (57px measured + clearance). It must stay in step with that bar's height, and stay `!important` to beat the JSX `pb-4`.
- Tablet (1024–1366px) is full-bleed by design: its block zeroes the bottom reserve and must never receive the desk margin, which would push its 100dvh card past the viewport and scroll it.
- Do not raise `lineGapRatio` in `FONT_V1` — the ceiling from `fix-tajweed-font-size.md` Addendum 2 (~0.44 at scale 3 / 768px) still applies, and the gap now comes from distribution, not from the ratio.

## What NOT to Do

- Do not use `justify-content: space-between` (or any word-spacing trick) to widen a mushaf **line**. The line is justified by kashida baked into the font's glyphs; distributing space at word boundaries shifts every word off its printed position — tried and reverted, see DECISIONS.md's mushaf-justification entry. A line gets wider only when the font gets bigger.
- Do not make the text bigger to fill the wider paper without re-checking the gap: line height and gap trade 1:1 inside a fixed-height card, and at the chosen 716px height a bigger font drops the gap below its pre-ticket value.
- Do not pin a fixed `height`/`100dvh` on the reader outer or the spread to force the fill — a flex item with an explicit height is not stretched, and content taller than the box would clip inside the `overflow-hidden` card at high font scales.
- Do not extend the fill below 800px viewport height — there is no surplus there, only the recitation bar to collide with.
- Do not apply the desk/side margins to the standalone `QuranSafha` (`/pages/vertical`, `QuranPage`): every rule here is scoped to `.fq-spread` / `.fq-reader-outer` deliberately.

## Decisions Made

- Opening pages 1–2 now sit as a centred block inside a full-height card rather than keeping a short card. This supersedes the "short opening pages are not forced to full screen height" clause of the desktop-spread decision — confirmed with the user, and it keeps every spread the same size.
- Tablet is left alone. It already fills its 100dvh card via its own `space-between`, and its gap (0.51 em) now reads slightly airier than desktop's (0.48 em). Making it airier still would mean shrinking the tablet font through the `23` divisor in its font formula — deliberately not done.
- Reading font size stays untouched at every breakpoint (ADR 0004 Option A remains rejected).

## Follow-ups

- Visual e2e baselines: the `desktop` Playwright project runs at 1280×800, which is inside the untouched tablet band, and `mobile` at 390×844 is untouched — measurements suggest no baseline churn, but CI's visual-e2e run is the authority.

---

## Addendum — Per-band reader size contracts, desktop presets, and tablet double view (2026-08-11)

**Type:** feature
**Status:** implemented — verification complete
**Trello:** [#172](https://trello.com/c/C12euyK1/172-reader-rhythm-claim-the-unused-vertical-space-into-line-gaps-desktop-tablet); the related frame-collision fix is [#188](https://trello.com/c/4sQ8ybEs/188-fix-surah-frame-collision-with-adjacent-lines-tashkeel)

### Summary

Replace the shared 1–10 `FONT_V1` viewport-height scale with clear per-band contracts. Mobile stays byte-for-byte visually unchanged. Tablet remains responsive but is always a double-page spread, sizing its text from the smaller width/height cap multiplied by `0.96`. Desktop gains Small/Medium/Large presets of 26/28/30px, defaulting to Small; each resolved size controls both the Quran ink and the physical page width so smaller text never floats in an old-width card. See ADR 0038.

### Root Cause / Approach

The old model applies one `vh` formula, then each breakpoint overrides a different subset of its consumers. On tall desktop viewports scale 1 grows to about 32px; tablet substitutes its own auto-fit font yet still inherits capped base rhythm variables; and a font-only desktop reduction leaves the card at its old `FONT_V1` width. The legacy `--fq-heading-h` budget no longer describes actual page-level `SurahBannerLine` and `BismillahLine` slots, so it cannot guarantee their clearance.

Use one resolved CSS value per active surface. Desktop preset values drive ink, card width, frame fallback, and floor rhythm together. Tablet derives its value from its existing geometric caps and multiplies the result by `0.96`; the released height feeds `space-between`. The existing separate frame and Bismillah slots retain their 15-slot model; their direct sibling relationship owns an explicit `0.2em` internal clearance, while the existing `0.3em` top clearance against preceding Quran text remains intact.

### Decision Tree / Algorithm

| Condition | Word-size source | View | Result |
|---|---|---|---|
| `<768px` | Existing `--fq-mobile-font` | Single | No visual or preference change. |
| `1024–1366px` | `min(widthCap, heightCap) × 0.96` | Forced double | Both pages show regardless of stored `quranSafhaView`; pair navigation is used; 0.2em internal surah-start clearance is reserved. |
| `≥1367px`, Small/default | 26px desktop preset, bounded by double-view width fit when applicable | User choice | Ink and page width resolve from the same value. |
| `≥1367px`, Medium | 28px desktop preset, bounded by double-view width fit when applicable | User choice | Same geometry contract. |
| `≥1367px`, Large | 30px desktop preset, bounded by double-view width fit when applicable | User choice | Same geometry contract. |
| Legacy `quranFontScale` stored value | Ignored | — | New `desktopQuranFontSize` defaults to `small`; no numeric migration. |

### Verified Test Cases

| Case | Verified outcome |
|---|---|
| Mobile, 390×844 | Existing font and generous `space-between` rhythm remain unchanged. |
| Desktop page 604, 1782×1030, Small | 26px ink and 526.19px printed-proportion cards confirmed, with generous paper margins around the smaller desktop text. The navigation/reader one-pixel height mismatch is corrected so the page has no document scroll. |
| Tablet page 604, 1024×768, double | ~30px (`31.2px × 0.96`), zero document scroll, both pair members `display:block`, and explicit frame-to-Bismillah clearance. |
| Tablet with stored `quranSafhaView: "single"` | Must still display both pair members and advance a pair per navigation action. |
| Desktop Small/Medium/Large | 26/28/30px respectively; all retain proportional page widths, never horizontally stretch QPC glyphs, and fit without scroll at the documented reference viewports. |
| Surah-start pages, regular and tajweed | Frame width continues to match the real rendered line; top clearance remains ≥ the existing verified 6.84px; the new internal frame-to-Bismillah clearance is present. |

### Files to Change

- `app/constants/font.ts` — replace the shared numeric `FONT_V1` scale contract with desktop preset metadata and the tablet density constant; remove obsolete numeric-derived helpers only after every consumer is moved.
- `app/types/index.ts`, `app/utils/storage.ts`, `app/contexts/DesktopQuranFontSizeContext.tsx` — semantic desktop-size type and new `desktopQuranFontSize` storage key; old `quranFontScale` is ignored.
- `app/components/DesktopQuranFontSizeControls.tsx`, `app/components/SettingsSidebar.tsx` — desktop-only Small/Medium/Large controls, hidden on mobile and tablet.
- `app/components/QuranSafha.tsx` — resolved desktop/card variables and the frame+Bismillah sibling clearance while preserving skeleton and fixed opening-page slot parity.
- `app/components/reader/QuranSpread.tsx`, `app/components/reader/ReaderPager.tsx` — forced tablet pair navigation while retaining desktop’s saved view preference and toggle.
- `app/globals.css` — consolidate responsive size variables, replace stale `0.417`/`2.417` caps with values derived from each active contract, apply tablet’s `0.96` factor, and remove the tablet-visible view-toggle path without changing mobile rules.
- `docs/architecture/DECISIONS.md`, `docs/architecture/adr/0038-reader-size-contracts-and-tablet-double-view.md` — record the final implementation and superseded constraints.

### Constraints

- Do not change mobile font sizing, mobile spacing, or mobile navigation.
- Do not stretch Quran glyphs, justify at word boundaries, or use a fixed frame width; `SurahBannerLine` continues measuring actual row width.
- Keep the frame art at native aspect ratio and retain its existing 0.3em clearance above the frame.
- Tablet font size must always fit both width and height; ~30px is a reference result at 1024×768, not a global fixed pixel value.
- Tablet must not show a single-page toggle or honor a persisted single-page preference.
- The 15-slot page model, opening-page fixed template, equal facing-page height, tajweed visual-density scaling, and font-loading skeleton parity remain load-bearing.
- Keep the work tied to its existing reader-rhythm ticket (#172); the frame-collision portion is also tracked by #188.

### What NOT to Do

- Do not raise `lineGapRatio` as an isolated fix, lower the 800px reader-rhythm gate, or alter the tablet `/23` divisor alone; all were measured dead ends.
- Do not leave a smaller desktop font inside a card sized from the old base formula.
- Do not migrate old numeric preferences into semantic sizes; use the new key and default to Small.
- Do not force a fixed ~30px tablet font across every tablet viewport.
- Do not remove the desktop single/double preference; only tablet is forced double.

### Decisions Made

- Desktop presets: Small 26px (default), Medium 28px, Large 30px.
- Mobile is unchanged and non-adjustable.
- Tablet is responsive `min(widthCap, heightCap) × 0.96`, always double-page, and gains explicit frame-to-Bismillah clearance.
