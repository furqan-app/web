# Fix: Surah Banner Placement and Standalone Line Sizing

**Type:** bug  
**Date:** 2026-07-07  
**Status:** implemented (Addendum 8 — blocked on the QUL licence gate before merge)  
**Trello #93:** https://trello.com/c/W0rsfojh/93-add-a-frame-for-the-surah-name-in-the-mushaf  
**Trello #123:** https://trello.com/c/tYOF9J1l/123-fix-surah-banner-frame-height-causing-unequal-page-heights-in-spread  
**Trello #133:** https://trello.com/c/eFWXR9ca — surah name frame, full text width (Addendum 8)  
**Trello:** https://trello.com/c/sRC6NhMS/72-surah-name-banners-render-at-end-of-page-madani-layout

## Summary

Two bugs shipped together (Bug 2's fix is a prerequisite for Bug 1's correctness):

**Bug 1:** Surah name banners rendered inline at the first word of verse 1, causing wrong positioning and unequal page heights in the double-page spread.

**Bug 2:** Glyph + bismillah crammed into a single `--fq-heading-h` block using fractional sizes. As standalone 1-slot lines they must use `1em` (the only token that tracks correctly across mobile, single, and double-page modes).

**Root cause:** `QuranLine` renders the surah header inline at `verseNumber === 1 && wordNumber === 1` with no page-level slot awareness.

**Final approach (Addendum 4):** Banner positions derived from `line_number` gaps in the `lines` prop. No DB changes. See Addendum 4 for the implemented algorithm.

## Files to Change

- `app/components/QuranSafha.tsx` — banner position derivation from `lineKeys` gaps; `SurahBannerLine`/`BismillahLine` helpers; `suppressInlineHeaderForSurahId` prop to `QuranLine`
- `app/components/QuranLine.tsx` — `suppressInlineHeaderForSurahId?: number` prop; guard `shouldRenderSurahHeader` against it
- `app/globals.css` — desktop spread spacing rules (Addendum 1/3)
- `app/components/reader/QuranSpread.tsx` — `md:h-full md:items-stretch` (Addendum 1)
- `app/components/reader/ReaderPage.tsx` — remove `md:h-[calc(100dvh-3.5rem)]` (Addendum 2)

No changes to Prisma schema, DB, seeder, `getPageWords`, `PageMetadata`.

## Constraints

- Banner elements must be direct children of `.fq-quran-safha`.
- Use `1em` for banner/bismillah heights — never `var(--fq-word-base)` or `--fq-heading-h` fractions.
- `leading-none` required on banner outer divs (prevents 1.5em strut from Tailwind body `line-height`).
- `lineKeys` must be sorted numerically — `Object.keys()` doesn't guarantee order.
- `endBannerSurahId = endingSurahId + 1`, guarded by `endingSurahId < 114`.
- Do not suppress the inline header unless a banner was actually rendered for that surah.
- ADR 0016 is superseded — the approach uses `line_number` gaps, not `PageMetadata` fields.

## Reference

- ADR 0016: superseded
- Trello #72: https://trello.com/c/sRC6NhMS

---

## Addendum 1/2 — Equal-height spread (content-driven)

**Goal:** Make both pages in the double-page spread equal height, adaptive to font size.

**Final approach:** `.fq-spread` already has `items-stretch`. The equalizer is letting the row size to its taller child — `items-stretch` then stretches the shorter wrapper. The `h-full` chain below the wrapper (`fq-full-safha` → relative wrapper → card → `fq-content`) resolves because a stretched flex item has a definite cross-size.

**Key gotcha (found in Addendum 2):** Addendum 1 initially added `md:h-[calc(100dvh-3.5rem)]` to ReaderPage (viewport pin), which broke font-scale adaptivity and forced opening pages (Al-Fatiha) to full viewport height. Fix: remove the viewport pin, keep `min-h`. Also: page-wrapper divs must NOT have `md:h-full` — an explicit `height: 100%` on a flex item is NOT stretched by `align-items: stretch` and collapses the shorter page to content height instead.

