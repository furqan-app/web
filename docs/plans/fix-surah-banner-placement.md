---
title: "Fix: Surah Banner Placement and Standalone Line Sizing"
type: bug
date: 2026-07-07
status: implemented
area: surah-layout
---

# Fix: Surah Banner Placement and Standalone Line Sizing

## Summary

Surah name banners were rendered inline at the first word of verse 1, causing wrong positioning and unequal page heights in the double-page spread. The fix derives banner and bismillah positions from **`line_number` gaps** in the `lines` prop — no DB changes — and lands them as real, `1em`-tall standalone line slots. The banner "frame" art is the authentic KFGQPC surah-header glyph, rendered full-width at a **DOM-measured** width and revealed only once that measurement has settled.

## Approach

### Gap-based placement

`lines` is `Record<string, WordWithVerse[]>` keyed by `line_number` (1–15). The **missing** slot numbers are exactly where surah-name / bismillah lines belong.

```ts
const occupied = new Set(lineKeys.map(Number));
const missing  = [1..15].filter(n => !occupied.has(n));       // → consecutive gap groups [{start,end}]
```

| Gap classification | Condition | Render |
|---|---|---|
| Start / mid banner | a line exists **after** the gap and its first word is `surahId:1:1` | per the size table below |
| End banner | no line after the gap, and the last word before it ends its surah (`verseNum === chapter.verses_count`) | `SurahBannerLine` for `surahId + 1` (guarded `endingSurahId < 114`) |

