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

## Addendum (2026-08-02): Opening-page flake — no readiness gate, and a diff gate too loose to catch it

**Type:** bug
**Status:** implemented — code done and verified; **baseline regeneration still pending** (`update-visual-baselines` must run against this branch before the PR merges).
**Trello:** [#174](https://trello.com/c/D4f3JMMH) — see the 2026-08-02 correction comment, which supersedes two claims in that card's description.
**Follow-up ticket:** [#175](https://trello.com/c/BSX7EK3j) (tighten the gate; deliberately a second PR — see Sequencing).

### Summary

`visual-e2e` has failed on effectively every PR since 2026-07-22, always on `quran page 1` / `quran pages 2-3 double-spread` and on a different random subset each run. Two defects compound. **A:** the spec screenshots the reader without waiting for its client-hydrated content, and `toHaveScreenshot` disables animations *before* its stability check — which freezes the loading skeleton's `animate-pulse` and makes a half-loaded page look like a settled one. **B:** `maxDiffPixelRatio: 0.02` is far too loose for a mostly-uniform mushaf page, so the skeleton-vs-painted difference lands exactly on the gate (0.0192) and a month-stale baseline scores only ~2x it. The fix is a positive content wait in the spec plus a full baseline regeneration; the gate tightening is sequenced as a separate PR.

### Root Cause

**A — the spec has no readiness gate.** `e2e/tests/visual.spec.ts` does `page.goto()` then `toHaveScreenshot()`. Reader line content arrives after hydration (`QuranSafha`'s `lines: null` -> skeleton, ADR 0034), and `ReaderPager` mounts six panels. Playwright's stability heuristic is "two consecutive screenshots 100ms apart are identical", but `toHaveScreenshot` disables all CSS animations first — so a static skeleton satisfies it. Instrumented at screenshot time (system Chrome, 1280x800, production build against the e2e fixture):

```
AT-SHOT  pulses=62  fonts={p1:true,p2:true,p3:true}  status=loaded
         panels=[{page:1,rows:0,bars:8},{page:2,rows:0,bars:8}, ...]
AFTER    pulses=0   panels=[{page:1,rows:7},{page:2,rows:6}, ...]
```

The **fonts are ready and the content is not** — so this is not the ADR 0029 / `fix-quran-page-font-loading.md` font-readiness problem, and no font fix applies. Eight repeat loads produced two distinct screenshots (4/8 each) at *identical* computed state (`fontSize: 32.6087px`, `cardW: 624` in both): the only difference is whether the partner page had painted.

**B — the gate is too loose to distinguish that from a real regression.** A mushaf page is mostly uniform paper, so pixelmatch flags few pixels even when the layout is wholly different. Scored on the real artifacts at the default `threshold: 0.2`:

| pair | flagged ratio |
|---|---|
| skeleton frame vs painted frame, same layout | **0.0192** |
| whole design generation apart (CI actual vs committed baseline) | **0.037-0.061** |

Against a 0.02 gate, defect A's two outcomes straddle the threshold — that is the flake. And because a stale baseline only scores ~2x the gate, `update-visual-baselines` rewrites just the ~3 files that happen to cross on a given run, which is why the 12 opening-page baselines carry four different vintages and four of them still date from 2026-07-12.

**Why the card's "rules out a stale baseline" is wrong.** The `25723 px (ratio 0.03)` line in the trace is Playwright's stability check — the page against *itself* 100ms later — not a comparison with the baseline; `37569 (0.04)` is the only baseline comparison, and `results.json` records `["failed","passed"]`, so attempt 2 passed rather than scoring 0.04. `page-1-en-dark-desktop-linux.png` is md5 `6a61c8b7991beb68a102d1ab1af10b17` from `b2abf10` (2026-07-12) through HEAD, and renders side nav arrows and a ~290px content-sized card — impossible under current code at 1280x800, where `7f26778` (2026-07-22) added `.fq-nav-arrow { display: none !important }` for the 1024-1366px band. The baselines are stale *and* there is real nondeterminism; they are separate facts.

### Decision Tree / Algorithm

Which tests get the readiness wait, and what it waits on:

| Test | What it was waiting on | Wait added |
|---|---|---|
| `quran page 1` (desktop + mobile) | nothing — `goto` then screenshot | rows painted in every mounted safha |
| `quran pages 2-3 double-spread` (desktop) | nothing — `goto` then screenshot | rows painted in every mounted safha |
| `search results` (desktop + mobile) | fixed `waitForTimeout(800)` | results heading visible, scoped to the searchbar under test |
| `home / surah list` | nothing needed — fully server-rendered | none |
| `settings sheet` | fixed `waitForTimeout(600)` for the slide-in | none — see Constraints |

Both waits are **positive** assertions on rendered content:

- **Reader:** every mounted `.fq-quran-safha` contains at least one `.fq-safha-row`, *and* at least one safha exists. Not `document.querySelectorAll(".animate-pulse").length === 0` — a "no bars present" check returns `0` and passes instantly if the skeleton's class is ever renamed, silently restoring the flake. The `length > 0` guard closes the same hazard one level up, since `every()` on an empty list is vacuously true. Every one of the 604 pages has at least one word row, so the predicate is never unsatisfiable.
- **Search:** the results dropdown's surah heading, which `SearchQueryResults` renders only once `chapters.length > 0`. Deliberately *not* a locator for the result row: the home page's own surah list renders each surah as a link with the same accessible name, so `getByRole("link", { name: "Al-Fatihah" })` resolves against the list underneath the dropdown and passes before the search has rendered anything.

**Search scoping (found during implementation).** On mobile the search dialog opens while the nav's own search bar stays mounted, so *two* `SearchQueryResults` render and any page-level locator hits a Playwright strict-mode violation ("resolved to 2 elements"). The test now derives a `scope` (`page` on desktop, `page.getByRole("dialog")` on mobile) once, and both the fill and the wait go through it.

### Verified Test Cases

| Scenario | Measured |
|---|---|
| 8 loads via the ungated path (`goto` -> screenshot) | 2 distinct images, 4/8 each — skeleton vs painted partner page |
| 3 runs through Playwright's own `toHaveScreenshot` assertion, warm | run-to-run diff **0.0** on all 12 opening-page shots |
| 4 runs through the assertion at 8x CPU throttle + 300ms latency | run-to-run diff **0.0** on all 4 desktop shots |
| skeleton frame vs painted frame, scored at `threshold: 0.2` | **0.0192** — against a 0.02 gate |
| CI `actual` vs committed baseline, en-dark + ar-light desktop | **0.0612 / 0.0560** (Playwright reported 0.0367 / 0.0328; it also excludes anti-aliased pixels, which this re-scoring does not) |
| no-JS render (pure SSR + CSS) at 1280x800 | `fontSize: 24.8px`, `data-safha-view: null` — confirms the 24.8px arm is the pre-tablet-band baseline, not a runtime state |

Playwright's own assertion never produced run-to-run variance locally, warm or throttled. That is the argument for tightening the gate in a follow-up rather than loosening the fix: the floor is genuinely zero, so 0.002 is affordable once CI confirms it.

**After implementation** — same 4 reader cases captured 10x each, both ways, under identical conditions. A green suite alone would not have shown this, because locally the flake only surfaces through the ungated capture path:

| Capture path | Distinct images / 10 runs | Captures containing skeleton bars |
|---|---|---|
| ungated (`goto` -> `fonts.ready` -> screenshot) | 2, 2, 2, 1 | **40 / 40** |
| gated (`goto` -> `waitForReaderContent` -> screenshot) | 1, 1, 1, 1 | **0 / 40** |

Three consecutive full-suite runs (36 snapshots each) through the real assertion: **0 of 72 pairwise comparisons nonzero, worst ratio 0.00000.**

**The search flake was found by this verification, not by the investigation** — the earlier 3-run check only diffed the opening pages. `search-ar-dark-desktop` and `search-ar-light-desktop` differed run-to-run at **0.0498 / 0.0568**, capturing the spinner instead of the results dropdown. Both would have exceeded even the current 0.02 gate, and the baseline regeneration in this PR would have frozen a spinner into a baseline. Fixed here rather than deferred, on that basis (user, 2026-08-02).

### Files to Change

- `e2e/tests/visual.spec.ts` — add a `waitForReaderContent` helper and call it in the `quran page 1` and `quran pages 2-3 double-spread` tests, after `page.goto` and before `toHaveScreenshot`. Replace the search test's `waitForTimeout(800)` with a positive wait on `SEARCH_RESULTS_HEADING`, and hoist the mobile/desktop `scope` locator so the fill and the wait share it. Fix the header comment's stale "ADR 0018" reference. Comment both waits with *why* they cannot be absence checks.
- `playwright.config.ts` — fix the same stale "ADR 0018" reference; 0018 is the Sentry Slack relay webhook, visual e2e is **ADR 0022**. `maxDiffPixelRatio` stays at `0.02` in this PR (see Sequencing).
- `e2e/tests/visual.spec.ts-snapshots/**` — regenerate **all** baselines via the `update-visual-baselines` workflow after the spec change merges. Not only the four pre-tablet-band ones: every current baseline was captured through the ungated path, so none is trustworthy.
- `docs/architecture/adr/0022-visual-e2e-testing.md` — addendum recording the readiness invariant and the gate measurements.
- `docs/architecture/DECISIONS.md` — two constraints under "Visual E2E Testing".

### Sequencing

Two PRs, deliberately.

1. **This PR:** readiness wait + the ADR-reference comment fix + full baseline regeneration, gate left at `0.02`.
2. **[#175](https://trello.com/c/BSX7EK3j), after 2-3 PRs have run green:** `maxDiffPixelRatio` -> `0.002`.

Tightening in the same PR would mean the new value never runs against a known-good baseline before merge. If CI runner anti-aliasing drifts between the regeneration run and later runs, the suite goes red for everyone with no way to separate runner drift from a real regression.

### Constraints

- The readiness wait must be a positive assertion on rendered content. Any "absence of loading state" form (no `.animate-pulse`, no `[data-loading]`) passes vacuously the moment the class or attribute is renamed, and re-introduces the flake with no failing test to catch it.
- Do not treat this as a font-readiness bug. `document.fonts.status` was `loaded` and all three page fonts reported `check() === true` at the moment the skeleton was captured — the late resource is the page's line content, not its font. ADR 0029, `fix-safha-swipe-flicker.md`, and `fix-quran-page-font-loading.md` are all about the font path and none of their mechanisms apply.
- Baselines still go only through the `workflow_dispatch` job, never a locally-committed PNG (existing ADR 0022 constraint, unchanged) — the local runs in this investigation used a throwaway config writing to a scratch directory and the committed baselines were never touched.
- Do not raise `expect.toHaveScreenshot.threshold` (the per-pixel YIQ tolerance) from its 0.2 default in either PR. It was considered and rejected: it widens exposure to font-rendering differences between CI runner images, which is a different and noisier failure mode than the pixel-count gate.
- Do not add the *reader* wait to the home/search/settings tests — those screens have no `.fq-quran-safha`, so its predicate would never be satisfied and every one of those tests would time out. The search test needs its own predicate, on its own results markup.
- Any locator in the search test must be scoped to the searchbar under test. Mobile opens search in a dialog while the nav's own searchbar stays mounted, so two `SearchQueryResults` render and a page-level locator fails with a Playwright strict-mode violation. This is why the test derives `scope` once and routes both the fill and the wait through it.
- The settings-sheet test's `waitForTimeout(600)` is deliberately left alone. It waits on a CSS slide-in, which `toHaveScreenshot` disables outright before its own stability check, and it measured zero run-to-run variance across three full suite runs — so there is no evidence it is unsound and no reason to churn it in a bugfix PR.
- Do not "fix" this by raising `retries` or by quarantining the two opening-page specs. Retries only re-roll the same coin, and quarantine removes the only coverage the reader has.

### What NOT to Do

- Do not chase a runtime layout-band flip between `--fq-word-base` (24.8px) and `--fq-t-word` (32.6px). It was investigated at length and does not exist: 12 instrumented loads reported `fontSize: 32.6087px`, `mqTablet: true`, `data-safha-view: "double"` every single time, with zero intermediate states. The 24.8px arm comes from baselines predating `7f26778` (2026-07-22).
- Do not regenerate baselines *before* the readiness wait lands — the regeneration would capture the same coin flip and bake a skeleton into a baseline.
- Do not modify `QuranSafha`, `ReaderPager`, or any production component for this. The defect is entirely in the test harness; the skeleton behaviour under test is correct and deliberate (ADR 0034).
- Do not use `page.waitForLoadState("networkidle")` as the gate. The reader keeps issuing requests after the spread has painted (neighbour-panel JSON, marks, reciters, session), so it is both slower and not a signal about the thing being screenshotted.

### Decisions Made

- **Positive content wait, not skeleton-absence** — chosen so a class rename fails loudly rather than silently disabling the gate.
- **Gate tightening split into a second PR** (user, 2026-08-02) — so the new value is validated against a known-good baseline before it can block anyone.
- **`maxDiffPixelRatio` -> 0.002, `threshold` unchanged at 0.2** (user, 2026-08-02) — measured run-to-run floor is 0.0, so the tighter pixel-count gate is affordable; widening the per-pixel colour tolerance is not, because it invites runner-image font drift.
- **Regenerate all 36 baselines, not just the 4 stale ones** — every existing baseline was produced through the ungated capture path.
- **Search test fixed in this PR rather than deferred** (user, 2026-08-02) — same root cause (a fixed sleep standing in for a readiness signal), and it had to land *before* the regeneration or a spinner would have been frozen into a baseline. Widened this plan's scope in place rather than opening an addendum, since the branch is still open.
- **Search waits on the results heading, not the result row** — the home page's surah list renders links with the same accessible name, so a row locator would resolve against the list beneath the dropdown and pass early. The heading only exists once `chapters.length > 0`.
- **No production component touched to make the search test targetable.** A `data-testid` on `SearchQueryResults` was considered and rejected: the heading gives an unambiguous locator with a loud (timeout) failure mode, so the plan's "test-harness only" constraint holds.
- **Trello #174's description left intact, correction appended as a comment** (user, 2026-08-02) — preserves the original hypothesis and how it was misread.
