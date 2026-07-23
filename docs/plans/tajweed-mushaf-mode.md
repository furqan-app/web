# Add Tajweed color-coded mushaf mode

**Type:** feature
**Date:** 2026-07-11
**Status:** implemented (Addendum 11: dark-mode tajweed color overrides; Addendum 12: unified word hover effect)

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
