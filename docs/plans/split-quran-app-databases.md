# Split the Quran database from the application database

**Type:** feature
**Date:** 2026-07-02
**Status:** implemented
**Trello:** https://trello.com/c/YKSgr36O
**ADR:** [0008-quran-app-database-split](../architecture/adr/0008-quran-app-database-split.md)

## Summary

Split the single MySQL database into two: `furqan_quran` (immutable, read-only Quran content) and `furqan_app` (mutable user/interaction data). Each gets its own Prisma schema and its own generated client (`quranPrisma`, `appPrisma`), driven by `QURAN_DATABASE_URL` and `APP_DATABASE_URL`. This enables independent hosting/backups and a future device-local Quran DB on mobile while app data stays in a shared remote DB. No data is migrated — pre-prod; the existing DB becomes `furqan_quran` (its `users`/`marks` tables get dropped by pushing the Quran-only schema), and `furqan_app` starts fresh.

## Approach

MySQL has no cross-database schema concept and Prisma's `multiSchema` preview is unsupported on MySQL, so two databases means **two schema files → two generated clients**. The domains are already relation-clean: `Mark`/`User` have zero Prisma relations and reference Quran locations + users only by scalar fields, so nothing needs to be severed — the models simply move to separate schemas. The single `prisma` export is replaced by `quranPrisma` and `appPrisma`, and every call site + type import is repointed to the correct one.

## Files to Change

### Schemas (split `prisma/schema.prisma` into two)
- **Delete** `prisma/schema.prisma`.
- **Create** `prisma/quran/schema.prisma` — `datasource db { url = env("QURAN_DATABASE_URL") }`, generator with `output = "../../app/generated/quran-client"`. Models: `Chapter`, `Verse`, `Word`, `PageMetadata`, `Rub`, `RubVerseMapping` (verbatim from current schema, including the inter-Quran relations among them). Keep the commented-out `Hizb`/`HizbVerseMapping`/`WordTranslation`/`WordTransliteration` blocks here (all Quran-domain).
- **Create** `prisma/app/schema.prisma` — `datasource db { url = env("APP_DATABASE_URL") }`, generator with `output = "../../app/generated/app-client"`. Models: `User`, `Mark` (verbatim).

### Client factory
- `app/utils/db.ts` — replace the single `PrismaClient` with two clients imported from the two generated output paths, each with the `connection_limit=5` URL treatment applied to its own env var. Export `quranPrisma` and `appPrisma`. Keep the raw `mysql2` `connection` export pointed at `QURAN_DATABASE_URL` (its only current consumers are Quran-content adjacent; confirm during implementation that nothing depends on it hitting app tables — grep shows no `connection` importers today, so this is low-risk).

### Query call sites (repoint `prisma.` → `quranPrisma.`/`appPrisma.`)
- `app/hooks/get-surahs.ts` — `prisma.chapter` → `quranPrisma.chapter`.
- `app/hooks/get-page-words.ts` — `prisma.word`, `prisma.pageMetadata` → `quranPrisma`.
- `app/hooks/get-rubs.ts` — `prisma.rub` → `quranPrisma`.
- `app/api/quran/pages/[pageId]/route.ts` — `prisma.word`, `prisma.pageMetadata` → `quranPrisma`.
- `app/api/search/verses/route.ts` — `prisma.verse` → `quranPrisma`.
- `app/api/search/chapters/route.ts` — `prisma.chapter` → `quranPrisma`.
- `app/api/quran/pages/[pageId]/marks/route.ts` — `prisma.mark` → `appPrisma`.
- `app/api/auth/options.ts` — `prisma.user` → `appPrisma`.

### Type imports (repoint `@prisma/client` → generated client paths)
- `app/types/prisma.ts` — `import { Prisma }` from the **quran** generated client (all payload helpers here — `WordGetPayload`, `PageMetadataGetPayload`, `RubGetPayload` — are Quran models).
- `app/components/MarkModal.tsx` — `import { Verse }` → quran client.
- `app/components/QuranSafha.tsx` — `import { Verse }` → quran client.
- `app/server/actions/getPageMarks.ts` — `import { Mark }` → **app** client.

