# Split the Quran database from the application database

**Type:** feature
**Date:** 2026-07-02
**Status:** implemented
**Trello:** https://trello.com/c/YKSgr36O
**ADR:** [0008-quran-app-database-split](../architecture/adr/0008-quran-app-database-split.md)

## Summary

Split the single MySQL database into two: `furqan_quran` (immutable Quran content) and `furqan_app` (mutable user/interaction data). Each gets its own Prisma schema and generated client (`quranPrisma` / `appPrisma`), driven by `QURAN_DATABASE_URL` / `APP_DATABASE_URL`. No data migration — pre-prod. The existing DB becomes `furqan_quran`; `furqan_app` starts fresh.

## Approach

Two schema files → two generated clients. `Mark`/`User` reference Quran locations only by scalar fields — no Prisma relations to sever. The single `prisma` export is replaced by `quranPrisma`/`appPrisma` throughout.

## Files to Change

### Schemas
- **Delete** `prisma/schema.prisma`.
- **Create** `prisma/quran/schema.prisma` — `QURAN_DATABASE_URL`, output `app/generated/quran-client`. Models: `Chapter`, `Verse`, `Word`, `PageMetadata`, `Rub`, `RubVerseMapping`.
- **Create** `prisma/app/schema.prisma` — `APP_DATABASE_URL`, output `app/generated/app-client`. Models: `User`, `Mark`.

### Client factory — `app/utils/db.ts`
Replace single `PrismaClient` with two clients (each with `connection_limit=5` treatment on its own env var). Export `quranPrisma` and `appPrisma`.

### Call sites
- `quranPrisma`: `get-surahs.ts`, `get-page-words.ts`, `get-rubs.ts`, `app/api/quran/pages/[pageId]/route.ts`, `app/api/search/verses/route.ts`, `app/api/search/chapters/route.ts`
- `appPrisma`: `app/api/quran/pages/[pageId]/marks/route.ts`, `app/api/auth/options.ts`
- Type imports: `app/types/prisma.ts` → quran client; `app/components/MarkModal.tsx` / `QuranSafha.tsx` → quran client; `app/server/actions/getPageMarks.ts` → app client

### Docker — `compose.yml`
Two MySQL 8.0 containers:
- `quran-db` → `furqan_quran`, port **3307**, user `quran_user`/`quran_password`
- `app-db` → `furqan_app`, port **3308**, user `app_user`/`app_password`
- `phpmyadmin` on `:8081` with `PMA_HOSTS` listing both (no auto-login — distinct creds)
- Named volumes `quran_mysql_data`/`app_mysql_data` for independent resets

### Env files (committed)
**`.env.example`** (copy to `.env.local`):
```
QURAN_DATABASE_URL="mysql://quran_user:quran_password@localhost:3307/furqan_quran"
APP_DATABASE_URL="mysql://app_user:app_password@localhost:3308/furqan_app"
```
Plus `NEXT_PUBLIC_BASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`.

**`compose.env.example`** (copy to `.env` to override compose defaults): documents all `QURAN_DB_*`/`APP_DB_*` vars.

### `package.json` scripts
- `quran-generate` / `app-generate` (each `prisma generate --schema prisma/<domain>/schema.prisma`)
- `prisma-generate` runs both
- `quran-studio` / `app-studio`
- `quran-db-push` / `app-db-push`

### `.gitignore`
- Add `app/generated/` — generated Prisma clients are build artifacts; confirm `prisma generate` runs in `postinstall` so dirs exist in CI.
- Add `.env` (bare, docker-compose override target — not already ignored by `.env*.local`).

### `prisma` → `dependencies`
Move `prisma` from devDependencies to dependencies — `postinstall` (`prisma generate`) is load-bearing; `npm install --omit=dev` (Vercel/Docker) would otherwise omit the CLI and fail.

## Bootstrapping
1. `docker compose up -d`
2. Set `.env.local` (see above)
3. `npm run quran-generate && npm run app-generate`
4. `npm run app-db-push`
5. `npm run seed:quran -- --force` (reproducible seeder — supersedes `quran-db-push` for `furqan_quran`)

## Constraints

- **Never introduce a foreign key or Prisma relation across the two domains.** `Mark`/`User` must reference Quran locations by scalar ids only — this is the load-bearing invariant for independent hosting and future device-local Quran DB (ADR 0008).
- Quran schema stays self-contained and provider-agnostic.
- Do not use `multiSchema` — unsupported on MySQL.
- Do not introduce `prisma/migrations` — `db push` per schema is the chosen mechanism pre-prod.
- Keep `connection_limit=5` on both clients.
- Dev pino-pretty transport: use `PinoPretty(...)` stream as pino's second constructor argument, not `transport: { target: "pino-pretty" }` — the worker-thread form throws inside Next.js webpack-bundled Route Handlers.
