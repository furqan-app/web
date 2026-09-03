---
title: "Local E2E runs against a production build, like CI"
type: chore
date: 2026-09-03
status: implemented
area: ci
issue: 524
---

# Local E2E runs against a production build, like CI

## Summary

`npm run e2e:test` locally starts `next dev` as the Playwright web server (the 2026-08-27 "Developer Ergonomics" decision, which chose `next dev` to avoid the 1,208-page `next build`). Measured on this machine, that choice is worse on every axis: `next dev` compiles the data-heavy `/[locale]/pages/[id]` reader route on demand, and running one spec file (`tafsir-sheet.spec.ts`) consumed **~16 GB of RAM and all 2 GB of swap over ~9 minutes**, and still **failed every test** (each `page.goto` exceeds the 60 s timeout waiting for the route to compile). The same spec against a production build (`next build` once, then `next start`) **passed 8/8 in 17 seconds with zero measurable memory growth**. This task reverses that decision: local Playwright uses `npm run e2e:build && npm run e2e:start` — exactly like CI — with `reuseExistingServer` so the build happens once per session and every subsequent run reuses the server. `next dev` is no longer part of the E2E path.

## Root Cause / Approach

**Why `next dev` for E2E is the wrong tool here:** `experimental.cpus: 2` in `next.config.mjs` only caps `next build`; it does nothing for `next dev`'s webpack compilation. Every reader-route navigation triggers an on-demand compile of the largest route in the app, holding the whole module graph plus webpack caches in memory. Playwright can't get a page to load before its 60 s timeout, and the dev server's heap climbs until the host swaps to death. Capping Playwright workers (the #516/#520 mitigation) only reduced the *count* of simultaneous compiles — the per-run memory cost is unchanged.

**Why the build path is fine:** `next build` is bounded (capped at 2 CPU workers, ~4 min, ~3 GB, no swap) and produces a `next start` server that serves pre-rendered pages with a flat, small memory footprint. `reuseExistingServer: !CI` means you build once (`npm run e2e:serve` in its own terminal, or the first `e2e:test` of the session) and every later `e2e:test` attaches to that server instantly.

**Approach (Option A):**