**Final files:**
- `app/components/QuranSafha.tsx` — `fq-full-safha: md:h-full`; relative wrapper: `md:h-full`; card: `md:h-full`; `fq-content`: remove `md:block md:h-auto`.
- `app/components/reader/QuranSpread.tsx` — root: `md:h-full md:items-stretch`; `.fq-spread` div: `md:h-full`; page-wrapper divs: **no** `md:h-full` (let `items-stretch` do the equalizing).
- `app/components/reader/ReaderPage.tsx` — keep `min-h-[calc(100dvh-3.5rem)]`; remove `md:h-[calc(100dvh-3.5rem)]` and `md:flex-1 md:min-h-0` from row div.
- `app/globals.css` — `@media (min-width: 768px) .fq-spread .fq-quran-safha { flex:1 1 0%; min-height:0; display:flex; flex-direction:column; align-items:center; padding-block:0.5em; }` + `> * { margin-bottom:0 !important }`. Also `.fq-spread .fq-quran-safha.fq-safha-center { justify-content:center; gap:0.55em; }` for short opening pages. All scoped to `.fq-spread` — standalone `QuranSafha` unaffected.

**Verified (Playwright, 1440×900):** pages 75/76 = 565px equal (content-driven); page 1/2 = 518px equal (58% viewport, not stretched full height); at `quranFontScale=8`, 75/76 = 764px both equal.

**Note:** The first attempt also implemented the banner algorithm from the base plan, which was immediately reverted (wrong banners). Surah names fell back to inline rendering until Addendum 4.

---

## Addendum 3 — Restore inter-line spacing (regression from equal-height spread)

`space-between` with zeroed margins (from Addendum 1/2) only produces gaps when the container is taller than its children. After Addendum 2 made the spread content-driven, full 15-line pages had ≈0 surplus and lines touched. (Mobile unaffected — its card is viewport-pinned and taller than the text.)

**Fix:** In the `@media (min-width: 768px) .fq-spread .fq-quran-safha` rule: add `gap: var(--fq-line-gap)` and change `justify-content: space-between` → `flex-start`. Surplus collects at bottom of the shorter (stretched) page — "uniform gap, top-aligned." Do not touch mobile (keeps `space-between`). `--fq-line-gap` resolves per breakpoint automatically.

**Files:** `app/globals.css` — that one rule. **Verified:** 75/76 = 728px equal, `gap: 11.61px` between rows.

---

## Addendum 4 — Gap-based surah banner placement (the implemented approach)

Banner positions derived from `line_number` gaps in `lines` (`Record<string, WordWithVerse[]>` keyed by `line_number` 1–15). Missing slot numbers are exactly where surah-name/bismillah lines belong.

### Algorithm

```ts
// Step 1: find gaps
const occupiedSet = new Set(lineKeys.map(Number));
const missing = Array.from({ length: 15 }, (_, i) => i + 1).filter(n => !occupiedSet.has(n));

// Step 2: group consecutive missing slots → [{start, end}, ...]

// Step 3: classify each gap group
```

| Gap classification | Condition | Render |
|---|---|---|
| Start/mid banner | Line exists AFTER gap AND its first word is `surahId:1:1` | see table below |
| End banner | No line after gap AND last word before gap ends its surah (`verseNum === chapter.verses_count`) | `SurahBannerLine` for `surahId + 1` |

