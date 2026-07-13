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
