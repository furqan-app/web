---
title: Add Tajweed color-coded mushaf mode
type: feature
date: 2026-07-11
status: implemented
area: rendering
adr: [0023, 0033]
---

# Add Tajweed color-coded mushaf mode

> The base plan's `tajweedMode: boolean` + `WordMushafLayout` (line-only override) + client-side `activeLines` re-grouping were replaced wholesale by [ADR 0033](../architecture/adr/0033-mushaf-edition-owns-word-placement.md) (per-edition word placement — see Revision History / Addendum 14). Tajweed is now **one mushaf edition** in a registry, not a boolean toggle over a base edition. The enduring tajweed-specific pieces are the COLRv1 palettes and the interaction states below; font sizing lives in `fix-tajweed-font-size.md`.

## Summary

An opt-in color-coded Tajweed rendering, selected from Settings and persisted in `localStorage`. It is delivered as **mushaf edition 19** (QCF V4 Tajweed): a complete independent print edition with its own page boundaries, line breaks, `code_v2` glyph field, and per-page COLRv1 colour-glyph font (`/fonts/v4/colrv1/woff2/p{n}.woff2`). The colour is baked into the font's glyph outlines — no runtime rule computation. Each font embeds 3 built-in CPAL palettes (light / dark / sepia-gold) selected via `@font-palette-values` / `font-palette`.

## Approach

### Edition model (ADR 0033)

An edition owns its complete word placement — **page, line, glyph field, and per-page font file are one inseparable unit**, selected together from `app/utils/mushaf-editions.ts`. No base edition + override layer.

```
mushaf 2  (QCF V1, default) → code_v1 + /fonts/v1/woff2/p{n}.woff2        + its own page/line rows
mushaf 19 (QCF V4 Tajweed)  → code_v2 + /fonts/v4/colrv1/woff2/p{n}.woff2 + its own page/line rows
```

`code_v2` is byte-identical across `mushaf=1/2/19` (ADR 0023) — it is the correct glyph field as seeded; only *placement* is edition-variant. Static per-edition page JSON is emitted at `public/quran/pages/{mushafId}/{page}.json`, already grouped by that edition's page/line rows, so `QuranSafha` does **no** client-side re-grouping. `QuranTajweedContext` carries `mushafId` (not `tajweedMode`); the old `quranTajweedMode` localStorage value is migrated on read.

### COLRv1 palette wiring

`FontFaceInjector` (a client leaf under the async Server Component — reads the context itself, no prop-drilling) injects, for the active edition's tajweed pages, keyed `<style>` elements with:

```css
@font-face { font-family: 'quran-p{id}-tajweed'; src: url('…/p{id}.woff2'); font-display: block; }
@font-palette-values --Light { font-family: 'quran-p{id}-tajweed'; base-palette: 0; }
@font-palette-values --Dark  { font-family: 'quran-p{id}-tajweed'; base-palette: 1; }
@font-palette-values --Gold  { font-family: 'quran-p{id}-tajweed'; base-palette: 2; }
```

