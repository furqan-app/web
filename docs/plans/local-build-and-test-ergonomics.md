# Dev Ergonomics: Local Dev Server for Playwright & Build Worker CPU Limit

**Type:** task  
**Date:** 2026-08-27  
**Status:** implemented  
**GitHub Issue:** [#450](https://github.com/furqan-app/web/issues/450)  

## Summary

Optimize local developer and AI agent workflows to prevent machine freezing and slow iteration cycles by:
1. Configuring Playwright (`playwright.config.ts`) to use `next dev` locally with `reuseExistingServer: !process.env.CI`, reserving heavy production `e2e:build` and `e2e:start` for CI.
2. Limiting Next.js static page generation concurrency (`experimental.cpus`) in `next.config.mjs` to 2 CPU workers locally (overrideable via `NEXT_BUILD_CPUS`), while allowing unrestricted CPU parallelism in CI.
3. Clearly separating test runner scripts in `package.json` (`test:unit` vs `test:e2e` / `e2e:test`) and documenting agent testing selection guidelines in `AGENTS.md` and DECISIONS.md.

## Approach

1. **Local Playwright Server Selection (`playwright.config.ts`)**:
   - In non-CI environments (`!process.env.CI`), configure `webServer.command` to `npm run dev` (or connect to an already running server at `http://localhost:3000` via `reuseExistingServer: true`).
   - In CI (`process.env.CI`), configure `webServer.command` to `npm run e2e:build && npm run e2e:start` to validate production static generation.
   - This eliminates the heavy 1,208-page static build during local test execution.

2. **Next.js Build CPU Worker Limiting (`next.config.mjs`)**:
   - Configure `experimental.cpus` in `nextConfig`:
     - When `process.env.CI` is true: `undefined` (Next.js utilizes all available CI runner cores).
     - When `!process.env.CI`: capped at `process.env.NEXT_BUILD_CPUS ? Number(process.env.NEXT_BUILD_CPUS) : 2` (or 2 workers max).
   - This prevents `next build` (both `npm run build` and `npm run e2e:build`) from maxing out 100% host CPU cores and freezing the user's computer during static page generation.

3. **Explicit Test Separation & Agent Guidance (`package.json`, `AGENTS.md`, `DECISIONS.md`)**:
   - Explicit npm scripts:
     - `test` / `test:unit`: `vitest run` (fast unit tests, < 1s).
     - `test:e2e`: `dotenv -e .env.e2e -- playwright test`.
   - Update `AGENTS.md` and `DECISIONS.md` to establish the standard:
     - Use fast unit tests (`npm test`) for business logic, helpers, parsers, and utilities.
     - Use Playwright against the local dev server for browser interaction / E2E verification.
     - Rely on CI for full production build validation.

## Decision Tree / Execution Matrix

| Context / Command | Triggered Environment | Concurrency / Server Target | Expected Outcome |
|---|---|---|---|
| `npx playwright test` | Local (`!process.env.CI`) | Points to `http://localhost:3000` via `npm run dev` (`reuseExistingServer: true`) | Runs tests instantly on-demand without building 1,208 pages. |
| `npm run e2e:test` | CI (`process.env.CI=true`) | Builds via `npm run e2e:build && npm run e2e:start` | Full SSG validation across all 1,208 pages. |
| `npm run build` or `e2e:build` | Local (`!process.env.CI`) | `experimental.cpus = 2` (or `NEXT_BUILD_CPUS`) | Host machine remains responsive; CPU usage capped at 2 workers. |
| `npm run build` or `e2e:build` | CI (`process.env.CI=true`) | `experimental.cpus = undefined` | All runner CPU cores utilized for maximum build speed. |
| `npm test` | Local & CI | `vitest run` | Fast unit test suite runs in < 1 second. |

## Verified Test Cases

- **Local Playwright Run**: With `CI` unset, running `npx playwright test` boots or connects to `next dev` without running `next build`.
- **Local Build CPU Cap**: Running `npm run build` locally runs `next build` with worker concurrency constrained to 2 processes, leaving remaining cores free.
- **CI Build Concurrency**: When `CI=true`, `next build` runs with full multi-core parallelism.
- **Unit vs E2E Separation**: `npm test` executes Vitest unit tests only; `npm run test:e2e` executes Playwright.

## Files to Change

- `next.config.mjs` — Add `experimental.cpus` configuration conditioned on `process.env.CI` and `process.env.NEXT_BUILD_CPUS`.
- `playwright.config.ts` — Update `webServer.command` to select `npm run dev` locally and `npm run e2e:build && npm run e2e:start` in CI.
- `package.json` — Add `test:unit` and `test:e2e` convenience aliases alongside existing scripts.
- `docs/architecture/DECISIONS.md` — Document the local dev server E2E and build worker concurrency invariants.
- `AGENTS.md` — Update command reference and test execution guidance.

## Constraints

- Do not alter production runtime logic in `app/` or `components/`.
- CI workflows in `.github/workflows/` must continue running full production builds (`e2e:build && e2e:start`) to guarantee SSG correctness.
- Local dev server must remain compatible with Playwright's `reuseExistingServer` flag.

## What NOT to Do

- Do not disable static page generation in production builds.
- Do not remove the dedicated e2e database fixture setup for CI runs.
- Do not mix Vitest and Playwright test files in the same directory.

## Decisions Made

- Default local build concurrency to 2 workers to keep developer machines responsive.
- Local Playwright tests target the dev server on port 3000 by default.
- Unit tests via Vitest remain the primary fast local verification loop (< 1s).
