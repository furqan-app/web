# Fix Stale connection_limit Documentation

**Type:** bug  
**Date:** 2026-07-03  
**Status:** implemented

## Summary

`DECISIONS.md` and `database.md` documented `connection_limit=5`. The actual required value is `connection_limit=1`. With `5` and ~8 Next.js build workers (each holding `quranPrisma` + `appPrisma` pools), total connections = 8 × 2 × 5 = 80, exceeding Hostinger's 75 per-user cap. With `1`: up to 37 workers fit.

## Files Changed

- `docs/architecture/DECISIONS.md` — change `connection_limit=5` to `connection_limit=1`; add rationale (N_workers × 2 DBs × limit vs 75 cap).
- `docs/standards/database.md` — same update.

Documentation-only — no code or env var changes. Hostinger env vars already set to `connection_limit=1`.
