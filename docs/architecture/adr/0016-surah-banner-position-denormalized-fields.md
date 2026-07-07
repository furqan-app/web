# ADR 0016: Surah Banner Positions as Denormalized Fields on PageMetadata

**Date:** 2026-07-07  
**Status:** Accepted

## Context

The madani mushaf renders surah name banners at two specific page-level positions — as the last slot on the ending surah's page ("end banner"), or as the first slot on the starting surah's page ("start banner") — rather than inline at the first verse. The QPC Word table carries only `line_number` and `char_type_name`; the `line_type` field (which in QPC's full layout API distinguishes `ayah / surah_name / basmallah` lines) was never ingested. Without that data, the app cannot determine banner placement from Word rows alone.

## Options Considered

**Option A — Ingest QPC per-line layout (`line_type`)**  
Re-ingest all 604 pages from QPC's page-layout endpoint, adding a `PageLine` table (page, line_number, line_type) and deriving banner positions from it at render time.

**Option B — Denormalized nullable fields on `PageMetadata` from curated data**  
Add `start_banner_surah_id`, `end_banner_surah_id`, and `bismillah_only_surah_id` to the existing `PageMetadata` row. Populate from a user-curated list of banner pages provided by the project owner, who has verified these against the printed mushaf.

## Decision

Option B — denormalized fields on `PageMetadata` fed from curated data.

## Consequences

- **+** Zero extra DB queries at render time; the three fields ride along on the `PageMetadata` fetch already done by `get-page-words.ts`.
- **+** No new tables or schema complexity; consistent with how `PageMetadata` already denormalizes `surah_id`, `page_surahs`, and `hizb_position`.
- **+** Unblocks the fix without a full QPC re-ingestion pipeline.
- **-** The curated data is a hand-maintained artifact — if QPC's layout changes or a data error is found, the seeder must be updated manually.
- **-** Does not capture full per-line `line_type` data; any future feature that needs line-level layout metadata (e.g. sajdah markers, rub-el-hizb glyphs as layout slots) will need Option A or a similar field-by-field extension.
- **-** `bismillah_only_surah_id` is derived automatically by the seeder from `end_banner_surah_id` pages (set on page N+1 whenever page N has an end banner) — this cross-page derivation must be preserved if the seeder is ever rewritten.

> If full QPC line_type data is ever ingested (Option A), these three fields become redundant and should be dropped in the same migration.
