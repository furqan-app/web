# Fix: Surah Banner Placement and Standalone Line Sizing

**Type:** bug  
**Date:** 2026-07-07  
**Status:** implemented — equal-height spread (Addendum 1/2), inter-line gap (Addendum 3), gap-based banner placement (Addendum 4), decorative surah frame (Addendum 5) all shipped.  
**Trello #93:** https://trello.com/c/W0rsfojh/93-add-a-frame-for-the-surah-name-in-the-mushaf  
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
