# ADR 0017: Adopt Prisma versioned migrations for furqan_app; keep db push for furqan_quran

**Date:** 2026-07-08
**Status:** Accepted — supersedes the "no migration history" stance in [ADR 0008](./0008-quran-app-database-split.md)

## Context

`furqan_app` now holds live production data (users, marks, mushaf_share_codes, mushaf_access_grants). `prisma db push` makes the DB match the schema declaratively and can silently drop columns or tables when the schema diverges from the DB — acceptable pre-prod, hazardous on a live database. ADR 0008 explicitly flagged this for revision before production. `furqan_quran` is rebuilt from scratch by the reproducible seeder (ADR 0009) and has no user data, so `db push --force-reset` remains correct and migration history adds no value there.

## Options Considered

**Option A — Keep db push for both databases**
Continue applying both schemas with `prisma db push`; rely on careful manual review of push output before each prod change. Zero tooling change; retains the risk of silent destructive changes.

**Option B — Versioned migrations for furqan_app; keep db push for furqan_quran**
`prisma migrate dev` locally to generate committed SQL migration files; `prisma migrate deploy` in the build script for zero-touch prod deploys. `furqan_quran` stays on `db push --force-reset` via the seeder — recreated reproducibly, no history needed.

**Option C — Versioned migrations for both databases**
Adds migration overhead to the Quran DB even though it is always fully recreated. Conflicts with the seeder's `--force-reset` approach (ADR 0009) and the future device-local Quran DB model.

## Decision

Adopt **Option B**: versioned migrations for `furqan_app` only. `migrate deploy` runs automatically in the `build` npm script so every Hostinger deploy applies pending migrations before `next build`. `furqan_quran` continues using `db push --force-reset` via the seeder.

## Consequences

- **+** Schema changes to `furqan_app` are auditable, ordered, and safe on a live database — `migrate deploy` never drops anything not explicitly in a migration file.
- **+** Zero manual deploy steps for schema changes: push to `prod`, Hostinger runs `npm run build`, migrations apply automatically.
- **+** `migrate deploy` is a no-op when no migrations are pending — safe to run on every deploy unconditionally.
- **-** Developers must run `prisma migrate dev` (not `db push`) for any App DB schema change locally; skipping this and using `db push` locally will cause a drift that `migrate deploy` on prod cannot resolve.
- **-** The initial baselining step (generate init migration, `migrate resolve --applied` on local + prod) is a one-time manual procedure.
- **-** `prisma migrate dev` requires a shadow database; local MySQL must allow Prisma to create a temp DB (it does by default with the credentials in `.env.local`).
