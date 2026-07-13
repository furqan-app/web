# ADR 0023: Tajweed color-coded mushaf mode via per-page COLRv1 fonts

**Date:** 2026-07-11
**Status:** Accepted

## Context

We want an opt-in reading mode that color-codes Quran text by Tajweed rule (idgham, ikhfa, qalqalah, madd, etc.). quran.com-frontend-next ships this using per-page COLRv1 (color-glyph) font files — one font per Mushaf page, same `p{n}.ttf` convention as our existing non-colored per-page font — where the coloring is baked into the font's glyph outlines rather than computed at runtime. Each COLRv1 file also embeds 3 built-in color palettes (light/dark/sepia), selected via CSS `@font-palette-values`. We evaluated whether porting this required new word-level data (a `code_v4`-equivalent column) as the reference project's source code suggested, or whether our existing `Word.code_v2` (already seeded, currently unused anywhere in the app) could be reused directly.

## Options Considered

**Option A — New `code_v4` column + reseed** — Add a schema column and re-fetch all 604 pages from QDC with `mushaf=19` (the Tajweed-V4 mushaf ID), matching the reference project's apparent per-mushaf field aliasing (`code_v2` re-requested under a different `mushaf` param).

**Option B — Reuse the existing `code_v2` column as-is** — No schema change, no reseed; render `word.code_v2` (already in the DB) whenever Tajweed mode is on.

## Decision

**Option B.** We verified empirically against the live QDC API that `code_v2` is byte-identical regardless of the `mushaf` query param (tested `mushaf=1`, `2`, `19` across 5 pages spanning the whole Mushaf — zero diffs, matching word counts). The reference project's `mushaf=19` request parameter does not change the word-level glyph field; it must affect something else (page/verse metadata, not glyph codepoints). Furqan's already-seeded `code_v2` is the correct, mushaf-independent QCF V2 glyph string and pairs correctly with the COLRv1 font files as-is.

## Consequences

- **+** No migration, no reseed, no new QDC dependency at build/seed time — this feature is purely additive on the render/asset side.
- **+** `code_v2` (previously dead schema weight) becomes load-bearing, one column doing double duty for both a hypothetical future plain-V2 font and this Tajweed font — acceptable since both would render identical glyph data.
- **-** If a future need arises for glyph data that is genuinely mushaf-variant (unlike `code_v2`), this ADR's finding does not generalize to other fields — re-verify empirically per field/mushaf pair rather than assuming the reference project's frontend code literally describes backend field semantics.
- **-** Coupling font family and glyph field by mode (`code_v1`+`quran-p{n}` vs `code_v2`+`quran-p{n}-tajweed`) means any future third font mode requires the same paired-selection pattern, not a generic "pick a font" toggle.
- **-** The COLRv1 font is a different font design, not a colorized clone of the base font — its glyphs measure ~1.42x taller at the same CSS `font-size` (measured via `fontTools` across 20 real word pairs, page 1). Required a separate CSS-only correction constant (`--fq-tajweed-scale`, Addendum 1) layered on top of all three existing font-sizing mechanisms (mobile/desktop-single/desktop-double).
- **-** COLRv1 glyphs ignore the CSS `color` property outright (they paint their own baked-in palette colors) — this broke the word hover cue (`hover:text-yellow-500`), which is `color`-based. Any future tajweed-mode interaction state must use `background-color`/`text-shadow`/opacity, never `color` (Addendum 1).

## Addendum: `line_number` is mushaf-variant, even though `code_v2` isn't

**Date:** 2026-07-11

The "-" consequence above ("re-verify empirically per field/mushaf pair") turned out to matter sooner than expected. Diffing page 343 word-by-word between `mushaf=19` (Tajweed-V4) and `mushaf=2` (Furqan's seeded param): `code_v2` is still byte-identical (confirming the Decision above still holds), but **`line_number` is not** — 36 of 153 words (23%) land on a different line depending on the mushaf param. The Tajweed-V4 mushaf has its own line-break layout, distinct from the one Furqan seeded (which matches `code_v1`'s V1-mushaf breaks).

