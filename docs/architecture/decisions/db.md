# Db — Decisions

Active decisions for databases — connection, the two-DB split, local dev containers, PageMetadata. Part of `docs/architecture/decisions/`; always-loaded index is [`../DECISIONS.md`](../DECISIONS.md).

---

## Database Connection

**Status:** active

**Decision:** MySQL runs on non-standard ports — `furqan_quran` on **3307**, `furqan_app` on **3308** (local dev; see "Database Split" below). Prisma is used exclusively for all DB queries: content queries go through `quranPrisma`, user/interaction queries through `appPrisma`, both exported from `app/utils/db.ts`. PrismaClient instances are constructed **without explicit datasource URLs** — Prisma reads `QURAN_DATABASE_URL`/`APP_DATABASE_URL` from the environment at query time via schema `env()` declarations. See [ADR 0010](../adr/0010-prisma-no-explicit-datasource-url.md).

**Constraints:**
- Do not use port 3306 — will fail in dev.
- Both local DBs run as separate containers via `compose.yml`; app-db is 3308, not 3307.
- `Chapter.pages` is a `"startPage-endPage"` string (e.g. `"1-21"`), not an array. Use `.split('-')[0]` to get the starting page.
- Do not pass explicit datasource URLs to PrismaClient constructors — `new URL()` at module scope crashes Next.js builds when env vars are absent (ADR 0010).
- `connection_limit=1` must be embedded in the DATABASE_URL string (e.g. `?connection_limit=1`) rather than added programmatically. The value must be 1, not higher: during `next build`, Next.js spawns multiple worker processes for static generation; each worker holds its own `quranPrisma` + `appPrisma` pool, so total open connections = N_workers × 2 × connection_limit. Hostinger caps at 75 connections per DB user — deploying with `connection_limit=5` exhausted that cap at ~8 workers. With `connection_limit=1`, up to 37 workers can run before hitting the ceiling.
- There is no raw `mysql2` connection export from `db.ts` — if a raw connection is ever needed, create it inside the function that uses it, not at module scope.
- In dev, `quranPrisma`/`appPrisma` are cached on `globalThis` (guarded to `NODE_ENV !== "production"`) so Next.js HMR reuses the same client/pool across module reloads instead of creating a new one — and a new set of open connections — on every edit. Production is unaffected (module loads once per process there already). See `docs/plans/fix-dev-hmr-prisma-connections.md`. Do not remove this guard as "unnecessary" — without it, a dev session of repeated edits exhausts the MySQL connection cap.

---

## Database Split (Quran vs Application)

**Status:** active

**Decision:** Quran content and application data live in two separate MySQL databases, each with its own Prisma schema and generated client. See [ADR 0008](../adr/0008-quran-app-database-split.md).

| Domain | Database | Env var | Client | Models |
|---|---|---|---|---|
| Quran content (read-only, portable) | `furqan_quran` | `QURAN_DATABASE_URL` | `quranPrisma` | `Chapter`, `Verse`, `Word`, `PageMetadata`, `Rub`, `RubVerseMapping` |
| Application data (mutable, shared remote) | `furqan_app` | `APP_DATABASE_URL` | `appPrisma` | `User`, `Mark` |

Schemas live at `prisma/quran/schema.prisma` and `prisma/app/schema.prisma`; clients generate to `app/generated/quran-client` and `app/generated/app-client` (imported via `@/app/generated/…`) and are both re-exported from `app/utils/db.ts`. `furqan_app` uses **versioned Prisma migrations** (`migrate dev` locally, `migrate deploy` in the build script) — see [ADR 0051](../adr/0051-prisma-migrations-app-db.md). `furqan_quran` is applied with `prisma db push --force-reset` by the seeder (ADR 0009) — no migration history, by design.

`app/generated/` is git-ignored (build artifact). A `postinstall` script regenerates both clients on `npm install` (no `.env.local` needed — `prisma generate` reads no DB URL), so CI/builds always have them. `npm run prisma-generate` runs both; per-domain scripts are `quran-generate`/`app-generate`, `quran-studio`/`app-studio`, `quran-db-push` (Quran only — App DB schema changes use `app-migrate-dev`).

**Constraints:**
- **Never add a foreign key or Prisma relation that crosses the two domains.** `Mark`/`User` reference Quran locations and users by scalar id only (`marked_id`, `page_number`, `from_user`, `to_user`). A cross-domain relation would make the databases inseparable and break the future device-local Quran DB (mobile). This is the load-bearing invariant of the split.
- Use `quranPrisma` for Quran content queries, `appPrisma` for user/interaction queries. Never reach for a single `prisma` — it no longer exists.
- Prisma types (`Verse`, `Mark`, `Prisma`, etc.) import from the correct generated client output path, not `@prisma/client`.
- The Quran schema must stay self-contained and provider-agnostic (no dependency on the app schema) so it can ship as a device-local DB later.

---

## Local Development Databases (Docker & Seeding)

**Status:** active

**Decision:** Local dev runs the two split databases as **two separate MySQL 8.0 containers** via `compose.yml`: `quran-db` (`furqan_quran`, host port 3307, user `quran_user`), `app-db` (`furqan_app`, host port 3308, user `app_user`), plus `phpmyadmin` on 8081 (`PMA_HOSTS` lists both; no shared auto-login, since the two DBs have distinct credentials). Two containers with **distinct credentials** (not one container / one shared user) mirrors ADR 0008's separate-hosting model. `.env.local`'s `QURAN_DATABASE_URL`/`APP_DATABASE_URL` must match these per-DB users; changing a container's `MYSQL_USER` only takes effect on a fresh data dir, so recreate that DB's volume when its user changes.

