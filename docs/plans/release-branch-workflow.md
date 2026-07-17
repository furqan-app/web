# Release-Branch Deployment Workflow

**Type:** feature  
**Date:** 2026-07-06  
**Status:** implemented

## Summary

Versioned release-branch workflow between `main` and `prod`. Three skills do the mechanical work: `/cut-release` (branch + version + Trello), `/promote-release` (release → prod PR), `/sync-main-from-prod` (prod → main PR). `/release` orchestrates all three and pauses only at genuine human gates. Hostinger auto-deploys on any push to `prod` — no manual redeploy click needed.

See [ADR 0015](../architecture/adr/0015-release-branch-workflow.md). Trello: [#55](https://trello.com/c/mkBlfwiW/55-create-deployment-workflow).

## Branch Flow

```
main
  └─ /cut-release <major|minor|patch>
       → release/x.y.z branched, version bumped, tagged, pushed
       → Trello: "To Be Released" cards labeled vX.Y.Z, moved to Done
            └─ manual local testing: npm run build && npm start
                 └─ /promote-release <version>
                      → PR: release/x.y.z → prod
                      → (merge on GitHub → Hostinger auto-deploys)
                           └─ /sync-main-from-prod
                                → PR: prod → main
```

## Skill Specs

### `/cut-release <major|minor|patch>`

1. `git fetch origin`; require clean working tree.
2. `git checkout main && git pull` (fast-forward only).
3. Read `version` from `package.json`; compute new version per bump type.
4. `git checkout -b release/<new-version>`.
5. Edit `package.json` `"version"`, commit (`chore(release): bump version to <new-version>`, no AI signature).
6. `git tag v<new-version>`.
7. `git push -u origin release/<new-version>` and `git push origin v<new-version>`.
8. Trello: get "To Be Released" cards; apply new label `v<new-version>` (create if absent — one label per version, never reuse); move cards to Done.
9. `gh release create v<new-version>` with body listing those Trello cards (title + URL) — not `--generate-notes`.
10. Report branch name, tag, GitHub Release URL, cards labeled/moved.

### `/promote-release <version>`

1. Verify `release/<version>` exists on `origin`.
2. `gh pr create --base prod --head release/<version>` titled `Release v<version>`, body linking Trello cards carrying that version label.
3. Report PR URL. Remind user: merging triggers Hostinger auto-deploy (no manual step needed).

### `/sync-main-from-prod`

1. `git fetch origin`.
2. `gh pr create --base main --head prod` titled `Sync main with prod (v<version>)`, where version comes from `git describe --tags origin/prod`.
3. Report PR URL. Merging and resolving conflicts is manual.

### `/release <major|minor|patch>` — orchestrator

Runs the three skills in sequence. Never asks "should I continue?" between mechanical steps — only pauses at genuine human gates.

1. **Run `/cut-release <bump>`** in full.
2. **Checkpoint 1 — testing.** Ask user to run `npm run build && npm start` against the release branch and confirm pass.
3. **Run `/promote-release <version>`** — opens `release/x.y.z → prod` PR.
4. **Checkpoint 2 — prod merge.** Tell user the PR is open; re-check via `gh pr view <number> --json state -q .state` and only proceed once it reports `MERGED`.
5. **Run `/sync-main-from-prod`** — opens `prod → main` PR.
6. **Checkpoint 3 — final merge.** Poll `gh pr view` the same way. Once merged, report release complete.

If any step fails, stop and report — do not silently retry.

## Files Changed

- `.claude/skills/cut-release/SKILL.md`, `promote-release/SKILL.md`, `sync-main-from-prod/SKILL.md`, `release/SKILL.md`
- `.github/workflows/protect-prod.yml` — gate `release/*`, not `main` (drops `main` exception entirely per ADR 0015)
- Trello board: add "To Be Released" list manually (once)
- `docs/architecture/DECISIONS.md` / `adr/0015-release-branch-workflow.md`
- `docs/deployment/hostinger.md` — Phase 4 updated: Hostinger auto-deploys on push to `prod`, no manual redeploy click

## Constraints

- No staging environment — testing is local only.
- Every prod update must go through a `release/*` branch — no direct `main → prod` path, including hotfixes (ADR 0015).
- `/cut-release` requires explicit bump type argument — never inferred from commits.
- Version source of truth: `package.json` `"version"` + matching `vX.Y.Z` git tag. No second version file.
- Trello label per release is a new label per version — never recolor/rename an old one.
- GitHub Release body sources from Trello cards, not `--generate-notes`.
- No AI signatures in any commit/PR from these skills.
- These skills only create branches/tags/PRs — never merge a PR.

## Decisions Made

- Release scope = whatever's in "To Be Released" at cut time (not curated against card branches).
- Version bump is manual per cut — keeps semver meaning intentional.
- Trello card drag to "To Be Released" is manual (on PR merge to main); `/cut-release` only stamps the label and advances to Done.
- `/release` verifies prod PR merge via `gh pr view` — merging happens outside chat, independent check is cheap.
- Hostinger auto-deploys on push to `prod` — no checkpoint needed.

## Addendum 1 — Staging environment (2026-07-17)

**Type:** feature
**Trello:** [#117](https://trello.com/c/Sfgsjg1V/117-integrate-staging-environment-into-release-flow)

### Summary

Adds a staging deploy stage between `release/x.y.z` and `prod`, superseding ADR 0015's "no staging environment" call (see [ADR 0026](../architecture/adr/0026-staging-environment.md)). A second Hostinger site (already provisioned by the user, with its own fresh Quran/App databases) tracks a `stg` branch. A new `/promote-to-staging` skill opens the `release/x.y.z → stg` PR; `/release`'s Checkpoint 1 changes from local `npm run build && npm start` testing to merging that PR and confirming staging looks right.

### Updated Branch Flow

```
main
  └─ /cut-release <major|minor|patch>
       → release/x.y.z branched, version bumped, tagged, pushed
       → Trello: "To Be Released" cards labeled vX.Y.Z, moved to Done
            └─ /promote-to-staging <version>
                 → PR: release/x.y.z → stg
                 → (merge on GitHub → Hostinger stg site auto-deploys)
                      → manual staging verification
                           └─ /promote-release <version>
                                → PR: release/x.y.z → prod
                                → (merge on GitHub → Hostinger prod auto-deploys)
                                     └─ /sync-main-from-prod
                                          → PR: prod → main
```

### New Skill Spec: `/promote-to-staging <version>`

Mirrors `/promote-release`'s structure exactly, targeting `stg` instead of `prod`:

1. Verify `release/<version>` exists on `origin`.
2. `gh pr create --base stg --head release/<version>` titled `Staging v<version>`, body linking Trello cards carrying that version label.
3. Report PR URL. Remind user: merging triggers Hostinger's staging site auto-deploy (no manual step needed).

### `/release` orchestrator — updated steps

1. **Run `/cut-release <bump>`** in full.
2. **Run `/promote-to-staging <version>`** — opens `release/x.y.z → stg` PR. No pause before this — mechanical.
3. **Checkpoint 1 — staging.** Tell user the PR is open. Ask them to merge it on GitHub and confirm the deployed staging site looks right. Verify the merge via `gh pr view <number> --json state -q .state`, the same pattern as the other checkpoints — do not trust a bare "done" for the merge state, but the "looks right" judgment itself is the user's call.
4. **Run `/promote-release <version>`** — opens `release/x.y.z → prod` PR. Proceed immediately once Checkpoint 1 clears.
5. **Checkpoint 2 — prod merge.** Same as before (unchanged).
6. **Run `/sync-main-from-prod`** — unchanged.
7. **Checkpoint 3 — final merge.** Unchanged.

### Decision Tree — why these choices

| Question | Decision | Why |
|---|---|---|
| Staging host | Second Hostinger site (not Vercel) | Vercel is a different runtime/platform and can't directly reach Hostinger's MySQL — it wouldn't catch the Hostinger-specific issues (env vars, real DB, managed Node runtime) that are the actual reason for staging. |
| Staging DB | Fresh, independent DBs (not a prod snapshot) | Goal is catching platform/env issues, not QA against realistic data volume. Copying real user data (auth tokens, marks/bookmarks) into a lower-security environment is an unnecessary privacy risk. |
| `release → stg` merge mechanism | Reviewed PR (like `release → prod`), not a direct push | Keeps all three promotion steps structurally identical (no special-cased skill), and leaves an audit trail of when staging was refreshed, even though there's typically no new code to review at that point. |
| Skill structure | New `/promote-to-staging` skill (not folded into `/cut-release`) | Keeps `/cut-release` focused on its current job (branch + version + Trello); matches the existing pattern of one skill per promotion step. |
| Branch protection | New `protect-stg.yml`, mirroring `protect-prod.yml` | Restricts PRs into `stg` to `release/*` sources only, preventing accidental pushes from feature branches. |
| `/release` merge count | 3 manual merges per release (stg, prod, main-sync), up from 2 | Chose consistency (all three promotion PRs behave identically, verified via `gh pr view`) over shaving one click by auto-merging the stg PR. |

### Files to Change

- New skill: `.claude/skills/promote-to-staging/SKILL.md`
- `.claude/skills/release/SKILL.md` — insert the staging step + Checkpoint 1 replacement above
- New workflow: `.github/workflows/protect-stg.yml` — copy of `protect-prod.yml` targeting `stg`
- `docs/architecture/DECISIONS.md` — Release & Deployment Workflow section updated (done in this addendum's commit)
- `docs/architecture/adr/0015-release-branch-workflow.md` — status updated to partially superseded
- New ADR: `docs/architecture/adr/0026-staging-environment.md`

### Constraints (supersedes the old "No staging environment" constraint)

- `stg` has its own fresh `furqan_quran`/`furqan_app` databases — never a snapshot of prod.
- `protect-stg.yml` restricts PRs into `stg` to `release/*` branches, same as `protect-prod.yml` does for `prod`.
- The `release → stg` merge is a reviewed PR, not a direct/fast-forward push.
- `/promote-to-staging` only creates the PR — never merges it, consistent with the existing "these skills only create branches/tags/PRs" constraint.
- The Hostinger site, staging databases, and subdomain for `stg` are already provisioned (user-managed, outside this plan's scope) — no new deployment runbook needed.

### What NOT to Do

- Do not auto-merge the `release → stg` PR inside `/promote-to-staging` — considered and rejected in favor of consistency with the other two promotion checkpoints.
- Do not use a prod data snapshot for staging's databases — rejected for privacy/security reasons.
- Do not route staging through Vercel or any non-Hostinger platform — rejected because it wouldn't validate the Hostinger-specific behavior staging exists to catch.
- Do not fold the `release → stg` PR into `/cut-release` — keep it a separate skill.
- Do not write a new Hostinger staging runbook doc — the user has already provisioned the site/DBs manually.

## Addendum 2 — DB change flags in release notes (2026-07-17)

**Type:** feature
**Trello:** [#118](https://trello.com/c/tvAO937e/118-flag-quran-app-db-manual-actions-in-release-notes)

### Summary

`/cut-release` now detects Quran DB and App DB changes since the previous release tag and surfaces them **non-blockingly**: a `## Manual Action Required` section is appended to the GitHub Release notes it already creates, and the same content is called out in its chat report. This is a reminder mechanism only — it never pauses the flow or requires acknowledgment, unlike the `/release` orchestrator's PR-merge checkpoints.

This exists because the Quran DB has **no automatic migration path** — per `docs/plans/split-quran-app-databases.md`'s constraint, `prisma/migrations` is explicitly not used for the Quran schema; it's fully re-synced via the destructive `npm run seed:quran -- --force` (`prisma db push --force-reset`). A schema or seed-logic change merged to `main` does **not** take effect in prod until someone remembers to re-run that manually. The App DB, by contrast, already auto-applies migrations safely via `prisma migrate deploy` on every deploy (`docs/deployment/hostinger.md`) — no action is required there, but a heads-up is still useful.

### Decision Tree — detection rules

Diff range: previous `vX.Y.Z` tag → the new `release/x.y.z` branch (catches everything merged since the last release, not just the latest commit). If no previous release tag exists (first-ever release), skip the check entirely.

| Path touched in the diff | Flag | Notes wording |
|---|---|---|
| `prisma/quran/schema.prisma` | Quran DB | "Quran DB schema changed — re-seed prod manually (`npm run seed:quran -- --force`) if this release should reflect it." |
| `scripts/quran-seed/**` (any file) | Quran DB | "Quran seed logic/data changed — re-seed prod manually if you want this release's data live." |
| `prisma/app/migrations/**` (new or changed files) | App DB | "New Prisma migration(s) — will auto-apply via `prisma migrate deploy` on deploy. No action needed; consider backing up the App DB first." |
| Anything else | — | No flag |

Both Quran-DB triggers (schema and seed-logic) share the same category and urgency — deliberately not split further, since either one requires the same manual decision (re-seed or don't) and splitting them added complexity without changing what the release-cutter actually needs to do.

### Verified Test Cases

- **A** — only `prisma/quran/schema.prisma` changed → Quran DB flag.
- **B** — only `scripts/quran-seed/derive.js` changed, no schema touched → Quran DB flag (same category/wording as A).
- **C** — only a new `prisma/app/migrations/*/migration.sql` file → App DB flag (FYI wording).
- **D** — only `app/components/*` changed → no flag, no `## Manual Action Required` section, nothing extra in the chat report.
- **E** — both A and C in the same release → both sections appear in the release notes and both are called out in the chat report.

### `/cut-release` — updated steps

New step inserted after Trello labeling (existing step 8) and before `gh release create` (existing step 9):

1. Find the previous release tag: the most recent `v*` tag reachable from `main` before the new one. If none exists, skip this step entirely (no error).
2. `git diff --name-only <previous-tag>..release/<new-version>` — check the returned paths against the table above.
3. If any flags fire, build a `## Manual Action Required` section (one bullet per flag, using the wording above, listing the specific files that triggered it).
4. Pass that section into the `gh release create` body (existing step 9), appended after the Trello cards list.
5. In the final report (existing step 10), explicitly restate any flags that fired — this is the "notify me so I don't forget" part; if no flags fired, say nothing extra.

### Files to Change

- `.claude/skills/cut-release/SKILL.md` — insert the new detection step (between Trello labeling and GitHub Release creation) and update the final report step to restate flags
- `docs/architecture/DECISIONS.md` — Release & Deployment Workflow section gets a line documenting this behavior

### Constraints

- Non-blocking, always — no checkpoint, no pause, no required acknowledgment, regardless of what's flagged.
- Detection is file-path-based only — no attempt to detect generic "breaking changes" in application code; that's explicitly out of scope (see What NOT to Do).
- Diff range is always "since the previous release tag," not "since the last commit" — a release can bundle several merges to `main`.
- If no previous release tag exists, skip silently rather than erroring — must not block a first-ever release.

### What NOT to Do

- Do not block or pause the release flow for any flag — this was explicitly decided against after initially considering it; the mechanism is reminder-only.
- Do not attempt to detect generic/non-DB breaking changes (API contract changes, removed routes, etc.) via heuristics or a manual prompt — considered and explicitly ruled out; left to PR review and the release-cutter's own judgment.
- Do not split Quran DB schema-changes and seed-logic-changes into different categories or wording — they share the same "you may need to re-seed" action, so treat them identically.
- Do not add this detection to `/release` or any other skill — it lives entirely inside `/cut-release`, since that's what already builds the GitHub Release body and has the version/tag context.