This does not overturn the Decision (`code_v2` is still the correct, mushaf-independent glyph field — confirmed `code_v3`/`code_v4` don't exist as API fields either, and the reference project's `TajweedV4` font renders `code_v2` too, per its `GlyphWord.tsx`). But it means Furqan's current DB `line_number` may be the wrong value to group `code_v2` words by when rendering Tajweed mode — the glyphs' kashida may have been shaped assuming the Tajweed-V4 mushaf's own line groupings, not the ones seeded. See Addendum 4 of `docs/plans/tajweed-mushaf-mode.md` for a diagnostic test page built to confirm this before any schema change is made.

## Addendum 2: `mushaf=19` confirmed final; `mushaf=11` investigated and abandoned

**Date:** 2026-07-12

Addendum 5 of the plan had picked `mushaf=11` off a single line-boundary match against a screenshot from the official Quran Android app. Cloning that app's actual repo (`quran/quran_android`) found it has **no Tajweed rendering code at all** — full-history git search (`git log --all -S"tajweed"`) returned zero hits; the app only downloads pre-rendered plain page images and overlays a separate SQLite bounding-box table for tap/highlight, no live font/glyph path. There is no reachable algorithm behind that screenshot's specific line layout. Separately, the live quran.com web app (an actual client-rendered tajweed reference) was checked for page 343 and matches `mushaf=19`, not `mushaf=11`. Given `mushaf=11`'s layout is unreachable and `mushaf=19` matches a real working reference implementation, **`mushaf=19` is final** for this feature. See Addendum 6 of `docs/plans/tajweed-mushaf-mode.md`.

## Addendum 3: alternative approach under investigation — `text_uthmani_tajweed`

**Date:** 2026-07-12

A structurally different rendering technique was found while investigating the above: QDC's `text_uthmani_tajweed` field renders Tajweed as CSS-colorable `<rule class=X>` spans over the *same* standard Uthmani text/line-layout as `code_v1` — not a special glyph font. This can't have the `code_v2`/`line_number` mismatch documented above, since it doesn't depend on a second mushaf-specific glyph string at all. A throwaway diagnostic test page was built to visually evaluate it (Addendum 7 of `docs/plans/tajweed-mushaf-mode.md`).

**Result: rejected.** Visual review of page 343 confirmed plain Unicode Uthmani text (`text_uthmani`) has no per-line kashida calibration at all — unlike `code_v1`/`code_v2`, which are typeset per mushaf page with kashida baked in at exact points — so lines fell visibly short of the container edge regardless of which `line_number` grouping was used. This is a structural property of the data, not something a schema/grouping fix can address. The COLRv1-font approach (main Decision above, `mushaf=19` per Addendum 2 below) remains the shipped approach. The diagnostic test page and its supporting code were removed after this result; see Addendum 7 of the plan for the full detail and rejected-approach record.

## Addendum 4: CPAL palette-slot → Tajweed rule mapping (empirically derived)

**Date:** 2026-07-12

A separate investigation (prompted by a user-supplied reference image of a different, real printed "colored tajweed mushaf") looked at whether Furqan's shipped colors match the authentic tajweed-rule color convention, and whether per-character coloring could be derived from `text_uthmani_tajweed` and applied to `code_v1`/`code_v2`.

**Finding 1 — `code_v1`/`code_v2` cannot be recolored per character; it doesn't need to be.** Both fields encode an entire word as a single glyph character (confirmed via the QDC API: `code_v1`/`code_v2` values are 1 character per word, occasionally 2 for a trailing pause mark) — there is no sub-word granularity to align against `text_uthmani_tajweed`'s per-character rule tags. This turned out not to matter: inspecting the actual font files (`public/fonts/v4/colrv1/ttf/p{n}.ttf`) with `fontTools` shows each glyph is a color-layered glyph (`COLR`/`CPAL` tables) — every word-glyph is already built from multiple internally-colored layers, each referencing one of **16 shared palette slots**. Which letters within a word get which layer/color is baked into the glyph itself by whoever produced these fonts, identically across every page's font file (checked `p1.ttf`, `p10.ttf`, `p100.ttf`, `p343.ttf` — byte-identical 16-slot CPAL structure and 6 built-in palettes in all four). The "which characters get colored" question is therefore already solved at the font layer — no code, alignment, or per-character data of ours is involved.

