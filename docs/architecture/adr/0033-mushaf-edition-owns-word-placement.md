# ADR 0033: A mushaf edition owns its full word placement

**Date:** 2026-07-30
**Status:** Accepted
**Supersedes:** ADR 0023 Addendum 6 (the `WordMushafLayout` line-only design); corrects ADR 0023 Addendum 5

## Context

A mushaf is not a rendering of the Quran text — it is a *typeset book*. A committee fixes the position of every letter, every space and every word for that specific print edition. Two editions of the same qirāʾah differ in where words sit on the page, how many words a line holds, and where a page ends. Furqan already ships two editions (QCF V1 as the default reader, QCF V4 Tajweed as the opt-in tajweed mode) and expects more (a second King Fahd print, other tajweed mushafs — each with its own committee-fixed layout).

ADR 0023 Addendum 6 introduced `WordMushafLayout(word_id, mushaf_id, line_number)` on the finding that `line_number` is mushaf-variant while `code_v2` is not. That framing treated the Madani/QCF V1 layout as the base truth (`Word.page_number`, `Word.line_number`) and any other edition as a **line-level override** on top of it. The framing was wrong, and it shipped a correctness bug.

Mushaf 19 has its own **page** boundaries too. 56 verses and 361 words fall on a different page under mushaf 19 than under mushaf 2. Because tajweed mode composed each page from mushaf 2's word set and then re-grouped it by mushaf 19's line numbers, 36 pages rendered a splice of two different books.

The failure is not cosmetic, because the per-page font files are part of the edition. Each page has its own font whose glyph codepoint space is local to that page, and whose glyph advance widths carry the committee's kashida calibration for that page's lines. Measured on the shipped assets:

- **292 words rendered a different word's glyph outright** — the same `code_v2` codepoint exists in the neighbouring page's font but maps to another word.
- **50 words rendered nothing** (pages 121, 533, 534, 568, 570) — no glyph at that codepoint in the font they were drawn with. Under mushaf 19's own composition, 0 of 83,665 words are missing a glyph.
- Line-width coefficient of variation reached **22%** (page 144) against **0.2–0.5%** on pages where the two editions happen to agree.

That last measurement is also how the edition identity of the font assets was established empirically rather than by filename: `public/fonts/v4/colrv1/woff2/p{n}.woff2` is calibrated for mushaf 19's pagination, confirmed by both the zero-missing-glyph result and the CV collapse.

## Decision

**A mushaf edition owns its complete word placement.** Page number, line number, glyph field and per-page font file form one inseparable unit per edition. There is no base edition and no override layer.

```prisma
model MushafWordLayout {
  mushaf_id   Int
  word_id     Int
  page_number Int
  line_number Int
  @@unique([mushaf_id, word_id])
  @@index([mushaf_id, page_number])
}
```

Rows are seeded for mushaf 2 and mushaf 19 as equals. Page-level summary data (`surah_id`, `page_surahs`, `juz_number`, `hizb_number`, `hizb_position`) becomes per-edition for the same reason — it is derived from which verses land on which page, so it diverges wherever pagination does (8 pages differ between mushaf 2 and 19).

`Word.page_number` / `Word.line_number` are retained **only** as a denormalized mirror of the default edition, for mark canonicalization and legacy queries. They are not the canonical layout of anything and must not be read as such.

The complementary invariant lives in code as an edition registry: an edition maps to its glyph field, font family and font URL together. Selecting an edition selects all three at once; they can never be chosen independently.

## Consequences

