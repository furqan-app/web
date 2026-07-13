# Database Standards

## Stack

- **MySQL** on non-standard ports (always check `.env.local`): `furqan_quran` on **3307**, `furqan_app` on **3308** — two separate containers via `compose.yml`.
- **Two databases** (see [ADR 0008](../architecture/adr/0008-quran-app-database-split.md)): `furqan_quran` (read-only Quran content, `QURAN_DATABASE_URL`) and `furqan_app` (mutable user/interaction data, `APP_DATABASE_URL`). Each has its own Prisma schema (`prisma/quran/schema.prisma`, `prisma/app/schema.prisma`) and its own generated client.
- **Prisma ORM** for all queries. Raw `mysql2` connection is also exported from `app/utils/db.ts` (points at the Quran DB) but should rarely be needed.
- **Prisma clients:** import from `@/app/utils/db` — `import { quranPrisma, appPrisma } from "@/app/utils/db"`. Use `quranPrisma` for content (`chapter`, `verse`, `word`, `pageMetadata`, `rub`), `appPrisma` for `user`/`mark`. There is no single `prisma` export.
- **Prisma types** (`Verse`, `Mark`, `Prisma`, …) import from the generated client, not `@prisma/client`: `@/app/generated/quran-client` for content types, `@/app/generated/app-client` for app types.
- **Never add a foreign key or relation across the two domains** — `Mark`/`User` reference Quran locations and users by scalar id only. This keeps the Quran DB shippable as a device-local mobile DB.

## Key Schema Facts

### Chapter.pages
Stored as `"startPage-endPage"` string (e.g. `"1-21"`). **Not an array.** Split on `'-'` to extract start/end.

### PageMetadata
Per-page structural info. Key fields:
- `surah_id` — first surah starting on the page, or the continuing surah
- `page_surahs` — dash-separated chapter IDs of all surahs on the page
- `juz_number`
- `hizb_number`
- `hizb_position` — `null` (no new rub) or `"hizb"` | `"hizb-quarter"` | `"hizb-half"` | `"hizb-three-quarters"`

### Mark
User marks at verse or word granularity:
- `marked_type`: `"verse"` | `"word"`
- `mark_type`: `"note"` | `"highlight"`
- `mark_value`: text (for notes) or color (for highlights)
- `from_user` / `to_user`: both set to the authenticated user's ID (self-marks only for now)

## Query Patterns

### Upsert pattern (marks)
```ts
await appPrisma.mark.upsert({
  where: { marked_type_marked_id_mark_type_to_user: { ... } },
  update: { mark_value },
  create: { ... },
});
```

### Include relations
Use `include` for eager-loading relations. Avoid N+1 — fetch in one query.

## Connection Limits

Both DATABASE_URLs must include `?connection_limit=1` (set in the environment variable on the host, not in code). During `next build`, Next.js spawns multiple worker processes for static generation — each worker holds its own pool, so total connections = N_workers × 2 DBs × connection_limit. Hostinger's shared MySQL caps at 75 connections per user; `connection_limit=1` keeps total connections well under that ceiling (allows ~37 parallel workers). Confirmed broken at `connection_limit=5` in production (2026-07-02).

## Migrations

**`furqan_app`** uses versioned Prisma migrations ([ADR 0017](../architecture/adr/0017-prisma-migrations-app-db.md)):
- Locally, after any schema change: `npm run app-migrate-dev -- --name <name>` — creates `prisma/app/migrations/TIMESTAMP_<name>/migration.sql`, applies it to the dev DB, regenerates the client. Commit both the schema file and the new migrations file.
- Production: `prisma migrate deploy` runs automatically in the `build` npm script before `next build`. Applies pending migrations silently with no risk of accidental column drops.
- On a fresh environment with an empty App DB: `migrate deploy` applies all migrations on first deploy — no manual step.
- On an existing DB with no migration history (baselining): see `docs/plans/adopt-prisma-migrations.md`.
- Never use `npm run app-db-push` on the App DB — it was removed to prevent post-baseline schema drift.

**`furqan_quran`** stays on `prisma db push --force-reset` via the seeder — it is always fully recreated from scratch, so migration history is unnecessary and incompatible with the seeder model.

**Seeding `furqan_quran`:** `npm run seed:quran -- --force` regenerates the whole Quran DB reproducibly ([ADR 0009](../architecture/adr/0009-reproducible-quran-seeder.md)) — it runs `prisma db push --force-reset` (Prisma owns the schema), fetches `chapters` + `verses`/`words` from the QDC API, and derives `page_metadata`/`rubs`/`rub_verse_mappings`. It is destructive and refuses without `--force`. Code lives in `scripts/quran-seed/`.
