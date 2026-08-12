# Release Workflow

Covers the full release lifecycle: cutting a release branch, promoting to staging, promoting to production, and syncing main afterwards. See also `docs/plans/release-branch-workflow.md`, ADR 0015, and ADR 0026.

---

## Full Release Orchestration (`/release <bump>`)

Orchestrates cut → staging → prod → sync as one continuous flow. Only stops at the three checkpoints below where the flow genuinely cannot proceed without the user acting outside the chat.

**Never pause between purely mechanical steps.** Only the three checkpoints below warrant a pause.

### Precondition

A bump type (`major`, `minor`, or `patch`) must be given. If missing, ask for it once, then proceed through the whole flow without asking again except at the checkpoints.

### Steps

1. **Run Cut Release in full** (see below). Its own preconditions (clean tree, on main) apply as normal. Do not pause before or after this step.

2. **Run Promote to Staging** (see below). Opens the `main → stg` PR. Proceed straight to Checkpoint 1 — no pause before this step.

3. **Checkpoint 1 — staging.** Tell the user the PR is open and ask them to merge it on GitHub. Hostinger auto-deploys the staging site on any push to `stg` — no manual redeploy click is needed. Do not trust a bare "done": verify via `gh pr view <number> --json state -q .state` and only continue once it reports `MERGED`. Once merged, ask the user to verify the deployed staging site looks right — wait for their explicit confirmation before continuing.

4. **Run Promote Release** (see below). Opens the `release/x.y.z → prod` PR. Proceed immediately once staging is confirmed.

5. **Checkpoint 2 — prod PR merged.** Tell the user the PR is open and ask them to merge it on GitHub. Do not trust a bare "done": verify via `gh pr view <number> --json state -q .state` and only continue once it reports `MERGED`. If the user says they merged it but the check disagrees, keep waiting.

6. **Run Sync Main from Prod** (see below). Opens the `prod → main` PR. Proceed immediately once the prod PR is confirmed merged.

7. **Checkpoint 3 — final merge.** Tell the user the sync PR is open and ask them to merge it (resolving any conflicts if needed). Verify via `gh pr view` the same way as Checkpoint 2. Once merged, report the release complete.

### Failure handling

If any git/gh step fails partway, stop immediately and report the failure plainly. Do not silently retry with a different approach or guess at a recovery — that decision belongs to the user.

### What NOT to do

- Do not ask "should I continue?" between mechanical steps — only the three checkpoints warrant a pause.
- Do not merge any PR yourself.
- Do not skip Checkpoint 1 or treat a merged stg PR alone as sufficient — the user must also confirm staging looks right.
- Do not skip Checkpoint 3.
- Do not trust the user's word over `gh`'s reported state for any PR-merge checkpoint — always re-verify.

---

## Cut Release (`/cut-release <bump>`)

Branches a new `release/x.y.z` off `main`, bumps and tags the version, stamps the release tracking system, and flags any DB changes that may need manual action.

### Precondition

- A bump type (`major`, `minor`, or `patch`) must be given. If missing, ask — do not guess or default.
- `git status` must be clean. If not, stop and tell the user to commit/stash first.

### Steps

1. `git fetch origin`.
2. `git checkout main && git pull` (fast-forward only).
3. Read `"version"` from `package.json`. Compute the new version by applying the given bump type (semver: major resets minor+patch to 0, minor resets patch to 0, patch increments only the patch number).
4. `git checkout -b release/<new-version>`.
5. Edit `package.json`'s `"version"` field to `<new-version>`. Run `npm install --package-lock-only` so `package-lock.json`'s top-level `version` field stays in sync (do not run a full `npm install`). Stage both files and commit: `chore(release): bump version to <new-version>`. No AI signature.
6. `git tag v<new-version>`.
7. `git push -u origin release/<new-version>` then `git push origin v<new-version>`.
8. **Update your release tracking system** — mark all tasks included in this release as released (labeled with `v<new-version>` and moved to Done). If your system has an equivalent of Trello's "To Be Released" list, pull tasks from there. If the list is empty, continue anyway — an empty release is still valid.
9. **Detect DB changes needing manual action** (non-blocking — this only builds content for steps 10 and 11, never pauses):
   - Find the previous release tag: `git tag --list 'v*' --sort=-v:refname` on `origin`, take the first entry that isn't `v<new-version>`. Sort by semver. If no prior tag exists (first release), skip this step.
   - `git diff --name-only <previous-tag>..release/<new-version>` and check against:

   | Path touched | Flag | Notes wording |
   |---|---|---|
   | `prisma/quran/schema.prisma` | Quran DB | "Quran DB schema changed — re-seed prod manually (`npm run seed:quran -- --force`) if this release should reflect it." |
   | `scripts/quran-seed/**` (any file) | Quran DB | "Quran seed logic/data changed — re-seed prod manually if you want this release's data live." |
   | `prisma/app/migrations/**` (new or changed files) | App DB | "New Prisma migration(s) — will auto-apply via `prisma migrate deploy` on deploy. No action needed; consider backing up the App DB first." |

   If any flags fire, build a `## Manual Action Required` section for step 10 and surface it in the final report.
