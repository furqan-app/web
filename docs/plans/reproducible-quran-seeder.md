# Reproducible Quran Database Seeder

**Type:** bug  
**Date:** 2026-07-02  
**Status:** implemented  
**ADR:** [0009-reproducible-quran-seeder](../architecture/adr/0009-reproducible-quran-seeder.md)

## Summary

Refactor ad-hoc scraper scripts into a self-contained `scripts/quran-seed/` subfolder that regenerates `furqan_quran` to a single known state with one guarded command. Prisma owns the schema (`prisma db push --force-reset`); data comes from the QDC API; `page_metadata`/`rubs`/`rub_verse_mappings` derived from `verses`. Refuses without `--force`.

`Verse.text_uthmani` and `Verse.text_imlaei_simple` must be `@db.Text` (not `VARCHAR(191)`) — long verses (e.g. 2:282) exceed 191 characters.

## Algorithm

1. **Guard** — read `--force` from argv; print `host:port/db`; refuse with non-zero exit if `--force` absent.
2. **Reset** — `execSync("npx prisma db push --force-reset --schema prisma/quran/schema.prisma")`.
3. **Fetch + insert (FK order):**
   - `chapters` ← QDC `GET /api/qdc/chapters?language=en`
   - `verses` + `words` ← QDC by-page (no `translation_text`/`transliteration_text`)
   - `rubs` ← group verses by `rub_el_hizb_number` (global 1–240, NOT within-hizb 1–4) → `{ rub_number, verse_mapping_start, verse_mapping_end, verses_count }`
   - `rub_verse_mappings` ← group by `(rub_el_hizb_number, chapter_id)` → `{ rub_number, chapter_number, start_verse, end_verse }`
   - `page_metadata` ← derived per page
   - Insert order: **chapters → verses → words → rubs → rub_verse_mappings → page_metadata**. Batch words (~83k) via `createMany` in chunks of ~1000.
4. **Report** final row counts (expected: chapters=114, verses=6236, words=83665, rubs=240, rub_verse_mappings=313, page_metadata=604).

## Data Contracts

- `Verse.rub_el_hizb_number` is a **global** rub index (1–240). Group by it directly.
- `chapters.pages` is `[start,end]` array → store as `"start-end"` string.
- `chapters.translated_name` is an object → store `.name`. `chapter_number` = `id`. Ignore `slug`.

## Files Changed

**New** — `scripts/quran-seed/`:
- `seed.js` — orchestrator
- `db-connection.js` — parses `QURAN_DATABASE_URL`, instantiates `quranPrisma` from generated client
- `chapters.js` — fetch + transform QDC `/chapters`
- `verses-words.js` — by-page fetch
- `derive.js` — pure derivation functions for `page_metadata`, `rubs`, `rub_verse_mappings`

**Removed** — `scripts/quran-scraper.js`, `populate-page-metadata.js`, `quran-db-connection.js`

`package.json`: replace `scrape-quran` with `seed:quran`: `dotenv -e .env.local -- node scripts/quran-seed/seed.js`. Run as: `npm run seed:quran -- --force`.

`prisma/quran/schema.prisma`: `Verse.text_uthmani` and `Verse.text_imlaei_simple` → `String @db.Text`.

## Constraints

- No hand-written DDL — Prisma owns the `furqan_quran` schema.
- Never insert `translation_text`/`transliteration_text` — not in the `Word` model.
- Never assume `rub_el_hizb_number` is within-hizb — it is global 1–240.
- Connect only via `QURAN_DATABASE_URL` — never touch `APP_DATABASE_URL` (ADR 0008).
- `--force` guard must print the target and refuse; it's the only safeguard against wiping the wrong DB.
- Do not widen word-level string columns — they're single-word text, unaffected by the varchar overflow.
- `hizbs`/`hizb_verse_mappings` are out of scope.
