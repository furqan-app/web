# Reproducible Quran database seeder

**Type:** bug
**Date:** 2026-07-02
**Status:** implemented
**ADR:** [0009-reproducible-quran-seeder](../architecture/adr/0009-reproducible-quran-seeder.md)
**Related:** [split-quran-app-databases](./split-quran-app-databases.md) (closes its schema-ownership open item)

## Summary

Refactor the ad-hoc scraper (`scripts/*.js`) into a self-contained seeder subfolder that regenerates `furqan_quran` to a single known state with one guarded command — runnable in prod. Prisma owns the schema (`prisma db push --force-reset`); data comes entirely from the QDC API (`chapters` + `verses`/`words`); `page_metadata`/`rubs`/`rub_verse_mappings` are derived from `verses`. Destructive: refuses without `--force`.

## Approach

A single Node (CommonJS) orchestrator, run via npm through `dotenv -e .env.local`, does:

1. **Guard** — read `--force` from argv; parse `QURAN_DATABASE_URL`; print target `host:port/db`; refuse (non-zero exit) unless `--force` is present.
2. **Reset schema** — `execSync("npx prisma db push --force-reset --schema prisma/quran/schema.prisma")` (inherits `QURAN_DATABASE_URL` from env). Prisma is the sole schema source; no hand-written DDL.
3. **Fetch + insert in FK order** via the generated `quranPrisma` client (required directly from `app/generated/quran-client`, its own `PrismaClient` on `QURAN_DATABASE_URL`):
   - `chapters` ← QDC `GET /api/qdc/chapters?language=en`, transformed (see contracts).
   - `verses` + `words` ← QDC by-page (existing scrape loop, **minus** `translation_text`/`transliteration_text` — not in Prisma). Accumulate verse rows in memory for derivation.
   - `rubs` ← derived: group verses by `rub_el_hizb_number` (global 1–240) → `{ rub_number: r, verse_mapping_start: min(id), verse_mapping_end: max(id), verses_count: count }`.
   - `rub_verse_mappings` ← derived: group verses by `(rub_el_hizb_number, chapter_id)` → `{ rub_number, chapter_number: chapter_id, start_verse: min(verse_number), end_verse: max(verse_number) }`.
   - `page_metadata` ← derived per page (existing `populate-page-metadata.js` logic).
   - Insert order (FK-safe): **chapters → verses → words → rubs → rub_verse_mappings → page_metadata**. Batch `words` (~83k) via `createMany` in chunks (~1000).
4. **Report** final row counts.

## Data-shape contracts (from ADR 0009 — do not break)

- `Verse.rub_el_hizb_number` is a **global** rub index (1–240), NOT within-hizb 1–4. Group by it directly. (Same fact as the `hizb_number*4 - rub_el_hizb_number ∈ {0..3}` page-metadata math.)
- QDC `chapters.pages` is an array `[start,end]` → store as `"start-end"` string (`Chapter.pages` is a string, per DECISIONS).
- QDC `chapters.translated_name` is an object → store `.name`. `chapter_number` = `id`. Ignore `slug`.

## Files to Change

### New — `scripts/quran-seed/`
- `scripts/quran-seed/db-connection.js` — moved from `scripts/quran-db-connection.js` (parses `QURAN_DATABASE_URL`; also used to print the target and instantiate the generated `PrismaClient`).
- `scripts/quran-seed/chapters.js` — fetch + transform QDC `/chapters` → chapters rows.
- `scripts/quran-seed/verses-words.js` — by-page fetch (from `quran-scraper.js`, translation columns removed), returns/accumulates verse + word rows.
- `scripts/quran-seed/derive.js` — pure functions deriving `page_metadata`, `rubs`, `rub_verse_mappings` from the verse rows.
- `scripts/quran-seed/seed.js` — orchestrator (guard → `db push --force-reset` → insert in FK order → report).

### Remove
- `scripts/quran-scraper.js`, `scripts/populate-page-metadata.js`, `scripts/quran-db-connection.js` — superseded (logic moves into `scripts/quran-seed/`).

### `package.json`
- Replace `scrape-quran` with `seed:quran`: `dotenv -e .env.local -- node scripts/quran-seed/seed.js`. Run destructively via `npm run seed:quran -- --force`.