10. Create the GitHub Release: `gh release create v<new-version> --title "v<new-version>" --notes "<body>"`, where the body is a "What's included" heading, one bullet per task in this release, and the `## Manual Action Required` section if one was built.
11. Report: new version, branch name, tag, GitHub Release URL, tasks labeled/moved. Restate the `## Manual Action Required` section prominently if one was built.

### What NOT to do

- Do not infer the bump type from commit history — it must be given explicitly.
- Do not cut from any branch other than `main`.
- Do not push to `prod` or open any PR — that's Promote Release's job.
- Do not pause for a flagged DB change (step 9) — it's a reminder, never a checkpoint.
- Do not detect generic breaking changes (API contract changes, removed routes, etc.) — only the specific DB paths in step 9's table are checked.

---

## Promote to Staging (`/promote-to-staging`)

Opens the `main → stg` PR so whatever's currently on `main` can be verified on staging. Not tied to a release version — `stg` tracks `main` directly and no longer accepts `release/*` branches (ADR 0039).

### Precondition

None — `main` always exists, no version argument needed.

### Steps

1. `git fetch origin`.
2. `git log origin/stg..origin/main --oneline` to summarize what's new since `stg`'s last merge, for the PR body.
3. `gh pr create --base stg --head main --title "Staging update"` with a body listing the commits/PRs found above.
4. Report the PR URL. Tell the user:
   - The `check-source` gate on `stg` requires this PR's head branch to be exactly `main` — it will pass automatically.
   - Merge the PR on GitHub. Hostinger auto-deploys on any push to `stg` — no manual redeploy needed.

### What NOT to do

- Do not merge the PR — only open it.
- Do not ask for or use a version argument — this skill no longer takes one.

---

## Promote Release (`/promote-release <version>`)

Opens the `release/<version>` → `prod` PR once staging verification has passed.

### Precondition

- A version must be given (e.g. `1.3.0`). If missing, ask for it.
- `release/<version>` must exist on `origin`. If not, stop — run Cut Release first.

### Steps

1. `git fetch origin`; confirm `origin/release/<version>` exists.
2. Best-effort: look up tasks carrying the `v<version>` label in your tracking system to reference in the PR body.
3. `gh pr create --base prod --head release/<version> --title "Release v<version>"` with a body summarizing the release (linking tasks found above, if any).
4. Report the PR URL. Tell the user:
   - The `check-source` gate on `prod` requires this PR's head branch to start with `release/` — it will pass automatically.
   - Merge the PR on GitHub. Hostinger auto-deploys on any push to `prod` — no manual redeploy needed.

### What NOT to do

- Do not merge the PR — only open it.
- Do not touch the release tracking system — that already happened in Cut Release.

---

## Sync Main from Prod (`/sync-main-from-prod`)

Opens the `prod` → `main` PR after a release, so any fixes made on the release branch during stabilization make it back into `main`.

### Steps

1. `git fetch origin`.
2. Determine the version for the PR title: `git describe --tags origin/prod` (latest tag reachable from `prod`).
3. `gh pr create --base main --head prod --title "Sync main with prod (v<version>)"` with a body noting this brings release-stabilization fixes back into `main`.
4. Report the PR URL. Tell the user: merging and resolving any conflicts is a manual step from here.

### What NOT to do

- Do not merge the PR — only open it.
- Do not attempt to auto-resolve merge conflicts — flag them and let the user handle it.