### Env
- `.env.local` — replace `DATABASE_URL` with `QURAN_DATABASE_URL=mysql://quran_user:…@localhost:3307/furqan_quran` and `APP_DATABASE_URL=mysql://app_user:…@localhost:3308/furqan_app` (distinct ports and credentials per DB — see Fix D). (User edits their own `.env.local`; document the change and update any example/committed reference — verify whether one exists.)

### npm scripts (`package.json`)
- Replace `prisma-generate` with `quran-generate` and `app-generate` (each `prisma generate --schema prisma/<domain>/schema.prisma`), plus a `prisma-generate` that runs both (keeps a single generate entrypoint).
- Replace `prisma-studio` with `quran-studio` / `app-studio` (Studio needs a single `--schema`).
- Add `quran-db-push` / `app-db-push` (`prisma db push --schema prisma/<domain>/schema.prisma`). All wrapped in the existing `dotenv -e .env.local --` pattern.

### Ignore generated clients
- `.gitignore` — add `app/generated/` (generated Prisma clients are build artifacts). Confirm build/CI regenerates them (`prisma generate` in `postinstall` or documented step) so the ignored dirs exist at build time.

## Local databases (Docker)
`compose.yml` (copied/adapted from the scraper project) provisions the two databases as **two separate MySQL 8.0 containers** — matching ADR 0008's separate-hosting model:
- `quran-db` → `furqan_quran`, host port **3307**.
- `app-db` → `furqan_app`, host port **3308**.
- `phpmyadmin` on `http://localhost:8081` (`PMA_HOSTS` lists both, so both appear in the server dropdown).

Each DB has **distinct** credentials inlined via `${VAR:-default}` (`quran_user`/`quran_password` for quran-db, `app_user`/`app_password` for app-db; `rootpassword` root) so `docker compose up -d` works zero-config; override with a `.env`/shell env. Each DB has its own named volume (`quran_mysql_data`, `app_mysql_data`) so they can be reset independently.

Because the two DBs are on **different ports and users**, `.env.local` must match:
```
QURAN_DATABASE_URL="mysql://quran_user:quran_password@localhost:3307/furqan_quran"
APP_DATABASE_URL="mysql://app_user:app_password@localhost:3308/furqan_app"
```

