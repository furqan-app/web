# Visual E2E Testing in the Workflow

**Type:** feature
**Date:** 2026-07-07
**Status:** ready-to-implement

## Summary

Introduce automated visual regression testing using Playwright, wired into a new GitHub Actions CI workflow that runs on pull requests. Since the repo has no automated testing today, this is a from-scratch addition: a committed fixture database (see **Addendum 1** below — this must be the *full* 604-page dataset, not a trimmed slice) lets CI build and boot the real app without hitting the live QDC API on every run. Five fixed screens are screenshotted across locale × theme × viewport combinations (36 baseline images total) and diffed against committed baselines on every PR. See [ADR 0018](../architecture/adr/0018-visual-e2e-testing.md) for the full rationale and alternatives considered.

## Approach

1. **Fixture generation script** (`scripts/e2e-fixture/generate.js`): reuses `scripts/quran-seed/chapters.js` (fetch all chapters), `scripts/quran-seed/verses-words.js`'s `fetchVersesAndWords` (all 604 pages — see Addendum 1), and `scripts/quran-seed/derive.js` (rubs/rub_verse_mappings/page_metadata). Output: a SQL file (`e2e/fixtures/quran-fixture.sql`) with `INSERT` statements for `chapters`, `verses`, `words`, `rubs`, `rub_verse_mappings`, `page_metadata`, generated once and committed. A `npm run e2e:generate-fixture` script runs it (manual, not part of CI — CI only *loads* the committed fixture, it never regenerates it; regenerating re-fetches all 604 pages from QDC and takes several minutes).

