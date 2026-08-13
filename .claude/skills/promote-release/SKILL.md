---
name: promote-release
description: Open the PR that promotes a cut release branch into prod. Trigger via /promote-release <version>.
---

# /promote-release <version>

Read and follow the **Promote Release** section in [`docs/workflow/release.md`](../../../docs/workflow/release.md).

---
<!-- original content preserved below this line for reference only -->

Opens the `release/<version>` → `prod` PR once staging verification has passed. See `docs/plans/release-branch-workflow.md` (Addendum 1), [ADR 0015](../../../docs/architecture/adr/0015-release-branch-workflow.md), and [ADR 0026](../../../docs/architecture/adr/0026-staging-environment.md).

## Precondition

- A version must be given (e.g. `1.3.0`). If missing, ask for it.
- `release/<version>` must exist on `origin`. If not, stop and say so — the user needs to run `/cut-release` first.

## Steps

1. `git fetch origin`; confirm `origin/release/<version>` exists.
2. Best-effort: `gh issue list --repo furqan-app/web --milestone "v<version>" --state closed --json number,title,url` to reference in the PR body.
3. `gh pr create --base prod --head release/<version> --title "Release v<version>"` with a body summarizing the release (linking the issues found above, if any).
4. Report the PR URL. Tell the user plainly:
   - The `check-source` gate on `prod` requires this PR's head branch to start with `release/` — it will pass automatically.
   - Merge the PR on GitHub. Hostinger auto-deploys on any push to `prod` — no manual redeploy click is needed.

## What NOT to do

- Do not merge the PR — only open it.
- Do not touch the GitHub issues — milestoning/closing already happened in `/cut-release`.
