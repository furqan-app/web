---
name: promote-to-staging
description: Open the PR that promotes main into stg for staging verification. Trigger via /promote-to-staging.
---

# /promote-to-staging

Opens the `main` → `stg` PR, so whatever's on `main` can be verified on Hostinger's staging site. Not tied to a release version — `stg` is decoupled from the release-branch flow. See `docs/plans/release-branch-workflow.md` (Addendum 3) and [ADR 0039](../../../docs/architecture/adr/0039-stg-tracks-main-directly.md).

## Precondition

None — `main` always exists. No version argument needed.

## Steps

1. `git fetch origin`.
2. `git log origin/stg..origin/main --oneline` to summarize what's new since `stg`'s last merge, for the PR body.
3. `gh pr create --base stg --head main --title "Staging update"` with a body listing the commits/PRs found above.
4. Report the PR URL. Tell the user plainly:
   - The `check-source` gate on `stg` requires this PR's head branch to be exactly `main` — it will pass automatically.
   - Merge the PR on GitHub. Hostinger auto-deploys the staging site on any push to `stg` — no manual redeploy click is needed.

## What NOT to do

- Do not merge the PR — only open it.
- Do not ask for or use a version argument — this skill no longer takes one.