## Bootstrapping (run after code change, by the user)
1. `docker compose up -d` — starts `quran-db` (3307) and `app-db` (3308). `MYSQL_DATABASE` auto-creates `furqan_quran` and `furqan_app` respectively.
2. Point `APP_DATABASE_URL` at port 3308 in `.env.local` (see above).
3. `npm run quran-generate && npm run app-generate`.
4. `npm run app-db-push` — creates `users`/`marks` in `furqan_app`.
5. `npm run quran-db-push` — pushes the Quran-only schema to `furqan_quran`. (Fresh container has no `users`/`marks`, so nothing is dropped; on a pre-existing DB it would drop them with `--accept-data-loss`.)
6. Seed Quran data: `npm run seed:quran -- --force` (the reproducible seeder — [ADR 0009](../architecture/adr/0009-reproducible-quran-seeder.md); supersedes step 5's `quran-db-push` for `furqan_quran`, since the seeder runs `db push --force-reset` itself).

## Seeding → superseded by the reproducible seeder

The original one-time approach (an ad-hoc scraper for `verses`/`words`/`page_metadata` + a `quran_db.sql` dump-copy for `chapters`/`rubs`/`rub_verse_mappings`) and its unresolved schema-ownership tension are **resolved and replaced** by the reproducible seeder — see [`reproducible-quran-seeder.md`](./reproducible-quran-seeder.md) and [ADR 0009](../architecture/adr/0009-reproducible-quran-seeder.md). Prisma now owns the `furqan_quran` schema; `npm run seed:quran -- --force` regenerates all six tables from the QDC API (deriving `page_metadata`/`rubs`/`rub_verse_mappings` from `verses`). The Review-fixes below (Fixes A–F) were applied to the interim scraper before it was replaced by the seeder.

## Review fixes (from `/review-fq-work --unstaged`, 2026-07-02)

Eight findings from the Opus review, to fix in one pass. These are hygiene fixes within ADR 0008 — no new architectural decision, no ADR.

**Fix A — scraper owns nothing about `page_metadata` (findings #1, #4, #5).** The full page-metadata computation is duplicated across `quran-scraper.js` and `populate-page-metadata.js`, and the scraper's copy is buggy (declares `page_metadata.hizb_position NOT NULL` then inserts `null` for single-rub pages → the `INSERT` throws and is swallowed by the per-page `catch`).
- `scripts/quran-scraper.js` — remove the `page_metadata` `CREATE TABLE` from `createDatabaseTables`, and remove the entire "Compute and insert page metadata" block from the scrape loop (plus the now-unused `prevPageLastRub` accumulator and inline `hizbPositionMap`). Scraper now creates/seeds **only** `verses` + `words`.
- `scripts/populate-page-metadata.js` — declare `hizb_position VARCHAR(32) NULL` (nullable) directly in its `CREATE TABLE`; delete the follow-up `ALTER TABLE … MODIFY … NULL`. This script is now the sole owner of `page_metadata`.
- Net behavior of `npm run scrape-quran` (runs both) is unchanged — `page_metadata` still ends up correct — but the dead/buggy path and the swallowed errors are gone.

**Fix B — null-safe word translation/transliteration (finding #2).** `scripts/quran-scraper.js` — in the `words` INSERT params, use `word.translation?.text ?? null` and `word.transliteration?.text ?? null` so a word with a null `translation`/`transliteration` (e.g. verse-end markers) doesn't throw a `TypeError` that aborts the rest of the page. (Keep the two columns — dropping them is the separate, still-open schema-ownership item, not one of these findings.)

**Fix C — `prisma` CLI must be a runtime dependency (finding #3).** `package.json` — move `"prisma": "^5.21.1"` from `devDependencies` to `dependencies`. The `postinstall` (`prisma generate`) is load-bearing because `app/generated/` is git-ignored; with `prisma` in devDeps a `npm install --omit=dev` omits the CLI and postinstall fails, leaving no runtime client. Moving it works under `--omit=dev`, Vercel, and Docker alike.

**Fix D — distinct app-db credentials (finding #6).** `compose.yml`:
- `quran-db` → `MYSQL_USER: ${QURAN_DB_USER:-quran_user}`, `MYSQL_PASSWORD: ${QURAN_DB_PASSWORD:-quran_password}` (same values, namespaced var — no reset needed).
- `app-db` → `MYSQL_USER: ${APP_DB_USER:-app_user}`, `MYSQL_PASSWORD: ${APP_DB_PASSWORD:-app_password}`.
- `phpmyadmin` → drop the `PMA_USER`/`PMA_PASSWORD` auto-login (two distinct cred sets can't share one auto-login); users pick a server from the `PMA_HOSTS` dropdown and enter creds. Add a short comment.
- **Operational (runbook, by the user):** MySQL only creates `MYSQL_USER` on a *fresh* data dir, so the already-initialized `app-db` needs its volume reset (app data is throwaway/empty):
  1. update `.env.local` → `APP_DATABASE_URL="mysql://app_user:app_password@localhost:3308/furqan_app"`
  2. `docker compose down`
  3. `docker volume rm furqan_app_mysql_data` (app volume only — leave `furqan_quran`'s intact)
  4. `docker compose up -d`
  5. `npm run app-db-push` (recreate `users`/`marks` under the new user)

**Fix E — `database.md` Stack mentions both ports (finding #7).** `docs/standards/database.md` — update the "Stack" bullet that still reads "MySQL on port 3307" to note `furqan_quran` on 3307 and `furqan_app` on 3308 (two compose containers), consistent with `DECISIONS.md`.

**Fix F — plan Env line staleness (finding #8).** This file — the `### Env` line (and the `## Local databases` example block) says both URLs sit on host:3307 and use `quran_user`; correct it to `APP_DATABASE_URL` on **3308** with the `app_user` creds from Fix D.

## Example env files (resolves the "committed env example" follow-up)

Two committed template files (no real secrets), because the app and docker-compose read **different** env files:

**`.env.example` → copy to `.env.local`** (the app: Next.js + npm scripts, loaded via `dotenv -e .env.local`). All required app keys with placeholder values; DB URLs preset to the compose defaults so a fresh clone works after `docker compose up -d`:
- `NEXT_PUBLIC_BASE_URL="http://localhost:3000"`
- `NEXTAUTH_URL="http://localhost:3000"`
- `NEXTAUTH_SECRET="<generate: openssl rand -base64 32>"`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — placeholders
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — placeholders
- `QURAN_DATABASE_URL="mysql://quran_user:quran_password@localhost:3307/furqan_quran"`
- `APP_DATABASE_URL="mysql://app_user:app_password@localhost:3308/furqan_app"`
- (omit the `?schema=public` suffix — a Postgres-ism that MySQL/Prisma ignores)

**`compose.env.example` → copy to `.env`** (docker-compose `${VAR}` substitution; **optional** — compose already runs zero-config via inline `${VAR:-default}`). Documents every override var at its current default so copying reproduces today's behavior: `QURAN_DB_ROOT_PASSWORD`, `QURAN_DB_NAME`, `QURAN_DB_USER`, `QURAN_DB_PASSWORD`, `QURAN_DB_PORT` (3307) and the `APP_DB_*` equivalents (`app_user`/`app_password`, 3308).

**`.gitignore`** — add a bare `.env` line. Compose's copy target (`.env`) may contain credentials and is currently **not** ignored (only `.env*.local` is). The `.env` pattern matches the file named exactly `.env`, not `.env.example` / `compose.env.example` (those stay tracked) nor `.env.local` (already covered).

## Constraints
- **Never introduce a foreign key or Prisma relation across the two domains.** `Mark`/`User` must keep referencing Quran locations and users by scalar id (`marked_id`, `page_number`, `from_user`, `to_user`). This is the load-bearing invariant — a cross-domain relation breaks independent hosting and the mobile local-DB model (ADR 0008).
- Quran schema stays self-contained and provider-agnostic — no dependency on app models, so it can ship as a device-local DB later.
- Do not attempt `multiSchema` — unsupported on MySQL.
- Do not introduce a `prisma/migrations` directory; `db push` per schema is the chosen mechanism pre-prod.
- Keep the `connection_limit=5` treatment on both clients (existing behavior, per `docs/standards/database.md`).

## Decisions Made
- Two schemas / two generated clients / two databases (Option C in ADR 0008); `multiSchema` and single-DB namespacing rejected.
- Names: `quranPrisma`/`appPrisma`, `QURAN_DATABASE_URL`/`APP_DATABASE_URL`, `furqan_quran`/`furqan_app`, schemas under `prisma/quran` and `prisma/app`, generated clients under `app/generated/`.
- Split both schema and physical database now; **do not migrate data** (pre-prod). Quran DB's leftover `users`/`marks` tables are removed by the Quran-schema `db push`.
- `db push` per schema; no migration history introduced.

## Follow-ups to verify during implementation
- ~~Whether a committed env example file exists that references `DATABASE_URL`~~ — none existed; addressed by adding `.env.example` + `compose.env.example` (see "Example env files" above).
- Whether anything imports the raw `mysql2` `connection` export (grep currently shows none) — if a consumer appears, confirm which DB it should target.
- Update `docs/standards/database.md` (the "Stack" / "Prisma client" import guidance and the single-`DATABASE_URL` assumption) to reflect the two-client split.
- Confirm `prisma generate` runs at build/install so `app/generated/` exists in CI given it's git-ignored.
