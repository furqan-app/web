# Adopt Prisma Migrations for furqan_app

**Type:** feature  
**Date:** 2026-07-08  
**Status:** implemented  
**Trello:** https://trello.com/c/PcpuGwgN/62-adopt-prisma-migrations-for-furqanapp

## Summary

Move `furqan_app` off `prisma db push` onto versioned migrations (`prisma migrate`). The App DB holds live production data and `db push` can silently drop columns on schema drift — unacceptable on a non-empty prod database. `furqan_quran` stays on `db push --force-reset` via the seeder (ADR 0009), since it is always fully recreated and migration history adds no value. See [ADR 0017](../architecture/adr/0017-prisma-migrations-app-db.md).

## Approach

Two phases:

**Phase 1 — Baselining (one-time, manual):** the App DB already has all tables created by `db push`, on both local dev and production. Generate an initial migration file matching the current schema, then mark it as already-applied on each DB without re-running it. This gives Prisma a migration history starting point without touching existing data.

**Phase 2 — Ongoing workflow:** `prisma migrate dev` locally to create migration files for future schema changes; `prisma migrate deploy` in the `build` npm script so Hostinger applies pending migrations automatically on every deploy. Developers must never use `app-db-push` for the App DB again (script removed).

## Decision Tree

```
Is this a furqan_quran schema change?
  YES → npm run quran-db-push (seeder handles this; db push --force-reset is fine)
  NO (furqan_app schema change)
    → LOCAL: npm run app-migrate-dev --name <name>
      → commits prisma/app/migrations/TIMESTAMP_<name>/migration.sql
      → git push to prod
      → Hostinger runs: prisma migrate deploy ... && next build
      → migration applied automatically
```

```
Is there no schema change, just a normal deploy?
  → migrate deploy is a no-op (checks _prisma_migrations table, finds nothing pending)
  → next build proceeds normally
```

## Verified Steps

### Baselining (run once, in this order)

```bash
# 1. Generate the initial migration file (--create-only: don't apply it yet)
dotenv -e .env.local -- npx prisma migrate dev \
  --schema prisma/app/schema.prisma \
  --name init \
  --create-only

# 2. Mark applied on local dev DB (tables already exist — don't re-run the SQL)
dotenv -e .env.local -- npx prisma migrate resolve \
  --applied "$(ls prisma/app/migrations | grep init)" \
  --schema prisma/app/schema.prisma

# 3. Mark applied on prod DB (run from local machine with .env.prod pointing at prod)
dotenv -e .env.prod -- npx prisma migrate resolve \
  --applied "$(ls prisma/app/migrations | grep init)" \
  --schema prisma/app/schema.prisma

# 4. Verify both DBs show the init migration as Applied
dotenv -e .env.local -- npx prisma migrate status --schema prisma/app/schema.prisma
dotenv -e .env.prod  -- npx prisma migrate status --schema prisma/app/schema.prisma
```

`.env.prod` is a git-ignored local file containing the production `APP_DATABASE_URL`. Hostinger's Remote MySQL IP whitelist must include your current IP for the prod steps. See `docs/deployment/hostinger.md` Phase 5 Option 1 for the Remote MySQL procedure.

### Ongoing (after baselining)

```bash
# Make a schema change in prisma/app/schema.prisma, then:
npm run app-migrate-dev -- --name <descriptive_name>
# → creates prisma/app/migrations/TIMESTAMP_<name>/migration.sql
# → applies it to local dev DB
# → regenerates app-client

# Commit both the schema change and the new migrations/ file, then push to prod.
# Hostinger deploy automatically runs: prisma migrate deploy --schema... && next build
```

## Files to Change

- `package.json`
  - Add to `"build"` script: `prisma migrate deploy --schema prisma/app/schema.prisma && ` before `next build`
  - Add `"app-migrate-dev": "dotenv -e .env.local -- npx prisma migrate dev --schema prisma/app/schema.prisma"`
  - Remove `"app-db-push"` (replaced by `app-migrate-dev` for local dev; `migrate deploy` handles prod)
  - Keep `"quran-db-push"` unchanged

- `prisma/app/migrations/` — new directory created during baselining; commit its contents

- `docs/deployment/hostinger.md`
  - Replace the entire "Phase 5 — Push the App DB schema" section
  - New Phase 5: for initial setup (empty prod DB), run `migrate deploy` from local machine; for ongoing, it runs automatically in build. Remove references to `db push` for the App DB.
  - Update "Ongoing — deploying App DB schema changes" section: replace `db push` procedure with `migrate dev` → commit → push workflow

- `docs/standards/database.md`
  - Update the "Migrations" section: replace `prisma db push` guidance for `furqan_app` with `migrate dev` / `migrate deploy` workflow

- `docs/architecture/DECISIONS.md`
  - "Database Split" section: update the bullet that says "Applied with `prisma db push` per schema — no migration history" to reflect that `furqan_app` now uses versioned migrations; reference ADR 0017
  - Add a link to ADR 0017 in the relevant section

## Constraints

- `furqan_quran` must keep `db push --force-reset` — the seeder calls it internally and migration history would conflict with the always-recreate model.
- Never run `migrate dev` on the prod DB — only `migrate deploy`.
- Never use `app-db-push` on the App DB after baselining — doing so after any `migrate dev` cycle will cause schema drift that `migrate deploy` can't see.
- `.env.prod` must be git-ignored. It should not be `.env.local` (which points at dev DB).
- `migrate deploy` in the build script reads `APP_DATABASE_URL` from the Hostinger platform environment (set in hPanel Phase 6). It does not need dotenv in the script — platform env is already set.
- The shadow database for `migrate dev` requires the local MySQL user (`app_user`) to have CREATE DATABASE privileges. This is already true for the Docker container's `MYSQL_ROOT_PASSWORD` user; confirm for `app_user` if `migrate dev` fails with a permissions error.

## What NOT to Do

- Do not add `prisma migrate` to `furqan_quran` — it breaks the seeder's `--force-reset` model.
- Do not add `--create-only` to the ongoing `app-migrate-dev` script — without it, the command creates AND applies the migration locally, which is the correct local dev behavior.
- Do not run the baselining `migrate resolve --applied` step on an empty database — it's only for databases that already have the tables. An empty DB (e.g. a fresh dev environment) should just run `migrate deploy` to apply the init migration normally.
- Do not add `dotenv -e .env.local` to the `build` script — the build script runs without `.env.local` on Hostinger (platform env vars are set directly), and `dotenv-cli` fails if the file doesn't exist.
- Do not keep `app-db-push` as a "fallback" — removing it is intentional to prevent accidental use after baselining.

## Decisions Made

- `migrate deploy` in the `build` script (automatic) rather than a manual pre-deploy step — Hostinger can't run npm over SSH, and the build script already runs in the correct environment with platform env vars set.
- `app-db-push` removed (not kept as fallback) — clean break to prevent post-baseline drift from accidental `db push` use.
- `furqan_quran` keeps `db push` — reproducible seeder model (ADR 0009) makes migration history unnecessary and incompatible.
- See [ADR 0017](../architecture/adr/0017-prisma-migrations-app-db.md) for the full rationale.
