# CI: Bump actions/* off deprecated Node 20

**Type:** chore
**Date:** 2026-08-02
**Status:** ready-to-implement

## Summary

GitHub Actions `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, and `actions/github-script@v7` bundle Node.js 20 as their internal runtime. GitHub deprecated that runtime; every workflow run now emits a warning and falls back to Node 24. Bumping to the current major of each action silences the warning and removes the fallback dependency. `peaceiris/actions-gh-pages@v4` is deliberately out of scope — it is not named in the deprecation warning and is the only way the per-PR visual diff report reaches gh-pages (ADR 0022 Addendum 2026-07-15).

## Approach

Pure version-number substitution across three workflow files. No logic changes.

## Files to Change

- `.github/workflows/visual-e2e.yml` — `checkout@v4`→`@v5`, `setup-node@v4`→`@v5`, `upload-artifact@v4`→`@v5` (×2), `github-script@v7`→`@v8`
- `.github/workflows/update-visual-baselines.yml` — `checkout@v4`→`@v5`, `setup-node@v4`→`@v5`
- `.github/workflows/visual-e2e-report-cleanup.yml` — `checkout@v4`→`@v5`

## Verification

Force a `visual-e2e` failure (perturb one baseline PNG), push, confirm: artifacts upload, gh-pages report publishes under `reports/pr-<N>/`, sticky PR comment posts with the link. Then revert the perturbation and re-push green.

## Constraints

- Do not bump `peaceiris/actions-gh-pages@v4` — out of scope, not in the deprecation warning.
- Do not change `node-version: 20` in `setup-node` steps — that is the app's Node.js build version, unrelated to the action's internal runtime.

## What NOT to Do

- Do not bump `peaceiris/actions-gh-pages`.
- Do not change `node-version: 20`.
