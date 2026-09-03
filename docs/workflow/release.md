# Release Workflow

Release mechanics run as GitHub Actions (`workflow_dispatch`), not agent-executed git/gh steps. The agent's job: trigger the right workflow, poll it to completion, relay the result. See ADR 0015 (+ its 2026-08-21 addendum), ADR 0026, ADR 0039, ADR 0058, and `docs/architecture/decisions/release.md`.

One skill, `/release`, routes on its first argument:

| `/release …` | Runs | Section |
|---|---|---|
| `major` \| `minor` \| `patch` | Full flow: cut → staging checkpoint → promote → sync → final-merge checkpoint | [Full Release Orchestration](#full-release-orchestration-release-bump) |
| `cut major` \| `cut minor` \| `cut patch` | `cut-release.yml` only | [Cut Release](#cut-release-release-cut-bump) |
| `promote` | `promote-release.yml` only | [Promote Release](#promote-release-release-promote) |
| `sync` | `sync-main-from-prod.yml` only | [Sync Main from Prod](#sync-main-from-prod-release-sync) |

Empty or unrecognized first arg → ask which subcommand (and the bump, for `cut` or the full flow). Never guess or default a bump.

## The release manifest

The `vX.Y.Z` GitHub milestone + GitHub Release is the single record of what a release contains. `cut-release.yml` builds it from the open `status:to-be-released` issues and renders it into **both** the GitHub Release notes and the `main → stg` PR body; `promote-release.yml` re-reads it from the milestone and renders it into the `release/x.y.z → prod` PR body. This is correct only while **one release is in flight at a time** — cut → promote → sync must finish before the next cut (ADR 0058).

---

## Full Release Orchestration (`/release <bump>`)

Orchestrates cut → stg → prod → sync as one continuous flow, pausing only at the two checkpoints below.

### Precondition

A bump type (`major`, `minor`, or `patch`) must be given. If missing, ask once, then run the whole flow without asking again except at the checkpoints. Do not start if a previous release has not yet reached `prod` (check for an unpromoted `release/*` branch).

### Steps

1. **Trigger Cut Release** (see below). Poll to completion. This also opens and auto-merges the `main → stg` PR — do not pause before or after.
2. **Checkpoint 1 — staging.** Tell the user staging has deployed and ask them to look at the site and confirm it's good. Wait for explicit confirmation — this judgment call is the user's, not inferable from `gh`.
3. **Trigger Promote Release** (see below). Poll to completion. It auto-detects the version and auto-merges the prod PR — no pause needed once it reports success.
4. **Trigger Sync Main from Prod** (see below). Poll to completion — it only opens the PR.
5. **Checkpoint 2 — final merge.** Tell the user the sync PR is open and ask them to merge it (resolving conflicts if needed) on GitHub — this one is never auto-merged. Verify via `gh pr view <url> --json state -q .state` reporting `MERGED`; do not trust a bare "done" from the user. Once merged, report the release complete.

### Failure handling

If any workflow run fails, stop immediately and report the failure (link the run) plainly. Do not retry with a different approach or guess at a recovery.

### What NOT to do

- Do not ask "should I continue?" between the workflow triggers — only the two checkpoints warrant a pause.
- Do not merge the sync PR yourself.
- Do not skip Checkpoint 1 or treat "workflow succeeded" as equivalent to "staging looks right."
- Do not trust the user's word over `gh`'s reported state for the Checkpoint 2 merge.

---

## Cut Release (`/release cut <bump>`)

Triggers the `cut-release.yml` GitHub Action, which does everything in one run: branches `release/x.y.z` off `main`, bumps and tags the version, milestones the open `status:to-be-released` issues to `vX.Y.Z`, flags DB changes needing manual action, creates the GitHub Release, and opens+auto-merges the `main → stg` PR with the same issue list in its body.

### Precondition

- A bump type (`major`, `minor`, or `patch`) must be given. If missing, ask — do not guess or default.
- No other release in flight — do not cut while an earlier `release/*` branch has not reached `prod`. The stg changelog and `promote-release.yml`'s branch selection both assume one at a time.
- A clean local working tree is not required — the workflow runs on GitHub's own checkout of `main`.

### Steps

1. `gh workflow run cut-release.yml -f bump=<bump> --repo furqan-app/web`.
2. Poll: `gh run list --workflow=cut-release.yml --repo furqan-app/web --limit 1 --json databaseId,status,conclusion`. Wait until `status` is `completed`.
3. If `conclusion` is not `success`, stop and report the failure with `gh run view <id> --repo furqan-app/web --log-failed`.
4. On success, read the job summary (`gh run view <id> --repo furqan-app/web`) and report: new version, release branch, tag, GitHub Release URL, and the "Manual action required" section verbatim if non-empty.

### What NOT to do

- Do not infer the bump type from commit history — it must be given explicitly.
- Do not run the git/gh steps yourself — the workflow does them all. Your job is trigger + poll + relay.
- Do not pause for a flagged DB change — it's a reminder, surfaced in the report, never a checkpoint.

---

## Promote Release (`/release promote`)

Triggers the `promote-release.yml` GitHub Action, which auto-detects the highest-semver `release/*` branch not yet merged into `prod`, opens the `release/x.y.z → prod` PR (milestone issue list in its body), auto-merges it, then marks those issues `status:done` and closes them.

### Precondition

None — no version argument needed, the workflow finds it.

### Steps

1. `gh workflow run promote-release.yml --repo furqan-app/web`.
2. Poll `gh run list --workflow=promote-release.yml --repo furqan-app/web --limit 1 --json databaseId,status,conclusion` until `completed`.
3. If `conclusion` is not `success` (e.g. no unpromoted release branch), stop and report the failure.
4. On success, report the version promoted and the PR URL from the run summary.

### What NOT to do

- Do not ask for or accept a version argument — the workflow determines it.
- Do not merge anything yourself — the workflow auto-merges once its required check passes.

---

## Sync Main from Prod (`/release sync`)

Triggers the `sync-main-from-prod.yml` GitHub Action, which opens the `prod → main` PR. This one is never auto-merged — conflicts here need a human.

### Steps

1. `gh workflow run sync-main-from-prod.yml --repo furqan-app/web`.
2. Poll `gh run list --workflow=sync-main-from-prod.yml --repo furqan-app/web --limit 1 --json databaseId,status,conclusion` until `completed`.
3. Report the PR URL from the run summary. Tell the user: merging and resolving any conflicts is a manual step from here.

### What NOT to do

- Do not merge the PR — only trigger the workflow that opens it.
- Do not attempt to auto-resolve merge conflicts — flag them and let the user handle it.