| Gap size | Bismillah? | Render |
|---|---|---|
| 2 | yes | `SurahBannerLine` at `gap.start`, `BismillahLine` at `gap.start + 1` |
| 1 | yes | `BismillahLine` only (surah name was on previous page's end banner) |
| 1 | no | `SurahBannerLine` |

```ts
// Step 4: build ordered render list, sort by slot, render in one pass
type RenderItem =
  | { type: "words"; slot: number; lineKey: string; suppressSurahId?: number }
  | { type: "surahBanner"; slot: number; surahId: number }
  | { type: "bismillah"; slot: number };
```

Pages 1 and 2 handled by the general algorithm (no special-casing): page 1 has an 8-slot gap → SurahBannerLine at slot 1, slots 2–8 render nothing (mushaf decorative opening); page 2 has a 9-slot gap → SurahBannerLine + BismillahLine.

### Component helpers (local to QuranSafha)

```tsx
const SurahBannerLine = ({ surahId }: { surahId: number }) => (
  <div className="leading-none text-center text-black dark:text-white"
    style={{ marginBottom: "var(--fq-line-gap)" }}>
    <span translate="no"
      style={{ fontFamily: "var(--surah-names)", fontSize: "1em", lineHeight: 1 }}>
      {`${surahId}`.padStart(3, "0")}
    </span>
  </div>
);

const BismillahLine = () => (
  <div className="leading-none flex justify-center text-black dark:text-white"
    style={{ marginBottom: "var(--fq-line-gap)" }}>
    <BismillahSVG style={{ height: "1em", width: "auto" }} />
  </div>
);
```

`leading-none` on both outer divs prevents the 1.5em strut from Tailwind's body `line-height`. Banner elements are direct children of `.fq-quran-safha` → `gap: var(--fq-line-gap)` (Addendum 3) + `space-between` (mobile) treat them as real slots automatically.

### QuranLine change

```tsx
const shouldRenderSurahHeader =
  verseNumber === 1 && wordNumber === 1 && surahId !== suppressInlineHeaderForSurahId;
```

**Files:** `QuranSafha.tsx` (gap algorithm, `RenderItem[]` rendering, helpers), `QuranLine.tsx` (`suppressInlineHeaderForSurahId` prop). No changes to schema, DB, seeder, `globals.css`, `QuranSpread.tsx`, `ReaderPage.tsx`.

---

## Addendum 5 — Decorative surah name frame (Trello #93)

**Date:** 2026-07-19  
**Branch:** `feature/93-surah-banner-frame`

### What

Wrap `SurahBannerLine`'s surah name glyph inside a full-width decorative frame matching the printed Madani mushaf style — an ornate pill-shaped border with arabesque medallions on each side and an inner pointed-arch crown decoration.

### Source asset

`/home/tahamohamed/Pictures/surah_banner1.svg` — a mobile-scale SVG (`viewBox="0 0 373 39"`) that includes both left and right ornaments and the full inner arch decoration. Contains exactly 3 fill colors:

| Original hex | Role | Theme mapping |
|---|---|---|
| `#404c6e` | Frame body fill (dark blue) | `hsl(var(--card))` — matches card bg per theme |
| `#fff` | Border lines + inner arch decoration | `var(--surah-frame-line)` — dark on light/gold, light on dark |
| `#cdad80` | Gold arabesque detail | `var(--surah-frame-gold)` — warm gold, varies slightly per theme |

The rectangle also has `stroke="#fff"` → replace with `stroke: var(--surah-frame-line)`.

### Algorithm

No changes to the gap detection or render-item algorithm from Addendum 4. Only `SurahBannerLine` changes visually.

### Decision tree

| Theme | `--surah-frame-line` | `--surah-frame-gold` |
|---|---|---|
| `.theme-light` | `hsl(39 35% 25%)` (warm dark brown) | `#cdad80` |
| `.theme-gold` | `hsl(39 45% 20%)` (rich deep brown) | `#b8924a` |
| `.theme-dark` | `hsl(209 51% 88%)` (matches `--card-foreground`) | `#cdad80` |

### Files to change

- `app/surah-frame.svg` — **new file**: the source SVG with fixed `width`/`height` removed, `width="100%"` added, and all fills replaced with CSS class selectors (`.fb`, `.fl`, `.fg`) + an inline `<style>` block referencing `--surah-frame-*` vars. The `stroke` on the rect also uses `var(--surah-frame-line)`.
- `app/globals.css` — add `--surah-frame-line` and `--surah-frame-gold` to each of `.theme-light`, `.theme-gold`, `.theme-dark` (`.theme-dark.dark` too). Do NOT add `--surah-frame-body` — use `hsl(var(--card))` directly in the SVG.
- `app/components/QuranSafha.tsx` — update `SurahBannerLine`:
  - Import `SurahFrameSVG from "@/app/surah-frame.svg"`
  - Render `SurahFrameSVG` at `width: 100%`, height auto (preserves aspect ratio)
  - Overlay the surah name glyph with `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center`
  - Outer div: `position: relative; leading-none` (keep existing `marginBottom: var(--fq-line-gap)`)
  - Glyph font-size: `0.85em` (slightly smaller than frame height so it sits comfortably inside)
  - Glyph color: keep `text-black dark:text-white` (existing pattern)

### What NOT to do

- Do not use `preserveAspectRatio="none"` — distorts the medallion ornaments.
- Do not add a decorative frame to `BismillahLine` — only `SurahBannerLine` gets the frame.
- Do not set a fixed `height` on the SVG — let it scale proportionally from `width: 100%`. The natural height (≈ viewBox ratio 39/373 × container width) will be slightly taller than `1em` at full page width; this is correct and matches the printed mushaf proportions.
- Do not hardcode colors in `surah-frame.svg` — all three color roles must go through CSS vars for theme support.
- Do not change the gap detection algorithm or `RenderItem[]` types from Addendum 4.

---

## Addendum 6 — Fix frame height causing unequal page heights (Trello #123)

**Date:** 2026-07-20  
**Branch:** `fix/123-surah-banner-frame-height`

### Root cause

`SurahBannerLine` renders the SVG with `width: 100%` + `aspectRatio: "373/39"` (ratio 9.56:1), so its layout height = `container_width × (39/373)`. At typical desktop mushaf card widths (~450px) this produces ~47px — about 50–80% taller than `1em`. The page with the banner becomes taller than its 15-line neighbor, causing visible white space at the bottom of the shorter page in the double-page spread.

### Fix: reshape the SVG to match the line-width aspect ratio

Rather than clipping or shrinking the frame, the SVG itself was modified so its natural aspect ratio matches `QURAN_LINE_WIDTH_RATIO` (14.41:1). With `height: 1em; width: 100%` the frame then renders at exactly `1em` tall and spans the Quran text content width without distortion, clipping, or overflow.

**`app/surah-frame.svg` changes:**

| What | Before | After |
|---|---|---|
| `viewBox` | `0 0 373 39` | `0 0 562 39` |
| Rect width | `304` (x=35→339) | `491` (x=35→526) |
| Right medallion | inline paths at x=337–373 | `<g transform="translate(187.15,0)">` → x=524–560 |
| Central arch | `<g transform="translate(94.5,0)">` | unchanged (spans frame interior) |
| Inner left ornament cluster | part of central group, rendered at x≈186 | `<g transform="translate(8.24,0)">` → left frame edge x≈38–115 |
| Inner right ornament cluster | part of central group, rendered at x≈369 | `<g transform="translate(177.89,0)">` → right frame edge x≈446–523 |

The inner ornament clusters (the knot/diamond shapes) were split out of the central arch group and given independent translates so they sit flush at the left and right ends of the frame rect, mirroring the printed Madani mushaf design.

**`app/components/QuranSafha.tsx` — `SurahBannerLine`:**

```tsx
const SurahBannerLine = ({ surahId }: { surahId: number }) => (
  <div
    className="leading-none relative w-full"
    style={{ marginBottom: "var(--fq-line-gap)", color: "hsl(var(--card))" }}
  >
    <SurahFrameSVG style={{ display: "block", width: "100%", height: "1em" }} />
    <span
      className="absolute inset-0 flex items-center justify-center text-black dark:text-white"
      translate="no"
      style={{ fontFamily: "var(--surah-names)", fontSize: "0.85em", lineHeight: 1 }}
    >
      {`${surahId}`.padStart(3, "0")}
    </span>
  </div>
);
```

SVG is in-flow at `height: 1em` — no absolute positioning, no overflow, no clipping. The glyph overlays via `position: absolute; inset: 0`.

**Verified:** both safha elements measure identical height (`692.328125px`) on page 50.

### What NOT to do

- Do not use `preserveAspectRatio="none"` — distorts the medallion ornaments.
- Do not use `height: 1em; width: auto` on the SVG — frame no longer spans full width.
- Do not use `overflow: hidden` on the outer div — the correct height comes from the SVG viewBox ratio, not clipping.
- Do not change the gap detection algorithm or `RenderItem[]` types from Addendum 4.

---

## Addendum 7 — Fix bismillah SVG appearing smaller than Quran text

**Date:** 2026-07-20  
**Branch:** `fix/123-surah-banner-frame-height`

### Root cause

`bismillah.svg` has `viewBox="0 0 176 36"` but the glyph content doesn't fill the full viewBox height — there's internal top padding of ~4 units (~11%). At `height: 1em`, the rendered glyph is effectively ~0.89em tall, making it visibly smaller than the surrounding Quran text lines.

### Fix

Same pattern as the surah frame: keep the outer div at `height: 1em` (layout slot unchanged), render the SVG absolutely centered at `height: 1.2em`. The SVG overflows visually but contributes zero to layout height.

```tsx
const BismillahLine = () => (
  <div
    className="leading-none relative flex justify-center text-black dark:text-white"
    style={{ marginBottom: "var(--fq-line-gap)", height: "1em" }}
  >
    <BismillahSVG style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", height: "1.2em", width: "auto" }} />
  </div>
);
```

### What NOT to do

- Do not increase `height` without `position: absolute` — that would make the line slot taller than `1em` and break equal-height spread pages.
- Do not modify the SVG file to crop its viewBox — the internal padding is part of the original asset.

---

## Addendum 8 — Replace the frame with the authentic KFGQPC glyph (Trello #133)

**Date:** 2026-08-01
**Branch:** `fix/133-surah-name-frame`
**Trello #133:** https://trello.com/c/eFWXR9ca — "تغيير فريم اسم السورة في نسخة التجويد" / "محتاج برضو تخليه بعرض الكلام"

The card names the tajweed edition, but `SurahBannerLine` is shared, so the fix lands in both editions.

### Problem

Three complaints, one root cause plus one independent one.

**Root cause A — the art is stretched.** The source asset was natively **8.05:1**. Addendum 6 forced it to `QURAN_LINE_WIDTH_RATIO` by widening the rect `304 → 491` and *translating* the medallion and knot clusters outward at their original scale, rather than redrawing at the new ratio. The result is small ornaments with a dead run of empty rule between them and the end knots. That is the "height is bad" and "decoration is not good" complaint — it is one defect, not two.

**Root cause B — the colour model is over-specified.** The current SVG carries three colour roles (`--surah-frame-line`, `--surah-frame-gold`, `hsl(var(--card))`) defined across four theme blocks and then overridden again in two banded groups: the desktop `.fq-spread` group (`globals.css` ~585–605) and the tablet `[data-safha-view="double"] .fq-spread` group (~1135–1170). One of those overrides exists purely to force the frame monochrome in dark — its own comment reads "leaving the frame two-tone; force it to the ornament gold too." Three roles that all have to be collapsed to one in most bands is the "colours are inconsistent" complaint.

### Source: extract glyph U+E000 from QUL `quran-common.ttf`

`https://static-cdn.tarteel.ai/qul/fonts/common/quran-common.ttf?v=3.3` (Quranic Universal Library, Tarteel). Glyph **U+E000** is the authentic KFGQPC surah header band.

This is a **path extraction, not a trace** — the source is already vector, so there is no rasterisation, quantisation or hand cleanup. Measured facts:

| Property | Value |
|---|---|
| `unitsPerEm` | 1024 |
| advance | 8240 |
| ink bbox | `(0, -188) → (8240, 828)` — 8240 × 1016 |
| **native ratio** | **8.1102 : 1** |
| colour tables | none — no `COLR`/`CPAL`/`SVG `, so a **single fill** |
| سورة | **absent** — the cartouche is empty; QUL renders سورة as a separate `surah-icon` element |
| cartouche interior | 48.9% of width × 74.4% of height → **7.19em × 1.35em** at final scale |

Extraction recipe (fontTools + `SVGPathPen`), producing a y-flipped viewBox that renders upright:

```py
pen = SVGPathPen(font.getGlyphSet()); font.getGlyphSet()["uniE000"].draw(pen)
# <svg viewBox="0 -828 8240 1016"><path transform="scale(1,-1)" d="..." fill="currentColor"/></svg>
```

`fill="currentColor"` — the single fill is driven by one `color` declaration on the parent, so no frame-specific colour token is needed at all.

### Ground truth for the geometry (measured, not assumed)

Taken live from QUL's own renderer of **KFGQPC V1 (1405H)** — the same layout our seeded line numbers come from — at `qul.tarteel.ai/resources/mushaf-layout/15`:

| Element | Measured |
|---|---|
| body text | `font-size: 30px`, line pitch `55.5px` |
| `.quran-icon.surah-header` | `font-size: 70px` (2.33× body) |
| frame rendered width | `563.3px` — **identical to the line width** |
| frame ink height | `69.4px` = 1.25× a normal line pitch |
| name glyph (`surah-name-v4`) | `font-size: 50px` = 0.714 × the frame's |

`8.05em × 70px = 563.5px`. QUL sizes the frame so its natural advance equals the line width. **The authentic frame is full-width and undistorted.** Any "render it at half width" option is therefore wrong and is ruled out below.

### Decision: option B — full width, undistorted, 1em layout slot

The three properties *full width*, *exactly 1em tall*, and *undistorted* cannot hold at once, because the art is 8.11:1 and the slot is 14.7:1. Options put to the user:

| Option | Width | Slot height | Ink height | Distortion | Verdict |
|---|---|---|---|---|---|
| A | full (14.7em) | 1em | 1em | **1.81× horizontal smear** | rejected — reproduces the current defect |
| **B** | **full (14.7em)** | **1em** | **1.81em, overflows into gaps** | **none** | **chosen** |
| C | 8.11em (55%) | 1em | 1em | none | rejected — not full width, and contradicts the measured print layout |

Under B the **layout slot stays exactly `1em`**, so the banner is indistinguishable from any other line as far as layout is concerned — 15-slot budget (ADR 0004), equal-height spread (Addenda 1–3, 6) and the gap-detection algorithm (Addendum 4) are all untouched. Only the ornament *ink* reaches into the empty gap above and below, which is what the printed mushaf does.

This is the same mechanism Addendum 7 already uses for `BismillahLine` at `1.2em`.

### Computed values

| Quantity | Derivation | Value |
|---|---|---|
| Frame ink height | `QURAN_LINE_WIDTH_RATIO / 8.1102` = `14.7 / 8.1102` | **1.81em** |
| Overflow per side | `(1.81 − 1) / 2` | **0.405em** |
| Desktop line gap | `--fq-line-gap` = `var(--fq-word-base) * 0.5607` (`globals.css:621`) | 0.5607em |
| Desktop clearance | `0.5607 − 0.405` | **0.156em** — clears |
| Name glyph size | height-bound by tallest surah glyph `uniE106` (ink 0.92em) filling 80% of the 1.35em interior | **1.18em** (was 0.85em) |

Name glyph width is not binding: the widest glyph `uniE029` (ink 2.28em) renders 2.69em wide inside a 7.19em interior. Cross-check on the size: ours works out to `1.18 / 1.826` = 0.65 of the frame's own scale, against QUL's 0.714 — same neighbourhood, the difference being `sura_names.ttf` v1 metrics vs QUL's `surah-name-v4`.

### Files to change

- `app/surah-frame.svg` — **replace wholly**. New content is the extracted U+E000 path, `viewBox="0 -828 8240 1016"`, single `fill="currentColor"`. The `.fb`/`.fl`/`.fg` classes and the inline `<style>` block from Addendum 5 all go.
- `app/components/QuranSafha.tsx` — `SurahBannerLine` only: SVG becomes `position: absolute`, vertically centred, `width: 100%`, `height: 1.81em`; outer div keeps `height: 1em` and `marginBottom: var(--fq-line-gap)`; drop the `color: "hsl(var(--card))"` inline style and set the ornament colour instead; name glyph `fontSize` `0.85em → 1.18em`.
- `app/globals.css` — remove `--surah-frame-gold` from all four theme blocks (lines ~34, 99, 171, 260) and both `.fq-spread` override groups (~590, ~1143). Reduce `--surah-frame-line` to a single ornament colour per theme, or retire it in favour of `--mushaf-ornament` directly. Delete the dark-theme "force it to the ornament gold too" overrides (~598, ~1166) — with one fill they have nothing left to fix.
- `docs/architecture/DECISIONS.md` — update the frame constraints under "Surah Banner Placement" (see below).

No change to: the gap-detection algorithm, `RenderItem[]`, `QuranLine.tsx`, `BismillahLine`, Prisma schema, DB, seeder, `QuranSpread.tsx`, `ReaderPage.tsx`.

### Implementation corrections (2026-08-01)

Two planned values were wrong and were corrected during implementation. Both are recorded because each was a real trap.

**1. Do not hardcode the frame's height in `em`.** The plan specified `height: 1.81em` (from `14.7 / 8.1102`). Implemented that way, the rendered ratio measured **7.87:1** against the true **8.11:1** — a 3% vertical stretch, i.e. the exact distortion this addendum exists to remove. The rendered column width is not reliably `QURAN_LINE_WIDTH_RATIO` em (that constant is the card's `minWidth` floor, and the double-view cap can shrink the reading font beneath it), so any fixed `em` height fights the real box.

