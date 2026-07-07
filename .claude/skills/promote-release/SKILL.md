---
name: promote-release
description: Open the PR that promotes a cut release branch into prod. Trigger via /promote-release <version>.
---

# /promote-release <version>

Opens the `release/<version>` → `prod` PR once local testing has passed. See `docs/plans/release-branch-workflow.md` and [ADR 0015](../../../docs/architecture/adr/0015-release-branch-workflow.md).

## Precondition

- A version must be given (e.g. `1.3.0`). If missing, ask for it.
- `release/<version>` must exist on `origin`. If not, stop and say so — the user needs to run `/cut-release` first.

## Steps

1. `git fetch origin`; confirm `origin/release/<version>` exists.
2. Best-effort: look up Trello cards carrying the `v<version>` label (via the board's cards) to reference in the PR body.
3. `gh pr create --base prod --head release/<version> --title "Release v<version>"` with a body summarizing the release (linking the Trello cards found above, if any).
4. Report the PR URL. Tell the user plainly:
   - The `check-source` gate on `prod` requires this PR's head branch to start with `release/` — it will pass automatically.
   - Merge the PR on GitHub. Hostinger auto-deploys on any push to `prod` — no manual redeploy click is needed.

## What NOT to do

- Do not merge the PR — only open it.
- Do not touch Trello — labeling/moving cards already happened in `/cut-release`.
