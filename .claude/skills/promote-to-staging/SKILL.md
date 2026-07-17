---
name: promote-to-staging
description: Open the PR that promotes a cut release branch into stg for staging verification. Trigger via /promote-to-staging <version>.
---

# /promote-to-staging <version>

Opens the `release/<version>` → `stg` PR, so the release can be verified on Hostinger's staging site before going to prod. See `docs/plans/release-branch-workflow.md` (Addendum 1) and [ADR 0026](../../../docs/architecture/adr/0026-staging-environment.md).

## Precondition

- A version must be given (e.g. `1.3.0`). If missing, ask for it.
- `release/<version>` must exist on `origin`. If not, stop and say so — the user needs to run `/cut-release` first.

## Steps

1. `git fetch origin`; confirm `origin/release/<version>` exists.
2. Best-effort: look up Trello cards carrying the `v<version>` label (via the board's cards) to reference in the PR body.
3. `gh pr create --base stg --head release/<version> --title "Staging v<version>"` with a body summarizing the release (linking the Trello cards found above, if any).
4. Report the PR URL. Tell the user plainly:
   - The `check-source` gate on `stg` requires this PR's head branch to start with `release/` — it will pass automatically.
   - Merge the PR on GitHub. Hostinger auto-deploys the staging site on any push to `stg` — no manual redeploy click is needed.

## What NOT to do

- Do not merge the PR — only open it.
- Do not touch Trello — labeling/moving cards already happened in `/cut-release`.