1. **`playwright.config.ts`** — `webServer.command` is `npm run e2e:build && npm run e2e:start -- -p ${PORT}` unconditionally (CI already ran exactly this; drop the `next dev` branch). `reuseExistingServer: !process.env.CI` stays. Local `workers` default returns to 2 (the compile-burst reason for capping is gone; browser-process memory is the only remaining reason, so keep a modest cap, `PLAYWRIGHT_WORKERS` to raise).
2. **`package.json`** — keep `"e2e:serve": "npm run e2e:build && npm run e2e:start"` as the documented "build once, leave it running" helper.
3. **`docs/architecture/decisions/testing.md`** — the "Developer Ergonomics" decision: reverse the "local uses `next dev`" part (dated supersession note with the measurements); keep the `experimental.cpus` cap and the Vitest-first guidance.
4. **Worktree setup (`.claude/skills/start-fq-task/SKILL.md`)** — replace the `ln -s app/generated` step with `npm run postinstall` (runs `prisma generate` for both schemas). The symlink to another worktree's `app/generated` breaks `next build` with `Module not found: @/app/generated/app-client` (surfacing as a misleading `not-found.tsx doesn't have a root layout`); Option A makes every local E2E run do a build, so the worktree must be buildable.
5. **Agent + workflow docs** — `docs/workflow/start-task.md`, `docs/workflow/check-fq-standards.md`, `AGENTS.md`: for any E2E spec, `npm run e2e:serve` once, then `npx playwright test e2e/tests/<spec>.spec.ts --project=desktop`. No more "is this a reader route?" branching. Vitest stays the primary fast loop.

No production/runtime code changes. No new ADR — amends an existing decision entry.

## Decision Tree / Algorithm

| Situation | Command(s) | Server |
|---|---|---|
| Verify logic / component (default loop) | `npm test` | none (Vitest) |
| Verify E2E — first run of the session | `npm run e2e:db:up && npm run e2e:setup` → `npm run e2e:serve` (own terminal) → `npx playwright test e2e/tests/<spec>.spec.ts --project=desktop` | built (`next start`) — one ~4 min build |
| Verify E2E — subsequent runs | `npx playwright test e2e/tests/<spec>.spec.ts --project=desktop` | reuses the running `e2e:serve` server |
| Full suite locally | not supported — CI only | — |
| CI | `npm run e2e:test` (`CI=1`) | `e2e:build && e2e:start` (fresh, `reuseExistingServer` off) |

Preconditions: `compose.e2e.yml` DBs up + `e2e:setup` done; worktree is buildable (`npm run postinstall` has generated `app/generated`).

## Verified Test Cases

Measured on this machine (31 GB RAM, 16 cores, 2 GB swap; ~19 GB free at idle), spec = `e2e/tests/tafsir-sheet.spec.ts --project=desktop`:

| Path | Result | Wall time | RAM consumed by the run | Swap | Peak load |
|---|---|---|---|---|---|
| `next dev` (1 worker) — the old default | **0 / 8 passed** (all `page.goto` timeouts) | ~9 min (killed) | **~16 GB** (19 → 1.6 GB free) | **2 GB (all)** | 3.1 |
| `e2e:build` (one-time) | success | ~4 min | ~3 GB (18 → 15 GB free) | none | 6.8 |
| `e2e:serve` built server — the new default | **8 / 8 passed** | **17 s** | **~0** (18.4 → 19.1 GB free) | none | negligible |

- `CI=1 npm run e2e:test` → unchanged: `e2e:build && e2e:start`, `reuseExistingServer` off, `workers` unconstrained.
- `npm test` → unchanged: Vitest only.
- Fresh worktree without `npm run postinstall` → `next build` fails (`Module not found: @/app/generated/app-client`); after `postinstall`, build succeeds.

## Files to Change

- `playwright.config.ts` — `webServer.command` unconditionally `e2e:build && e2e:start`; local `workers` default `1 → 2` (env-overridable); update the header comment.
- `package.json` — keep `e2e:serve` (`e2e:build && e2e:start`).
- `docs/architecture/decisions/testing.md` — amend "Developer Ergonomics…": dated supersession of the `next dev` part with the measurements; keep CPU cap + Vitest-first.
- `.claude/skills/start-fq-task/SKILL.md` — swap the `ln -s app/generated` step (both occurrences + the explanatory line) for `npm run postinstall`.
- `docs/workflow/start-task.md` & `docs/workflow/check-fq-standards.md` & `AGENTS.md` — E2E guidance: `e2e:serve` once, then targeted spec; drop `next dev` / `--workers=2` phrasing.

## Constraints

- Do not touch `app/` / `components/` runtime code.
- CI path in `playwright.config.ts` and `.github/workflows/e2e.yml` must stay behaviourally identical (it already runs `e2e:build && e2e:start`); only local behaviour changes, and only via the removed `next dev` branch + `reuseExistingServer`.
- `reuseExistingServer: !process.env.CI` must stay — it is what makes "build once, iterate" work and what keeps CI builds fresh.
- `experimental.cpus: 2` in `next.config.mjs` stays (it now guards a build that runs on every local E2E session).
- `e2e:serve` must not run `e2e:setup` / DB bring-up — those stay explicit prerequisites, matching CI's sequencing.
- The "Developer Ergonomics" decision section stays `**Status:** active`; only its `next dev` clause is superseded, with a dated note.

## What NOT to Do

- Do NOT keep a `next dev` fallback for E2E "for quick runs" — measured, it is slower (never completes), heavier (16 GB), and fails the tests. `reuseExistingServer` already gives the fast iterate loop.
- Do NOT add a Playwright `globalSetup` route pre-warmer — irrelevant once the server is a production build.
- Do NOT change `next.config.mjs` `experimental.cpus`, or lower CI worker concurrency, or add local-only branches to `.github/workflows/`.
- Do NOT keep symlinking `app/generated` in worktree setup — generate it (`npm run postinstall`); a symlink to another worktree breaks `next build`.
- Do NOT un-archive `docs/plans/archive/local-build-and-test-ergonomics.md` — reference it; this plan supersedes its `next dev` clause via the decision entry, not by editing the archived plan.

## Decisions Made

- Local Playwright E2E runs against a production build (`e2e:build && e2e:start`), identical to CI; `next dev` is removed from the E2E path.
- `reuseExistingServer` (local only) makes the build a once-per-session cost; `npm run e2e:serve` is the documented way to start it.
- Local Playwright `workers` default returns to 2 (`PLAYWRIGHT_WORKERS` override kept); CI unchanged.
- Worktree setup generates `app/generated` via `npm run postinstall` instead of symlinking it.
- Recorded in `docs/architecture/decisions/testing.md` with a dated supersession note and the measured comparison; no new ADR.
