---
title: "Reader Rhythm: Per-Band Size Contracts, Desktop Presets, Tablet Double View"
type: feature
date: 2026-08-02
status: implemented
area: reader
---

# Reader Rhythm: Per-Band Size Contracts, Desktop Presets, Tablet Double View

## Summary

The reader has three physically different surfaces — a width-filled mobile page, a full-viewport tablet spread, and a desktop book on a desk — and a shared 1–10 `vh` `FONT_V1` scale was overridden independently by each, leaving word size, page width, line rhythm, and surah-start clearance without one source of truth. This replaces that scale with **per-band contracts** ([ADR 0054](../../architecture/adr/0054-reader-size-contracts-and-tablet-double-view.md)):

- **Mobile (`<768px`)** — unchanged and non-adjustable (`--fq-mobile-font`, ADR 0011).
- **Tablet (1024–1366px)** — always a double-page spread; word size resolves `min(widthCap, heightCap) × 0.96`; the released height feeds `space-between` rhythm; an explicit `0.2em` frame-to-Bismillah clearance is reserved.
- **Desktop (`≥1367px`)** — Small/Medium/Large presets of **26/28/30px**, defaulting to Small (`desktopQuranFontSize` storage key; the old numeric `quranFontScale` is ignored, no migration). The resolved size governs word ink, page width, frame fallback, and vertical rhythm together.

The desktop card fills its height band and `space-between` hands the surplus to the inter-line gaps ([ADR 0036](../../architecture/adr/0036-reader-fills-height-band.md)) — the model mobile has used since ADR 0011, gated at `min-height: 800px` (below that the lines already fill the band and stretching only pushes the card under the recitation bar).

## Approach

Use **one resolved CSS value per active surface** instead of a shared numeric scale that each breakpoint re-derives.

- **Desktop preset values drive ink, card width, frame fallback, and floor rhythm together** — a smaller font never floats in an old-width card. The card stretches to the reader's height band (`.fq-reader-spread-container` is `flex: 1 1 auto` + `align-items: stretch`, with every level between it and the page wrapper kept height-less so the stretch passes through) and `.fq-spread .fq-quran-safha` uses `justify-content: space-between` with `gap: var(--fq-line-gap)` as the floor. Desk margin (`padding-block` on the spread container) and a wider page side margin (`padding-inline` on `.fq-content`, `≥1367px`) shorten the paper off the viewport edges.
- **Tablet derives its value from its existing geometric caps** and multiplies by `0.96`; the released height feeds `space-between`. It is forced double-page regardless of any stored `quranSafhaView`, and pair navigation is used.
- **The separate `SurahBannerLine` / `BismillahLine` slots** keep their 15-slot model; their sibling relationship owns an explicit `0.2em` internal clearance, and the existing `0.3em` top clearance against preceding Quran text is intact.

`height: 100%` cannot carry the stretch — inside a flex-grown box it resolves to `auto`. The height must arrive by `align-items: stretch` at every level, which is why the rule drops `md:h-full` rather than adding more of it.

## Decision Tree / Algorithm

| Condition | Word-size source | View | Result |
|---|---|---|---|
| `<768px` | `--fq-mobile-font` (existing) | Single | No visual or preference change. |
| `1024–1366px` | `min(widthCap, heightCap) × 0.96` | **Forced double** | Both pages show regardless of stored `quranSafhaView`; pair navigation; `0.2em` surah-start clearance reserved. |
| `≥1367px`, Small / default | 26px preset, bounded by double-view width fit where applicable | User choice | Ink and page width resolve from the same value. |
| `≥1367px`, Medium | 28px preset | User choice | Same geometry contract. |
| `≥1367px`, Large | 30px preset | User choice | Same geometry contract. |
| `≥1367px` **and** `min-height < 800px` | preset value, `flex-start` + floor gap | User choice | No band-fill — no surplus to distribute, only the recitation bar to collide with. |
| Legacy `quranFontScale` stored value | ignored | — | `desktopQuranFontSize` defaults to `small`; no numeric migration. |

