# Fix Stale connection_limit Documentation

**Type:** bug  
**Date:** 2026-07-03  
**Status:** implemented

## Summary

`DECISIONS.md` and `docs/standards/database.md` both document `connection_limit=5` as the correct value to embed in the Hostinger DATABASE_URLs. The actual deployed value is `connection_limit=1`. Deploying with `5` triggered `ERROR 42000 (1226): User has exceeded the 'max_user_connections' resource (current value: 75)` during `next build` because Next.js spawns multiple worker processes for static generation — each worker holds its own `quranPrisma` + `appPrisma` pool, so total open connections = N_workers × 2 × connection_limit. With `connection_limit=5` and ~8 workers, that exceeds 75. With `connection_limit=1`, up to 37 workers can run before hitting the cap.

## Root Cause

Documentation written before the build-time connection exhaustion was observed. The value `5` was a reasonable default guess; `1` is what Hostinger's shared MySQL actually requires.

## Files to Change

- `docs/architecture/DECISIONS.md` — Under "Database Connection", change `connection_limit=5` to `connection_limit=1` in the constraint bullet, and add an explanation of why: Next.js build workers each hold a separate pool, so total connections = N_workers × 2 DBs × connection_limit; Hostinger caps at 75 per user.
- `docs/standards/database.md` — Under "Connection Limits", update the stated value from `5` to `1` and add the same rationale.

## Constraints

- This is a documentation-only change. No code or env var changes — the Hostinger env vars are already set to `connection_limit=1`.
- Do not change the value back to 5 "for performance" — the build exhausted 75 connections with 5, confirmed in production on 2026-07-02.

## Decisions Made

- `connection_limit=1` is the required value for Hostinger's shared MySQL (75 max_user_connections per DB user, Next.js build workers each hold a separate Prisma pool).