**Correct form:** `width: var(--fq-surah-frame-w, 100%); height: auto`, absolutely positioned and centred on both axes. Height then follows the viewBox and the ratio is exact everywhere — measured **8.111–8.113** across 7 viewports, 6 pages, 2 font scales, 2 editions and 3 themes. The `--fq-surah-frame-w` variable is the clearance lever: shrinking width scales height with it, so the art can never be distorted to buy room.

**2. The mobile-collision risk was backwards.** Precondition 2 predicted mobile as the tight case. Measured ink-to-ink clearance to the following bismillah line:

| Viewport | Clearance |
|---|---|
| 360×640 | +1.68px |
| 390×667 | +0.26px |
| 390×844, 430×932 | comfortably positive |
| 768×1024 | −3.38px (box), 1 clean pixel row of real ink separation |
| 1440×900 | −2.97px (box), 1 clean pixel row |
| 1920×1080 | −3.56px (box) |

Mobile is fine; **desktop and tablet are the tight band**. The negative numbers are *box* overlap absorbed by `bismillah.svg`'s documented internal padding (Addendum 7) — a pixel scan of the rendered page shows the frame's bottom rule ending at row 188 and the bismillah's first ink at row 190, i.e. a clean separating row. Verified visually at 4× magnification. No width cap was needed; `--fq-surah-frame-w` stays at its `100%` default.

