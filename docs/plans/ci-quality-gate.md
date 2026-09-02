---
title: "CI Quality Gate: PR Lint, Typecheck & Vitest Workflow"
type: feature
date: 2026-08-27
status: implemented
area: ci
---

# CI Quality Gate: PR Lint, Typecheck & Vitest Workflow

## Summary

Add a fast GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on every `pull_request` to enforce code quality by running ESLint (`npm run lint`), TypeScript compiler verification (`npm run type-check`), and the Vitest unit test suite (`npm test`). The workflow executes sequentially within a single runner without requiring MySQL databases. Path filtering via `paths-ignore` skips execution for documentation-only and AI tooling changes while ensuring changes to lint/type configurations trigger the checks.

## Root Cause / Approach

Currently, the primary automated PR check is the Playwright functional E2E suite (`.github/workflows/e2e.yml`), which provisions two MySQL containers and runs browser tests. Pure unit tests, ESLint checks, and TypeScript type validations rely on local developer discipline before pushing.

Create `.github/workflows/ci.yml` as a lightweight quality gate:
- Runs in a single `quality-gate` job on `ubuntu-latest` with Node 20 and `cache: npm`.
- Configures `concurrency` with `cancel-in-progress: true` to avoid redundant runner minutes on rapid pushes.
- Runs `npm ci` (identified as `id: install`), which automatically executes the `postinstall` script to generate Prisma clients for `quran` and `app` domains without needing a live database connection.
- Sequentially executes `npm run lint`, `npm run type-check`, and `npm test` gated by `if: steps.install.outcome == 'success'` so all diagnostics run after successful dependency install while skipping cleanly if install fails.
- Tracks `next-env.d.ts` in git (removed from `.gitignore`) so `tsc --noEmit` runs deterministically without depending on prior `next lint` generation.

## Decision Tree / Path Filtering

| Changed File / Path Pattern | Triggers `ci.yml`? | Rationale |
|---|---|---|
| `docs/**` | **No** (ignored) | Documentation only |
| `.claude/**`, `.agents/**`, `.opencode/**` | **No** (ignored) | AI assistant configurations |
| `**/*.md` | **No** (ignored) | Markdown documentation |
| `.mcp.json`, `.mcp.json.example` | **No** (ignored) | Local tooling configuration |
| `furqan-workflow.excalidraw` | **No** (ignored) | Design diagram asset |
| `.eslintrc.json` | **Yes** | Affects ESLint linting rules |
| `tsconfig.json` | **Yes** | Affects TypeScript type-checking |
| `app/**`, `components/**`, `lib/**`, `messages/**`, `prisma/**` | **Yes** | Core application code, data, and translations |
| `package.json`, `package-lock.json` | **Yes** | Dependency and script updates |
| Any unrecognized / newly added paths | **Yes** | Default-safe behavior via `paths-ignore` |

## Verified Test Cases

1. **Docs/Tooling PR:** PR modifies only `docs/plans/something.md` or `.claude/skills/plan-fq-task/SKILL.md` → skipped completely by `paths-ignore` (0 runner seconds used).
2. **Code Edit PR:** PR touches `app/page.tsx` → `ci.yml` runs `npm ci` → `lint` → `type-check` → `vitest`.
3. **Lint Failure:** PR introduces an ESLint warning/error → `npm run lint` fails; `type-check` and `test` still execute (since install succeeded); overall job fails (❌) and signals failure to PR checks.
4. **Type Error:** PR introduces a TypeScript type mismatch → `npm run type-check` fails; overall job fails (❌).
5. **Vitest Failure:** PR introduces a failing unit test → `npm test` fails; overall job fails (❌).
6. **Linter/TS Config Change:** PR touches `.eslintrc.json` or `tsconfig.json` → triggers `ci.yml` to validate against updated rules.
7. **Install Failure:** If `npm ci` fails, subsequent test steps are skipped and the raw install error is reported without confusing `tsc: not found` noise.

## Files to Change

- `.github/workflows/ci.yml` — create GitHub Actions workflow for PR lint, typecheck, and Vitest suite.
- `.github/workflows/e2e.yml` — sync `paths-ignore` to include `.agents/**` and `.opencode/**`.
- `package.json` — add `"type-check": "tsc --noEmit"` script.
- `.gitignore` — remove `next-env.d.ts` so Next.js TypeScript declarations are tracked in git.
- `docs/architecture/DECISIONS.md` — document the CI quality gate workflow and path-filtering convention alongside `e2e.yml`.

## Constraints

- Must not depend on running MySQL databases or external network services.
- Must execute on Node 20 with npm caching enabled.
- Must use `paths-ignore` (not an allowlist) to ensure new source paths default to running CI checks.
- Must not ignore `.eslintrc.json` or `tsconfig.json` in `ci.yml`.
- `next-env.d.ts` must be tracked in version control for standalone `type-check` invocations.

## What NOT to Do

- Do not include Playwright tests or Docker container setup (these remain scoped to `e2e.yml`).
- Do not split into separate jobs requiring 3x runner provisioning and 3x `npm ci` overhead.
- Do not allow `paths-ignore` to omit source code or configuration files.

## Decisions Made

- Use a single sequential runner job (`quality-gate`) with concurrency cancellation to minimize GitHub Actions queue time and runner consumption.
- Gate check steps on `if: steps.install.outcome == 'success'` so all diagnostics run if install succeeds, while aborting cleanly if install fails.
- Track `next-env.d.ts` in git per standard Next.js conventions.
- Add `"type-check": "tsc --noEmit"` to `package.json`.