**Seeding:** `furqan_quran` is (re)generated by the reproducible seeder — see [ADR 0009](../adr/0009-reproducible-quran-seeder.md). One command runs `prisma db push --force-reset` (Prisma owns the schema), fetches `chapters` (QDC `/chapters`) and `verses`+`words` (QDC by-page), and **derives** `page_metadata`/`rubs`/`rub_verse_mappings` from `verses` in FK order. It is destructive and refuses without `--force`. This replaces the earlier one-time path (scraper for `verses`/`words`/`page_metadata` + `quran_db.sql` dump-copy for `chapters`/`rubs`/`rub_verse_mappings`). App tables `users`/`marks` → `npm run app-db-push`.

**Constraints:**
- Prisma owns the `furqan_quran` schema; the seeder never hand-writes DDL. `hizbs`/`hizb_verse_mappings` are not in the Prisma schema and are out of scope until the models are added.
- `Verse.rub_el_hizb_number` is a **global** rub index (1–240), not within-hizb 1–4 — the seeder groups by it directly to build `rubs`/`rub_verse_mappings` (same fact behind the page-metadata `hizb_number*4 - rub_el_hizb_number` math). QDC `chapters.pages` is an array → store as `"start-end"` string; `translated_name` is an object → store `.name`.
- `Verse.text_uthmani`/`Verse.text_imlaei_simple` hold **full verse text** and are `String @db.Text` — Prisma's default `VARCHAR(191)` overflows on long verses (e.g. 2:282). Word-level text columns (`Word.text_uthmani`, `code_v1`, `code_v2`, `qpc_uthmani_hafs`, `text`) are single-word and correctly stay plain `String`; don't widen those "for consistency."
- If a compose DB container ever comes up with a host-port conflict, it can end up detached from the compose network (no service-name DNS — phpMyAdmin can't resolve it); `docker compose down && docker compose up -d` recreates it cleanly. Check `ss -tlnp | grep 3307` before starting if the scraper project's own MySQL (also 3307) might be running.
- `Word.audio_url`'s trailing file number is rewritten to always equal `Word.position` for `char_type_name === "word"` rows — QDC's raw number double-counts Rub-el-hizb/waqf marks it fuses into the adjacent word's `text_uthmani` instead of giving them their own row (see ADR 0009 Addendum 2026-07-15). Never trust the raw QDC `audio_url` number as-is.

---

## PageMetadata

**Status:** active

**Decision:** Per-page structural info (`surah_id`, `juz_number`, `hizb_number`, `hizb_position`) is derived in memory at static-generation time by `scripts/quran-static/generate.js` and emitted into `public/quran/pages/{mushafId}/{page}.json` (with the legacy `PageMetadata` DB table retained only until `#751`). Not computed at request runtime.

**`hizb_position` values:** `null` (no new rub starts on this page), `"hizb"`, `"hizb-quarter"`, `"hizb-half"`, `"hizb-three-quarters"`.

---

## Build-Generated Static Quran Indexes (DB-Free Pipeline)

**Status:** active

**Decision:** All committed Quran text, division, and layout JSON under `public/quran/` (excluding `reciters-*.json`, which is generated from MP3Quran by `scripts/quran-reciters/generate.js`) is generated by a single DB-free QDC pipeline (`scripts/quran-static/generate.js` via `npm run generate:quran`, with individual `generate:quran-*` scripts delegating to it without `quranPrisma`). Existing client assets (`chapters.json`, `juz-starts.json`, `search-index.json`, `pages/{mushafId}/{page}.json`, `verse-pages/{mushafId}.json`) are emitted byte-identically alongside four server/service indexes (`page-bounds/{mushafId}.json`, `rubs.json`, `verses.json`, `words.json`). See [ADR 0078](../adr/0078-static-quran-indexes-without-db.md).

**Constraints:**
- **Atomic writes only:** Fetch all pages across all registered mushaf editions into memory and run `validateLayouts` and completeness checks before writing any file; write via two-phase temp staging, rename, and destination rollback so partial failures never corrupt `public/quran/`.
- **Byte-for-byte parity on existing outputs:** Preserve `pageMetadata.id` deterministic numbering (`mushaf 2` → `1..604`, `mushaf 19` → `605..1208`, `mushaf 1` → `1209..1812`) and exact field ordering across `chapters.json`, `juz-starts.json`, `search-index.json`, `pages/*/*.json`, and `verse-pages/*.json`; verify via `--verify-existing`.
- **Zero client precache growth:** Keep `page-bounds/*.json`, `rubs.json`, `verses.json`, and `words.json` excluded from `globPublicPatterns` in `next.config.mjs` and `app/sw.ts` precache flows so mobile PWA and Capacitor memory/storage never grow.
- **Edition vs riwayah separation:** Edition-scoped files stay keyed by `{mushafId}` (`pages`, `verse-pages`, `page-bounds`), while text/division indexes (`chapters`, `juz-starts`, `search-index`, `rubs`, `verses`, `words`) remain grouped by riwayah semantics (Hafs today) so future riwayat (e.g., Warsh, Qaloon) can be added cleanly.