Do not "fix" the negative box numbers by shrinking the frame — they do not correspond to visible collision, and the fix would cost the full-width requirement.

**3. The frame's width must track the text block, not the card.** First implemented as `w-full`, which is the card's content box. Those coincide only when the text fills the card — on mobile and tablet the font hits its 28px cap first (ADR 0011), so lines sit narrower and centre while a `w-full` frame kept stretching to the card edge. Reported as "it takes the full quran page width".

Fixed by giving the frame a line-shaped box: `width: ${QURAN_MAX_LINE_WIDTH_RATIO}em; maxWidth: 100%` with `mx-auto`.

`QURAN_MAX_LINE_WIDTH_RATIO = 14.42` is a **new constant, deliberately distinct from `QURAN_LINE_WIDTH_RATIO = 14.7`**. The latter is a padded *floor* for the card's width and intentionally exceeds every real line; the former is the widest line/font ratio actually measured across all 604 pages (range 14.13–14.42, page 580 worst — recorded in DECISIONS' mobile sizing entry). Using 14.7 for the frame left it overhanging the longest line by 15–20px. With 14.42 the overhang is 7.4–8.8px and the frame is still never narrower than a line on any page. **Do not unify the two constants** — they answer different questions, and collapsing them reintroduces this defect.

Measured after the fix (page 151): frame 14.42em at 390×844 / 768×1024 / 1440×900 / 1920×1080, overhang 7.4–8.8px, ratio 8.110–8.112, slot 1em, inside the card at every size.

