# ADR 0009: Reproducible API-driven Quran seeder; Prisma owns the `furqan_quran` schema

**Date:** 2026-07-02
**Status:** Accepted

## Context

`furqan_quran` had no single reproducible seed path: the scraper produced `verses`/`words`/`page_metadata` while `chapters`/`rubs`/`rub_verse_mappings` were hand-copied from an 18 MB `quran_db.sql` dump, and the scraper's hand-written `CREATE TABLE` DDL drifted from `prisma/quran/schema.prisma` (extra `words.translation_text`/`transliteration_text`, `hizb_position NOT NULL` vs nullable, missing FKs). We want one command that regenerates the whole Quran DB to a known state — runnable in prod. Investigation showed only `chapters` needs external metadata (from the QDC API); `page_metadata`, `rubs`, and `rub_verse_mappings` are all derivable from `verses`, and `hizbs`/`hizb_verse_mappings` are not in the Prisma schema so nothing consumes them.

## Options Considered

**Option A — Seeder owns raw DDL + bundled SQL dump**
Keep hand-written `CREATE TABLE` in the seeder and ship the `quran_db.sql` dump for `chapters`/`rubs`. Perpetuates schema drift and a large committed data blob.

**Option B — Prisma owns schema; API-driven data; derive the rest**
Seeder runs `prisma db push --force-reset` (Prisma is the single schema source), fetches `chapters` (QDC `/chapters`) and `verses`+`words` (QDC by-page), and derives `page_metadata`/`rubs`/`rub_verse_mappings` from the verses in FK order.

**Option C — Commit a versioned full SQL snapshot**
Bundle all data as an in-repo SQL snapshot for fully offline, deterministic seeding. Heavy repo, and the snapshot drifts from upstream corrections.

## Decision

Adopt **Option B**. A self-contained seeder subfolder regenerates `furqan_quran` on demand: `prisma db push --force-reset --schema prisma/quran/schema.prisma` (schema), then insert via the generated `quranPrisma` client in FK order — `chapters` → `verses` → `words` → `rubs` → `rub_verse_mappings` → `page_metadata`. `chapters` comes from QDC `/api/qdc/chapters`; `verses`+`words` from QDC by-page; `page_metadata`/`rubs`/`rub_verse_mappings` are derived from `verses`. The run is destructive and refuses without an explicit `--force`, printing the target host/db first. This supersedes ADR 0008's "scrape + dump-copy" bootstrapping and closes its schema-ownership open item.

## Consequences

- **+** One reproducible, prod-runnable command; `furqan_quran` always returns to the same known state.
- **+** Prisma is the single schema source of truth — the `translation_text` / `NOT NULL` / missing-FK drift class disappears (those columns simply don't exist; the seeder never writes them).
- **+** No 18 MB dump dependency; QDC is the only upstream, matching where `verses`/`words` already come from.
- **-** **Encoded data contracts a future dev must not break:** `Verse.rub_el_hizb_number` is a **global** rub index (1–240), not a within-hizb 1–4 value — group by it directly to build `rubs`/`rub_verse_mappings` (this is the same fact the `hizb_number*4 - rub_el_hizb_number ∈ {0..3}` page-metadata math relies on). QDC `chapters.pages` arrives as an array `[start,end]` and must be stored as the `"start-end"` string the app expects; `translated_name` is an object — store `.name`; `chapter_number` = `id`.
- **-** Seeding requires network access to QDC at run time and tracks upstream state (not pinned) — acceptable since the Quran text is stable and `verses`/`words` already depend on it.
- **-** Destructive by design; the `--force` guard is the only thing preventing an accidental wipe of whatever `QURAN_DATABASE_URL` points at.
- **-** `hizbs`/`hizb_verse_mappings` remain unseeded and out of scope — they are not in the Prisma schema; adding them means adding the models first.