| Gap size | Bismillah? | Render |
|---|---|---|
| 2 | yes | `SurahBannerLine` at `gap.start`, `BismillahLine` at `gap.start + 1` |
| 1 | yes | `BismillahLine` only (the name was on the previous page's end banner) |
| 1 | no | `SurahBannerLine` |

Build an ordered `RenderItem[]` — `{ type: "words" | "surahBanner" | "bismillah" | "blank"; slot; … }` — sort by slot, render in one pass. `QuranLine` gets a `suppressInlineHeaderForSurahId?: number` prop (`shouldRenderSurahHeader = v===1 && w===1 && surahId !== suppressInlineHeaderForSurahId`) — the inline header is suppressed **only** when a banner was actually rendered for that surah.

Verified **114/114** surahs on 604/604 pages (re-confirmed under the correct per-edition composition, `tajweed-mushaf-mode.md` Addendum 14). `line_type` ingestion is permanently unnecessary — gap detection derives the same information.

### Pages 1–2: a fixed 15-slot template (not gap-derived)

Pages 1 (Fatiha) and 2 (Baqara opening) use a hardcoded template, `page <= 2` only — the general algorithm runs unchanged for the other 112 surah-opening pages:

| slot | page 1 | page 2 |
|---|---|---|
| 1–3 | blank | blank |
| 4 | `SurahBannerLine` (surah 1) | `SurahBannerLine` (surah 2) |
| 5 | blank | blank |
| 6 | 1st content line (surah 1 has no bismillah SVG — verse 1:1 *is* the Basmala, real text) | `BismillahLine` (SVG) |
| 6/7–12 | 7 content lines, sequential | 6 content lines, sequential |
| 13–15 | blank | blank |

Every slot is a real flex child (`1em` height, `leading-none`) — blanks included — using the same `justify-between` / `space-between` rhythm every other page uses. The `.fq-safha-center` CSS special case (centred block + fixed `0.55em` gap) is **removed entirely**, not layered. The loading skeleton for pages 1–2 uses the standard 15-slot shape (`SKELETON_LINE_COUNT_SHORT` removed) so the skeleton→content transition doesn't jump (ADR 0034).

### The frame

`SurahBannerLine`'s art is the authentic KFGQPC surah-header band — glyph **U+E000**, extracted **losslessly** (path extraction via fontTools `SVGPathPen`, not a trace) from QUL's `quran-common.ttf`. Single `fill="currentColor"` (no `COLR`/`CPAL` — one colour, driven by one `color` declaration on the parent, so **no frame-specific colour token**); `viewBox="0 -828 8240 1016"`; native ratio **8.1102 : 1**; the cartouche is empty (سورة is rendered separately as the name glyph).

- **Full width, undistorted, `height: auto`** — never a fixed `em` height (that stretched the art ~3%, the exact defect being removed). Absolutely positioned, centred on both axes. The layout **slot stays `1em`** — the ornament *ink* (~1.81em) overflows into the empty gaps above/below, exactly as print does — so the 15-slot budget, equal-height spread, and gap detection are untouched.
- **Width is DOM-measured, not a ratio.** After mount and on `ResizeObserver`, the component takes the **max rendered width of every `.fq-safha-row`** in its own `.fq-quran-safha` (max-of-all, so a short adjacent line doesn't make the frame look undersized) and sets that exact px value. Mode/breakpoint/edition-agnostic by construction — it reads what rendered instead of predicting it. `QURAN_MAX_LINE_WIDTH_RATIO = 14.42` (deliberately **distinct** from `QURAN_LINE_WIDTH_RATIO = 14.7`, the card's padded minWidth *floor* — real line width varies 14.13–14.42em page to page) survives only as the SSR / first-paint fallback.
- **Clearance above the frame is an explicit `marginTop: 0.3em`**, on top of the standard `--fq-line-gap` (`marginBottom` stays `var(--fq-line-gap)` so the existing `> * { margin-bottom: 0 !important }` still zeroes it and the container `gap`/`space-between` supplies one gap). Nothing zeroes `margin-top`, so this is a real, additional, width-independent gap. Worst-case ink-to-ink clearance measured at **6.84px** across 122 samples (was 0.25px).
- **Reveal is gated on the banner's own `measured` flag**, independent of the container's `fontReady`. `measure()` updates `lineWidth` from every trigger; a separate `reveal()` wrapper — called **only** from the double-`requestAnimationFrame` callback and the 150ms fallback timer (the first reliable point to read final row boxes) — flips `measured`. `visibility: measured ? "visible" : "hidden"`. Gating on any successful `measure()` still snapped, because the untrusted immediate / `ResizeObserver` call can return a stale width. Trade-off (user-confirmed): the banner reveals 1–2 frames after the page text on *every* surah-opening load, not just cached revisits — no cold-load-vs-revisit branching.
- Name glyph `fontSize: 0.9em`.

`BismillahLine` renders `BismillahSVG` at ~`1.2em` ink in a `1em` slot (same overflow mechanism), `leading-none`.

### Equal-height spread

`.fq-spread` carries `items-stretch`; the row sizes to its taller child and stretches the shorter wrapper (which then has a definite cross-size for the `h-full` chain). **No viewport pin** on `ReaderPage` (`md:h-[calc(100dvh-3.5rem)]` broke font-scale adaptivity and forced Al-Fatiha to full height) — keep `min-h-[calc(100dvh-3.5rem)]`. Page-wrapper divs must **not** have `md:h-full` — an explicit `height: 100%` on a flex item is not stretched by `align-items: stretch` and collapses the shorter page to content height. Inter-line spacing on desktop: `gap: var(--fq-line-gap)` + `justify-content: flex-start` (surplus collects top-aligned at the bottom of the shorter page); mobile keeps `space-between`.

## Verified Test Cases

- p595 slots 2–3: banner(91) + bismillah (was bismillah only, سورة الشمس missing). p597: banner(95) + bismillah. p594: banner(90) + bismillah at 6–7, سورة الشمس correctly at the top of p595.
- Page 1: blank×3, banner@4, blank@5, 7 content lines (6–12, first carries the real Basmala text), blank×3. Page 2: blank×3, banner@4, blank@5, bismillah@6, 6 content lines (7–12), blank×3.
- Frame width vs the page's own widest real line: exact match across 7 viewports / 6 pages / 2 font scales / **2 editions** / 3 themes; ratio measured 8.110–8.113. Frame stays inside the card at every size; overhang of the longest line 7.4–8.8px.
- Worst-case gap above/below the frame: 6.84px minimum, all positive (17 mid-page surah-opening pages × 4 viewports × both sides).
- Cold load: frame starts `visibility:hidden` at the SSR fallback width, settles ~2s later to `visible` at the measured width — never seen visible at the wrong width. Cached revisit: style written twice (`224px` while hidden → `364px` on reveal) — the reveal always carries the final width.
- Equal-height spread: pages 75/76 measure identical height (content-driven); dark + tajweed page 106, all 6 `.fq-quran-safha` in view exactly equal.

## Files to Change

- `app/components/QuranSafha.tsx` — the gap algorithm + `page <= 2` fixed-template branch + `RenderItem[]` one-pass render; `SurahBannerLine` (extracted-glyph SVG, `useRef`/`useLayoutEffect`/`ResizeObserver` width measurement, `measured` state + `reveal()` wrapper, `marginTop: 0.3em`, glyph `0.9em`); `BismillahLine`; `blank` slot div; remove `page <= 2 ? "fq-safha-center"` and `SKELETON_LINE_COUNT_SHORT`.
- `app/components/QuranLine.tsx` — `suppressInlineHeaderForSurahId?: number` prop.
- `app/surah-frame.svg` — the extracted U+E000 path, single `fill="currentColor"` (the Addendum-5 `.fb`/`.fl`/`.fg` classes + inline `<style>` removed).
- `app/components/reader/QuranSpread.tsx` — root `md:h-full md:items-stretch`, `.fq-spread` div `md:h-full`, page-wrapper divs **no** `md:h-full`.
- `app/components/reader/ReaderPage.tsx` — keep `min-h-[calc(100dvh-3.5rem)]`, remove `md:h-[calc(100dvh-3.5rem)]`.
- `app/globals.css` — desktop `.fq-spread .fq-quran-safha` spacing (`gap: var(--fq-line-gap)`, `flex-start`); remove all `.fq-safha-center` rules, `--surah-frame-*` colour tokens, the dark-theme "force it gold" frame overrides, the `--fq-surah-frame-w` / `--fq-safha-font` frame-width machinery.
- `docs/architecture/DECISIONS.md` — "Surah Banner Placement" as IMPLEMENTED (gap-derived; pages 1–2 fixed-template exception; frame is a losslessly-extracted glyph, DOM-measured width, `marginTop` clearance, measurement-gated reveal).

No changes to Prisma schema, DB, seeder, `getPageWords`, `PageMetadata`.

## Constraints

- Banner / bismillah / blank elements are direct children of `.fq-quran-safha`, `1em` layout height, `leading-none` (no exceptions for blank slots). Ornament ink overflow comes from **absolute positioning only** — the outer div must never exceed `1em`, or equal-height spread and the 15-slot budget break.
- `lineKeys` must be sorted numerically (`Object.keys()` doesn't guarantee order). `endBannerSurahId = endingSurahId + 1`, guarded `endingSurahId < 114`.
- Do not suppress the inline header unless a banner was actually rendered for that surah.
- Only `page <= 2` uses the fixed template — the general gap algorithm and its `RenderItem` shapes are untouched for every other page (beyond adding the `blank` variant).
- Frame width is DOM-measured — never a fixed em ratio (tried twice, both needed a further correction once real per-page/per-mode variation showed up). `QURAN_MAX_LINE_WIDTH_RATIO` survives only as the SSR fallback; do not unify it with `QURAN_LINE_WIDTH_RATIO`.
- Keep the `ResizeObserver` — the measured width goes stale on font-scale changes and single/double toggles otherwise.
- `measured` must be set in the same call as `lineWidth` and only from the trusted double-RAF / 150ms callbacks — never gate visibility on `lineWidth != null` (its fallback is never `null`, making the gate a no-op).
- Measure the **max** across all `.fq-safha-row` in the container, not just the adjacent line.
- Frame art comes from a font glyph, extracted losslessly — never traced from a raster (the surahapp PNG and a page photo were both evaluated and rejected). One fill; no second/third colour token.
- Do not stretch the art to the line ratio by any means (`preserveAspectRatio="none"`, viewBox widening, translating ornaments outward) — that is the Addendum-6 mistake this reverts.
- ADR 0016 is superseded — the approach uses `line_number` gaps, not `PageMetadata` fields.

## What NOT to Do

- Do not render the surah header inline at `verse 1 word 1` without page-level slot awareness — the original bug.
- Do not derive pages 1–2 slot positions from real `line_number` data, or keep `.fq-safha-center` / `gap: 0.55em` as a fallback alongside the template.
- Do not go back to a fixed em ratio for the frame width, or remove the `marginTop` clearance to "simplify" — width and gap are two separate independently-verified concerns.
- Do not gate the banner's visibility on the container's `fontReady` alone, or special-case cold-load vs revisit for the gate.
- Do not render the frame at `height: 1em` in flow (that's 55% of the line width, contradicting the measured KFGQPC layout), or let the outer div exceed `1em`.
- Do not switch the surah-name font to QUL's `surah-name-v4` — `sura_names.ttf` v1 is the integrated font (a separate decision).
- Do not change the gap-detection algorithm or `RenderItem[]` for pages other than 1–2, or add `md:h-full` to a page-wrapper div (collapses the shorter page).
- Do not reintroduce a viewport pin (`md:h-[calc(100dvh-3.5rem)]`) on `ReaderPage`.

## Constraints on licensing

The U+E000 glyph comes from QUL's `quran-common.ttf`; QUL's FAQ explicitly declines a blanket licence for its fonts (supplied by KFGQPC). This project already ships KFGQPC assets (the QCF page fonts, `code_v1`) from the same publisher — settle the basis once and record it for both. If it turns out restrictive, the frame must be redrawn natively.

## Decisions Made

- Banner positions are derived from `line_number` gaps in `lines` — no DB fields, no `line_type` ingestion (ever).
- Pages 1–2 get a fixed hardcoded 15-slot template (their content-line counts, 7 and 6, fit the same assignment regardless of raw gap size); `.fq-safha-center` removed entirely.
- The frame is a losslessly-extracted KFGQPC glyph (U+E000), single fill, full-width, undistorted, `1em` layout slot with ink overflow — full width beats exact ink height, on the measured KFGQPC layout.
- Frame width is DOM-measured at runtime from real `.fq-safha-row` elements; clearance above is a width-independent explicit `marginTop: 0.3em`; the reveal is gated on the banner's own `measured` flag.
- Equal-height spread is content-driven via `items-stretch` (no viewport pin); desktop inter-line spacing is `gap` + `flex-start`, mobile keeps `space-between`.

## Revision History

- Addenda 1–3 (equal-height spread + inter-line spacing): `.fq-spread` `items-stretch` equalises to the taller page; a first pass added `md:h-[calc(100dvh-3.5rem)]` which broke font-scale adaptivity and was removed (keep `min-h`); page-wrapper divs must not carry `md:h-full`; desktop rhythm became `gap: var(--fq-line-gap)` + `flex-start` (mobile keeps `space-between`). **The base plan's first banner-algorithm attempt was reverted (wrong banners); surah names fell back to inline rendering until Addendum 4.**
- Addendum 4 (2026-07) — the implemented gap-based placement (algorithm above). **Supersedes ADR 0016** (`PageMetadata`-field approach).
- Addenda 5–7 — a decorative SVG frame (Addendum 5, PNG-derived), reshaped to the line ratio (Addendum 6), bismillah SVG sizing (Addendum 7, `1.2em` ink / `1em` slot). **Addendum 6's ratio-forcing was itself the distortion Addendum 8 reverts.**
- Addendum 8 (2026-08-01) — **replaces the SVG/PNG frame with the losslessly-extracted KFGQPC glyph U+E000** (QUL `quran-common.ttf`), single `fill="currentColor"`, full-width undistorted, `1em` layout slot / ~1.81em ink overflow. Implementation corrections: `height: auto` (never a fixed `em` — measured a 3% stretch); the frame's width must track the *text block* not the *card* (`QURAN_MAX_LINE_WIDTH_RATIO = 14.42`, distinct from `QURAN_LINE_WIDTH_RATIO`); the tight clearance band is desktop/tablet, not mobile. Removed all `--surah-frame-*` colour tokens and the dark-theme "force it gold" overrides. Licence gate flagged (unresolved — see above).
- Addendum 9 (2026-08-02) — tajweed frame width: the `14.42em` outer-div width resolved against `.fq-quran-safha`'s tajweed-scaled `font-size` (×0.85/×0.88), so the frame was ~83% width. Fixed with a `--fq-safha-font` custom property holding the pre-scale base font. **Later removed** — Addendum 11's DOM measurement makes the whole em-ratio approach unnecessary.
- Addendum 10 (2026-08-03) — the fixed 15-slot template for pages 1–2 (above). **Supersedes Addendum 4's "pages 1–2 handled by the general algorithm"** and removes the `.fq-safha-center` CSS mechanism.
- Addendum 11 (2026-08-10) — **frame width is DOM-measured, not a ratio** (`ResizeObserver`, max of all `.fq-safha-row`); an explicit `marginTop: 0.3em` clears the line above independent of width (the ratio-guessing tried twice — Addendum 9 and this addendum's own first pass — both needed correction); glyph `fontSize` `1.18em → 0.9em`; `--fq-surah-frame-w` / `--fq-safha-font` machinery removed.
- Addendum 12 (2026-08-23) — **the frame's reveal is gated on its own `measured` flag** (Issue #373), independent of the container's `fontReady`, and `measured` is flipped only from the trusted double-RAF / 150ms callbacks (gating on any successful `measure()` still snapped, because the untrusted immediate / `ResizeObserver` call can return a stale width).
