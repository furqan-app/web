# Fix Prisma Connection Exhaustion on Next.js Dev Hot-Reload

**Type:** bug
**Date:** 2026-07-03
**Status:** implemented

## Summary

`app/utils/db.ts` constructs `quranPrisma` and `appPrisma` unconditionally at module scope with no caching. In `npm run dev`, every HMR reload re-executes the module, creating a brand-new `PrismaClient` (and thus a new MySQL connection pool) without releasing the previous one. Over a session of repeated edits, this exhausts the connection cap on the dev MySQL containers, surfacing as DB connection errors. Fix: cache both clients on `globalThis`, guarded to non-production, so HMR reuses the same instance instead of creating a new one each reload.

## Root Cause

No global-scope singleton guard exists for either Prisma client. This is the standard, well-documented Next.js + Prisma dev-mode pitfall — the fix is the standard singleton-via-global pattern, applied to both clients since this project uses two (`quranPrisma`, `appPrisma`) instead of Prisma's usual single-client example.

## Approach

Guard the global cache to `NODE_ENV !== 'production'` only:
- **Dev:** module reloads reuse the cached instance from `globalThis` instead of constructing a new one — no new pool per HMR reload.
- **Production:** behavior is unchanged from today (`new ...Client()` runs once per process, as it already does) — this avoids touching anything relevant to ADR 0010's `connection_limit=1` / multi-worker build math, which was tuned specifically for production build behavior.

Constructor calls remain argument-less (`new QuranPrismaClient()`, `new AppPrismaClient()`) — no adapter, no explicit datasource URL — per ADR 0010. Export names (`quranPrisma`, `appPrisma`) stay identical, so no call-site changes anywhere else in the app.

## Files to Change

- `app/utils/db.ts` — add a `globalForPrisma` cache keyed by client name, guarded by `process.env.NODE_ENV !== "production"`, for both `QuranPrismaClient` and `AppPrismaClient`. Same shape as the standard Prisma docs pattern, duplicated for the two clients.
- `docs/architecture/DECISIONS.md` — append a note to the existing "Database Connection" section describing the dev-only singleton guard, so future agents editing `db.ts` don't strip it out as unnecessary.

## Edge Cases

- Must not affect production: guard is `NODE_ENV !== "production"`, matching the standard pattern exactly.
- Two separate clients need two separate global slots (`globalForPrisma.quranPrisma`, `globalForPrisma.appPrisma`) — a single shared slot would overwrite one client with the other.
- No change to constructor arguments — must not reintroduce an explicit datasource URL or adapter (ADR 0010 constraint).

## Constraints

- Do not add `@prisma/adapter-pg` or any Postgres-specific tooling — this project is MySQL-only.
- Do not pass `connectionString`/datasource URL to either constructor.
- No new raw `mysql2` connection export (removed per ADR 0010; out of scope here).

## Decisions Made

- Singleton guard is dev-only (`NODE_ENV !== "production"`), not always-on — production's per-process module load already avoids the problem this fixes, and keeping prod behavior untouched avoids any interaction with the ADR 0010 connection-limit tuning.
- No new ADR — this is the standard, well-known Prisma/Next.js singleton pattern with no real architectural alternative being weighed; documented as an addendum to the existing "Database Connection" decision in DECISIONS.md instead.
