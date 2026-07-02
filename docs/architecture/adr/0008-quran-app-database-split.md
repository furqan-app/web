# ADR 0008: Split Quran content and application data into two databases with separate Prisma clients

**Date:** 2026-07-02
**Status:** Accepted

## Context

Quran content (`Chapter`, `Verse`, `Word`, `PageMetadata`, `Rub`, `RubVerseMapping`) is immutable, scraper-sourced, and consumed read-only — on web today, and potentially as a device-local database on a future mobile build. Application data (`User`, `Mark`, and future interactions) is mutable, user-owned, and must always live in a shared remote database. The two domains already share no foreign keys: `Mark` references users and Quran locations only through loose scalar fields (`from_user`, `to_user`, `marked_id`, `page_number`), never Prisma relations. Keeping both in one database blocks independent hosting, backups, versioning, and the mobile local-Quran model. MySQL has no cross-database schema concept and Prisma's `multiSchema` preview feature does not support MySQL, so "standalone schema" here means a physically separate database.

## Options Considered

**Option A — Prisma `multiSchema` in one client**
One datasource, one client, models tagged with `@@schema`. Not viable: `multiSchema` is unsupported on the MySQL provider.

**Option B — Single database, logical namespacing only**
Keep one physical DB, separate models by naming/convention. Rejected: does not enable separate hosting, independent backups, or a device-local Quran DB.

**Option C — Two schema files → two generated Prisma clients, two databases**
`prisma/quran/schema.prisma` and `prisma/app/schema.prisma`, each with its own `datasource` URL and its own generated client output, talking to `furqan_quran` and `furqan_app`.

## Decision

Adopt **Option C**: two Prisma schemas, two generated clients (`quranPrisma`, `appPrisma`), two databases (`furqan_quran`, `furqan_app`) driven by `QURAN_DATABASE_URL` and `APP_DATABASE_URL`. The Quran schema is a self-contained, provider-agnostic, read-only dataset; the app schema owns all mutable user data. Schemas are applied with `prisma db push` per schema (no migration history introduced), consistent with the pre-prod, scraper-owned reality.

## Consequences

- **+** Quran DB can be hosted, versioned, backed up, and shipped (e.g. device-local on mobile) independently of user data.
- **+** The clean domain boundary is now enforced structurally: a query cannot accidentally couple user data to Quran content across a single client.
- **+** No data migration needed now — pre-prod; pushing the Quran-only schema to the existing DB drops the `users`/`marks` tables (`--accept-data-loss`), and `furqan_app` starts fresh.
- **-** **Hard invariant, must never be violated:** no foreign key or Prisma relation may cross the two domains. `Mark` must keep referencing users and Quran locations by scalar id only. Adding a relation from `Mark`/`User` to any Quran model — or vice versa — would make the databases inseparable and break the mobile local-DB model.
- **-** Two generated clients, two connection pools, two env vars, and a larger import surface (`quranPrisma` vs `appPrisma`) to keep straight.
- **-** Prisma types now come from custom generated-client output paths, not the default `@prisma/client`; imports across the app must target the correct client.
- **-** No versioned migration history (by choice); acceptable pre-prod, revisit before production per the app DB's needs.
