# Fix Prisma Connection Exhaustion on Next.js Dev Hot-Reload

**Type:** bug  
**Date:** 2026-07-03  
**Status:** implemented

## Root Cause

`app/utils/db.ts` constructs `quranPrisma` and `appPrisma` at module scope with no caching. Every HMR reload re-executes the module, creating a new `PrismaClient` (new MySQL connection pool) without releasing the previous one. Over a session, this exhausts the dev MySQL containers' connection cap.

## Fix

Cache both clients on `globalThis`, guarded to `NODE_ENV !== 'production'` — dev reuses the cached instance; production behavior (single module load per process) is unchanged. Two separate global slots: `globalForPrisma.quranPrisma` and `globalForPrisma.appPrisma`. Constructor arguments stay argument-less (per ADR 0010).

## Files Changed

- `app/utils/db.ts` — add `globalForPrisma` singleton guard for both clients
- `docs/architecture/DECISIONS.md` — note under "Database Connection" describing the dev-only singleton guard
