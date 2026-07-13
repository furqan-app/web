# Protect prod Branch: Enforce Merges from release/* Only

**Type:** feature  
**Date:** 2026-07-05  
**Status:** implemented

## Summary

GitHub Actions workflow blocking any PR to `prod` unless it originates from a `release/` branch (updated from initial `main`-only gate per ADR 0015). After pushing, add `check-source` as a required status check in GitHub branch protection for `prod`.

## `.github/workflows/protect-prod.yml`

```yaml
name: Enforce prod source

on:
  pull_request:
    branches: [prod]

jobs:
  check-source:
    runs-on: ubuntu-latest
    steps:
      - name: Only allow merges from a release branch
        run: |
          if [[ "${{ github.head_ref }}" != release/* ]]; then
            echo "PRs to prod must come from a release/* branch. Got: ${{ github.head_ref }}"
            exit 1
          fi
          echo "Source branch is ${{ github.head_ref }} — OK"
```

## Post-Deploy (manual)

Repo → Settings → Branches → Edit rule for `prod` → add `check-source` as required status check.

## Constraints

- Job name `check-source` must stay stable — it's registered as the required status check.
- No exception for `main` — every prod update including hotfixes must go through a release branch (ADR 0015).
- `github.head_ref` is only populated on `pull_request` events — do not use on `push` events.
