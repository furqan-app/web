# Visual E2E Testing in the Workflow

**Type:** feature
**Date:** 2026-07-07
**Status:** implemented

## Summary

Automated visual regression testing using Playwright, wired into a GitHub Actions CI workflow that runs on PRs. A committed full-dataset fixture DB (see Constraints) lets CI build and boot the real app without hitting the live QDC API. 36 baseline images (5 screens × locale × theme × viewport) are diffed against committed baselines on every PR. See [ADR 0022](../architecture/adr/0022-visual-e2e-testing.md) for rationale.

## Approach

1. **Fixture generation** (`scripts/e2e-fixture/generate.js`): reuses `chapters.js`, `verses-words.js`'s `fetchVersesAndWords`, and `derive.js`. Output: `e2e/fixtures/quran-fixture.sql` with `INSERT` statements for all tables, generated once and committed. `npm run e2e:generate-fixture` (manual — CI only loads the committed file, never regenerates it).

2. **Playwright config** (`playwright.config.ts`): desktop 1280×800 and mobile 390×844 projects, `testDir: e2e/tests`, `webServer` block runs `npm run e2e:build && npm run e2e:start`. Baselines live at `e2e/tests/visual.spec.ts-snapshots/` (Playwright's default derived from spec filename — not `__screenshots__/`).

3. **Test file** (`e2e/tests/visual.spec.ts`): theme injected via `page.addInitScript()` (sets `localStorage.theme`, same `JSON.stringify` shape as `storage.ts`) before navigation — faster than clicking toggle × 36 cases. Locale via URL path.

4. **DB orchestration** (`compose.e2e.yml`): dedicated, tmpfs-backed `quran-db-e2e`/`app-db-e2e` on ports 3309/3310 — never ports 3307/3308 (dev DBs). `npm run e2e:setup` force-resets schemas via `prisma db push --force-reset` and loads the fixture SQL via `mysql2` (no `mysql` CLI dependency).

5. **CI** (`.github/workflows/visual-e2e.yml`): PR-triggered. Steps: checkout → Node → `npm ci` → MySQL service containers → `e2e:setup` → playwright install chromium → `e2e:test` → upload artifacts on failure.

6. **Baseline update** (`.github/workflows/update-visual-baselines.yml`): `workflow_dispatch` with `branch` input. Runs same build/setup, then `npx playwright test --update-snapshots`, creates a new branch `update-baselines/<sanitized-branch>-<run_id>`, commits updated PNGs, pushes the branch, and opens a PR via `gh pr create --base ${{ inputs.branch }}` — does **not** push directly to `main` (blocked by repository ruleset). Requires `permissions: contents: write` and `permissions: pull-requests: write`. Never auto-merges the opened PR.

## Screens × Combinations

| # | Screen | Route | Viewports | Notes |
|---|---|---|---|---|
| 1 | Home / surah list | `/{locale}` | desktop, mobile | |
| 2 | Quran page 1 | `/{locale}/pages/1` | desktop, mobile | Al-Fatiha |
| 3 | Double-spread pages 2–3 | `/{locale}/pages/2` | desktop only | `lg`+ only; mobile forced single |
| 4 | Search results | `/{locale}` + search | desktop, mobile | Query from Al-Fatiha; wait for debounced results |
| 5 | Settings sheet (open) | `/{locale}` + click trigger | desktop, mobile | `side="left"` for ar, `"right"` for en |

Total: (4 screens × 2 viewports + 1 screen × 1 viewport) × 2 locales × 2 themes = **36 screenshots**.

## Files to Change

- `package.json` — devDependency `@playwright/test`; scripts `e2e:generate-fixture`, `e2e:db:up`, `e2e:db:down`, `e2e:setup`, `e2e:build`, `e2e:start`, `e2e:test`
- `playwright.config.ts` — new
- `scripts/e2e-fixture/generate.js` — new, fetches full dataset (all 604 pages)
- `scripts/e2e-fixture/setup.js` — new, force-reset schemas + load fixture via `mysql2`
- `compose.e2e.yml` — new, dedicated e2e-only DB containers on 3309/3310
- `.env.e2e` — new, committed, non-secret defaults for e2e containers
- `e2e/fixtures/quran-fixture.sql` — new, committed, full 604-page dataset
- `e2e/tests/visual.spec.ts` — new, all 5 screen tests
- `e2e/tests/visual.spec.ts-snapshots/**` — new, committed, 36 baseline PNGs
- `app/components/SettingsSidebar.tsx` — add `aria-label` to settings trigger button (a11y, needed for reliable test targeting)
- `.github/workflows/visual-e2e.yml` — new, PR-triggered check
- `.github/workflows/update-visual-baselines.yml` — new, `workflow_dispatch` baseline regeneration via PR (see §6)
- `.gitignore` — add `playwright-report/`, `test-results/` (baselines under `visual.spec.ts-snapshots/` are NOT ignored)

## Constraints

- The fixture SQL must contain the **full 604-page dataset** — `generateStaticParams` hardcodes all 604 pages so `next build` generates all pages; a trimmed fixture crashes the build when any out-of-fixture page statically generates and its `pageMetadata.findUniqueOrThrow` finds no row.
- Never reuse `compose.yml`'s dev DB ports (3307/3308) for e2e — `prisma db push --force-reset` would wipe the developer's real Quran DB.
- Never regenerate baselines by committing locally-produced PNGs — use the `workflow_dispatch` job so baselines are produced in the same environment that later compares against them.
- Do not seed `app-db` for this suite — schema push only.
- Do not modify `generateStaticParams` to derive its list from the DB — production code unchanged for a testing concern.
- Baseline updates must go through a PR, never a direct push to `main` (repository ruleset: Changes must be made through a pull request).
- Each update-baselines run creates a unique branch (`<run_id>` suffix) — no reuse across runs.
- Visual diffs fail the CI check (soft-blocking, not merge-gate).

## Addendum (2026-07-15): Post visual diffs directly on the PR

**Problem (Trello #115):** `visual-e2e.yml` only uploads `playwright-report/`/`test-results/` as artifacts on failure — the PR shows a red X with no indication of which screens broke or what the diff looks like. Seeing it requires opening the Actions run, downloading a zip, and unzipping locally.

**Approach:** Host the Playwright HTML report (built-in side-by-side actual/expected/diff viewer) on GitHub Pages per PR, and post a sticky PR comment linking to it. The repo is public, so GitHub Pages is free.

### Decision Tree

| Trigger | Condition | Action |
|---|---|---|
| `visual-e2e` job finishes | Any test failed | Push `playwright-report/` to the `gh-pages` branch at `reports/pr-<PR_NUMBER>/` (additive — other PRs' folders untouched); post/update a sticky PR comment (identified by a hidden `<!-- visual-e2e-report -->` marker so re-runs edit the same comment instead of piling up) listing each failed screen (e.g. "Home (en, dark, desktop)") and linking to `https://furqan-app.github.io/web/reports/pr-<PR_NUMBER>/` |
| `visual-e2e` job finishes | All passed, sticky comment exists from a prior failed run | Update that comment to "✅ now passing" |
| `visual-e2e` job finishes | All passed, no prior sticky comment | No comment posted |
| A PR is closed (merged or not) | — | New workflow (`pull_request: types: [closed]`) deletes `reports/pr-<PR_NUMBER>/` from `gh-pages` |

### Verified Test Cases

- **PR with a failing screen** (e.g. a font-size regression breaks "Quran page 1 (ar, light, desktop)"): job fails → report pushed to `reports/pr-<N>/` → comment posted listing "Quran page 1 (ar, light, desktop)" + the hosted link → clicking it opens Playwright's report showing the actual/expected/diff images in-browser, no download.
- **Same PR, pushed a fix, now passing**: job succeeds → existing sticky comment (matched by its marker) is edited in place to "✅ now passing" — not a second comment.
- **A different PR failing concurrently**: its report lands at `reports/pr-<M>/`, distinct from `reports/pr-<N>/` — pushing one PR's report never overwrites or removes another's (this is why `gh-pages` is used directly via an additive push rather than `actions/deploy-pages`, which replaces the entire Pages deployment from a single artifact each run and would clobber concurrent PRs' reports).
- **PR #104 merges**: `pull_request: closed` fires → `reports/pr-104/` is deleted from `gh-pages`, keeping the branch from growing unbounded.

### Files to Change

- `.github/workflows/visual-e2e.yml` — after the existing `Run visual e2e tests` step: parse `playwright-report/results.json` for failed test titles, push `playwright-report/` to `gh-pages` under `reports/pr-<PR_NUMBER>/` on failure, and post/update the sticky PR comment (`actions/github-script` or equivalent) in both the failure and now-passing cases. Needs `permissions: contents: write` and `permissions: pull-requests: write` added to the job.
- `playwright.config.ts` — add a `json` reporter alongside the existing `html` one in the CI branch (`reporter: [["html", ...], ["json", { outputFile: "playwright-report/results.json" }]]`) so failed test titles can be parsed programmatically; the `html` reporter output is unchanged and remains what gets hosted.
- `.github/workflows/visual-e2e-report-cleanup.yml` — new, `pull_request: types: [closed]`, deletes `reports/pr-<PR_NUMBER>/` from `gh-pages`.

### Constraints

- Publish to `gh-pages` via a direct additive push (e.g. `keep_files: true`-style branch push), never `actions/deploy-pages` — that action replaces the whole Pages deployment from one artifact per run, which would delete every other open PR's report each time one PR's workflow runs.
- The repo's Pages source must be set to "Deploy from branch: `gh-pages`" in Settings — a one-time manual/`gh api` change, confirm with the user before applying (repo setting, not code).
- The sticky comment must be identified by a stable hidden marker and edited in place — never create a new comment per run (would spam the PR on every push).
- This CI change is additive to `visual-e2e.yml`'s existing behavior (artifact upload on failure stays as-is) — do not remove the existing `Upload Playwright report` / `Upload test-results` steps.
- Cleanup only runs on PR close, not on every push — do not delete a PR's report while it's still open, even between runs.
- Any step's `if:` condition that needs to run after a failed prior step must include one of GitHub Actions' status-check functions (`failure()`, `success()`, `always()`, `cancelled()`) — a bare expression like `steps.run-tests.outcome == 'failure'` gets an implicit `success() &&` prepended by GitHub Actions and silently evaluates to skip. First shipped version of the "Publish report to GitHub Pages" step hit exactly this (condition was `if: steps.run-tests.outcome == 'failure'`, step showed as `skipped` on PR #105's own failing run, so the report link 404'd); fixed to `if: failure() && steps.run-tests.outcome == 'failure'`.

### What NOT to Do

- Do not use `actions/deploy-pages` / `actions/upload-pages-artifact` — not additive, would clobber concurrent PRs' reports (see Constraints).
- Do not automate `update-visual-baselines.yml`'s trigger as part of this task — explicitly out of scope per user (2026-07-15).
- Do not post a new PR comment on every run — must be a single sticky comment, updated in place.

### Decisions Made

- Hosted GitHub Pages report (not just an artifact-download link) — confirmed with user 2026-07-15, given the repo is public so Pages is free.
- Comment behavior: only post on failure or transition-to-passing; no comment on a clean pass with no prior failure — confirmed with user 2026-07-15.

## Addendum (2026-07-16): Refresh fixture after the word-audio seeder fix

**Problem (Trello #116):** `scripts/e2e-fixture/generate.js` reuses `fetchVersesAndWords` from `scripts/quran-seed/verses-words.js` to build `e2e/fixtures/quran-fixture.sql`. PR #104 (merged) patched that exact function to correct `Word.audio_url`'s trailing file number to always equal `Word.position` (see ADR 0009 Addendum 2026-07-15). The committed fixture SQL predates that fix, so it still has the old, uncorrected `audio_url` values — stale relative to what a real seed run (and the fixture generator, if re-run today) now produces.

**Impact:** None on current test outcomes — `audio_url` isn't rendered on any of the 5 screenshotted screens, so no baseline is affected. This is pure data-consistency drift between the fixture and the real seeder logic it's supposed to mirror (per ADR 0022: "The fixture SQL duplicates the full output of what the reproducible seeder already knows how to produce").

**Approach:** Re-run `npm run e2e:generate-fixture` (re-fetches all 604 pages from QDC via the now-patched `fetchVersesAndWords`) and commit the regenerated `e2e/fixtures/quran-fixture.sql`. Simple, single-file change — no branching logic, no new decisions.

### Files to Change

- `e2e/fixtures/quran-fixture.sql` — regenerated via `npm run e2e:generate-fixture`

### Constraints

- Regeneration re-fetches all 604 pages from QDC (slow, one-time) — same cost profile as a full `seed:quran` run, per existing ADR 0022 constraint.
- Do not hand-edit the fixture SQL — it must come from running the generator, so it stays a faithful derivative of the seeder logic.

### What NOT to Do

- Do not touch `scripts/e2e-fixture/generate.js`, `playwright.config.ts`, or any test file — this task is a data refresh only, not a logic change.

### Decisions Made

- Confirmed with user 2026-07-16: regenerate now rather than defer.