with `.theme-light .fq-tajweed { font-palette: --Light; }` etc. in `globals.css`. These keyed `<style>` elements + `@font-palette-values` are the documented CSS exception to ADR 0029 (never mutate a live `@font-face` stylesheet's text — add/remove whole immutable units only).

### Interaction states (COLRv1 ignores CSS `color`)

- **Hover:** `hover:scale-[1.06] hover:[filter:drop-shadow(1px_1px_0px_hsl(var(--foreground)/0.4))] transition-[filter,transform] duration-150` — one unified rule for both editions (filter/transform are not overridden by COLRv1; distinct from every background-color effect — search highlight, mark highlight, recitation active-word).
- Search / mark / recitation highlights use `background-color` layers, unaffected.

### Line centering

**Every line is centered, in every edition, on every page** (`QuranLine.tsx` — unconditional `justify-center`, the `[1,2].includes(page_number) || tajweedMode` condition deleted). The card content box (`14.7em`) is slightly wider than a typical page's widest line (median `14.24em`), so lines carry ~0.46em of slack; centering distributes it symmetrically rather than dumping it on the far edge. `code_v2` lines are **not** less width-consistent than `code_v1` — under the correct per-edition grouping they measure 0.21–0.44% CV, tighter than `code_v1`'s 2.7% (the earlier "7.7% CV" was mushaf 2's grouping applied to mushaf 19's fonts). `justify-content: space-between` was tried and reverted — it moves every word off its authentic kashida-baked position.

### Settings + Switch

"Tajweed Colors" section in the settings surface using shadcn `Switch`; the Thumb carries `rtl:data-[state=checked]:-translate-x-5` so the checked position is on the left in RTL.

### PWA

Tajweed fonts are **never** added to `app/sw.ts`'s precache list — the default edition only is precached (ADR 0014). Bump the SW cache version when the JSON path moves under the edition folder.

## Decision Tree — where each field comes from

| Concern | Source |
|---|---|
| Which words are on page N | `MushafWordLayout` where `mushaf_id = active, page_number = N` — never `Word.page_number` |
| Which line a word is on | that row's `line_number` — never `Word.line_number` |
| Which glyph string / which font file | edition registry (`code_v1`\|`code_v2` paired with the font URL template — never chosen separately) |
| Page header juz / hizb / surah glyph | `MushafPageMetadata` for the active edition (diverges on 8 pages) |
| Banner / bismillah slots | gap detection over the active edition's line keys — **unchanged algorithm** (`fix-surah-banner-placement.md` Addendum 4, verified 604/604) |
| Mark storage page | default edition (mushaf 2) — canonical, edition-independent; mark `marked_id` is edition-independent |

## Verified Test Cases

- Pages 594 / 595 / 597 / 121 in tajweed: rendered line contents match mushaf 19's own layout exactly; سورة الشمس at the top of p595, سورة الضحى on p597; no blank words on 121/533/534/568/570.
- Regular mode is byte-identical to before on all 604 pages.
- Every word (83,665) resolves to a glyph in its edition's page font (was 50 missing); line-width CV < 2% on all 604 pages of both editions (excluding surah-final lines).
- Gap structure vs mushaf 19 truth: **604/604 match** (was mismatches on 36 pages).
- A mark made in tajweed mode on a divergent page is visible in regular mode and vice versa.
- Toggling edition on any of the 36 divergent pages keeps the same verse on screen; toggling mid-recitation does not stop or skip audio (ADR 0021).
- 114/114 surahs receive a page-level banner in both editions; no surah falls back to the `QuranLine` inline header (closes the substantive scope of Trello #72).

## Files to Change

Registry + reader (ADR 0033): `app/utils/mushaf-editions.ts` (new registry), `app/contexts/QuranTajweedContext.tsx` (carries `mushafId`), `app/components/QuranSafha.tsx` (delete `activeLines` / client `groupBy`), `app/components/QuranWord.tsx` (glyph field + unified hover from the registry), `app/utils/quran-font-map.ts` / `app/utils/page-font-registry.ts` (font family + URL from the registry, ADR 0029 invariant preserved), `app/components/reader/FontFaceInjector.tsx` (reads context; keyed `<style>` + `@font-palette-values`), `app/hooks/use-quran-page.ts` / `get-page-words.ts` (fetch `/quran/pages/{mushafId}/{page}.json`, `mushafId` in the query key), `app/components/QuranLine.tsx` (unconditional `justify-center`, drop `useQuranTajweed()`), `app/components/RubList.tsx` / `ReaderPager.tsx` / `app/sw.ts` / `app/[locale]/pages/[id]/page.tsx` (edition-blind call sites — resolve verse→page through the active edition, font paths from the registry, `generateStaticParams` count from the registry).

Schema + seeder: `prisma/quran/schema.prisma` — `MushafWordLayout` (`mushaf_id`, `word_id`, `page_number`, `line_number`, `@@unique([mushaf_id, word_id])`) + `MushafPageMetadata` (`mushaf_id` + `PageMetadata` fields). `scripts/quran-seed/mushaf-layout.js` (edition-generic fetch capturing page **and** line + the verse→page map). `scripts/quran-json/generate.js` (per-edition page JSON, verse-level data hoisted to a per-page map, `audio_url` derived from `location`). A repeatable `scripts/` check that walks every page's JSON, looks up each word's codepoint in that page's font `cmap`, and computes per-line advance-width CV (needs `fontTools` + `brotli`).

Styling: `app/globals.css` (`.theme-* .fq-tajweed` palette rules, unified hover, unconditional centering, `--fq-safha-center` left alone — it is vertical block centering for pages 1–2), `components/ui/switch.tsx` (`rtl:data-[state=checked]:-translate-x-5` on the Thumb), the settings surface's "Tajweed Colors" section, `messages/*.json`.

`docs/architecture/adr/0023-tajweed-mushaf-mode.md`, `adr/0033-mushaf-edition-owns-word-placement.md`, `docs/architecture/DECISIONS.md`.

**No Prisma migration** — `furqan_quran` is owned by the seeder (`prisma db push --force-reset`, ADR 0009). Applying this is a destructive full reseed (`npm run seed:quran -- --force`).

## Constraints

- Never select a glyph field, font file, or word placement independently of one another — always as an edition set from the registry. A mismatch draws a *different word's* glyph rather than failing, so nothing alerts you.
- Never read `Word.page_number` / `Word.line_number` as a word's canonical page/line — they survive only as a default-edition mirror for mark canonicalization and legacy queries.
- Never render `code_v1` with the tajweed font or `code_v2` with the base font; never change `code_v2` (ADR 0023's core finding holds).
- Never inject tajweed `@font-face` / `@font-palette-values` unconditionally; never mutate a live `@font-face` stylesheet's text — keyed `<style>` immutable units only (ADR 0029).
- Never add tajweed font URLs to `app/sw.ts`'s precache list (ADR 0014).
- Do not reintroduce `justify-content: space-between` for line layout in either edition; line justification is now edition-independent (every line centered) — do not reintroduce a per-edition or per-page justification branch.
- Do not modify the surah-banner gap algorithm, `RenderItem[]`, or the classification table from `fix-surah-banner-placement.md` Addendum 4 — verified correct given correct input; the missing banner was bad input.
- Do not loosen a seeder integrity check to make a seed pass — a failure means the model is mismodelled (assert: line numbers never decrease within a page, every line 1–15, ≤15 distinct lines/page, no word id on two pages, every word placed, exactly 604 pages/edition).
- Adding an edition must stay a seed run — if it needs a schema or rendering change, the model has regressed.
- `getPageWords`'s `{ lines, pageMetadata }` return shape is unchanged.
- COLRv1 ignores CSS `color` — interaction states use transform / filter / background only.
- `line_type` ingestion is permanently unnecessary — gap detection derives the same information; QDC exposes no `line_type` under any mushaf param.
- All constraints from `tajweed-mushaf-mode.md`'s earlier addenda that are still active carry forward (COLRv1 hover via filter/transform; no Firefox OT-SVG fallback; do not build on `origin/tajweed-mushaf`).

## What NOT to Do

- Do not encode tajweed as "base edition (mushaf 2) + a `tajweedOverflow` delta" or fall back to mushaf 2's `line_number` on the 36 divergent pages — that is the "base + corrections" model that caused the bug and breaks on the next edition.
- Do not keep mushaf 2's page composition and render 16–17 line slots to fit foreign words — a Furqan page spans up to 17 mushaf-19 lines (p123, p144); breaks 15-slot layout, equal-height spread, and viewport fit.
- Do not treat a bare page number as an absolute reference to Quran content anywhere new; do not preserve the page number across an edition switch — preserve the verse.
- Do not attempt the `text_uthmani_tajweed` / CSS-span colouring approach — `font-uthmanic` has no per-line kashida calibration; structurally unable to self-justify.
- Do not attempt to make tajweed lines edge-to-edge by adding justification — the kashida is baked into the glyph advance widths (0.21–0.44% CV); ADR 0023 Addendum 5's "add justification" conclusion was withdrawn.
- Do not re-verify a general property with a single spot check on a non-divergent page and record it as verified — that (page 106, Addendum 6) is how the splice bug shipped.
- Do not use `hover:bg-*` (conflicts with search/mark/recitation highlights) or `hover:text-*` (ignored by COLRv1).
- Do not change the Switch track/root for the RTL fix — only the Thumb translation.

## Decisions Made

- Tajweed is mushaf edition 19 under the ADR 0033 registry — an edition owns page + line + glyph field + font as one set; `mushafId` context replaces `tajweedMode: boolean`.
- COLRv1 colour is font-baked; three CPAL palettes (light/dark/sepia) via `@font-palette-values`, selected by theme class.
- Interaction states use `scale` + `drop-shadow` filter (COLRv1 ignores `color`) — one rule for both editions.
- Every line is centered in every edition (Task 7) — the `~0.46em` slack is distributed symmetrically; `space-between` stays reverted.
- Mark storage stays on the default edition's page; `marked_id` is edition-independent, so no `marks` migration.
- A per-edition glyph-CV check is a committed repeatable script — the failure mode (wrong layout wired to an edition) is silent.

## Revision History

- 2026-07-15 — folded the tajweed-palette / legend addendum: CPAL index → tajweed-rule mapping verified via fontTools on page 343; `@font-palette-values` selects the built-in light/dark/sepia palettes. (A later runtime palette-colour-override addendum was **reverted**, and the `TajweedLegend` component that depended on it was never implemented — both removed.)
- 2026-07-19 — folded the dark-mode override, unified-hover, and RTL-Switch-thumb addenda: interaction states moved to `scale` + `drop-shadow` filter (one rule, both editions — COLRv1 ignores `color` and `hover:bg-*` collided with existing highlights); `rtl:data-[state=checked]:-translate-x-5` on the Switch Thumb.
- 2026-07-30 — folded Addendum 14 "Per-edition word placement" (Trello #155, [ADR 0033](../architecture/adr/0033-mushaf-edition-owns-word-placement.md), supersedes ADR 0023 Addendum 6, corrects Addendum 5). **Supersedes the base plan's `tajweedMode: boolean` + `WordMushafLayout` (line-only) + client `activeLines` re-grouping.** The reader was seeding each page from mushaf 2's words re-grouped by mushaf 19's line numbers — a splice of two independent print editions that drew 292 words as a *different* word's glyph and left 50 blank. Fixed by a 7-task rework: an edition owns its complete page+line+glyph+font set (`MushafWordLayout` with `page_number`, `MushafPageMetadata` per edition, `app/utils/mushaf-editions.ts` registry, `mushafId` context, per-edition static JSON, mark canonicalization to the default edition, verse-preserving edition switch, and unconditional line centering). Also: rewrote the stale DECISIONS.md "Surah Banner Placement — DEFERRED" section as IMPLEMENTED; `line_type` ingestion declared permanently unnecessary.