2. **Playwright setup**: `@playwright/test` as a devDependency, config at `playwright.config.ts` (`testDir: e2e/tests`, `baseURL: http://localhost:3000`, projects for desktop `1280x800` and mobile `390x844` viewports, `webServer` block that runs `npm run e2e:build && npm run e2e:start` and waits on `http://localhost:3000`). Baseline screenshots live under `e2e/tests/__screenshots__/` (Playwright's default, committed to git).

3. **Test files** (`e2e/tests/visual.spec.ts`), one `test.describe` per screen, parametrized over locale × theme (and viewport project, handled by Playwright's project matrix):
   - Navigate to the route.
   - For theme: inject `localStorage.theme` via `page.addInitScript()` before navigation (mirrors `app/utils/storage.ts`'s `JSON.stringify` shape, e.g. `'"dark"'`) rather than clicking `ThemeToggle` in every test — avoids an extra interaction step multiplied across 36 cases.
   - For locale: navigate to `/ar/...` or `/en/...` directly (locale is in the URL).
   - `await expect(page).toHaveScreenshot("<name>.png")` (viewport-only, not `fullPage` — bounds screenshot size and is sufficient for an above-the-fold visual smoke test).

4. **Local DB orchestration** (see Addendum 1 for why this uses dedicated e2e-only containers, not `compose.yml`'s dev DBs): `docker compose -f compose.e2e.yml` starts `quran-db-e2e`/`app-db-e2e` on ports 3309/3310 (tmpfs-backed, disposable). `npm run e2e:setup` (`scripts/e2e-fixture/setup.js`) force-resets both schemas via `prisma db push --force-reset` and loads the committed fixture SQL into `quran-db-e2e` directly via `mysql2` (`multipleStatements: true`) — no `mysql` CLI dependency. `npm run e2e:test` runs Playwright, whose `webServer` config builds and starts the app (against `.env.e2e`) before running specs.

5. **CI workflow** (`.github/workflows/visual-e2e.yml`): triggers on `pull_request`. Steps: checkout → setup Node → `npm ci` → start `mysql:8.0` as two GitHub Actions **service containers** (matching `compose.e2e.yml`'s two-DB split) → `npm run e2e:setup` → `npx playwright install --with-deps chromium` → `npm run e2e:test` (build + start + run specs, via Playwright's `webServer`) → upload `playwright-report/` and diff images as a CI artifact on failure.

6. **Baseline update workflow** (`.github/workflows/update-visual-baselines.yml`): `workflow_dispatch` input `branch`. Checks out that branch, runs the same DB+build setup as the CI workflow, runs `npx playwright test --update-snapshots`, commits the changed PNGs under `e2e/tests/__screenshots__/` with a fixed commit message, and pushes back to that branch.

## Addendum 1 — Fixture must be the full dataset, not trimmed to pages 1–3

**Discovered during implementation** (superseding the original trimmed-fixture approach described in the initial version of this plan and ADR 0018): `app/[locale]/pages/[id]/page.tsx`'s `generateStaticParams` hardcodes `Array.from({ length: 604 }, ...)`, so `next build` always statically generates all 604 pages × 2 locales regardless of which pages the tests actually visit. A fixture trimmed to pages 1–3 crashes the build the moment page 4 statically generates and its `pageMetadata.findUniqueOrThrow` finds no row.

**Resolution (user-confirmed):** the committed fixture SQL contains the **full** dataset — all 604 pages' `verses`/`words`/`page_metadata`/`rubs`/`rub_verse_mappings`, plus all 114 `chapters` — not a trimmed slice. `generateStaticParams` is left unmodified (no production code changed for a testing concern). The trade-off is a larger committed SQL file and a slower one-time fixture-generation step (re-fetches all 604 pages from QDC), but this only happens when the fixture is (re)generated, never on a CI run — CI always loads the pre-generated, already-committed file.

**Also discovered/decided in this addendum:** local e2e runs must never reuse `compose.yml`'s dev `quran-db`/`app-db` — `e2e:setup`'s `prisma db push --force-reset` would silently wipe a developer's real locally-seeded Quran DB. `compose.e2e.yml` defines dedicated, disposable, tmpfs-backed containers (`quran-db-e2e` on 3309, `app-db-e2e` on 3310) used only by the e2e scripts, matching CI's ephemeral-container approach.

**What NOT to do (superseded):** do not trim the fixture to only the pages under screenshot test (the original plan/ADR approach) — it does not compose with this app's hardcoded-604 static generation without also changing `generateStaticParams`, which was explicitly ruled out.

## Decision Tree — Screens × Combinations

| # | Screen | Route | Locale | Theme | Viewport(s) | Notes |
|---|---|---|---|---|---|---|
| 1 | Home / surah list | `/{locale}` | ar, en | light, dark | desktop, mobile | Static content, no interaction needed |
| 2 | Quran page 1 (single) | `/{locale}/pages/1` | ar, en | light, dark | desktop, mobile | Short opening page (Al-Fatiha) |
| 3 | Quran pages 2–3 (double-spread) | `/{locale}/pages/2` | ar, en | light, dark | desktop only | `lg`+ only per ADR 0013; forced single below `lg` so mobile has nothing distinct to capture here |
| 4 | Search results | `/{locale}` + type into search bar | ar, en | light, dark | desktop, mobile | Query = a phrase from Al-Fatiha (in-fixture data); wait for debounced results before screenshot |
| 5 | Settings sheet (open) | `/{locale}` + click settings trigger | ar, en | light, dark | desktop, mobile | `Sheet` opens `side="left"` for ar (RTL), `"right"` for en |

Total: (4 screens × 2 viewports + 1 screen × 1 viewport) × 2 locales × 2 themes = 9 × 4 = **36 screenshots**.

**Theme switching:** set `localStorage.theme` (mirroring `useTheme`'s storage key — confirm exact key/value shape in `app/hooks/use-theme.ts` or equivalent during implementation) via `page.addInitScript()` before navigation, rather than clicking `ThemeToggle` in every test — avoids an extra interaction step (and its own flakiness) multiplied across 36 cases.

**Locale switching:** locale is already in the URL path (`/ar/...` vs `/en/...`) — no toggle interaction needed, just navigate to the right path.

## Files to Change

- `package.json` — add `@playwright/test` devDependency; add scripts: `e2e:generate-fixture`, `e2e:db:up`, `e2e:db:down`, `e2e:setup`, `e2e:build`, `e2e:start`, `e2e:test`.
- `scripts/quran-seed/verses-words.js` — extend `fetchVersesAndWords(onPage, pages)` to accept an optional page list (defaults to all 604, unchanged behavior for the real seeder); the fixture generator passes no override, so it also fetches all 604.
- `playwright.config.ts` — new. Desktop (1280×800) and mobile (390×844) projects, `testDir: e2e/tests`, `webServer` block, screenshot comparison config.
- `scripts/e2e-fixture/generate.js` — new. Fetches the full dataset (chapters + all 604 pages) and writes `e2e/fixtures/quran-fixture.sql`.
- `scripts/e2e-fixture/setup.js` — new. Force-resets the e2e-only DB schemas and loads the fixture SQL via `mysql2` (no `mysql` CLI dependency).
- `compose.e2e.yml` — new. Dedicated, disposable, tmpfs-backed `quran-db-e2e` (3309) / `app-db-e2e` (3310) containers — separate from dev's `compose.yml`.
- `.env.e2e` — new, committed (test-only, non-secret defaults pointing at the e2e containers).
- `e2e/fixtures/quran-fixture.sql` — new, committed. Generated output, not hand-written. Full 604-page dataset (see Addendum 1) — a large file.
- `e2e/tests/visual.spec.ts` — new. All 5 screen tests.
- `e2e/tests/__screenshots__/**` — new, committed. Baseline PNGs (36 initially).
- `app/components/SettingsSidebar.tsx` — add `aria-label` to the settings trigger `Button` (currently icon-only with no accessible name, unlike its sibling nav buttons) so tests can target it reliably. Minor, in-scope a11y fix consistent with existing patterns.
- `.github/workflows/visual-e2e.yml` — new. PR-triggered CI check.
- `.github/workflows/update-visual-baselines.yml` — new. `workflow_dispatch` baseline regeneration.
- `.gitignore` — add `playwright-report/`, `test-results/` (Playwright's transient output dirs; screenshots under `__screenshots__/` are NOT ignored — those are the committed baselines).

## Constraints

- Do not seed `app-db` with rows for this suite — schema push only. If a future screen needs auth, add seed data and revisit ADR 0018/this plan rather than silently expanding scope.
- Do not add the visual-e2e check to `protect-prod.yml`'s branch-source rule — it's a normal PR check, not a merge-gate rule (see Release & Deployment Workflow decision).
- Never regenerate baselines by committing locally-produced PNGs — always go through the `workflow_dispatch` job so baselines are produced in the same environment that will later compare against them.
- Reuse `scripts/quran-seed/chapters.js`/`derive.js` rather than re-deriving chapter-fetch or rub/hizb logic independently — the fixture must stay consistent with the real seeder's output shape.
- The fixture SQL must contain the full 604-page dataset, not a trim — see Addendum 1. Do not re-introduce page trimming without also solving the `generateStaticParams` mismatch it creates.
- `e2e:setup` / `compose.e2e.yml` must never point at `compose.yml`'s dev DB ports (3307/3308) — always the dedicated e2e ports (3309/3310).

## What NOT to Do

- Do not trim the fixture to only the screenshotted pages (1–3) — superseded by Addendum 1; it crashes `next build` against the hardcoded-604 `generateStaticParams`.
- Do not modify `generateStaticParams` to derive its param list from the DB — considered during Addendum 1's resolution and rejected in favor of keeping production code unchanged for a testing concern.
- Do not point CI at a shared/staging database (Option C) — no staging environment exists; rejected for coupling CI to shared external state.
- Do not make visual diffs "warn only" — they fail the check (still soft-blocking, not merge-gate).
- Do not expand screenshot coverage beyond the 5 screens / pages 1–3 in this task — broader coverage (more pages, mobile double-spread equivalent, auth-gated screens, mark modal, sign-in modal) is explicitly deferred to a follow-up.
- Do not reuse `compose.yml`'s dev `quran-db`/`app-db` for e2e — Addendum 1.

## Decisions Made

- CI target: GitHub Actions (new workflow), not just the local `no-mistakes` pipeline.
- Tool: Playwright, not a paid SaaS visual-diff service.
- Coverage: small smoke set (5 screens), not the full route/state matrix.
- Data source: committed **full-dataset** fixture SQL (all 604 pages, full chapters — revised from the original pages-1–3-trim plan in Addendum 1), not a live-seeded ephemeral DB or a shared/staging DB.
- Local/CI DB isolation: dedicated disposable e2e-only DB containers, never the developer's real dev DBs (Addendum 1).
- Viewports: desktop always; mobile added for 4 of 5 screens (double-spread excluded, desktop/`lg`-only by design).
- Diff behavior: fails the CI check (soft-blocking).
- Baseline updates: dedicated `workflow_dispatch` CI job, not local regeneration + commit.
