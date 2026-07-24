# Skip visual e2e on config-only PRs

**Type:** feature
**Date:** 2026-07-24
**Status:** implemented
**Trello:** https://trello.com/c/3T4tbYj4/139-avoid-running-the-pr-pipelines-on-config-changes

## Summary

`visual-e2e.yml` currently runs on every `pull_request` regardless of what changed — spinning up two MySQL containers, installing Playwright, and running the full visual regression suite even for PRs that only touch docs, `.claude/` tooling, or lint/type config. Add a `paths-ignore` filter so the workflow is skipped when every changed file in the PR falls into a known non-UI-affecting set.

`protect-prod.yml` and `protect-stg.yml` are out of scope — they already only trigger on PRs targeting `prod`/`stg`, so they're not part of "PR pipelines running on every config change."

## Approach

Use GitHub Actions' `on.pull_request.paths-ignore`, not an allowlist (`paths:`). Rationale: an allowlist defaults unsafe — any new top-level path added later that actually affects rendered UI would silently never trigger e2e until someone remembers to add it. An ignore-list defaults safe — unrecognized/new paths still run the suite; only a small, explicit set is carved out as "definitely can't affect what's rendered."

## Decision Tree

| Changed path pattern | Affects rendered UI / e2e output? | Skip e2e? |
|---|---|---|
| `docs/**` | No — prose only | Yes |
| `.claude/**` | No — assistant tooling, not shipped | Yes |
| `**/*.md` (README, CLAUDE.md, any markdown) | No | Yes |
| `.mcp.json`, `.mcp.json.example` | No — local MCP config | Yes |
| `furqan-workflow.excalidraw` | No — design doc | Yes |
| `.eslintrc.json` | No — lint-only, never runs at runtime | Yes |
| `tsconfig.json` | No — compile-time types only | Yes |
| `app/`, `components/`, `lib/`, `prisma/` | Yes — rendered output / queried data shape | No |
| `messages/` | Yes — i18n content renders directly | No |
| `i18n/` | Yes — next-intl config affects locale routing | No |
| `middleware.ts` | Yes — routing/auth affects reachable pages | No |
| `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs` | Yes — build/style output | No |
| `package.json`, `package-lock.json` | Yes — dependency bumps can change rendered output | No |
| `e2e/`, `playwright.config.ts`, `scripts/` | Yes — the harness itself | No |
| `compose.e2e.yml`, `.env.e2e` | Yes — feeds `npm run e2e:setup` | No |
| Anything else not listed | Unknown → default to running | No |

If a PR's changed files are a **mix** of ignored and non-ignored paths, GitHub Actions' `paths-ignore` semantics apply: the workflow runs (skip only triggers when *every* changed file matches an ignore pattern).

## Verified Test Cases

- PR only touches `docs/plans/*.md` and `.claude/skills/*.md` → all match ignore patterns → e2e skipped.
- PR touches `.eslintrc.json` only → matches → skipped.
- PR touches `tailwind.config.ts` → does not match any ignore pattern → e2e runs.
- PR touches `docs/plans/foo.md` **and** `app/components/Foo.tsx` → not all changed files match → e2e runs (mixed PRs always run).
- PR touches `.github/workflows/visual-e2e.yml` itself (not in the ignore list) → e2e runs, so workflow-logic changes still get tested.

## Files to Change

- `.github/workflows/visual-e2e.yml` — add `paths-ignore` list under `on.pull_request`.
- `docs/architecture/DECISIONS.md` — short entry documenting the convention, so future additions of new top-level dirs/config remember to reconsider this list.

## Constraints

- Do not use `paths:` (allowlist) — see Approach above for why.
- `.github/workflows/**` is intentionally NOT in the ignore list — workflow-file changes (including edits to this same ignore list) should still run e2e to validate them.

## What NOT to Do

- None known — this is a new, isolated CI-config task with no prior plan to conflict with.

## Decisions Made

- Target only `visual-e2e.yml`; `protect-prod.yml`/`protect-stg.yml` already scoped correctly and are out of scope.
- Use `paths-ignore`, not `paths` allowlist.
- Final ignore list: `docs/**`, `.claude/**`, `**/*.md`, `.mcp.json`, `.mcp.json.example`, `furqan-workflow.excalidraw`, `.eslintrc.json`, `tsconfig.json`.
