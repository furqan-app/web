---
title: "Dev Ergonomics: Local Dev Server for Playwright & Build Worker CPU Limit"
type: feature
date: 2026-08-27
status: implemented
area: ci
issue: 516
---

# Dev Ergonomics: Local Dev Server for Playwright & Build Worker CPU Limit

**GitHub Issues:** [#450](https://github.com/furqan-app/web/issues/450), [#516](https://github.com/furqan-app/web/issues/516)  

## Summary

Optimize local developer and AI agent workflows to prevent machine freezing and slow iteration cycles by:
1. Configuring Playwright (`playwright.config.ts`) to use `next dev` locally with `reuseExistingServer: !process.env.CI`, reserving heavy production `e2e:build` and `e2e:start` for CI.
2. Limiting Next.js static page generation concurrency (`experimental.cpus`) in `next.config.mjs` to 2 CPU workers locally (overrideable via `NEXT_BUILD_CPUS`), while allowing unrestricted CPU parallelism in CI.
3. Capping local Playwright test worker concurrency (`workers`) in `playwright.config.ts` to 2 workers (overrideable via `PLAYWRIGHT_WORKERS`), preventing multi-process browser and dev-server JIT compilation memory and CPU thrashing that freezes host machines. CI remains unconstrained.
4. Clearly separating test runner scripts in `package.json` (`test:unit` vs `test:e2e` / `e2e:test`) and documenting invariants in `docs/architecture/decisions/testing.md`.
5. Updating agent workflow skills (`start-fq-task`, `check-fq-standards`) to enforce testing standards: agents must always verify business logic and components with fast Vitest unit tests (`npm test`), and must never run uncapped full-suite Playwright commands.

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

3. **Local Playwright Worker Concurrency Limiting (`playwright.config.ts`)**:
   - Configure `workers` in `defineConfig`:
     - When `process.env.CI` is true: `undefined` (Playwright uses runner defaults).
     - When `!process.env.CI`: capped at `process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : 2`.
   - With `fullyParallel: true` and 16-thread CPUs, Playwright defaults to 8 parallel Chromium instances that bombard `next dev` with concurrent on-demand compilation requests, exhausting RAM, thrashing swap, and freezing the host system. Capping at 2 workers keeps local browser testing responsive.

4. **Agent Workflow Skills & Standards (`.claude/skills/`, `docs/workflow/`)**:
   - In `start-fq-task` (`docs/workflow/start-task.md` and `.claude/skills/start-fq-task/SKILL.md`): add an explicit test execution guardrail during step 4 (Implement). Agents must use fast unit tests (`npm test` / Vitest) for logic and components, and scope browser tests to targeted spec files with at most 2 workers (`--workers=2`).
   - In `check-fq-standards` (`docs/workflow/check-fq-standards.md` and `.claude/skills/check-fq-standards/SKILL.md`): add a testing guardrail under the General Engineering Bar prohibiting uncapped full-suite Playwright runs locally.

5. **Explicit Test Separation (`package.json`, `docs/architecture/decisions/testing.md`)**:
   - Explicit npm scripts:
     - `test` / `test:unit`: `vitest run` (fast unit tests, < 1s).
     - `test:e2e`: `dotenv -e .env.e2e -- playwright test`.
   - Document testing decisions and ergonomics in `docs/architecture/decisions/testing.md`.

## Decision Tree / Execution Matrix

| Context / Command | Triggered Environment | Concurrency / Server Target | Expected Outcome |
|---|---|---|---|
| `npx playwright test` / `npm run test:e2e` | Local (`!process.env.CI`) | `workers = 2` (or `PLAYWRIGHT_WORKERS`), dev server on `:3000` | Browser and compiler load constrained; host machine remains responsive. |
| `npm run e2e:test` | CI (`process.env.CI=true`) | `workers = undefined`, builds via `npm run e2e:build && npm run e2e:start` | Full SSG validation across all 1,208 pages with unconstrained CI runners. |
| `npm run build` or `e2e:build` | Local (`!process.env.CI`) | `experimental.cpus = 2` (or `NEXT_BUILD_CPUS`) | Host machine remains responsive; CPU usage capped at 2 workers. |
| `npm run build` or `e2e:build` | CI (`process.env.CI=true`) | `experimental.cpus = undefined` | All runner CPU cores utilized for maximum build speed. |
| `npm test` | Local & CI | `vitest run` | Fast unit test suite runs in < 1 second. |

## Verified Test Cases

- **Local Playwright Run**: With `CI` unset, running `npx playwright test` boots or connects to `next dev` without running `next build`, using at most 2 workers.
- **Local Build CPU Cap**: Running `npm run build` locally runs `next build` with worker concurrency constrained to 2 processes, leaving remaining cores free.
- **CI Concurrency**: When `CI=true`, both `next build` and Playwright run with unconstrained multi-core parallelism.
- **Unit vs E2E Separation**: `npm test` executes Vitest unit tests only; `npm run test:e2e` executes Playwright.
- **Agent Skill Directives**: `start-fq-task` and `check-fq-standards` explicitly instruct agents to verify with Vitest and cap local E2E runs to 2 workers on targeted specs.

## Files to Change

- `next.config.mjs` — Add `experimental.cpus` configuration conditioned on `process.env.CI` and `process.env.NEXT_BUILD_CPUS`.
- `playwright.config.ts` — Update `webServer.command` and configure `workers` to 2 locally (overrideable via `PLAYWRIGHT_WORKERS`).
- `package.json` — Add `test:unit` and `test:e2e` convenience aliases alongside existing scripts.
- `docs/architecture/decisions/testing.md` — Document the local dev server E2E, build worker concurrency, and Playwright worker concurrency invariants.
- `.claude/skills/start-fq-task/SKILL.md` & `docs/workflow/start-task.md` — Add testing verification instructions for agents.
- `.claude/skills/check-fq-standards/SKILL.md` & `docs/workflow/check-fq-standards.md` — Add testing guardrails to General Engineering Bar.

## Constraints

- Do not alter production runtime logic in `app/` or `components/`.
- CI workflows in `.github/workflows/` must continue running full production builds (`e2e:build && e2e:start`) and unconstrained workers.
- Local dev server must remain compatible with Playwright's `reuseExistingServer` flag.
- Do not edit `AGENTS.md` (agent rules are managed in skills and workflow files).

## What NOT to Do

- Do not update `AGENTS.md` for this task.
- Do not disable static page generation in production builds.
- Do not remove the dedicated e2e database fixture setup for CI runs.
- Do not mix Vitest and Playwright test files in the same directory.
- Do not run uncapped full-suite Playwright commands during agent verification.

## Decisions Made

- Default local build concurrency to 2 workers in `next.config.mjs`.
- Default local Playwright worker concurrency to 2 in `playwright.config.ts` (overrideable via `PLAYWRIGHT_WORKERS`).
- Embed testing guardrails directly into agent skills (`start-fq-task`, `check-fq-standards`) rather than `AGENTS.md`.
- Unit tests via Vitest remain the primary fast local verification loop (< 1s).
