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

## Developer Ergonomics: Local Dev Server for Playwright & Worker Concurrency Limits

**Status:** active

**Decision (2026-08-27, updated 2026-09-03):** Playwright is configured in `playwright.config.ts` to use `next dev` locally (reusing `http://localhost:3000`), completely bypassing the heavy 1,208-page static compilation during local testing. In CI, it executes `npm run e2e:build && npm run e2e:start` for full SSG validation. Next.js build concurrency (`experimental.cpus`) in `next.config.mjs` is capped at 2 CPU workers locally (overrideable via `NEXT_BUILD_CPUS`), and local Playwright worker concurrency (`workers`) in `playwright.config.ts` is capped at 2 workers (overrideable via `PLAYWRIGHT_WORKERS`). In CI, both remain unconstrained. See `docs/plans/local-build-and-test-ergonomics.md` (Issues #450, #516).

**Rationale:** Generating all 604 mushaf pages across 2 locales (1,208 pages) during production builds maxes out CPU and memory, freezing local development machines. Furthermore, uncapped local Playwright runs spawn parallel Chromium instances that overwhelm `next dev` with concurrent on-demand compilation bursts, thrashing memory and swap. Dev-server execution, CPU worker caps, and Playwright worker concurrency limits allow responsive local development while preserving unconstrained CI validation.

**Constraints:**
- Local Playwright tests target the dev server (`http://localhost:3000`) and must support `reuseExistingServer: true`.
- CI must keep running `npm run e2e:build && npm run e2e:start` to validate full SSG static generation before merging.
- Local `next build` worker count defaults to 2 cores unless overridden by `NEXT_BUILD_CPUS`.
- Local Playwright worker count defaults to 2 workers unless overridden by `PLAYWRIGHT_WORKERS`.
- Agents must use `npm test` (Vitest) as their fast primary verification loop, and scope local Playwright executions to targeted test files with at most 2 workers.