### Preconditions — both must be resolved before this ships

1. **Licence gate (blocking — investigated 2026-08-01, NOT cleared).** Checked four places: the `TarteelAI/quranic-universal-library` repo `LICENSE` (**MIT**, but that covers the application code), the font listing page (no terms), the individual font resource pages (no terms), and the QUL FAQ. The FAQ **explicitly declines a blanket licence**: resources "vary in their copyright status… some are in the public domain, while others may be subject to specific licenses", and for commercial use "review the licensing terms for each resource." QUL's own materials state the fonts were supplied by KFGQPC, so the terms are not Tarteel's to grant via the repo's MIT licence.

   **Status: unresolved, needs a human decision — do not merge on the MIT repo licence alone.** Practical path: this project already ships KFGQPC assets (the QCF page fonts, `code_v1`), so whatever basis covers those covers this glyph — same publisher. Settle it once and record it for both rather than per-asset. If it turns out restrictive, this addendum is void and the frame must be redrawn natively.
2. ~~**Mobile clearance (must measure).**~~ **Resolved 2026-08-01.** Measured across 7 viewports — see "Implementation corrections" above. The prediction was backwards: mobile clears comfortably, the tight band is desktop/tablet, and real ink separation there is still positive. No width cap applied; `--fq-surah-frame-w` remains `100%`.

