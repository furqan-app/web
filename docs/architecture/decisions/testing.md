# Testing — Decisions

Active decisions for testing & CI — Playwright e2e, CI gates, dev ergonomics. Part of `docs/architecture/decisions/`; always-loaded index is [`../DECISIONS.md`](../DECISIONS.md).

---

## E2E Testing (Behavioral Playwright Suite)

**Status:** active

**Decision:** Playwright (`@playwright/test`) drives behavioral/functional end-to-end tests against a committed, **full-dataset** fixture database (all 604 pages) — not a trimmed slice. This is required, not optional: `app/[locale]/pages/[id]/page.tsx`'s `generateStaticParams` hardcodes all 604 page ids, so `next build` always statically generates every page regardless of which ones the tests visit; a trimmed fixture would crash the build on every page outside the trim. A fixture-generation script (`scripts/e2e-fixture/generate.js`, reusing the seeder's fetch/derive modules) produces one committed SQL dump (`e2e/fixtures/quran-fixture.sql`) with all 114 `chapters` + all 604 pages' `verses`/`words`/`page_metadata`/`rubs`/`rub_verse_mappings`. CI (GitHub Actions) and local test execution both load this file into a **dedicated, disposable** MySQL setup (`compose.e2e.yml` locally — separate ports/volumes from dev's `compose.yml`; GitHub Actions service containers in CI), then `next build && next start` against it. Sibling functional test suites exercise reader navigation, search, sidebar drawer, settings persistence, and word marking. Visual screenshot diffing (`toHaveScreenshot`) and committed baseline PNGs are deprecated and removed (ADR 0022 Addendum 2026-08-27). See [ADR 0022](../adr/0022-visual-e2e-testing.md).

**Constraints:**
- Never point `e2e:setup` (or `compose.e2e.yml`) at the dev databases in `compose.yml` — it force-resets both schemas on every run. The e2e DBs are separate containers/ports (`quran-db-e2e` 3309, `app-db-e2e` 3310) specifically so this is never destructive to real dev data.
- `app-db` gets its Prisma schema pushed via `prisma db push` in `e2e:setup`; test suites create and manage any required app-level seed or session fixtures explicitly.
- If the Quran schema (ADR 0009) changes, `scripts/e2e-fixture/generate.js` must be re-run and `e2e/fixtures/quran-fixture.sql` regenerated — it is a full derivative of the same seeder logic, not an independent source of truth. Regenerating re-fetches all 604 pages from QDC (slow, one-time), not part of any CI run.
- On failure in CI, the Playwright HTML report is uploaded as a standard GitHub Actions artifact (`playwright-report/`). Dedicated `gh-pages` deployments and sticky PR comments for screenshot diffing are discontinued.
- Tests assert behavioral outcomes and interactive state transitions (DOM visibility, navigation URL, focus, accessibility roles, and localStorage persistence) rather than pixel-diff matching.
- **Locators in the search test must be scoped to the searchbar under test.** Mobile opens search in a dialog while the nav's own searchbar stays mounted, so two `SearchQueryResults` render and any page-level locator fails with a Playwright strict-mode violation.

---

## CI: E2E Skip on Config-Only PRs

**Status:** active

**Decision:** `.github/workflows/e2e.yml` uses `on.pull_request.paths-ignore` (not an allowlist) to skip the suite when every changed file in a PR matches: `docs/**`, `.claude/**`, `.agents/**`, `.opencode/**`, `**/*.md`, `.mcp.json`, `.mcp.json.example`, `furqan-workflow.excalidraw`, `.eslintrc.json`, `tsconfig.json`. See `docs/plans/skip-e2e-config-changes.md`.

**Rationale:** An ignore-list defaults safe — any new/unrecognized path still triggers the suite. An allowlist would default unsafe, silently skipping e2e for new UI-affecting paths until someone remembers to add them.

**Constraints:**
- When adding a new top-level directory or root config file, decide explicitly whether it can affect rendered output before adding it to this ignore list — do not add out of convenience.
- `.github/workflows/**` is deliberately not in the ignore list, so changes to the workflow itself (including this list) still get tested.

---

## CI: Quality Gate (Lint, Type-Check & Unit Tests)

**Status:** active

