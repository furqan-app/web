---
name: release
description: Drive the full release process from cut to prod to main-sync in one continuous run, pausing only where human action is genuinely required. Trigger via /release <major|minor|patch>.
---

# /release <major|minor|patch>

Orchestrates `/cut-release` → `/promote-release` → `/sync-main-from-prod` as one continuous flow. See `docs/plans/release-branch-workflow.md` and [ADR 0015](../../../docs/architecture/adr/0015-release-branch-workflow.md).

**Never pause between purely mechanical steps.** Only stop at the four checkpoints below, where the flow genuinely cannot proceed without the user doing something outside this chat. At each checkpoint, state plainly what you're waiting for.

## Precondition

- A bump type (`major`, `minor`, or `patch`) must be given. If missing, ask for it once, then proceed through the whole flow without asking again except at the checkpoints.

## Steps

1. **Run `/cut-release <bump>` in full.** Its own preconditions (clean tree, on main) apply as normal. Do not pause before or after this step — proceed straight to Checkpoint 1.

2. **Checkpoint 1 — local testing.** Report the new release branch and tag. Ask the user to run local testing (`npm run build && npm start` against `release/x.y.z`) and confirm when it has passed. This cannot be verified programmatically — wait for an explicit confirmation before continuing.

3. **Run `/promote-release <version>`.** Opens the `release/x.y.z → prod` PR. Proceed immediately once testing is confirmed — no extra pause here.

4. **Checkpoint 2 — prod PR merged.** Tell the user the PR is open and ask them to merge it on GitHub. Do not trust a bare "done": check with `gh pr view <number> --json state -q .state` (or `gh pr view release/<version> --json state -q .state` if the number wasn't captured) and only continue once it reports `MERGED`. If the user says they merged it but the check disagrees, say so and keep waiting — re-check rather than proceeding on their word alone.

5. **Checkpoint 3 — Hostinger redeploy.** Once the prod PR is confirmed merged, remind the user to manually trigger the redeploy in hPanel (`docs/deployment/hostinger.md` Phase 4). There is no API to verify or trigger this — take the user's confirmation on trust, since no independent check exists.

6. **Run `/sync-main-from-prod`.** Opens the `prod → main` PR. Proceed immediately once the redeploy is confirmed — no extra pause here.

7. **Checkpoint 4 — final merge.** Tell the user the sync PR is open and ask them to merge it (resolving any conflicts if needed). Verify via `gh pr view` the same way as Checkpoint 2. Once merged, report the release complete — nothing further to do.

## Failure handling

If any `git`/`gh` step fails partway (e.g. the prod PR can't be created because the branch is stale, or a merge check errors), stop immediately and report the failure plainly. Do not silently retry with a different approach or guess at a recovery — that decision belongs to the user.

## What NOT to do

- Do not ask "should I continue?" between mechanical steps (after cutting, before opening the prod PR; after the redeploy confirmation, before opening the sync PR) — only the four checkpoints above warrant a pause.
- Do not merge any PR or trigger the Hostinger redeploy yourself, even to "save a step" — those stay explicit human actions.
- Do not skip Checkpoint 4 — the sync PR must actually merge, or fixes made on the release branch during stabilization are silently lost from `main`.
- Do not trust the user's word over `gh`'s reported state for any PR-merge checkpoint — always re-verify.