The `min-height: 800px` gate coincides with the recitation rail's own gate (`≥1367px` + `≥800px`, [recitation-bar-vertical-rail.md](../recitation-bar-vertical-rail.md)) — that ticket removed the 104px bottom reserve this rhythm claims.

## Verified Test Cases

| Case | Verified outcome |
|---|---|
| Mobile, 390×844 | Existing font and generous `space-between` rhythm unchanged. |
| Desktop page 604, 1782×1030, Small | 26px ink, 526.19px printed-proportion cards, generous paper margins; the nav/reader 1px height mismatch corrected so there is no document scroll. |
| Tablet page 604, 1024×768, double | ~30px (`31.2px × 0.96`), zero document scroll, both pair members `display:block`, explicit frame-to-Bismillah clearance. |
| Tablet with stored `quranSafhaView: "single"` | Still shows both pair members and advances a pair per navigation. |
| Desktop Small / Medium / Large | 26 / 28 / 30px; all retain proportional page widths, never horizontally stretch QPC glyphs, fit without scroll at the reference viewports. |
| Surah-start pages, regular and tajweed | Frame width matches the real rendered line; top clearance ≥ the verified 6.84px; the new internal frame-to-Bismillah clearance present. |
| 1440×760 (gate off) | `flex-start` + floor gap, card sits exactly on the bar, no scroll. |

## Files to Change

- `app/constants/font.ts` — replace the numeric `FONT_V1` scale contract with desktop preset metadata + the tablet density constant; remove obsolete numeric-derived helpers only after every consumer is moved.
- `app/types/index.ts`, `app/utils/storage.ts`, `app/contexts/DesktopQuranFontSizeContext.tsx` — semantic desktop-size type + new `desktopQuranFontSize` key; old `quranFontScale` ignored.
- `app/components/DesktopQuranFontSizeControls.tsx`, `app/components/SettingsSidebar.tsx` — desktop-only Small/Medium/Large controls, hidden on mobile and tablet.
- `app/components/QuranSafha.tsx` — resolved desktop/card variables and the frame + Bismillah sibling clearance, preserving skeleton and fixed opening-page slot parity.
- `app/components/reader/QuranSpread.tsx`, `app/components/reader/ReaderPager.tsx` — forced tablet pair navigation while retaining desktop's saved view preference and toggle. `fq-spread-col` marker class on the spread column so the stretch chain targets it without a positional selector.
- `app/globals.css` — consolidate responsive size variables; replace stale `0.417` / `2.417` caps with values derived from each contract; the `@media (min-width: 768px) and (min-height: 800px)` rhythm block (stretch chain, `space-between`, bottom-bar reserve, skeleton mirror); a 768–1023px desk-margin block; desk + page side margins inside `(min-width: 1367px) and (min-height: 800px)`; apply tablet's `0.96` factor and remove the tablet-visible view-toggle path without changing mobile rules.
- `docs/architecture/DECISIONS.md`, `docs/architecture/adr/0054-reader-size-contracts-and-tablet-double-view.md`, `docs/architecture/adr/0036-reader-fills-height-band.md` — record the final implementation and superseded constraints.

## Constraints

- **`gap` under `space-between` is load-bearing as a floor** — flexbox distributes only positive free space, so a page taller than the band degrades to `flex-start` with the floor intact instead of overlapping lines.
- Every level between the spread container and the page wrapper must stay height-less at `md`+; re-adding `md:h-full` anywhere in that chain silently collapses the card to content height.
- The bottom reserve tracks the horizontal recitation bar (measured height + clearance); it must stay in step with that bar and stay `!important` to beat the JSX `pb-4`.
- Do not change mobile font sizing, mobile spacing, or mobile navigation.
- Do not stretch Quran glyphs, justify at word boundaries, or use a fixed frame width; `SurahBannerLine` continues measuring actual row width. Keep frame art at native aspect ratio and its `0.3em` clearance above the frame.
- Tablet font size must always fit both width and height; ~30px is a reference result at 1024×768, not a fixed pixel value. Tablet must not show a single-page toggle or honour a persisted single-page preference, and must never receive the desk margin (it would push the 100dvh card past the viewport and scroll it).
- Do not raise `lineGapRatio` — the ceiling from `fix-tajweed-font-size.md` Addendum 2 (~0.44 at scale 3 / 768px) still applies, and the gap now comes from distribution, not the ratio.
- The 15-slot page model, opening-page fixed template, equal facing-page height, tajweed visual-density scaling, and font-loading skeleton parity remain load-bearing.
- Keep the work tied to ticket #172; the frame-collision portion is also tracked by #188.

