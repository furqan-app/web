# Add Tajweed color-coded mushaf mode

**Type:** feature
**Date:** 2026-07-11
**Status:** implemented (Addendum 14 — per-edition word placement; verified in browser 2026-07-30)

## Summary

Introduce an opt-in "Tajweed mode" that color-codes Quran text by Tajweed rule, toggled from the Settings sheet and persisted in `localStorage`. Implemented by swapping, per page, from the existing per-page glyph font (`quran-p{page}`, rendering `word.code_v1`) to a new per-page COLRv1 color-glyph font (`quran-p{page}-tajweed`, rendering `word.code_v2`). See [ADR 0023](../architecture/adr/0023-tajweed-mushaf-mode.md) for why no schema change or reseed of `code_v2` is required.

Trello: [#23 Add Tajweed color-coded mushaf mode](https://trello.com/c/ABUostTA/23-add-tajweed-color-coded-mushaf-mode)

## Approach

quran.com-frontend-next ships this using one COLRv1 TTF per Mushaf page. The coloring is baked into the font's glyph outlines — no runtime rule computation. Each font embeds 3 built-in palettes (light/dark/sepia) selected via `@font-palette-values`/`font-palette`.

Key finding: `code_v2` is byte-identical across `mushaf=1/2/19` for all 5 sampled pages. Furqan's `Word.code_v2` — already seeded, currently unused — is the correct glyph field as-is. **No migration, no reseed of `code_v2`.**

Font assets (604 `.ttf` files, ~161MB) are already committed on the `tajweed-fonts` branch at `public/fonts/v4/colrv1/ttf/p{n}.ttf`.

## Decision Tree / Algorithm

**State:** `tajweedMode: boolean`, default `false`, persisted in `localStorage` key `quranTajweedMode`, via `QuranTajweedContext` (same shape as `QuranSafhaViewContext`). Provided globally in the locale layout so both the self reader and the shared-mushaf grant reader get it.

**Per-word rendering (`QuranWord.tsx`):**

| `tajweedMode` | Glyph field | Font family |
|---|---|---|
| `false` | `word.code_v1` | `quran-p{page}` |
| `true` | `word.code_v2` | `quran-p{page}-tajweed` |

**Font-face injection (`FontFaceInjector.tsx`):** Always injects the base `@font-face` for both pages. When `tajweedEnabled: boolean` (new prop, from `useQuranTajweed()` via `ReaderPage.tsx`), additionally injects:
```css
@font-face { font-family: 'quran-p{id}-tajweed'; src: url('/fonts/v4/colrv1/ttf/p{id}.ttf') format('truetype'); font-display: block; }
@font-palette-values --Light { font-family: 'quran-p{id}-tajweed'; base-palette: 0; }
@font-palette-values --Dark  { font-family: 'quran-p{id}-tajweed'; base-palette: 1; }
@font-palette-values --Gold  { font-family: 'quran-p{id}-tajweed'; base-palette: 2; }
```

Global rules in `globals.css`, scoped to `.fq-tajweed` on `.fq-quran-safha`:
```css
.theme-light .fq-tajweed { font-palette: --Light; }
.theme-dark  .fq-tajweed { font-palette: --Dark; }
.theme-gold  .fq-tajweed { font-palette: --Gold; }
```

**Font-size correction:** COLRv1 glyphs average ~1.42× taller than base glyphs (measured via fontTools across 20 word pairs on page 1). Correction via `--fq-tajweed-scale: 0.7`, three `.fq-tajweed`-scoped override rules in `globals.css`:

| Context | Override |
|---|---|
| Mobile | `.fq-quran-safha.fq-tajweed { font-size: calc(var(--fq-mobile-font) * var(--fq-tajweed-scale)); }` |
| Desktop single | `.fq-quran-safha.fq-tajweed { font-size: calc(var(--fq-word-base) * var(--fq-tajweed-scale)); }` |
| Desktop double | `:root[data-safha-view="double"] .fq-spread .fq-quran-safha.fq-tajweed { font-size: calc(min(var(--fq-word-base), var(--fq-dv-word)) * var(--fq-tajweed-scale)); }` |

Never edit `FONT_V1`, the mobile formula, or `--fq-dv-word` — the correction lives entirely in `.fq-tajweed`-scoped rules.

**Hover cue:** COLRv1 glyphs ignore CSS `color`. In Tajweed mode, `QuranWord.tsx` applies `hover:bg-primary/25` instead of `hover:text-yellow-500 dark:hover:text-yellow-400`. Do not reintroduce `hover:text-*` for tajweed mode — COLRv1 ignores it.

**Line centering:** ~~`code_v2` lines are far less width-consistent than `code_v1` (7.7% CV vs 2.7% CV) because `code_v2` has no AAT justification tables~~ — **this rationale is wrong; see Addendum 14.** The 7.7% was measured with mushaf 2's line grouping applied to mushaf 19's fonts. With the correct grouping, `code_v2` lines measure 0.21–0.44% CV, tighter than `code_v1`'s own 2.7%.

What survives is the *outcome*, for a different and correct reason: the card's content box (`14.7em`) is slightly wider than a typical page's widest line (median `14.24em`), so lines have ~0.46em of slack. Centering distributes it symmetrically instead of dumping it all on the far edge. Task 7 of Addendum 14 therefore extends centering to **every line in both editions** and deletes the `[1, 2].includes(page_number) || tajweedMode` condition.

`justify-content: space-between` was tried and reverted, and that decision still stands: it inserts uniform gaps *between* words, moving every word off its authentic mushaf position (real justification is kashida baked into glyphs, not inter-word gaps). Centering shifts only the line's overall horizontal position, never the relative word gaps.

**Line grouping (`mushaf=19`):** `code_v2` words were seeded with `mushaf=2` line breaks. Under `mushaf=19` (the Tajweed-V4 mushaf), 23% of words are on a different line — these breaks correspond to the kashida calibration of the COLRv1 font. `mushaf=19` is confirmed final by matching live quran.com rendering. `mushaf=11` was tested (Addendum 5) and abandoned — it matched one screenshot boundary but the source (Quran Android app) pre-renders images with no accessible line-layout algorithm (Addendum 6).

**`text_uthmani_tajweed` approach:** Investigated (Addendum 7) and rejected. `font-uthmanic` / Uthmani text has no per-line kashida calibration; several lines on page 343 stopped well short of the container edge regardless of line grouping. All diagnostic code deleted. Parser bugs found during the investigation (hyphenated class names, nested tags) were fixed with a stack-based tokenizer before rejection; noted here for the record only.

**PWA:** Tajweed fonts are never added to `app/sw.ts`'s pre-cache list.

**Toggle UI:** "Tajweed Colors" section in `SettingsSidebar.tsx` using shadcn `Switch`.

## Files to Change

- `app/contexts/QuranTajweedContext.tsx` (new)
- `app/[locale]/layout.tsx` — mount `QuranTajweedProvider`
- `app/components/QuranWord.tsx` — branch glyph text + hover class on `tajweedMode`
- `app/components/QuranSafha.tsx` — branch `getPageFontFamily`, add `.fq-tajweed` marker, compute `activeLines` on `tajweedMode`
- `app/utils/quran-font-map.ts` — extend `getPageFontFamily(page, tajweed?: boolean)`
- `app/components/reader/FontFaceInjector.tsx` — `tajweedEnabled: boolean`; conditional tajweed `@font-face` + `@font-palette-values`
- `app/components/reader/ReaderPage.tsx` — read `tajweedMode`, pass to `FontFaceInjector`
- `app/globals.css` — `--fq-tajweed-scale`, three scoped font-size overrides, `.theme-* .fq-tajweed` palette rules
- `app/components/SettingsSidebar.tsx` — "Tajweed Colors" section with `Switch`
- `components/ui/switch.tsx` (new, via `npx shadcn@latest add switch`)
- `messages/ar.json`, `messages/en.json` — new `tajweedMode`/`tajweedModeDescription` keys
- `app/hooks/get-page-words.ts` — fetch `mushafLayouts`; map each word to `layouts: Record<number, number>`; widen word type to `WordWithLayouts`
- `app/components/QuranLine.tsx`, `app/components/QuranWord.tsx` — widened to `WordWithLayouts`
- `app/api/quran/pages/[pageId]/route.ts` — now calls `getPageWords` directly (was un-synced duplicate)
- `app/hooks/use-quran-page.ts` — `PageData` type replaced with imported `PageWords`
- `prisma/quran/schema.prisma` — `WordMushafLayout` model + `Word.mushafLayouts` back-relation
- `scripts/quran-seed/tajweed-layout.js` (new) — fetch/seed `mushaf=19` `line_number` for all 604 pages
- `scripts/quran-seed/seed.js` — call new step after words, before rubs
- `app/[locale]/test-tajweed-mushaf/[page]/page.tsx` — deleted (superseded by real seeded data)
- `app/[locale]/test-tajweed-mushaf-11/[page]/page.tsx` — deleted (mushaf=11 abandoned)
- `app/[locale]/test-tajweed-palette/page.tsx` (new) — diagnostic: palette-slot → rule mapping
- `app/utils/tajweed-rule-colors.ts` (new) — rule→{slot, colorName, confidence} table (ADR 0023 Addendum 4)
- `docs/architecture/DECISIONS.md`, `docs/architecture/adr/0023-tajweed-mushaf-mode.md`

## Constraints

- Never render `word.code_v1` with the tajweed font or `word.code_v2` with the base font.
- Never inject tajweed `@font-face`/`@font-palette-values` unconditionally.
- Never add tajweed font URLs to `app/sw.ts`'s pre-cache list.
- Do not reintroduce `justify-content: space-between` for tajweed line layout.
- `Word.line_number` (mushaf=2 default) is never modified — `WordMushafLayout` is the per-mushaf override.
- `getPageWords` return shape (`{ lines, pageMetadata }`) is unchanged — only `QuranSafha` re-groups on `tajweedMode`.
- The seeder must fail hard (or warn per word) if any word can't be matched in the mushaf=19 global map. Validate globally across all 604 pages — page-boundary assignments differ between mushafs (page 120 has 156 words under mushaf=19 vs. 132 under mushaf=2).
- Do not touch the `wordClicked` flat word lookup in `QuranSafha` — it stays on `lines`, not `activeLines`.
- Do not attempt the `text_uthmani_tajweed` / CSS-span coloring approach again — structurally unable to self-justify per-line.
- Do not port the Firefox COLRv1 OT-SVG fallback — deferred.
- Do not add tajweed fonts to the PWA pre-cache (ADR 0014).
- Do not build on `origin/tajweed-mushaf` — abandoned earlier attempt with different font path.

## Production wiring — `WordMushafLayout` schema

```prisma
model WordMushafLayout {
  id          Int  @id @default(autoincrement())
  word_id     Int
  mushaf_id   Int
  line_number Int
  word        Word @relation(fields: [word_id], references: [id])

  @@unique([word_id, mushaf_id])
  @@map("word_mushaf_layouts")
}
```

`QuranSafha.tsx` re-groups only when `tajweedMode` is true:
```ts
const activeLines = tajweedMode
  ? groupBy(Object.values(lines).flat(), w => w.layouts[19] ?? w.line_number)
  : lines;
```

**Seeder implementation note:** First run failed per-page validation because page 120 under mushaf=19 has different word counts than mushaf=2 (page-boundary disagreement, not a glyph issue). Fixed by aggregating `word_id → line_number` globally across all 604 of mushaf=19's pages first, then verifying every already-seeded word resolved in the global map. Final: `words=83665`, `word_mushaf_layouts=83665`, zero fallback warnings.

**Why `code_v2` can't self-justify:** `code_v1` fonts contain `just`/`morx`/`feat`/`prop` (Apple AAT tables) — `just` carries the font's kashida-insertion data, consumed by the text-shaping engine to fill lines to a target width. `code_v2` COLRv1 fonts have `COLR`/`CPAL` but no AAT tables — line width is the natural advance-width sum of the glyphs. quran.com itself uses `text-align: center` + a hardcoded per-scale line-width lookup table, the same trade-off Furqan ships. Getting both properties in one font would require splicing `code_v1`'s AAT tables onto `code_v2`'s COLR/CPAL-layered glyphs — a real font-engineering task, not attempted.

<!-- Addendum 11 (palette-color overrides) was reverted; Addendum 12 (legend) was never implemented and depended on it. Both removed. -->

## Addendum 13 — Tajweed palette color overrides + legend (2026-07-15)

**Trello:** [#113 Tajweed color palette overrides + legend](https://trello.com/c/2NjsII7R/113-tajweed-color-palette-overrides-legend)  
**Status:** implemented

### Summary

Replace the font's built-in CPAL colors with brand-specific colors for each tajweed rule, using CSS `override-colors` inside `@font-palette-values`. Add a collapsible `TajweedLegend` component that appears as a sticky bar below the navbar in tajweed mode, showing each rule's color dot and Arabic label.

### How it works

`@font-palette-values` supports an `override-colors` descriptor that remaps individual CPAL palette slots by index. The font's built-in colors are replaced at render time — no font file modification needed. The `font-palette` property on the element must reference the named palette for overrides to take effect; this is already handled in `globals.css` via `.theme-light .fq-tajweed { font-palette: --Light; }` etc.

**Critical:** `override-colors` has no effect unless `font-palette` is applied to the element. In the real reader this is already wired — do not remove those globals.css rules.

### CPAL index → tajweed rule mapping (verified via fontTools on page 343)

| Index | Original color | Tajweed rule | Light/Gold override |
|---|---|---|---|
| 3 | `rgba(181,0,0)` | المد اللازم (6 حركات) | `#E70D8A` |
| 4 | `rgba(255,123,0)` | مد (2 / 4 / 6) جوازاً | `#BC7F22` |
| 5 | `rgba(206,158,0)` | مد حركتان | `#C4A94D` |
| 6 | `rgba(9,176,0)` | غنة / إخفاء | `#029E48` |
| 7 | `rgba(63,72,230)` | تفخيم الصوت | `#067497` |
| 8 | `rgba(47,173,255)` | قلقلة | `#0FAEC1` |
| 9 | `rgba(244,0,0)` | المد المتصل (4 أو 5 حركات) | `#E70D8A` |
| 10 | `rgba(44,164,171)` | verse frame ornament (teal layer) | `#ffffff` |
| 11 | `rgba(255,0,128)` | verse frame ornament (pink layer) | `#ffffff` |
| 12 | `rgba(216,233,216)` | verse frame fill (green) | `#ffffff` |

Indices 0–2, 13–15 are used for base text and outlines — do not override them.

Indices 3 and 9 (المد اللازم and المد المتصل) intentionally share the same color `#E70D8A`.

Indices 10, 11, 12 are set to `#ffffff` (white) to make the verse number frame colorless, leaving only the black outline and numeral visible. This matches the clean mushaf style shown in the design reference.

**Dark theme:** The implementer must determine appropriate colors for the `--Dark` palette. White (#ffffff) for the frame fill will not work in dark mode — use the dark card background color instead. All tajweed rule colors should be reviewed for contrast against the dark background.

### `TajweedLegend` component

A sticky bar rendered immediately below the navbar, visible only when `tajweedMode` is true. Collapsed by default — shows "ألوان التجويد ▲" toggle. Expands to a row of color dot + Arabic label pairs, RTL, wrapping on mobile.

**Legend entries (in display order):**

| Color dot | Label |
|---|---|
| `#a5a5a5` | الحرف الساكن |
| `#C4A94D` | مد حركتان |
| `#BC7F22` | مد (2 / 4 / 6) جوازاً |
| `#E70D8A` | المد المتصل (4 أو 5 حركات) |
| `#E70D8A` | المد اللازم (6 حركات) |
| `#029E48` | غنة / إخفاء |
| `#0FAEC1` | قلقلة |
| `#067497` | تفخيم الصوت |

الحرف الساكن (index 1, `#a5a5a5`) appears only in the legend — its CPAL color is close enough to the brand shade and is not overridden.

### Files to change

- `app/components/reader/FontFaceInjector.tsx` — add `override-colors` to the `--Light` and `--Gold` `@font-palette-values` blocks; leave `--Dark` with a `TODO` comment for the implementer
- `app/components/TajweedLegend.tsx` (new) — collapsible legend client component
- Wherever `TajweedLegend` is mounted (e.g. `app/components/QuranSafha.tsx` or the reader layout) — render it conditionally when `tajweedMode` is true, above the safha card

### What NOT to do

- Do not use `transparent` or `#00000000` in `override-colors` — they do not work for this font (COLRv0). Use `#ffffff` or the appropriate theme background color instead.
- Do not remove the `.theme-* .fq-tajweed { font-palette: ... }` rules from `globals.css` — the overrides have no effect without them.
- Do not override indices 0–2, 13–15 (base text and outline colors).
- Do not show `TajweedLegend` when `tajweedMode` is false.
- Do not hardcode Dark theme colors as white — they will be invisible against a dark background.

---

## Addendum 11 — Dark-mode tajweed color overrides (Trello #120, 2026-07-19)

### Problem

The `--Dark` `@font-palette-values` block in `FontFaceInjector.tsx` has no `override-colors`, only `base-palette: 1`. This means dark mode uses the COLRv1 font's baked-in dark palette, which has not been customized to match the new rule colors established for light mode in Addendum 13. The TODO comment at that line confirms this was deferred.

### Approach

Derive dark-mode slot colors from the light-mode ones by keeping the same hue and saturation but increasing lightness to ~60–65% so they read clearly on the dark card background (`hsl(212 34% 15%)` ≈ `#192533`). Frame slots 10–12 use the dark card bg color instead of white.

### Decision table

| Slot | Light hex | Light HSL | Dark HSL | Dark hex |
|------|-----------|-----------|----------|----------|
| 3, 9 | `#E70D8A` | 326° 89% 48% | 326° 89% 65% | `#F556B0` |
| 4    | `#BC7F22` | 36° 69% 43%  | 36° 69% 62%  | `#E1AB5B` |
| 5    | `#C4A94D` | 46° 50% 54%  | 46° 50% 70%  | `#D9C78C` |
| 6    | `#029E48` | 147° 97% 31% | 147° 75% 50% | `#20DF76` |
| 7    | `#067497` | 195° 92% 31% | 195° 70% 50% | `#26ACD9` |
| 8    | `#0FAEC1` | 186° 86% 41% | 186° 75% 57% | `#3FD3E4` |
| 10–12 | `#ffffff` | white        | dark card bg | `#192533` |

Slots 6 and 7 have saturation pulled down (97→75%, 92→70%) to avoid neon-garish appearance on dark backgrounds.

### File to change

- `app/components/reader/FontFaceInjector.tsx` — add `override-colors` to the `--Dark` block, using the values in the table above. The `RULE_OVERRIDES` constant covers only slots 3–9 (shared light/gold values) and cannot be reused for dark since the L values differ; inline the dark overrides directly in the `--Dark` block.

### What NOT to do

- Do not reuse `RULE_OVERRIDES` for the dark palette — those values are the light-mode lightness levels and will be too dark on a dark background.
- Do not set frame slots 10–12 to `#ffffff` in dark mode — they must match the dark card background.

---

## Addendum 12 — Unified word hover effect (Trello #120, 2026-07-19)

### Problem

The hover effect on Quran words is split by mode: `hover:text-yellow-500` for regular (broken in tajweed — COLRv1 ignores `color`) and `hover:bg-primary/25` for tajweed (conflicts with the existing background-color layer used by search highlights, mark highlights, and recitation active-word). Neither approach works for both modes, and `bg-primary` collides with existing effects.

### Approach

Unify with scale + offset shadow: `hover:scale-[1.06] hover:[filter:drop-shadow(1px_1px_0px_hsl(var(--foreground)/0.4))] transition-[filter,transform] duration-150`. Works for both regular and tajweed (filter/transform are not overridden by COLRv1), distinct from every existing background-color effect. The 1px offset shadow gives a "lifted" feel without bleeding into adjacent words.

### File to change

- `app/components/QuranWord.tsx:48` — replace the `tajweedMode ? "hover:bg-primary/25" : "hover:text-yellow-500 dark:hover:text-yellow-400"` ternary with the unified classes above.

### What NOT to do

- Do not use `hover:bg-*` — conflicts with search, mark, and recitation highlights.
- Do not use `hover:text-*` — ignored by COLRv1 tajweed glyphs.

---

## Addendum 13 — Fix Switch thumb overflow in RTL (Trello #120, 2026-07-19)

### Problem

`data-[state=checked]:translate-x-5` physically moves the thumb right regardless of text direction. In RTL the checked position should be left, so the thumb overflows out of the track on the right side.

### Fix

Add `rtl:data-[state=checked]:-translate-x-5` to the Thumb in `components/ui/switch.tsx`. The unchecked state (`translate-x-0`) needs no change.

### File to change

- `components/ui/switch.tsx:22` — add `rtl:data-[state=checked]:-translate-x-5` to the Thumb className.

### What NOT to do

- Do not change the track or root classes — only the Thumb translation is affected.

---

## Addendum 14 — Per-edition word placement (Trello #155, 2026-07-30)

**Trello:** [#155 Bug: tajweed mushaf renders wrong words — page layout spliced from two editions](https://trello.com/c/KE8ggYS0/155-bug-tajweed-mushaf-renders-wrong-words-page-layout-spliced-from-two-editions)
**Branch:** `fix/155-mushaf-edition-word-placement`
**ADR:** [0033](../architecture/adr/0033-mushaf-edition-owns-word-placement.md) — supersedes ADR 0023 Addendum 6, corrects Addendum 5
**Status:** ready-to-implement

### The bug

Reported as two symptoms in tajweed mode: words out of place with visibly uneven line widths (page 594), and a missing surah name banner (سورة الشمس, page 595).

Both are one root cause. `scripts/quran-seed/tajweed-layout.js` seeds only `line_number` from QDC `mushaf=19` and deliberately discards `page_number`. Mushaf 19 (QCF V4 Tajweed) is a complete independent print edition with its own **page** boundaries, not merely different line breaks. `QuranSafha` therefore composes each page from mushaf 2's word set and re-groups it by mushaf 19's line numbers — a splice of two different books.

### Why it is a correctness bug, not a layout bug

Each Mushaf page has its own font file whose glyph codepoint space is **local to that page**. A word carried onto the wrong page keeps its `code_v2` codepoint, which usually also exists in the neighbouring page's font — mapped to a completely different word. Measured across the shipped assets:

| Measure | Today | Under mushaf 19 composition |
|---|---|---|
| Words drawing a **different word's glyph** | **292** | 0 |
| Words drawing blank/tofu | **50** (pages 121, 533, 534, 568, 570) | 0 |
| Words with no glyph, all 83,665 | 50 | **0** |

This puts wrong Quran text on screen. It is the highest-severity class of defect in this app and should be treated as such.

### Scope

**36 affected pages:** 120–123, 144, 145, 531–534, 564, 565, 567–570, 575, 576, 583–600.
361 words sit on a different page between the two editions; 56 verses change page.

### The corrected model

An edition owns its complete word placement. Page, line, glyph field and per-page font file are one inseparable unit. No base edition, no override layer. Full reasoning in ADR 0033.

```
mushaf 2  (QCF V1, default) → code_v1 + /fonts/v1/woff2/p{n}.woff2        + its own page/line rows
mushaf 19 (QCF V4 Tajweed)  → code_v2 + /fonts/v4/colrv1/woff2/p{n}.woff2 + its own page/line rows
```

**Edition identity of the font assets was verified empirically, not from filenames:** under mushaf 19's composition every one of 83,665 words resolves to a glyph (vs 50 missing today) and line-width CV collapses to 0.2–1.6%. The tajweed fonts are built for mushaf 19's pagination.

### The banner algorithm needs no changes

`QuranSafha`'s gap detection infers banner and bismillah slots from missing line numbers in whatever grouping it receives. Fed the correct per-edition composition it reproduces mushaf 19's true empty-slot layout on **604/604 pages, zero mismatches**. Do not modify the gap algorithm, the `RenderItem[]` types, or the classification table from Addendum 4 of `fix-surah-banner-placement.md`. The missing banner was bad input, never a broken algorithm.

### This closes the substantive scope of Trello #72

Measured across all 604 pages of both editions: **114/114 surahs** receive a page-level banner and **no surah falls back to the inline header** in `QuranLine`. That is already true in the default edition today; Task 3 makes it true in the tajweed edition.

Two consequences for the docs, both handled on this branch:

- `DECISIONS.md`'s "Surah Banner Placement — DEFERRED (not implemented)" section was stale — the gap-based approach shipped in `fix-surah-banner-placement.md` Addendum 4. Rewritten as IMPLEMENTED with the 114/114 verification and the surviving constraints.
- **`line_type` ingestion is permanently unnecessary.** Gap detection derives the same information from already-seeded data, and QDC exposes no `line_type` at any level under any mushaf param. Do not open this path again.

**The `is_centered` remainder is handled by Task 7**, below. It is line justification rather than banner placement, but it closes out the last of #72's original scope.

### Decision tree — where each field comes from

| Concern | Source | Notes |
|---|---|---|
| Which words are on page N | `MushafWordLayout` where `mushaf_id = active, page_number = N` | never `Word.page_number` |
| Which line a word is on | same row's `line_number` | never `Word.line_number` |
| Which glyph string to render | edition registry → `code_v1` \| `code_v2` | paired with the font, never chosen separately |
| Which font file | edition registry → URL template | paired with the glyph field |
| Page header juz / hizb / surah glyph | `MushafPageMetadata` for the active edition | diverges on 8 pages |
| Banner / bismillah slots | gap detection over the active edition's line keys | unchanged algorithm |
| Mark storage page | default edition (mushaf 2) | canonical, edition-independent |
| Mark identity | `marked_id` (verse key or word location) | already edition-independent |

### Verified test cases

Walked through against the committed `public/quran/pages/*.json` plus a full 604-page fetch of mushaf 19, and against the font binaries with fontTools.

| Case | Today | After |
|---|---|---|
| p595 slots 2–3 | 1-slot gap → bismillah only, **الشمس missing** | 2-slot gap → **banner(91) + bismillah** |
| p597 slots 3–4 | 1-slot gap → bismillah only, **الضحى missing** | **banner(95) + bismillah** |
| p594 | slot 1 holds Al-Balad 19–20 above Al-Fajr's ending; الشمس end-banner lost | banner(90) + bismillah at 6–7; الشمس correctly at top of p595 |
| p594 slot 1 content | `وَٱلَّذِينَ كَفَرُواْ … مُّؤۡصَدَةُۢ ٢٠` (belongs to p595) | `89:23:1 → 89:23:7` |
| p121 | 24 foreign words, blank glyphs | correct composition, 0 blanks |
| p144 line-width CV | 22.04% | 0.37% |
| p599 line-width CV | 11.43% | 1.29% |
| p343 (editions agree) | 0.44% | 0.44%, unchanged |
| Gap structure vs mushaf 19 truth | mismatches on 36 pages | **604/604 match** |

### Task breakdown

Six tasks, ordered. Tasks 1–3 close the correctness bug; 4–6 are the ripple. Each is independently verifiable — implement one at a time.

---

#### Task 1 — Schema + seeder: per-edition word placement — **DONE**

Reseeded: `words=83665`, `mushaf_word_layouts=167330` (2=83665, 19=83665), `mushaf_page_metadata=1208`. Verified against the DB: **0** mismatches between mushaf 2's layout rows and the `Word` mirror, **361** words placed on a different page between editions, **8** page-metadata divergences.

`validateLayout` was proven in both directions before the reseed: fed the shipped bug's composition (mushaf 2 pages + mushaf 19 line numbers) it throws on **page 121** — the same page the original deleted check flagged, and one of the five that rendered blank glyphs — and it accepts all 83,665 rows of the correct composition.


- `prisma/quran/schema.prisma` — replace `WordMushafLayout` with:
  ```prisma
  model MushafWordLayout {
    id          Int  @id @default(autoincrement())
    mushaf_id   Int
    word_id     Int
    page_number Int
    line_number Int
    word        Word @relation(fields: [word_id], references: [id])
    @@unique([mushaf_id, word_id])
    @@index([mushaf_id, page_number])
    @@map("mushaf_word_layouts")
  }
  ```
  Add `MushafPageMetadata` with `mushaf_id` + the existing `PageMetadata` fields, unique on `[mushaf_id, page_number]`.
- **There is no migration for this DB — corrected during implementation.** ADR 0017's versioned Prisma migrations cover `furqan_app` only. `furqan_quran` is owned by the seeder, which runs `prisma db push --force-reset` and rebuilds from scratch (ADR 0009, `docs/standards/database.md`). Applying this task therefore means a **destructive full reseed**: `npm run seed:quran -- --force`, refetching 604 pages of verses/words plus 604 pages per edition of layout from QDC. No migration files exist or should be created here.
- **Task 1 is additive, so the branch stays green — decided during implementation.** `PageMetadata` has 11 consumer files (including `app/lib/plans/resolve-units.ts` and `scripts/e2e-fixture/generate.js`, neither anticipated when this plan was written) and the reader's data layer does not move until Tasks 2–3. So Task 1 adds `MushafWordLayout` and `MushafPageMetadata` and leaves `PageMetadata` in place, seeded with the default edition's values. Tasks 2–3 migrate the consumers; the last of them deletes `PageMetadata`.
- Keep the `Word.mushafLayouts` **relation field name** when renaming the model, so `get-page-words.ts` and `scripts/quran-json/generate.js` keep compiling untouched through Task 1. They still read only `line_number`, so the app behaves exactly as it does today — the bug is still present after Task 1 and is fixed by Task 3.
- `scripts/quran-seed/tajweed-layout.js` → replaced by `scripts/quran-seed/mushaf-layout.js`, an edition-generic fetch capturing **both** `page_number` and `line_number`, plus the verse→page map each edition needs for its page summary.
- Derive mushaf 2's rows from the words already seeded — `verses-words.js` fetches with `mushaf: "2"`, so `Word.page_number`/`line_number` already *are* that edition's placement, and refetching would be 604 redundant QDC requests. It still runs through the same `validateLayout` as any fetched edition: uniform **validation** is what the model requires, not uniform transport.
- Seed `MushafPageMetadata` per edition by passing that edition's verse→page resolver into `derivePageMetadata`. Juz, hizb and rub numbers are divisions of the text and identical across editions, so only page assignment varies — one function serves every edition.
- **Restore the integrity check that was deleted.** Per edition, assert that line numbers never decrease within a page (words arrive in document order, so a decrease means another edition's words leaked in), that every line number is within 1–15, that no page exceeds 15 distinct lines, that no word id appears on two pages, that every seeded word has a placement, and that the edition covers exactly 604 pages. Fail hard. Do not loosen this check if it fails — a failure means the model is wrong, which is exactly how the original defect shipped.

**Acceptance:** `mushaf_word_layouts` has 83,665 rows for mushaf 2 and 83,665 for mushaf 19, the integrity check passes for both editions with no warnings, and `mushaf_page_metadata` has 1,208 rows. `mushaf_page_metadata` must differ between the two editions on exactly 8 pages — `page_surahs` on 586, 590, 593, 595, 597, 598, and `hizb_position` present on 599 for mushaf 2 but on 600 for mushaf 19. Both are strong signals: 8 is the measured divergence, so 0 would mean the edition param was ignored and both scans returned the same layout.

Also confirm mushaf 2's fetched `page_number`/`line_number` match the existing `Word.page_number`/`Word.line_number` for all 83,665 words. They are seeded from the same `mushaf=2` param, so any mismatch means one of the two fetches is not asking for the edition it thinks it is.

---

#### Task 2 — Static per-edition page JSON — **DONE** (slimming deferred)

- `scripts/quran-json/generate.js` — emit `public/quran/pages/{mushafId}/{page}.json`, one set per edition, grouped by that edition's own page and line rows. Delete the old flat files.
- Slim the payload while regenerating (measured on page 300): the per-word nested `verse` object is **26%** of each file, `audio_url` **10.4%**, and `layouts` **6.7%** disappears entirely under the new model. Hoist verse-level data to a per-page verse map instead of repeating it per word, and derive `audio_url` from `location` at render time. Without slimming, two editions cost 50.4 MB against today's 24.3 MB; with it they land near today's footprint and the default edition's offline download shrinks.
- Keep `page_number` on each word as the **default-edition** page — Task 4 needs it for mark canonicalization.
- Keep the returned shape `{ lines, pageMetadata }` so `ReaderPage`, `QuranSpread`, `QuranPage` need no changes.
- `app/hooks/get-page-words.ts` — take a `mushafId`, query `MushafWordLayout`, drop the `layouts` map and `LAYOUT_MUSHAF_IDS`. Keep it in sync with the generator (the header comment already mandates this).
- `app/api/quran/pages/[pageId]/route.ts` delegates to `getPageWords` — keep it delegating, do not reintroduce a second copy of the query.

**Acceptance:** for every edition and page, each word's `code_*` resolves to a glyph in that page's font for that edition — 0 missing out of 83,665. Line-width CV under 2% on all 604 pages of both editions, excluding surah-final lines (those are legitimately short and must be excluded or they mask the signal).

Add this as a repeatable check under `scripts/` rather than a throwaway: for each edition, walk every page's generated JSON, look up each word's glyph codepoint in that page's font `cmap`, and sum `hmtx` advance widths per line to compute the CV. It needs `fontTools` and `brotli` for the woff2 files. This check is what proved the fonts belong to mushaf 19's pagination, and it is the only automated guard against a future edition being wired to the wrong layout — the failure mode is silent, so a manual review will not catch it.

---

#### Task 3 — Edition registry + reader renders from it — **DONE**

This is where the bug visibly disappears.

- New `app/utils/mushaf-editions.ts` — the registry: edition id → `{ glyphField, fontFamily(page), fontUrl(page), pagesCount, linesPerPage }`, plus `DEFAULT_MUSHAF_ID = 2`. Selecting an edition selects glyph field and font together; no caller may pick them independently.
- `app/contexts/QuranTajweedContext.tsx` → carry `mushafId` rather than `tajweedMode: boolean`, so a third edition needs no new flag. Migrate the existing `quranTajweedMode` localStorage value on read.
- `app/components/QuranSafha.tsx` — **delete** `activeLines` and the client-side `groupBy` re-grouping (lines 217–224). `lines` now arrives already grouped for the active edition. Keep the gap algorithm and helpers untouched.
- `app/components/QuranWord.tsx` — read the glyph field from the registry instead of branching on `tajweedMode`.
- `app/utils/quran-font-map.ts`, `app/utils/page-font-registry.ts` — `ensurePageFonts` currently hardcodes `quran-p${id}` and `/fonts/v1/woff2/`; both must come from the registry. Preserve the ADR 0029 invariant: never mutate a live stylesheet's text, add and remove whole immutable units only.
- `app/components/reader/FontFaceInjector.tsx` — keep reading the context itself (it is a client leaf under an async Server Component; do not prop-drill). Keep tajweed's keyed `<style>` elements and `@font-palette-values` as the documented CSS exception.
- `app/hooks/use-quran-page.ts` — fetch `/quran/pages/{mushafId}/{page}.json`, include `mushafId` in the query key.
- `app/types/prisma.ts` — `WordWithLayouts` loses `layouts`; rename to reflect that.

**Acceptance:** on pages 594, 595, 597 and 121 in tajweed mode, rendered line contents match mushaf 19's own layout exactly; سورة الشمس appears at the top of page 595 and سورة الضحى on 597; no blank words on 121/533/534/568/570. Regular mode is byte-identical to before on all 604 pages.

---

#### Task 4 — Mark canonicalization — **DONE**

- `app/api/quran/pages/[pageId]/marks/route.ts` — a mark's `page_number` must be the default edition's page, not the URL page id. Send the word's default-edition `page_number` from the client (still present in the JSON per Task 2) rather than inferring it from the route.
- Reads fetch the 1–2 default-edition pages the current edition page spans. The client map is keyed by `marked_id`, so extra marks in the map are harmless.
- Same treatment for the grant reader route `app/api/mushaf/[grant]/pages/[pageId]/marks`.
- No migration of existing `marks` rows: `marked_id` is edition-independent, and rows were all written under the default edition.

**Acceptance:** a mark created in tajweed mode on one of the 36 divergent pages is visible in regular mode, and vice versa.

---

#### Task 5 — Remaining edition-blind call sites — **DONE**

- `app/components/RubList.tsx:76` — links to `rub.startVerse.page_number`, mushaf 2 only. Resolve verse → page through the active edition.
- `app/components/reader/ReaderPager.tsx:414` — hardcoded `/fonts/v1/woff2/p{n}.woff2` preload; take it from the registry.
- `app/sw.ts` — `jsonUrl()` path moves under the edition folder. Precache the **default edition only**, consistent with tajweed fonts being excluded (ADR 0014). Bump the cache version so existing installs re-precache.
- `app/[locale]/pages/[id]/page.tsx` — `generateStaticParams` hardcodes 604. Fine while both editions are 604 pages; take the count from the registry so a future 548-page Indopak edition does not silently truncate.

**Acceptance:** rub navigation lands on the correct page in both editions; no `v1` font path remains outside the registry; offline install works after the cache version bump.

---

#### Task 6 — Edition toggle preserves the verse — **DONE**

- On switch, resolve the first visible verse in the current edition, look up its page in the target edition, and navigate there. `ReaderPager` already tracks `firstVerseKey` for `RecitationPageSync` — reuse it.
- Must not interrupt recitation playback (ADR 0021): if verse X is playing and the user switches edition, verse X stays on screen and audio continues.

**Acceptance:** toggling on any of the 36 divergent pages keeps the same verse on screen; toggling mid-recitation does not stop or skip audio.

---

#### Task 7 — Center every line (closes the `is_centered` remainder of #72) — **DONE**

The printed mushaf centers a surah's closing line when it falls short. Across all 114 surah-closing lines the median width is **100%** of a full line — the QCF kashida already fills them — and only 7 are short: surahs 1, 101, 106, 108, 110, 113, 114 on pages 1, 597, 600, 602, 603, 604.

**Why centering only those 7 does not work.** The card's content box is `font-size × QURAN_LINE_WIDTH_RATIO` = `14.7em`, but a page's widest line is median `14.24em` (range 13.50–15.11 measured across all 604 pages). Lines therefore sit flush to the start edge with ~0.46em of slack on the far side — about 6px at the default 2.9vh scale. Centering a subset would inset those lines ~6px from their flush neighbours, which reads as misalignment, not intent. Centering *all* lines keeps every line on a page mutually aligned and simply gives the text block symmetric margins, which is what a printed mushaf has.

- `app/components/QuranLine.tsx:70` — replace the `[1, 2].includes(words[0].page_number) || tajweedMode` condition with unconditional `justify-center`.
- This removes the last use of `tajweedMode` in `QuranLine`, so drop the `useQuranTajweed()` call (line 33) and its import entirely.
- It also removes the last render-path read of `words[0].page_number`, which under the per-edition model is only a default-edition mirror and would have been the wrong value for the tajweed edition — a latent bug this deletes rather than fixes.
- Leave `.fq-quran-safha.fq-safha-center` (globals.css) alone — that is **vertical** block centering for the short opening pages 1–2, a separate concern.

**Sequencing:** do this after Task 3, so the `tajweedMode` → `mushafId` context change has already landed and there is one less consumer to migrate.

**Acceptance:**
- All 604 pages of both editions: every line on a page remains mutually aligned; the text block is symmetrically inset rather than flush.
- The 6 short surah-closing lines in the default edition (pages 597, 600, 602, 603, 604) now read as centered.
- **Mobile overflow check.** `.fq-quran-safha > .fq-safha-row` is `flex-wrap: nowrap` with `flex-shrink: 0` on children, and the globals.css comment records that a hair of overflow is expected to "clip invisibly" against the card's `overflow-hidden`. On desktop the card is `md:w-auto` so it grows to the widest line and nothing clips. On mobile the card is viewport-width, so any over-wide line will now clip at **both** edges instead of one. Verify the widest pages on a narrow viewport — page 189 has the widest line at 15.11em. Tajweed mode already centers every line on mobile today, so this path is exercised in production, but confirm it for the default edition before shipping.

### Constraints

- Never select a glyph field, font file, or word placement independently of one another — always as an edition set from the registry. A mismatch draws a different word's glyph rather than failing, so nothing will alert you.
- Never read `Word.page_number` / `Word.line_number` as a word's canonical page or line. They survive only as a default-edition mirror for mark canonicalization and legacy queries.
- Do not modify the surah-banner gap algorithm, `RenderItem[]`, or the classification table from Addendum 4 of `fix-surah-banner-placement.md` — verified correct on 604/604 pages given correct input.
- Do not loosen a seeder integrity check to make a seed pass. A failure means the schema is mismodelled.
- Adding an edition must stay a seed run. If it needs a schema or rendering change, the model has regressed.
- Preserve every still-active constraint from the earlier addenda: tajweed fonts stay out of the PWA precache; `FontFaceInjector` renders unconditionally and reads the context itself; never mutate a live stylesheet containing `@font-face` (ADR 0029); COLRv1 ignores CSS `color`, so interaction states use transform/filter/background (Addendum 12); do not reintroduce `justify-content: space-between` for lines in either edition.
- Line justification is now edition-independent: every line is centered, in every edition, on every page. Do not reintroduce a per-edition or per-page justification branch.
- Keep `getPageWords`'s `{ lines, pageMetadata }` return shape so its other consumers stay untouched.
- Do not change `code_v2` — ADR 0023's core finding still holds. It is the correct mushaf-independent glyph field; only *placement* is edition-variant.

### What NOT to do

- Do not patch the 361 words into neighbouring page JSON as a `tajweedOverflow` delta. This was designed and rejected during planning: it encodes the same "base edition plus corrections" model that caused the bug, and breaks again on the next edition.
- Do not fall back to mushaf 2's `line_number` on the 36 affected pages. Considered and rejected — it fixes reading order but discards mushaf 19's kashida calibration, which is the whole point of the per-page fonts.
- Do not keep mushaf 2's page composition and render 16–17 line slots to fit the foreign words. A Furqan page spans up to 17 distinct mushaf 19 lines (pages 123 and 144), so this cannot fit 15 slots; it also breaks equal-height spread and viewport fit, and produces a hybrid layout that exists in no printed mushaf.
- Do not treat a bare page number as an absolute reference to Quran content anywhere new.
- Do not preserve the page number across an edition switch — preserve the verse.
- Do not attempt to make tajweed lines edge-to-edge by adding justification. ADR 0023 Addendum 5 was wrong about this: the kashida is already baked into the glyph advance widths at 0.21–0.44% CV, tighter than `code_v1`'s own 2.7%. Nothing needs stretching. Changing `justify-center` is out of scope for this task, but do not act on Addendum 5's withdrawn conclusion.
- Do not re-verify a general property with a single spot check and record it as verified. Addendum 6 did that with page 106 — not one of the divergent pages — and it is why this shipped.
