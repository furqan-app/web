# ADR 0015: Release-branch deployment workflow (main → release/x.y.z → prod → main)

**Date:** 2026-07-06
**Status:** Partially superseded by [ADR 0026](./0026-staging-environment.md) — the "no staging environment" consequence below no longer holds; a `stg` deploy stage was added between `release/x.y.z` and `prod`.

## Context

Today, `main` is the only integration branch and `prod` deploys to Hostinger, gated by `protect-prod.yml` so only PRs from `main` can reach `prod` (see `docs/plans/protect-prod-branch.md`). This means every merge to `main` is a live deploy candidate with no stabilization window, no versioning, and no record of what shipped in which release. There's also no staging environment — Hostinger hosts prod only, and deploys there are a manual "redeploy" click in hPanel (`docs/deployment/hostinger.md`), not automatic on push.

## Options Considered

**Option A — Direct main → prod (status quo)**
Keep merging straight to prod from main. No stabilization step, no versioning, no release history.

**Option B — Release-branch model with local-only testing**
Introduce `release/x.y.z` branches cut from `main` as the required stabilization step before prod. Version tracked via semver in `package.json` + git tag. Testing happens locally (`npm run build && npm start` against the release branch) — no new hosting environment. After prod is updated, merge prod back into main to capture any last-minute fixes made on the release branch.

**Option C — Release-branch model with a Hostinger staging site**
Same as B, but release branches auto-deploy to a second Hostinger-connected site (e.g. `staging.furqan.taha7.com`) for QA against a real deployment instead of local testing.

## Decision

Option B. Branch flow becomes:

```
main (feature branches merge here, as today)
  └─ /cut-release <major|minor|patch> → release/x.y.z (branched from main, version bumped + tagged)
       └─ manual local testing (npm run build && npm start)
            └─ /promote-release → PR release/x.y.z → prod (merge → Hostinger auto-deploys)
                 └─ /sync-main-from-prod → PR prod → main (captures any release-branch fixes back into main)
```

Three new Claude Code skills orchestrate this (`/cut-release`, `/promote-release`, `/sync-main-from-prod` — see `docs/plans/release-branch-workflow.md`). `protect-prod.yml` is updated so `prod` only accepts PRs whose source branch starts with `release/` — direct `main → prod` PRs (today's only allowed path) are no longer permitted; every prod update must go through a release branch, including hotfixes.

Release scope is tracked in Trello: a new **"To Be Released"** list holds cards whose PRs have merged to `main` and are queued for the next cut (moved there manually). `/cut-release` labels every card in that list with the new version (e.g. `v1.3.0`) and moves them to `Done`.

## Consequences

- **+** Prod always deploys from a versioned, named release (`release/x.y.z` + `vX.Y.Z` git tag), giving a clear history of what shipped when.
- **+** A stabilization window exists before prod — bugs found in local testing get fixed on the release branch without blocking `main`, which keeps accepting new feature merges in parallel.
- **+** Trello's "To Be Released" list + per-release version label gives a permanent, searchable record of what was in each release, without needing a separate changelog system.
- **-** No staging deployment — testing relies on local `npm run build && npm start`, which won't catch environment-specific issues (Hostinger env vars, real DB) the way a deployed staging site would. Accepted for now; revisit if local testing proves insufficient (Option C).
- **-** Every prod update now requires a release branch, even urgent hotfixes — no direct main→prod escape hatch. Accepted deliberately to keep the process consistent; a hotfix just means cutting a (possibly same-day) release branch too.
- **+** Merging the release PR into `prod` is sufficient to deploy — Hostinger auto-deploys on any push to `prod`, so no manual hPanel click is needed for routine releases.
