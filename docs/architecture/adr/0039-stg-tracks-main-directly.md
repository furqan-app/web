# ADR 0039: `stg` tracks `main` directly, decoupled from release branches

**Date:** 2026-08-12
**Status:** Accepted

## Context

ADR 0026 gated `stg` the same way as `prod`: only PRs from a `release/x.y.z` branch are accepted (`protect-stg.yml`, mirroring `protect-prod.yml`). In practice this means every staging deploy — even a quick check that doesn't need to go to prod yet — requires cutting a full release (version bump, tag, Trello labeling) via `/cut-release`. There's no way to push `main` to staging without also starting a release.

## Decision

`protect-stg.yml`'s `check-source` job now accepts PRs into `stg` only from `main` — not `release/*`, not any other branch. `protect-prod.yml` is unchanged: `prod` still only accepts `release/*`.

```
main → PR → stg   (direct, no release cut required)
main → /cut-release → release/x.y.z → /promote-release → prod → /sync-main-from-prod → main
```

This decouples `stg` from the release-branch flow entirely. `/promote-to-staging` and `/release`'s Checkpoint 1 are repointed to open a `main → stg` PR instead of `release/x.y.z → stg`, since release branches are no longer accepted into `stg`.

## Consequences

- **+** Staging can be refreshed any time by merging `main → stg`, without cutting a release first.
- **+** `stg` now always reflects latest `main`, useful for verifying in-progress work before it's release-ready.
- **-** Staging no longer verifies the exact artifact (`release/x.y.z`) that will later be promoted to `prod` — a release cut after a staging check could include additional commits merged to `main` in between that were never staged.
- **-** `/promote-to-staging`'s existing per-version framing (PR title `Staging v<version>`, linking Trello cards by version label) no longer applies cleanly, since a `main → stg` PR isn't tied to a single release version.