### Docs
- `docs/plans/split-quran-app-databases.md` — update the "Scraper" / bootstrapping / "Seeding status" sections to point at the seeder and ADR 0009 (the dump-copy + `scrape-quran` path is superseded); resolve the schema-ownership open item.
- `docs/standards/database.md` — update the seeding/Migrations notes to reference `npm run seed:quran` (+ ADR 0009).

## Constraints (what NOT to do)
- **No hand-written DDL** — Prisma owns the `furqan_quran` schema. Never re-add `CREATE TABLE` to the seeder.
- **Never insert `translation_text`/`transliteration_text`** — not in the Prisma `Word` model. (Adding word translations means adding the Prisma models first.)
- **Never assume `rub_el_hizb_number` is within-hizb** — it is global 1–240.
- **Connect only via `QURAN_DATABASE_URL`** — the seeder must never touch the app DB (`APP_DATABASE_URL`). No cross-domain writes (ADR 0008 invariant).
- **No run without `--force`** — the guard must print the target and refuse; this is the only safeguard against wiping the wrong DB.
- `hizbs`/`hizb_verse_mappings` are out of scope (not in Prisma).

## Decisions Made
- Prisma owns the schema; regenerate via `prisma db push --force-reset` (not raw DDL, not `quran-db-push`-then-seed).
- Fully API-driven: `chapters` from QDC `/chapters`; `verses`/`words` from QDC by-page; `page_metadata`/`rubs`/`rub_verse_mappings` derived from `verses` (no `quran_db.sql` dump).
- Destructive full reset each run, guarded by an explicit `--force` (prints target host/db first).
- Self-contained Node/CommonJS scripts in `scripts/quran-seed/`, run via `npm run seed:quran`, inserting through the generated `quranPrisma` client.

## Follow-ups to verify during implementation
- Confirm QDC `/chapters?language=en` supplies all 10 non-derived chapters columns for all 114 (esp. `pages`, `bismillah_pre`, `revelation_order`) — verified reachable (HTTP 200) during planning.
- Confirm `prisma db push --force-reset` picks up `QURAN_DATABASE_URL` from the `dotenv -e .env.local` wrapper (matches existing `quran-db-push`).
- After implementation, run `npm run seed:quran -- --force` and re-verify counts (expect chapters 114, verses 6236, words 83665, page_metadata 604, rubs 240, rub_verse_mappings 313) + zero cross-table orphans.

## Addendum 1 (2026-07-06) — bug: `Verse.text_uthmani` too short for full verse text

**Bug:** `npm run seed:quran -- --force` fails during `[4/4] Inserting` on the `verses` `createMany` (`insertChunked(prisma.verse, verses)`) with:
```
Invalid `delegate.createMany()` invocation ... The provided value for the column is too long for the column's type. Column: text_uthmani
```

**Root cause:** `Verse.text_uthmani` and `Verse.text_imlaei_simple` in `prisma/quran/schema.prisma` are declared as plain `String`, which Prisma maps to `VARCHAR(191)` in MySQL. These two columns hold the **full verse text** (not a single word) — long verses (e.g. 2:282) exceed 191 characters and overflow the column. Word-level text columns (`Word.text_uthmani`, `code_v1`, `code_v2`, `qpc_uthmani_hafs`, `text`) hold single-word strings and stay well under 191 chars, so they are unaffected and out of scope for this fix.

**Fix:** Add `@db.Text` to `Verse.text_uthmani` and `Verse.text_imlaei_simple` only.

### Files to Change
- `prisma/quran/schema.prisma` — `Verse.text_uthmani String` → `Verse.text_uthmani String @db.Text`; `Verse.text_imlaei_simple String` → `Verse.text_imlaei_simple String @db.Text`.

### Constraints
- Do not widen any `Word`-level string column — they're single-word text and not the source of this failure; changing them is unnecessary schema churn.
- Neither column has a `@unique` or is used in an exact-match `where` today (verse search only does `contains` on `text_imlaei_simple`), so switching to `@db.Text` (no fixed length, no index) is safe.

### Verification
- Re-run `npm run app-db-push` is unaffected (app schema untouched).
- Re-run `npm run seed:quran -- --force` end to end; must complete through `[4/4] Inserting` and print final counts (chapters 114, verses 6236, words 83665, page_metadata 604, rubs 240, rub_verse_mappings 313).
- **Confirmed 2026-07-06:** `npm run seed:quran -- --force` completed with exactly these counts — `chapters=114 verses=6236 words=83665 rubs=240 rub_verse_mappings=313 page_metadata=604`. `npm run lint` clean.