- **+** The next edition is a seed run, not a schema change or a rendering change.
- **+** The surah-banner gap-detection algorithm needs no modification — it infers banner slots from empty line numbers in whatever grouping it receives. Fed the correct per-edition composition it reproduces mushaf 19's true empty-slot layout on 604/604 pages. The banner loss reported on page 595 was a symptom of bad input, never an algorithm defect.
- **+** The font↔glyph↔layout invariant is now expressible in one place, so violating it requires deliberately bypassing the registry.
- **−** A page number is only meaningful relative to an edition. Page 595 of mushaf 2 and page 595 of mushaf 19 are different pages that share a number. Any feature that treats a bare page number as an absolute reference to Quran content is wrong; deep links, saved positions and the rub sidebar must all resolve through an edition.
- **−** Switching edition mid-read cannot preserve the page number and the content at once. The reader preserves the **verse**, not the page number, so a toggle during recitation keeps the playing verse on screen. The footer page number may shift by one on the 36 divergent pages, which is correct behaviour for two different books.
- **−** `Mark.page_number` is edition-relative as stored. It is canonicalized to the default edition on write, and reads fetch the 1–2 default-edition pages a given edition page spans. Marks themselves are keyed by `marked_id` (verse key or word location), which is edition-independent, so the underlying data needs no migration.
- **−** Static per-page JSON becomes per-edition, roughly doubling the committed asset count. Mitigated by removing genuine redundancy from the payload while regenerating (the per-word nested `verse` object is 26% of each file and `audio_url` is another 10%, both derivable), which also shrinks the default edition's offline download.

## Corrections to ADR 0023

**Addendum 5 is wrong.** It concluded that `code_v2` cannot self-justify — that its lines are "far less width-consistent than `code_v1` (7.7% CV vs 2.7% CV)" because the COLRv1 fonts lack the AAT `just`/`morx`/`feat`/`prop` tables, and that centering was therefore an unavoidable trade-off shared with quran.com. The table observation is accurate; the conclusion drawn from it is not. The 7.7% was measured with mushaf 2's line grouping applied to mushaf 19's fonts, before any mushaf 19 line data existed. Measured with the correct grouping, and excluding surah-final lines which are legitimately short:

| Page | mushaf 2 line grouping | mushaf 19 line grouping |
|---|---|---|
| 10 | 9.94% | 0.36% |
| 100 | 4.82% | 0.33% |
| 343 | 8.95% | 0.44% |
| 500 | 3.78% | 0.21% |

The kashida is baked into the glyph advance widths, to a tighter tolerance than `code_v1`'s own 2.7%. No AAT justification table is needed because no runtime stretching is needed. The claim that colour and edge-to-edge lines are mutually exclusive with the current assets is withdrawn, as is the implication that a merged font would be required to get both.

**Addendum 6's central finding was too narrow.** "`line_number` is mushaf-variant, even though `code_v2` isn't" is true but incomplete — `page_number` is mushaf-variant as well, and that omission is the bug. Its own warning ("re-verify empirically per field/mushaf pair rather than assuming") was the right instruction and was not followed through: page assignment was never checked.

Addendum 6 also recorded a verification that reads as broader than it was: "the existing surah-banner gap-detection algorithm needs no logic changes … spot-checked against a real mid-page surah transition (page 106)." Page 106 is not among the 36 pages where the editions disagree, so the check could not have caught this. The conclusion happens to be correct, but for reasons the check did not establish. A single spot check must not be recorded as verification of a general property.

## The signal that was present and misread

The divergent page boundaries were **already known and written down**. `DECISIONS.md` carried this constraint before the bug was reported:

> `mushaf=19` and `mushaf=2` disagree on page *boundaries*, not just line groupings within a page — discovered when the seeder's first run failed: verse 5:77's words sit on `mushaf=2`'s page 121 but `mushaf=19`'s page 120.

The seeder's page-by-page validation caught the disagreement correctly, on the first run. The response was to remove the check — to aggregate `word_id → line_number` globally so that "a word only needs to resolve *somewhere* in mushaf 19's pagination, not on the same page number mushaf 2 assigned it." That treated a genuine signal as a validation nuisance. The failing check was the design telling us the model was wrong; suppressing it kept the model and shipped the defect. Page 121 is one of the 5 pages that went on to render blank glyphs.

The lesson worth carrying: when a seeder's integrity check fails on real data, the default assumption should be that the schema is mismodelled, not that the check is too strict.
