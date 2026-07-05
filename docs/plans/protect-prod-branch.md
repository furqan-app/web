# Protect prod Branch: Enforce Merges from main Only

**Type:** feature
**Date:** 2026-07-05
**Status:** implemented

## Summary

Add a GitHub Actions workflow that blocks any PR targeting the `prod` branch unless it originates from `main`. This enforces the deployment gate: `main` is the only permitted source for production releases. Any PR opened from a feature branch, hotfix branch, or other arbitrary ref directly to `prod` will fail CI and cannot be merged (given branch protection is also configured to require this status check).

## Approach

Create `.github/workflows/protect-prod.yml` with a `pull_request` trigger scoped to the `prod` branch. A single job reads `github.head_ref` (the source branch of the PR) and exits non-zero if it is not `main`, printing a clear error message. The check name (`check-source`) must then be added as a required status check in GitHub's branch protection settings for `prod`.

## Files to Change

- `.github/workflows/protect-prod.yml` — new file; the sole workflow protecting the prod branch

## Workflow Content

```yaml
name: Enforce prod source

on:
  pull_request:
    branches: [prod]

jobs:
  check-source:
    runs-on: ubuntu-latest
    steps:
      - name: Only allow merges from main
        run: |
          if [ "${{ github.head_ref }}" != "main" ]; then
            echo "PRs to prod must come from main. Got: ${{ github.head_ref }}"
            exit 1
          fi
          echo "Source branch is main — OK"
```

## Post-deploy Step (manual, not in code)

After the workflow is pushed and visible in GitHub Actions, go to:
**Repo → Settings → Branches → Edit rule for `prod`** and add `check-source` as a required status check. Without this, the workflow runs but cannot block merges.

## Constraints

- Do not add any app-logic changes alongside this file.
- The job name `check-source` must stay stable — it is the string that gets registered as the required status check in GitHub branch protection.
- `github.head_ref` is only populated on `pull_request` events; do not use it on `push` events (it would be empty).

## Decisions Made

- Use `github.head_ref` (source branch name) rather than `github.base_ref` — `base_ref` is always `prod` for these PRs, which tells us nothing; `head_ref` is the source we want to gate.
- One-step `run:` check rather than a reusable action — the logic is two lines; no abstraction warranted.
