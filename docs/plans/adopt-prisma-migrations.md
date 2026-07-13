# Adopt Prisma Migrations for furqan_app

**Type:** feature  
**Date:** 2026-07-08  
**Status:** implemented  
**Trello:** https://trello.com/c/PcpuGwgN/62-adopt-prisma-migrations-for-furqanapp

## Summary

Move `furqan_app` off `prisma db push` onto versioned migrations (`prisma migrate`). The App DB holds live production data and `db push` can silently drop columns on schema drift. `furqan_quran` stays on `db push --force-reset` via the seeder (ADR 0009) — it's always fully recreated and migration history adds no value. See [ADR 0017](../architecture/adr/0017-prisma-migrations-app-db.md).

## Approach

**Phase 1 — Baselining (one-time):** App DB already has all tables. Generate an initial migration file, then mark it applied on each DB without re-running it.

**Phase 2 — Ongoing:** `prisma migrate dev` locally; `prisma migrate deploy` in the `build` script so Hostinger applies pending migrations automatically on every deploy.

```
furqan_app schema change?
  → LOCAL: npm run app-migrate-dev -- --name <name>
    → creates prisma/app/migrations/TIMESTAMP_<name>/migration.sql
    → git push → Hostinger runs: prisma migrate deploy ... && next build
```

## Baselining Steps (run once, in order)

```bash
# 1. Generate initial migration (don't apply yet)
dotenv -e .env.local -- npx prisma migrate dev \
  --schema prisma/app/schema.prisma --name init --create-only

# 2. Mark applied on local dev DB (tables already exist)
dotenv -e .env.local -- npx prisma migrate resolve \
  --applied "$(ls prisma/app/migrations | grep init)" \
  --schema prisma/app/schema.prisma

# 3. Mark applied on prod DB
dotenv -e .env.prod -- npx prisma migrate resolve \
  --applied "$(ls prisma/app/migrations | grep init)" \
  --schema prisma/app/schema.prisma

# 4. Verify both DBs show init as Applied
dotenv -e .env.local -- npx prisma migrate status --schema prisma/app/schema.prisma
dotenv -e .env.prod  -- npx prisma migrate status --schema prisma/app/schema.prisma
```

`.env.prod` is git-ignored. Hostinger Remote MySQL whitelist must include your current IP for prod steps (see `docs/deployment/hostinger.md` Phase 5 Option 1).

## Ongoing

```bash
npm run app-migrate-dev -- --name <descriptive_name>
# creates migration.sql, applies to local dev DB, regenerates app-client
# commit schema + migrations/, push → Hostinger auto-deploys
```

## Files Changed

- `package.json`
  - `"build"`: prepend `prisma migrate deploy --schema prisma/app/schema.prisma && `
  - Add `"app-migrate-dev": "dotenv -e .env.local -- npx prisma migrate dev --schema prisma/app/schema.prisma"`
  - Remove `"app-db-push"`; keep `"quran-db-push"` unchanged
- `prisma/app/migrations/` — new directory (commit its contents)
- `docs/deployment/hostinger.md` — Phase 5 updated: `migrate deploy` for initial empty-DB setup; ongoing runs automatically in build
- `docs/standards/database.md` — migrations section updated
- `docs/architecture/DECISIONS.md` — furqan_app now uses versioned migrations; ADR 0017 linked

## Constraints

- `furqan_quran` must keep `db push --force-reset` — seeder's always-recreate model is incompatible with migration history.
- Never run `migrate dev` on the prod DB — only `migrate deploy`.
- Never use `app-db-push` after baselining — post-baseline `db push` causes drift `migrate deploy` can't see.
- `.env.prod` must be git-ignored and must not be `.env.local`.
- `migrate deploy` in the build script reads `APP_DATABASE_URL` from Hostinger platform env — do not add `dotenv -e .env.local` to it.
- Shadow database for `migrate dev` requires the local MySQL user to have CREATE DATABASE privileges.
- Do not run `migrate resolve --applied` on an empty database — an empty DB should run `migrate deploy` to apply the init migration normally.
- `app-db-push` removed (not kept as fallback) — clean break prevents accidental post-baseline drift.

## Decisions Made

- `migrate deploy` in `build` (automatic) — Hostinger can't run npm over SSH; build script already has correct platform env vars.
- `furqan_quran` keeps `db push` — reproducible seeder model makes migration history unnecessary and incompatible.
