# Release-Branch Deployment Workflow

**Type:** feature
**Date:** 2026-07-06
**Status:** implemented

## Summary

Introduce a versioned release-branch workflow between `main` and `prod`, replacing today's direct `main → prod` deploy path. Three new Claude Code skills do the mechanical work: `/cut-release` (branch + version + Trello), `/promote-release` (release → prod PR), and `/sync-main-from-prod` (prod → main PR). A fourth skill, `/release`, drives all three in one continuous run and pauses only at the points that genuinely need a human (confirm local testing passed, confirm the prod PR is merged, confirm the Hostinger redeploy was clicked). See [ADR 0015](../architecture/adr/0015-release-branch-workflow.md) for the branch-topology decision and rationale, and `docs/plans/protect-prod-branch.md` Addendum 1 for the required `protect-prod.yml` change.

Trello card: [#55 — Create deployment workflow](https://trello.com/c/mkBlfwiW/55-create-deployment-workflow) (board: Furqan, currently in "In Progress").

## Approach

```
main (feature branches merge here, unchanged)
  └─ /cut-release <major|minor|patch>
       → release/x.y.z branched from main, package.json version bumped + committed, tagged vX.Y.Z, pushed
       → Trello: cards in "To Be Released" labeled vX.Y.Z, moved to Done
            └─ manual local testing: npm run build && npm start
                 └─ /promote-release <version>
                      → opens PR release/x.y.z -> prod
                      → (you merge on GitHub, then manually click Redeploy in hPanel)
                           └─ /sync-main-from-prod
                                → opens PR prod -> main
```

### `/cut-release <major|minor|patch>`

1. `git fetch origin`; require a clean working tree.
2. `git checkout main && git pull` (fast-forward only).
3. Read `version` from `package.json`; compute the new version per the given bump type (semver).
4. `git checkout -b release/<new-version>`.
5. Edit `package.json`'s `"version"` field to `<new-version>`, commit (`chore(release): bump version to <new-version>`, no AI signature — same rule as `/ship-fq-task`).
6. `git tag v<new-version>`.
7. `git push -u origin release/<new-version>` and `git push origin v<new-version>`.
8. Trello: `mcp__trello__get_cards_by_list_id` on the **"To Be Released"** list; for each card, apply a new label named `v<new-version>` (create it if it doesn't exist yet — one label per version, not a reused color slot, so old releases stay distinguishable) and `mcp__trello__move_card` to **Done**.
9. Create a GitHub Release (`gh release create v<new-version>`) whose notes are a "What's included" list built from those same Trello cards (title + card URL) — not `--generate-notes`/commit history, so the release body matches the curated Trello scope rather than raw commit noise.
10. Report the release branch name, tag, GitHub Release URL, and which cards were labeled/moved.

### `/promote-release <version>`

1. Verify `release/<version>` exists on `origin` (`git fetch origin` then check).
2. `gh pr create --base prod --head release/<version>` with a title like `Release v<version>` and a body linking the Trello cards labeled with that version (best-effort — list cards carrying the `v<version>` label).
3. Report the PR URL and remind the user: merge it once testing has passed (the `check-source` gate requires the head branch to start with `release/`), then manually trigger a redeploy in hPanel per `docs/deployment/hostinger.md` Phase 4 — this is not automatic.
4. Does not touch Trello — labeling/moving already happened at cut time.

### `/sync-main-from-prod`

1. `git fetch origin`.
2. `gh pr create --base main --head prod` with a title like `Sync main with prod (v<version>)`, where `<version>` is read from the latest tag reachable from `origin/prod` (`git describe --tags origin/prod`).
3. Report the PR URL. Merging and resolving any conflicts is a manual step — this skill only opens the PR.

### `/release <major|minor|patch>` — orchestrator

Runs the other three skills back-to-back as one continuous flow. Never asks "should I continue?" between mechanical steps — only stops at a checkpoint when it genuinely cannot proceed without the user doing something outside the chat (local testing, a GitHub merge, a hPanel click). At each checkpoint it states plainly what it's waiting for.

1. **Run `/cut-release <bump>`** in full (branch, bump, tag, push, Trello labels/move). No pause before this — preconditions (clean tree, on main) are checked as part of it, same as today.
2. **Checkpoint 1 — testing.** Report the release branch/tag, then ask the user to run local testing (`npm run build && npm start` against `release/x.y.z`) and confirm when it's passed. This cannot be verified automatically — it's a genuine human gate. Do not proceed until the user explicitly confirms.
3. **Run `/promote-release <version>`** — opens the `release/x.y.z → prod` PR. No pause before this; it follows immediately once testing is confirmed.
4. **Checkpoint 2 — prod merge.** Tell the user the PR is open and ask them to merge it on GitHub. Rather than trusting a bare "done," re-check via `gh pr view <number> --json state -q .state` before proceeding — only continue once it actually reports `MERGED`. If the user says they merged it but the check disagrees, say so and keep waiting.
5. **Checkpoint 3 — Hostinger redeploy.** Once the prod PR is confirmed merged, remind the user to manually trigger the redeploy in hPanel (`docs/deployment/hostinger.md` Phase 4 — no API exists to verify or trigger this) and wait for their confirmation that it's done. This one has to be taken on trust; there's no programmatic check available.
6. **Run `/sync-main-from-prod`** — opens the `prod → main` PR. No pause before this; it follows immediately once the redeploy is confirmed.
7. **Checkpoint 4 — final merge.** Tell the user the sync PR is open and ask them to merge it (resolving any conflicts if needed). Poll `gh pr view` the same way as checkpoint 2. Once merged, report the release complete — this is the last step, nothing further to automate.

If any `gh`/`git` step fails partway (e.g. the prod PR can't be created because the branch is stale), stop immediately and report the failure rather than guessing how to recover — do not silently retry with a different approach.

## Files to Change

- `.claude/skills/cut-release/SKILL.md` — new skill, steps above.
- `.claude/skills/promote-release/SKILL.md` — new skill, steps above.
- `.claude/skills/sync-main-from-prod/SKILL.md` — new skill, steps above.
- `.claude/skills/release/SKILL.md` — new orchestrator skill, invokes the three above in sequence with the checkpoints described above.
- `.github/workflows/protect-prod.yml` — updated per `docs/plans/protect-prod-branch.md` Addendum 1 (gate `release/*`, not `main`).
- Trello board "Furqan": add a new list **"To Be Released"**, positioned after "Done" (or wherever the user places it) — created once, manually, not by a skill.
- `docs/architecture/DECISIONS.md` / `docs/architecture/adr/0015-release-branch-workflow.md` — already written as part of this planning pass.

## Constraints

- No staging environment — testing is local only (`npm run build && npm start` against the release branch). Hostinger hosts prod only; a staging site was explicitly deferred (ADR 0015, Option C).
- No direct `main → prod` path anymore, including for hotfixes — every prod update must go through a `release/*` branch (ADR 0015, protect-prod-branch.md Addendum 1).
- `/cut-release` requires the version bump type as an explicit argument (major/minor/patch) — never inferred from commit messages.
- Version source of truth is `package.json`'s `"version"` field plus the matching `vX.Y.Z` git tag on the release branch — don't introduce a second version file.
- Trello label per release is a **new** label per version (not a recolored/renamed reuse of an old label) so historical releases stay independently searchable.
- The GitHub Release created at cut time sources its "what's included" body from the Trello cards labeled with that version, not `gh release create --generate-notes` — the curated Trello scope is the meaningful summary, not raw PR/commit history.
- These three skills follow `/ship-fq-task`'s "no AI signature" rule for every commit/PR they create.
- These skills only ever create branches/tags/PRs — none of them merge a PR or trigger the Hostinger redeploy; those stay explicit human actions (same boundary `/ship-fq-task` draws around merging).

## Edge Cases / Decisions Made

- **Release scope = whatever's in "To Be Released" at cut time**, not a curated pre-check against Trello card branches — simpler, and everything in `main` is already reviewed/merged by the time it's there.
- **Version bump is manual per cut** (major/minor/patch argument), not auto-inferred — keeps semver meaning (breaking/feature/fix) intentional.
- **Trello mechanics:** moving a card into "To Be Released" is a manual drag by the user when its PR merges to main (not automated into `/ship-fq-task`); `/cut-release` is solely what stamps the label and advances cards to Done.
- **Promote/sync split into two skills**, not one skill re-run at each stage — more explicit, no "detect PR state" magic. `/release` is the layer that stitches them together for the common case; the individual skills remain usable standalone (e.g. re-running `/promote-release` by hand if `/release` was interrupted mid-flow).
- **`protect-prod.yml` drops the `main` exception entirely** rather than allowing both `main` and `release/*` — consistency over a hotfix escape hatch (ADR 0015).
- **`/release` verifies PR merges via `gh pr view` rather than trusting the user's word** — merging happens outside the chat, so an independent check is possible and cheap; only local testing and the Hostinger redeploy have no such check and must be taken on trust.

## What NOT to Do

- Do not add a Hostinger staging site as part of this change — explicitly out of scope (deferred per ADR 0015).
- Do not have any of the three skills (or `/release`) auto-merge a PR or trigger the Hostinger redeploy — those are manual, explicit human actions, even inside the orchestrator.
- Do not infer the version bump automatically from commit messages/conventional commits — the user specifies it.
- Do not reuse/recolor an existing Trello label across releases — create a new one per version.
- Do not have `/release` ask "continue?" between purely mechanical steps (e.g. after cutting, before opening the prod PR) — only pause at the four checkpoints that require human action.

---

## Addendum 1 — Hostinger auto-deploys on push to prod (2026-07-07)

**Type:** correction  
**Status:** implemented

### What changed

Hostinger is connected to the `prod` branch and auto-deploys on any push to it. The original plan (and ADR 0015) incorrectly stated that a manual "redeploy" click in hPanel was required after merging a release PR into `prod`. This was never true — merging the `release/x.y.z → prod` PR is sufficient to trigger the deploy.

### Files to change

- `docs/deployment/hostinger.md` — Phase 4: replace "trigger a redeploy" instruction with a note that Hostinger auto-deploys on any push to `prod`; remove the instruction to click Redeploy manually.
- `docs/architecture/adr/0015-release-branch-workflow.md` — remove the consequence bullet stating deploy is a manual click; update branch flow diagram to drop the "manual Hostinger redeploy" step.
- `.claude/skills/promote-release/SKILL.md` — remove the reminder to manually trigger redeploy in hPanel after merging.
- `.claude/skills/release/SKILL.md` — remove Checkpoint 3 (Hostinger redeploy); collapse the flow from 4 checkpoints to 3.

### What NOT to Do

- Do not add a manual confirmation step for the deploy — Hostinger handles it automatically on push to `prod`; no programmatic verification exists and none is needed.
