---
name: sync-main-from-prod
description: Open the PR that merges prod back into main after a release, so release-branch fixes aren't lost. Trigger via /sync-main-from-prod.
---

# /sync-main-from-prod

Opens the `prod` → `main` PR after a release has been promoted, so any fixes made directly on the release branch during stabilization make it back into `main`. See `docs/plans/release-branch-workflow.md` and [ADR 0015](../../../docs/architecture/adr/0015-release-branch-workflow.md).

## Steps

1. `git fetch origin`.
2. Determine the version for the PR title: `git describe --tags origin/prod` (latest tag reachable from `prod`).
3. `gh pr create --base main --head prod --title "Sync main with prod (v<version>)"` with a body noting this brings any release-stabilization fixes back into `main`.
4. Report the PR URL. Tell the user: merging and resolving any conflicts is a manual step from here.

## What NOT to do

- Do not merge the PR — only open it.
- Do not attempt to auto-resolve merge conflicts — flag them and let the user handle it.
