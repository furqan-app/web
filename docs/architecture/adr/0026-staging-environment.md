# ADR 0026: Staging environment in the release flow

**Date:** 2026-07-17
**Status:** Accepted

## Context

ADR 0015 deliberately deferred a staging deployment ("Option C"), relying instead on local `npm run build && npm start` testing against a release branch before promoting to `prod`. That doesn't catch Hostinger-specific issues — real env vars, real MySQL connectivity, the actual managed Node runtime — which is exactly the class of bug most likely to slip through local testing and surface as a prod incident.

## Options Considered

**Option A — Keep local-only testing (status quo)**
No new hosting, no new DBs, no new skill. Accept the risk that Hostinger-specific issues are only caught after prod deploy.

**Option B — Second Hostinger site as a staging stage**
A new Hostinger site tracks a `stg` branch, with its own fresh `furqan_quran`/`furqan_app` databases. `release/x.y.z` merges into `stg` via a reviewed PR (gated by a new `protect-stg.yml`, mirroring `protect-prod.yml`) before promotion to `prod`.

**Option C — Vercel preview deployments**
Push release branches to Vercel for automatic preview URLs. Rejected: different runtime/platform than prod, and Vercel has no direct access to Hostinger's MySQL databases (would need a network tunnel or a separate cloud DB), so it wouldn't catch the Hostinger-specific issues that are the actual motivation for staging.

## Decision

Option B. Flow becomes:

```
main → /cut-release → release/x.y.z
     → /promote-to-staging → PR release/x.y.z → stg → (merge → Hostinger stg auto-deploys)
     → /promote-release → PR release/x.y.z → prod → (merge → Hostinger prod auto-deploys)
     → /sync-main-from-prod → PR prod → main
```

`stg` uses its own fresh databases (not a snapshot of prod) — QA on real data shape isn't the goal here, catching platform/env issues is, and copying prod's real user data to a lower-security environment is an unnecessary privacy risk. The `release → stg` merge goes through a reviewed PR rather than a direct push, for symmetry with `release → prod` and to leave an audit trail of when staging was refreshed, even though there's no new code to review at that point.

## Consequences

- **+** Catches Hostinger-specific issues (env vars, real DB connectivity, managed Node runtime behavior) before they reach prod, which was the exact gap ADR 0015 accepted and left open.
- **+** `/release`'s Checkpoint 1 now verifies against a real deployed URL instead of a developer's local machine, making the check reproducible regardless of who runs it.
- **-** Every release now requires 3 manual PR merges instead of 2 (`stg`, `prod`, `main`-sync), adding one more human step per release.
- **-** Ongoing hosting cost and maintenance for a second Hostinger site + two additional databases.
- **-** Staging's App DB starts empty and only accumulates realistic data over time from staging usage — it won't reflect prod's real data volume/shape.
