# Consolidate the release workflow: 4 skills → 1, staging PR carries the changelog

**Type:** feature
**Date:** 2026-09-02
**Status:** implemented

GitHub issue: furqan-app/web#496 (T1.5, part of epic #491)

## Summary

The release flow is four thin skills (`/cut-release`, `/promote-release`, `/sync-main-from-prod`, `/release`) fronting three GitHub Actions, and the model is neither documented cleanly nor fully implemented: `decisions/release.md` still describes the Trello-era, pre-GitHub-Actions flow, and the `main → stg` PR body is a fixed one-liner that says nothing about what staging just received. This task collapses the four skills into one `/release` skill with subcommands, makes `cut-release.yml` write the release's issue list into the `main → stg` PR body (mirroring what `promote-release.yml` already does for the prod PR), and rewrites the docs around a single stated model: the `vX.Y.Z` milestone + GitHub Release is the release manifest, rendered into both PR bodies, valid under one-release-in-flight-at-a-time. Delegate-skill consolidation (also named in #496) is explicitly dropped — those are machine-global, out of scope.

## Approach

### 1. Skill surface: 4 → 1 (shape A — subcommands)

Delete `.claude/skills/cut-release/`, `.claude/skills/promote-release/`, `.claude/skills/sync-main-from-prod/`. Rewrite `.claude/skills/release/SKILL.md` to route on the first argument. `.agents/skills` is a symlink to `.claude/skills`, so the deletions propagate.

### 2. `cut-release.yml`: staging PR body gets the manifest

The "Milestone queued issues" step already builds `steps.issues.outputs.body` (the `- title (url)` list) and the DB step builds `steps.db_flags.outputs.notes`. The "Open and merge main → stg PR" step currently passes a fixed `--body`. Change it to the same composed body the "Create GitHub Release" step uses.

### 3. Docs rewrite around one model