**Decision:** `.github/workflows/ci.yml` runs on every `pull_request` as a fast, database-free quality gate executing `npm run lint`, `npm run type-check` (`tsc --noEmit`), and `npm test` (`vitest run`) sequentially on a single runner. It uses `concurrency` cancellation and `on.pull_request.paths-ignore` for `docs/**`, `.claude/**`, `.agents/**`, `.opencode/**`, `**/*.md`, `.mcp.json`, `.mcp.json.example`, `furqan-workflow.excalidraw`. See `docs/plans/ci-quality-gate.md`.

**Rationale:** Provides instant feedback on PRs without provisioning Docker containers or MySQL databases, while catching lint, TypeScript, and unit test regressions before merging.

**Constraints:**
- Do not ignore `.eslintrc.json` or `tsconfig.json` in `ci.yml` — configuration changes must trigger lint and type-checking.
- Must not depend on running database containers; client generation is handled offline via `npm ci`'s `postinstall`.
- `next-env.d.ts` is tracked in git (unignored) so `tsc --noEmit` runs deterministically without relying on prior `next lint` generation.
- Quality steps run with `if: steps.install.outcome == 'success'` so all diagnostics run after successful install, but skip cleanly if dependency installation fails.

---

## Developer Ergonomics: Local E2E Against a Production Build & Worker Concurrency Limits

**Status:** active

**Decision (2026-08-27, superseded in part 2026-09-03):** Playwright's web server is a production build (`npm run e2e:build && npm run e2e:start`) both locally and in CI. Locally, `reuseExistingServer: !process.env.CI` means `npm run e2e:serve` in a separate terminal builds once and every later `npm run e2e:test` / `npx playwright test` run attaches to that server; CI always builds fresh. Next.js build concurrency (`experimental.cpus`) in `next.config.mjs` is capped at 2 CPU workers locally (overrideable via `NEXT_BUILD_CPUS`); in CI it is unconstrained. Local Playwright worker concurrency (`workers`) defaults to 2 (overrideable via `PLAYWRIGHT_WORKERS`); CI is unconstrained. See `docs/plans/local-e2e-build-path.md` (Issue #524) and the archived `docs/plans/archive/local-build-and-test-ergonomics.md` (Issues #450, #516).

**Superseded (2026-09-03, Issue #524):** The original decision used `next dev` as the local web server to skip the 1,208-page build. Measured on a 31 GB / 16-core machine (~19 GB free at idle), running one spec file (`tafsir-sheet.spec.ts`) that way consumed ~16 GB of RAM and all 2 GB of swap over ~9 minutes and **failed every test** (each `page.goto` exceeds the 60 s timeout waiting for the reader route to compile). `experimental.cpus` does not cap `next dev`'s webpack compilation, and capping Playwright workers only changes how many on-demand compiles run at once, not the per-run heap cost. The same spec against `e2e:start` **passed 8/8 in 17 s with no measurable memory growth**; the one-time `e2e:build` is bounded (~4 min, ~3 GB, no swap, load ≤ 7 under the 2-CPU cap). `next dev` is therefore removed from the E2E path.

**Rationale:** A production build is a bounded, once-per-session cost that `reuseExistingServer` amortises across every run in that session; `next dev`'s on-demand compilation of a data-heavy route is unbounded in memory and does not complete within the test timeout. Serving pre-rendered pages keeps local E2E fast and flat on memory while staying identical to what CI validates.

**Constraints:**
- Local Playwright must support `reuseExistingServer: true` — this is what makes `e2e:serve` (build once) compose with repeated `e2e:test` runs, and it is off in CI so CI always builds fresh.
- CI must keep running `npm run e2e:build && npm run e2e:start` with unconstrained workers to validate full SSG static generation before merging.
- Local `next build` worker count defaults to 2 cores unless overridden by `NEXT_BUILD_CPUS`; do not remove this cap (every local E2E session now runs a build).
- Local Playwright worker count defaults to 2 unless overridden by `PLAYWRIGHT_WORKERS`.
- A worktree must be buildable before local E2E: `app/generated` is produced by `npm run postinstall` (`prisma generate` for both schemas), never symlinked from another worktree — a symlink breaks `next build` with `Module not found: @/app/generated/app-client`.
- Agents use `npm test` (Vitest) as the primary fast loop; for E2E, start `npm run e2e:serve` once, then run the targeted spec against it.