**Finding 2 — which palette slot means which rule, verified empirically.** For ~600 words sampled across 13 pages (1, 50, 100, 120, 200, 250, 300, 343, 400, 450, 500, 550, 600), each word's `COLR` layer palette indices (from its `code_v2` glyph) were correlated, in order, against that same word's rule tag(s) from QDC's `text_uthmani_tajweed` field. Palette 0 (Furqan's current `--Light`) values in parens:

| Rule (QDC) | Palette slot | Color | Confidence |
|---|---|---|---|
| `qalaqah` | 8 | `#2FADFF` cyan | 14/14 (100%) |
| `madda_normal` | 5 | `#CE9E00` gold | 49/49 (100%) |
| `madda_permissible` | 4 | `#FF7B00` orange | 20/20 (100%) |
| `madda_obligatory_mottasel` | 9 | `#F40000` red | 18/18 (100%) |
| `madda_obligatory_monfasel` | 9 | `#F40000` red | 30/30 (100%) |
| `iqlab` | 6 | `#09B000` green | 4/4 (100%) |
| `ghunnah` | 6 | `#09B000` green | 71/71 (100%) |
| `slnt` (silent) | 2 | `#A3A5A5` grey | 26/26 (100%) |
| `ikhafa` | 6 | `#09B000` green | 52/61 (85%) |
| `idgham_wo_ghunnah` | 2 | `#A3A5A5` grey | 8/9 (89%) |
| `idgham_shafawi` | 6 | `#09B000` green | 6/8 (75%) |
| `ham_wasl` | 15 | `#9FA5A5` light grey | 62/71 (87%) |
| `idgham_ghunnah` | 2 or 6 | grey/green | ambiguous, 30 vs 24 |

Palette slots 3 (`#B50000` maroon), 10 (`#2CA4AB` teal), 11 (`#FF0080` pink), and 12 (`#D8E9D8` pale green) never matched any rule in this sample — either unused, or reserved for a rule QDC doesn't expose via `text_uthmani_tajweed` (`تفخيم`/tafkheem is a letter-context rule, not a per-instance API tag, and is the leading candidate for one of these unmapped slots).

## Consequences (Addendum 4)

