---
title: Release-Branch Deployment Workflow
type: feature
date: 2026-07-06
status: implemented
area: release
adr: [0015, 0026, 0039]
---

# Release-Branch Deployment Workflow

> The canonical, current release process lives in [`docs/workflow/release.md`](../workflow/release.md) and [`docs/architecture/decisions/release.md`](../architecture/decisions/release.md) (both rewritten in #496). This plan is the historical record of how that workflow was built and evolved.

## Summary

A versioned release-branch workflow between `main`, `stg`, and `prod`. Since #496 it is driven by **one `/release` skill** that routes on its first argument (`<bump>` = full orchestration | `cut <bump>` | `promote` | `sync`). Hostinger auto-deploys on any push to `stg` or `prod`.

```
main ──PR──▶ stg              (direct, any time — protect-stg.yml gates head == "main" exactly; ADR 0039)
main
  └─ /release cut <major|minor|patch>
       → release/x.y.z branched, version bumped, tagged, pushed
       → vX.Y.Z milestone: status:to-be-released issues attached, closed
       → GitHub Release created (issue list + any DB-change flags in the body)
            └─ /release promote
                 → PR: release/x.y.z → prod   (protect-prod.yml gates release/* only — no exceptions, ADR 0015)
                 → merge on GitHub → Hostinger prod auto-deploys → issues → status:done
                      └─ /release sync
                           → PR: prod → main
```

## Decision Tree — DB-change flags (in the cut-release notes)

`/release cut` diffs the previous `vX.Y.Z` tag → the new `release/x.y.z` branch (everything merged since the last release; skipped silently if there is no previous tag) and appends a **non-blocking** `## Manual Action Required` section to the GitHub Release body + the `main → stg` PR body, and restates it in the chat report:

| Path touched | Flag | Wording |
|---|---|---|
| `prisma/quran/schema.prisma` | Quran DB | "Quran DB schema changed — re-seed prod manually (`npm run seed:quran -- --force`) if this release should reflect it." |
| `scripts/quran-seed/**` | Quran DB | "Quran seed logic/data changed — re-seed prod manually if you want this release's data live." |
| `prisma/app/migrations/**` (new/changed) | App DB | "New Prisma migration(s) — auto-apply via `prisma migrate deploy` on deploy. No action needed; consider backing up the App DB first." |
| anything else | — | no flag |

The Quran DB has no automatic migration path (`split-quran-app-databases.md` — `prisma/migrations` is not used for the Quran schema; it is re-synced destructively via `seed:quran -- --force`), so a schema/seed change on `main` does not reach prod until someone re-runs that manually. The App DB auto-applies migrations on deploy. Both Quran-DB triggers share one category/urgency — deliberately not split.

## Verified Test Cases

- Only `prisma/quran/schema.prisma` changed → Quran DB flag.
- Only `scripts/quran-seed/derive.js` changed → Quran DB flag (same wording).
- Only a new `prisma/app/migrations/*/migration.sql` → App DB flag (FYI wording).
- Only `app/components/*` → no flag, no `## Manual Action Required` section.
- Both a Quran schema change and a new App migration → both bullets appear in both PR bodies and the chat report.

## Files to Change

- `.claude/skills/release/SKILL.md` — the single skill (routes `<bump>` | `cut <bump>` | `promote` | `sync`).
- `.github/workflows/protect-prod.yml` — gate `release/*` only (drops the `main` exception, ADR 0015).
- `.github/workflows/protect-stg.yml` — gate `head_ref == "main"` exactly, not `release/*` (ADR 0039).
- `.github/workflows/cut-release.yml` — the `main → stg` PR body renders the `status:to-be-released` issue list + the DB-change flags (same manifest as the Release notes / prod PR body).
- `docs/workflow/release.md`, `docs/architecture/decisions/release.md`, `docs/architecture/adr/0015-release-branch-workflow.md`, `adr/0026-staging-environment.md`, `adr/0039-stg-tracks-main-directly.md` — the canonical process.
- `docs/deployment/hostinger.md` — Hostinger auto-deploys on push to `stg` / `prod`.

## Constraints

- Every prod update goes through a `release/*` branch — no direct `main → prod`, including hotfixes (ADR 0015). `protect-prod.yml` is never loosened.
- `stg` accepts a PR from `main` **only** — not `release/*`, not any feature branch (ADR 0039). A deliberate narrowing.
- `/release cut` requires an explicit bump type — never inferred from commits. Version source of truth = `package.json` `"version"` + matching `vX.Y.Z` git tag; no second version file.
- The vX.Y.Z milestone + GitHub Release is the one release manifest, rendered into both the `main → stg` and `release → prod` PR bodies. Valid under the one-release-in-flight assumption.
- DB-change flagging is non-blocking, always — no checkpoint, no acknowledgment. Detection is file-path-based only.
- The `/release` skill only creates branches/tags/PRs — it never merges a PR.
- No AI signatures in any commit/PR from the skill.

## What NOT to Do

- Do not loosen `protect-prod.yml` — the release-only gate stands for hotfixes too.
- Do not accept `release/*` into `stg` alongside `main` — `stg` is `main`-only (ADR 0039), not "`main` in addition to `release/*`".
- Do not block or pause the release flow for a DB-change flag — reminder-only.
- Do not attempt to detect generic/non-DB breaking changes (API contract changes, removed routes) via heuristics — left to PR review.
- Do not split Quran DB schema-change and seed-logic-change into different flag categories.
- Do not re-split the `/release` skill back into `/cut-release` / `/promote-release` / `/promote-to-staging` / `/sync-main-from-prod` (#496 consolidated them).
- Do not add a version argument to the staging step — a `main → stg` PR is not tied to one release version.

## Decisions Made

- Release scope = whatever carries `status:to-be-released` at cut time.
- Version bump is manual per cut — keeps semver intentional.
- `/release` verifies each PR merge via `gh pr view` — merging happens outside chat.
- Hostinger auto-deploys on push to `stg` / `prod` — no checkpoint needed there.
- `stg` tracks `main` directly (ADR 0039), reversing Addendum 1's `release/* → stg` requirement — staging can be refreshed any time without cutting a release; `prod` still requires `release/*` (ADR 0015).
- DB-change flags are surfaced non-blockingly in the release notes and PR bodies (Addendum 2).
- The four release skills were consolidated into one `/release` skill (#496); Trello labelling was replaced by the GitHub `status:to-be-released` label + vX.Y.Z milestone (Trello → GitHub issues migration).

## Revision History

- 2026-07-17 — folded Addendum 1 "Staging environment" (Trello #117, [ADR 0026](../architecture/adr/0026-staging-environment.md)): added a `stg` branch + second Hostinger site between `release/x.y.z` and `prod`, superseding ADR 0015's original "no staging environment" call. `/release`'s Checkpoint 1 moved from local `npm run build && npm start` to merging the staging PR and confirming staging.
- 2026-07-17 — folded Addendum 2 "DB change flags in release notes" (Trello #118): `/release cut` detects Quran-DB / App-DB changes since the previous tag and surfaces them non-blockingly in the Release body and chat report.
- 2026-08-12 — folded Addendum 3 "`stg` decoupled from release branches" ([ADR 0039](../architecture/adr/0039-stg-tracks-main-directly.md)). **Supersedes part of Addendum 1** — `protect-stg.yml` now accepts a PR from `main` only, not `release/*`; staging is refreshed by merging `main → stg` at any time. `/promote-to-staging` dropped its `<version>` argument. `prod` untouched (ADR 0015).
- 2026-09-02 (#496) — folded the release-skill consolidation: `/cut-release`, `/promote-release`, `/promote-to-staging`, `/sync-main-from-prod` became one `/release` skill routing on its first argument; the `main → stg` PR body now carries the release manifest (issue list + DB notes). Combined with the Trello → GitHub issues migration, all Trello card handling became `status:to-be-released` label + vX.Y.Z milestone handling. The canonical process moved to `docs/workflow/release.md` + `decisions/release.md`.