`docs/workflow/release.md`, `docs/workflow/INDEX.md`, `AGENTS.md`, `decisions/release.md` (done in this plan's branch already), new ADR 0058 (done).

## Decision Tree / Algorithm

### `/release` argument routing

| `/release …` args | Action | `release.md` section |
|---|---|---|
| `major` \| `minor` \| `patch` | Full orchestration: cut → Checkpoint 1 → promote → sync → Checkpoint 2 | Full Release Orchestration |
| `cut major` \| `cut minor` \| `cut patch` | Trigger `cut-release.yml`, poll, relay | Cut Release |
| `promote` | Trigger `promote-release.yml`, poll, relay | Promote Release |
| `sync` | Trigger `sync-main-from-prod.yml`, poll, relay | Sync Main from Prod |
| empty, or first arg not in the above | Ask which subcommand + bump; do not guess | — |
| `cut` with no/invalid bump | Ask for the bump; do not infer from history | Cut Release |

### What list goes in which artifact (the manifest model)

| Moment | Query | Written to |
|---|---|---|
| `cut-release.yml`, milestone step | `gh issue list --label status:to-be-released --state open` | milestone `vX.Y.Z` applied to each; list built |
| `cut-release.yml`, Release step | (that list) | GitHub Release notes — `## What's included in vX.Y.Z` |
| `cut-release.yml`, stg PR step | (that same list, **new**) | `main → stg` PR body — `## Included` |
| `promote-release.yml`, issues step | `gh issue list --milestone vX.Y.Z --state all` | `release/x.y.z → prod` PR body |
| `promote-release.yml`, close step | `gh issue list --milestone vX.Y.Z --state open` | each → `status:done`, closed |

Invariant the label query depends on: **one release in flight at a time**. Under it, open `status:to-be-released` at cut time = merged to `main` since the last promote = "in `main`, not yet in `stg`". Cutting a second release before promoting the first re-lists the first's issues; unsupported, not enforced.

### `cut-release.yml` stg PR body — exact composition

Mirror the "Create GitHub Release" step's `notes` variable:

```
Promoting main to stg as part of cutting vX.Y.Z.

## Included
<steps.issues.outputs.body>
```

Then, when `steps.db_flags.outputs.notes` is non-empty, append:

```

## Manual Action Required
<steps.db_flags.outputs.notes>
```

Zero-issues case: `steps.issues.outputs.body` is already the string `No tracked changes — infra/release-process only.` — it flows through unchanged.

## Verified Test Cases

1. **`/release patch`** — full flow. Skill reads the "Full Release Orchestration" section: trigger `cut-release.yml` → poll → Checkpoint 1 (staging) → trigger `promote-release.yml` → poll → trigger `sync-main-from-prod.yml` → poll → Checkpoint 2 (user merges `prod → main` PR, verified via `gh pr view … -q .state` = MERGED). Two checkpoints, matching ADR 0015's 2026-08-21 addendum.
2. **`/release cut minor`** — trigger `cut-release.yml -f bump=minor`, poll to `completed`, relay version / branch / tag / Release URL / `Manual action required` block. No promote, no checkpoint.
3. **`/release promote`** — trigger `promote-release.yml` (no args), poll, relay version + PR URL. Errors if no unpromoted release branch.
4. **`/release sync`** — trigger `sync-main-from-prod.yml`, poll, relay PR URL, tell user merge is manual.
5. **`/release`** (no args) — ask which subcommand and (if `cut`/full) which bump. No default.
6. **Cut with 3 queued issues** — stg PR body shows `## Included` with 3 `- title (url)` lines; Release notes show the same 3; prod PR body (at promote) re-derives the same 3 from the milestone.
7. **Cut with 0 queued issues** — stg PR body `## Included` section contains `No tracked changes — infra/release-process only.`; no crash.
8. **Cut with a `prisma/quran/schema.prisma` change** — stg PR body gets `## Manual Action Required` appended, same text as the Release notes and the chat report.

## Files to Change

- `.claude/skills/release/SKILL.md` — rewrite as the single entry point; document the four argument forms and which `release.md` section each maps to.
- `.claude/skills/cut-release/` — delete.
- `.claude/skills/promote-release/` — delete.
- `.claude/skills/sync-main-from-prod/` — delete.
- `.github/workflows/cut-release.yml` — "Open and merge main → stg PR" step: replace the fixed `--body` with the composed body (`## Included` + issue list, plus `## Manual Action Required` when DB notes are non-empty). Add a one-line comment noting the one-release-in-flight assumption and the sync-with-prod-PR-body coupling.
- `docs/workflow/release.md` — rewrite: subcommand table at the top; keep the four phase sections (`Full Release Orchestration`, `Cut Release`, `Promote Release`, `Sync Main from Prod`) but retitle triggers to `/release …` forms; each phase states which issue list lands in which PR body; add the "one release in flight" precondition to `Cut Release`.
- `docs/workflow/INDEX.md` — "Release Workflow" table: four rows → one `/release` row, with the sub-syntax (`cut <bump>` / `promote` / `sync`) named in the Description cell.
- `AGENTS.md` — "Releases" paragraph: fix "promoted `stg` → `prod`" (staging is not promoted to prod; the release branch is), name the `/release cut|promote|sync` subcommands.
- `docs/architecture/adr/0058-release-manifest-and-single-skill.md` — **created in this branch.**
- `docs/architecture/decisions/release.md` — **rewritten in this branch** (de-Trello, drop `/promote-to-staging`, state the manifest model, ref ADR 0039 + 0058).
- `docs/architecture/DECISIONS.md` — no change needed (Release domain row already exists; no new invariant).

## Constraints

- `.agents/skills` is a symlink to `.claude/skills` — do not delete or edit it directly; deleting the skill dirs is enough.
- Do not touch `promote-release.yml` or `sync-main-from-prod.yml` — the prod PR body already renders the milestone list; sync is already correct.
- Do not touch `protect-stg.yml` / `protect-prod.yml` — PR body text is irrelevant to their `check-source` job.
- The stg PR body and the prod PR body must render the same manifest — if either workflow's body step is edited later, update both.
- `cut-release.yml`'s stg PR is auto-merged directly (not `--auto`) because `stg` has no required checks — keep that; only the `--body` value changes.
- Keep the merge-commit strategy (`gh pr merge --merge`, not squash) on the stg PR — ancestor-based checks elsewhere depend on it (existing comment in the YAML).
- ADR 0015 / 0026 / 0039 stay as-is (historical); ADR 0058 references them, does not supersede.

## What NOT to Do

- Do not consolidate the delegate skills (`codex-delegate`, `agy-delegate`, `claude-delegate`, `opencode-delegate`) — they live in machine-global `~/.claude/skills/`, are unrelated to the epic's per-task context-tax goal, and the user has dropped them from scope (no separate issue either).
- Do not review or change `start-task` / `understand-project` / `audit-repo` / `document-task` — all global, none referenced by this repo's workflow docs; #496's "also review" note produces no repo change.
- Do not add a commit-range (`git log stg..main`) changelog computation — the label query is sufficient under one-release-in-flight and simpler to read (ADR 0058, Option C rejected).
- Do not keep `/cut-release` etc. as aliases or hidden commands — full removal, `/release <sub>` only.
- Do not add a `<version>` argument to `/release promote` or `/release sync` — the workflows auto-detect (ADR 0015 addendum; ADR 0039).
- Do not re-introduce a third checkpoint — the flow has two (staging judgement, final sync-PR merge).
- Do not fold addenda into or otherwise edit `docs/plans/release-branch-workflow.md` / `trello-to-github-issues-migration.md` — historical records of superseded work.

## Decisions Made

- Skill shape **A** (one `/release`, subcommands) over B (delete phase skills, phases become "read the doc") or C (leave 4) — user: all shapes are low-cost, optimise for a clear model.
- Scope is **doc + YAML** (option b), not doc-only — the stg PR body must actually carry the changelog.
- "One release in flight at a time" is baked in as an explicit invariant; the alternative (commit-range diff) is rejected.
- Manifest = the `vX.Y.Z` milestone + GitHub Release; both the stg and prod PR bodies render it; issue list only, not raw commits (matches current Release notes).
- New ADR 0058 records the manifest model + the skill collapse.