- Recoloring Tajweed to match a different reference palette is a CSS-only change (`@font-palette-values` `override-color: <slot> <hex>;` on top of a `base-palette`) — not a font, schema, or rendering-logic change. `FontFaceInjector.tsx`/`globals.css` currently only select whole built-in palettes 0/1/2 (mapped 1:1 to Furqan's light/dark/gold themes, per the Constraints above) — introducing per-rule color overrides on top of a theme's base palette is additive to that mechanism, not a replacement of it.
- This mapping is empirical (order-correlation across a sample), not read from font metadata or vendor documentation — treat slots with <100% confidence (`ikhafa`, `idgham_wo_ghunnah`, `idgham_shafawi`, `ham_wasl`, `idgham_ghunnah`) as provisional until spot-checked against more words/pages.

## Addendum 5: Tajweed color + always-edge-to-edge lines is not achievable with current font assets

**Date:** 2026-07-12

Addenda 2–3 (main body above) measured that `code_v2` lines are far less width-consistent than `code_v1` (7.7% CV vs 2.7% CV) but never established the root cause. Directly inspecting both font files with `fontTools` found it: `public/fonts/v1/ttf/p{n}.ttf` (`code_v1`) has Apple AAT tables `just`/`morx`/`feat`/`prop` — `just` specifically is Apple's justification table, carrying the font's own kashida-insertion/stretch data, which is what a text-shaping engine uses to fill a line to width. This is the actual mechanism behind `code_v1`'s consistent self-justification, not a coincidence of glyph design. This font has **zero** `COLR`/`CPAL` tables — it cannot be recolored by any means (one glyph per word, one fixed outline, no paint layers).

`public/fonts/v4/colrv1/ttf/p{n}.ttf` (`code_v2`, the Tajweed font) has `COLR`/`CPAL` (Addendum 4 above) but is missing `just`/`morx`/`feat`/`prop` entirely — no AAT justification mechanism at all. Its line width is purely the glyph outlines' natural advance-width sum, with nothing to stretch it further. This is the direct, font-level explanation for Addendum 2's CV measurement.

**Decision:** color and full self-justification currently live in two different, mutually exclusive font files — there is no font asset today with both `COLR`/`CPAL` and `just`/`morx`/`feat`/`prop`. The reference project (quran.com-frontend-next) has the identical limitation and works around it the same way Furqan does (hardcoded per-scale width + `text-align: center`, not force-stretching) — this is an ecosystem-wide asset gap, not a Furqan-specific shortcoming. Achieving both properties in one rendering would require constructing a merged font (splicing AAT justification tables onto the COLR/CPAL-layered glyphs, or vice versa) — a real font-engineering undertaking, not attempted, not designed, and not something either project currently has an asset for. Centering (Addendum 3 above) remains the accepted, shipped trade-off; building a merged font is a legitimate future option if edge-to-edge Tajweed lines become a priority, but is out of scope for now.

## Addendum 6: Production wiring of `mushaf=19` line data — QDC field-availability finding and the static-generation/dual-grouping decision

**Date:** 2026-07-12

Planning the schema change deferred since the Addendum above (`line_number` is mushaf-variant, `code_v2` isn't) surfaced two decisions worth recording for future reference.

**Finding — QDC has no `line_type`/`is_centered` fields, at word or verse level, under any mushaf param.** Explicitly requested both as `word_fields` against the live API; QDC silently drops unrecognized field names (no error) and neither appeared in the response. No dedicated per-line-layout endpoint exists either (`/mushafs/{id}/pages/{page}`, `/verses/filter?mushaf=...&page=...` both return nothing). This matters because Furqan's own `DECISIONS.md` ("Surah Banner Placement — DEFERRED", Trello #72) had floated "ingest the canonical QPC per-line `line_type`... via the seeder" as a future path — this investigation confirms that data does not come from QDC and would require sourcing a separate dataset entirely. The `mushaf=19` schema change below stores `line_number` only; `line_type`/`is_centered` remain unscoped, tracked solely under Trello #72.

**Decision — new data is a generic per-mushaf side table, not a `Word` column.** `WordMushafLayout` (`word_id`, `mushaf_id`, `line_number`, unique on the pair) rather than a `Word.tajweed_line_number` column — keyed by `mushaf_id` so a future mushaf/print-edition's line layout is a new set of rows, not a schema change. Word `id` is confirmed stable across mushaf params (re-verified on two more pages, including a mid-page surah-transition page), so this table joins cleanly without touching the main verse/word seed pass.

**Decision — rendering must carry both groupings in one set of static props, and only re-group client-side.** All 604 pages are statically generated once at build time (Static Generation Strategy decision) and `tajweedMode` is a pure client-side toggle — there is no per-request opportunity to fetch a different grouping on mode switch. Two designs were weighed: (a) `getPageWords` computing and returning two full pre-grouped `Record<string, WordWithVerse[]>` maps, or (b) returning the existing single grouping unchanged, with a `layouts: Record<number, number>` map (mushafId → lineNumber) attached per word, and only `QuranSafha` re-grouping client-side when `tajweedMode` is true. **(b) was chosen** — (a) would double the static payload embedded in every one of 604×2 (locale) pages, since each word already carries a nested `verse`→`chapter` object; (b) adds a small keyed map per word and keeps every other consumer of `getPageWords` (`ReaderPage`, `QuranSpread`, `QuranPage`, the `/test-tajweed-palette` diagnostic page) completely untouched.

**Verified — the existing surah-banner gap-detection algorithm needs no logic changes.** `QuranSafha`'s banner/bismillah placement infers position generically from gaps in whichever line-number sequence it receives. Spot-checked against a real mid-page surah transition (page 106, An-Nisa → Al-Ma'idah): the gap sits at lines 6-7 under both `mushaf=2` and `mushaf=19` groupings, even though 6 other words on the page shift line by ±1 between the two. The algorithm just needs to run against the active grouping (`activeLines`) — not be rewritten. See Addendum 10 of `docs/plans/tajweed-mushaf-mode.md` for the full design.