### Verification

- Both safha elements in a spread measure identical height on a page with a banner (the Addendum 6 check — page 50).
- Banner spans the full text column width, ornaments undistorted, at font scales 1 and 10.
- No collision with adjacent lines on mobile at several viewport heights (precondition 2).
- All four themes × both editions (default, tajweed) × both bands (`.fq-spread` desktop, `[data-safha-view="double"]` tablet) render the frame in one colour with no two-tone artefact.
- Surah name glyph centred and inside the cartouche for the widest (`uniE029`) and tallest (`uniE106`) glyphs.

### What NOT to do

- Do not stretch the art to 14.7:1 by any means — no `preserveAspectRatio="none"`, no viewBox widening, no translating ornaments outward at fixed scale. That is precisely the Addendum 6 mistake being reverted here.
- Do not render the frame at `height: 1em` in flow — at its native ratio that yields 55% of the line width, which contradicts the measured KFGQPC layout.
- Do not let the outer div exceed `height: 1em`. The overflow must come from absolute positioning only, or equal-height spread and the 15-slot budget break (same rule as Addendum 7).
- Do not reintroduce a second or third frame colour token. The glyph has one fill; keep it that way.
- Do not trace a raster source. Two were evaluated and rejected: the surahapp PNG (`web.surahapp.com/_nuxt/img/top.*.png` — 7.53:1, another product's build asset, ~6 quantised colours, سورة baked into the leafwork) and a photo of a printed page (paper texture and lighting become paths). The QUL glyph is already vector.
- Do not switch the surah name font to QUL's `surah-name-v4` as part of this change — `sura_names.ttf` v1 is the integrated font (DECISIONS.md Font System) and swapping it is a separate decision.
- Do not change the gap detection algorithm or `RenderItem[]` types from Addendum 4.

### Decisions made

- Frame art comes from a font glyph, extracted losslessly — not traced from an image.
- The banner's **layout** slot is 1em; its **ink** is 1.81em. These are deliberately different.
- The cartouche interior stays unfilled so `--mushaf-paper` shows through, as in print. This removes the `hsl(var(--card))` body fill.
- Full width beats exact ink height, on the evidence of the measured KFGQPC layout.
