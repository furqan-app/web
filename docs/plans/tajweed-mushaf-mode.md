# Add Tajweed color-coded mushaf mode

**Type:** feature
**Date:** 2026-07-11
**Status:** implemented (Addendum 10's production wiring of `mushaf=19` line-layout data is implemented and seeded.)

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

**Line centering:** `code_v2` lines are far less width-consistent than `code_v1` (7.7% CV vs 2.7% CV) because `code_v2` has no AAT justification tables — only COLR/CPAL. `justify-content: space-between` was tried and reverted: it inserts uniform gaps *between* words, moving every word off its authentic mushaf position (real justification is kashida baked into glyphs, not inter-word gaps). Fix: center every tajweed line as a rigid block. `QuranLine.tsx`: `[1, 2].includes(page_number) || tajweedMode ? "justify-center" : ""`. Centering shifts only the line's overall horizontal position, never the relative word gaps.

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
