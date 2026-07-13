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