## What NOT to Do

- Do not use `justify-content: space-between` (or any word-spacing trick) to widen a mushaf **line** — the line is justified by kashida baked into the font's glyphs; distributing space at word boundaries shifts every word off its printed position (tried and reverted; DECISIONS.md mushaf-justification entry). A line gets wider only when the font gets bigger.
- Do not raise `lineGapRatio` as an isolated fix, lower the 800px reader-rhythm gate, or alter the tablet `/23` divisor alone — all measured dead ends.
- Do not leave a smaller desktop font inside a card sized from the old base formula.
- Do not raise a desktop preset (or widen the paper) without re-checking the line gap — height and gap trade 1:1 inside the fixed-height card, and a bigger font drops the gap.
- Do not pin a fixed `height` / `100dvh` on the reader outer or the spread to force the fill — a flex item with an explicit height is not stretched, and content taller than the box clips inside the `overflow-hidden` card at high sizes.
- Do not extend the band-fill below 800px viewport height — no surplus there, only the recitation bar to collide with.
- Do not apply the desk/side margins to the standalone `QuranSafha` (`/pages/vertical`, `QuranPage`) — every rule here is scoped to `.fq-spread` / `.fq-reader-outer` deliberately.
- Do not migrate old numeric preferences into semantic sizes — use the new key, default to Small.
- Do not force a fixed ~30px tablet font across every tablet viewport.
- Do not remove the desktop single/double preference — only tablet is forced double.
- Do not change the font declaration alone — the sizing variables and the tablet navigation condition must be refactored together, or width drift / scroll / an incorrect one-page tablet spread returns (ADR 0054).

## Decisions Made

- Per-band contracts (ADR 0054): mobile unchanged and non-adjustable; tablet responsive `min(widthCap, heightCap) × 0.96`, always double-page, with explicit frame-to-Bismillah clearance; desktop Small 26px (default) / Medium 28px / Large 30px, the resolved size driving ink, page width, frame fallback, and rhythm together.
- Desktop card fills its height band via `space-between` (ADR 0036); opening pages 1–2 sit as a centred block inside a full-height card rather than a short card, so every spread is the same size.
- The legacy numeric `quranFontScale` is retired with no numeric-to-semantic migration — `desktopQuranFontSize` starts at Small, the old key is ignored.
- Width is the free knob for desktop rhythm — page margin costs nothing in line gap.

## Revision History

- 2026-08-11 — folded Addendum (Trello #172; frame-collision fix #188), which introduced [ADR 0054](../../architecture/adr/0054-reader-size-contracts-and-tablet-double-view.md). **Supersedes two decisions from the original 2026-08-02 plan:** (1) "reading font size stays untouched at every breakpoint" — desktop now has 26/28/30px presets; (2) "tablet is left alone" — tablet is now forced double-page, resized to `min(widthCap, heightCap) × 0.96`, and gains an explicit frame-to-Bismillah clearance. The shared 1–10 `FONT_V1` `vh` scale is replaced by per-band contracts. The original plan's band-fill mechanism (ADR 0036 — stretch chain + `space-between` floor + desk/side margins, gated `min-height: 800px`) is retained as the desktop rhythm substrate, now fed by the preset-resolved size instead of `FONT_V1`.
