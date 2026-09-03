---
title: Plan lifecycle — YAML frontmatter, generated INDEX.md, fold-addenda-on-ship
type: chore
date: 2026-09-02
status: implemented
area: workflow
issue: 497
adr: [0059]
---

# Plan lifecycle — YAML frontmatter, generated INDEX.md, fold-addenda-on-ship

**Epic:** furqan-app/web#491 (T1.6) · **ADR:** [0059](../../architecture/adr/0059-plan-lifecycle-frontmatter-and-index.md)

## Summary

`docs/plans/` is 135 files with freeform bold-line headers and no index; `/plan-task`
step 0 ("is there already a plan for this?") scans 135 filenames and gets skipped or
misses. This task: (1) add a YAML frontmatter block to every plan, migrating the existing
bold-line header values into it and stripping the now-redundant lines; (2) generate
`docs/plans/INDEX.md` from that frontmatter, plus a regen script; (3) rewire `/plan-task`
step 0 to read `INDEX.md`, and add the frontmatter contract to `plan-task.md`; (4) add a
fold-addenda-on-ship rule to `ship-task.md`. The archive sweep stays deferred. The 29
plans that already carry `## Addendum` sections are **not** folded here — that is a tracked
follow-up (see What NOT to Do).

## Approach

### 1. Frontmatter migration (all 135 plans + the `design-migration/` subdir)

Per file: parse the leading bold-line header (`**Type:**`, `**Date:**`, `**Status:**`,
`**Issue:**`, `**ADR:**`, `**Trello:**`, `**Lineage:**`, and the long tail of one-offs),
lift the values into a YAML frontmatter block per the ADR 0059 contract, then **delete the
migrated bold lines from the body** — keep the `# H1`, keep everything below the header.
Non-standard one-off bold keys stay in the body (they are prose, not metadata).

- `type` — from `**Type:**`; if absent, infer from title/filename (`fix-*` → bug) else `chore`.
- `date` — from `**Date:**`; if absent, `git log --diff-filter=A --format=%ad --date=short -- <file> | tail -1`.
- `status` — normalize the freeform `**Status:**` string to the enum (see Decision Tree).
  The 3 files with no status line: `dark-theme-mushaf-unification-HANDOFF.md`,
  `global-ui-font-tajawal.md`, `trello-to-github-issues-migration.md` — infer per Decision Tree.
- `area` — one value from the ADR 0059 vocabulary, inferred from title + path + which
  `decisions/*.md` domain the plan cites.
- `supersedes` — from `**Lineage:**` / `**Supersedes:**` / "supersedes" in the header; else omit.
- `issue` — bare number from `**Issue:**` / `**GitHub:**`; else omit. `trello:` is **not** carried (Trello is dead — [[trello_in_progress]]); a `**Trello:**` link may stay as a body line.
- `adr` — numbers from `**ADR:**`; else omit.

### 2. `docs/plans/INDEX.md` + regen script

`.claude/skills/scripts/gen-plans-index.sh` — reads every `docs/plans/**/*.md` frontmatter,
emits `INDEX.md`: a short preamble + one table sorted by `area` then `status`:

```
| Plan | Area | Status | Type |
|---|---|---|---|
| [Fix QuranSafha swipe flicker](../fix-safha-swipe-flicker.md) | reader | implemented | bug |
```

Script is idempotent and deterministic (pure function of frontmatter). It is the
regeneration fallback; the hot-path updates are the workflow touchpoints below.

### 3. `plan-task.md` + `plan-fq-task/SKILL.md`

- **Step 0** — replace "run `ls docs/plans/` and scan filenames" with "read
  `docs/plans/INDEX.md` and scan by `area` + title". Keep the "extend, don't create"
  and "reset status" instructions.
- **Step 2** (bugs/features investigation) — same `ls` → `INDEX.md` swap where it recurs.
- **Plan file format** section — prepend the ADR 0059 frontmatter contract; drop the
  `**Type:** / **Date:** / **Status:**` bold-line example.
- **Step 6/7 (write the plan)** — after writing `<slug>.md`, run `gen-plans-index.sh`
  (or append the row by hand if the script can't run in the worktree) and stage `INDEX.md`.
- Mirror all of the above in the legacy embedded copy inside `plan-fq-task/SKILL.md` so the
  two don't drift.

### 4. `ship-task.md` + `ship-fq-task/SKILL.md` — fold-addenda-on-ship

New step, before the commit step:

> **Fold plan addenda.** If the branch diff touches any `docs/plans/**/*.md` that still
> contains `## Addendum` section(s): for each, merge the addendum's content into the
> relevant body section (decision tree, files-to-change, constraints) so the plan reads as
> one current spec, then delete the `## Addendum` heading(s). Record each fold as a dated
> one-line entry under a `## Revision History` section at the file bottom. Re-derive the
> frontmatter `status` and `date`. Then regenerate `docs/plans/INDEX.md` and stage it with
> the plan.

Applies to **any** plan in the diff carrying an unfolded addendum, not only ones the branch
added. Also add a `## What NOT to do` bullet: never ship a plan diff that leaves a
`## Addendum` heading in place.

### 5. Stale bare ADR citations (folds in taha7's #497 comment)

While every plan header is being rewritten: path-qualify the ~22 plan files carrying bare
`ADR 0017 / 0019 / 0022 / 0038 / 0043 / 0050` citations (post-#492 renumber, these
mis-resolve). In `status: implemented`/`superseded` plans that are otherwise untouched,
fixing the citation is still in scope here since the file is already being edited for
frontmatter. Genuinely stale/abandoned plans may keep the bare ref — judgement call per file.
Removes the "when the archive sweep runs" dependency noted in the issue comment.

### 6. Doc pointers

- `docs/workflow/INDEX.md` — under "Architecture & decision records" or a new line: note
  plans carry frontmatter and `INDEX.md` is generated ([ADR 0059]).
- `AGENTS.md` line ~87 (`- **Task plans**: docs/plans/`) — add "— see `docs/plans/INDEX.md`".

## Decision Tree / Algorithm

### `status` normalization

| Existing `**Status:**` string (case-insensitive contains) | frontmatter `status` |
|---|---|
| `implemented`, `done`, `shipped`, `complete`, `merged` | `implemented` |
| `implemented (Addendum …)`, `implemented — …` | `implemented` (addendum handled by the fold rule, not status) |
| `ready-to-implement`, `ready for implementation`, `approved`, `planned` | `ready-to-implement` |
| `in progress`, `in-progress`, `wip`, `partial` | `in-progress` |
| `superseded`, `abandoned`, `dropped`, `obsolete`, `replaced by` | `superseded` |
| anything else, or no status line | see inference below |

### `status` inference (no parseable status line)

1. Header/body says superseded/replaced/abandoned → `superseded`.
2. Plan `date` (or git first-commit) is before 2026-08-01 **and** no open follow-up issue / no "TODO"/"not done"/"remaining" in the body → `implemented`.
3. Otherwise → `unknown`.

Never infer `implemented` for a plan dated on/after 2026-08-01.

### `area` inference

1. Plan explicitly cites a `decisions/<domain>.md` → use that domain's `area`.
2. Else match title/filename against the vocabulary (`fix-safha-*`, `*-mushaf-*` → `reader`/`rendering`; `sidebar-*`, `nav-*`, `*-overlay` → `nav`; `mark*`, `shared-mushaf` → `marks`; `recitation-*`, `*-audio-*`, `listening-*` → `recitation`; `pwa-*`, `offline-*` → `pwa`; `*-e2e-*`, `ci-*`, `*-workflow*`, `*-skill*`, `retrospect*` → `ci` or `workflow`; `*-seeder`, `reproducible-quran-*` → `seeder`; `tafsir-*` → `tafsir`; `awrad-*`, `daily-awrad-*`, `*-wird-*` → `awrad`).
3. Ambiguous → pick the dominant one; do not invent a value outside the vocabulary.

## Verified Test Cases

| File | Current header | → frontmatter |
|---|---|---|
| `fix-safha-swipe-flicker.md` | `**Type:** bug` / `**Date:** 2026-07-22` / `**Status:** implemented (Addendum — 2026-08-23)` | `type: bug`, `date: 2026-07-22`, `status: implemented`, `area: reader` — file still has 1 `## Addendum`, so a future task that touches it folds it (not this task) |
| `mobile-nav-ux.md` | `**Type:** feature` / `**Date:** 2026-07-01` / `**Status:** implemented` / `**Issue:** [#431]` | `type: feature`, `date: 2026-07-01`, `status: implemented`, `area: nav`, `issue: 431` |
| `make-marks-meaningful.md` | `**Type:** feature` / `**Date:** 2026-07-13` / `**Status:** implemented` / `**Trello:** [#53]` / `**ADR:** [0025] (supersedes [0022], amends [0024])` | `type: feature`, `date: 2026-07-13`, `status: implemented`, `area: marks`, `adr: [0025]`, `supersedes: []` (ADR supersession ≠ plan supersession); `**Trello:**` line stays in body |
| `split-decisions-by-domain.md` | `**Type:** feature` / `**Status:** implemented` / `**Issue:** furqan-app/web#493` / `**ADR:** [0057]` / `**Lineage:** re-architects … ai-docs-workflow-system.md` | `type: feature`, `status: implemented`, `area: workflow`, `issue: 493`, `adr: [0057]`, `supersedes: [ai-docs-workflow-system]` |
| `global-ui-font-tajawal.md` | no status line, dated pre-2026-08 | `status: implemented` (inference rule 2), `area: theming` |
| `dark-theme-mushaf-unification-HANDOFF.md` | no status line, "HANDOFF" | `status: superseded` if a non-HANDOFF successor exists, else `unknown`; `area: theming` |
| `recitation-playback.md` | `**Type:** feature` / `**Status:** implemented`, 13 `## Addendum` | frontmatter only; **not folded here** — deepest stack, goes to the follow-up issue |

## Files to Change

- `docs/plans/**/*.md` (135) — prepend YAML frontmatter, strip migrated bold-line header, fix bare ADR citations where applicable
- `docs/plans/INDEX.md` — **new**, generated
- `.claude/skills/scripts/gen-plans-index.sh` — **new**, regen script
- `docs/workflow/plan-task.md` — step 0 + step 2 `ls`→`INDEX.md`; frontmatter contract into Plan file format; step 6/7 stage `INDEX.md`
- `.claude/skills/plan-fq-task/SKILL.md` — mirror the above in Step 7 + the legacy embedded copy
- `docs/workflow/ship-task.md` — new fold-addenda step before commit; `## What NOT to do` bullet
- `.claude/skills/ship-fq-task/SKILL.md` — mirror the fold step
- `docs/workflow/INDEX.md` — pointer line for plan frontmatter + generated INDEX
- `AGENTS.md` — `docs/plans/` line → mention `INDEX.md`
- `docs/architecture/adr/0059-plan-lifecycle-frontmatter-and-index.md` — **new** (written in the planning phase)

## Constraints

- Migration is **header-only**. Never move, reword, or drop body prose. The `# H1` stays.
- `area` values come only from the ADR 0059 fixed vocabulary — no free-text.
- Trello links are not carried into frontmatter (`trello:` key does not exist); Trello is dead ([[trello_in_progress]]).
- `INDEX.md` is generated output — it must be reproducible by re-running `gen-plans-index.sh` with an empty diff. No hand edits that the script wouldn't reproduce.
- The `plan-task.md` / `plan-fq-task/SKILL.md` legacy embedded copy must stay in sync with the canonical steps — update both.
- Do not contradict the anti-pattern already in `plan-task.md`: addenda are only added when returning to a merged plan on a new branch, never mid-branch. The fold rule operates at ship time on exactly those returning-task diffs.
- Keep frontmatter minimal — `status`, `type`, `area`, `date` always; `supersedes` / `issue` / `adr` only when real. No `owner`, no `tags`, no `priority`.

## What NOT to Do

- **Do not fold the 29 existing `## Addendum`-bearing plans in this task.** That is 29 delicate multi-addendum merges (deepest: `recitation-playback.md` 13, `fix-surah-banner-placement.md` 11) — bundling them with the migration makes the diff unreviewable and risks silently dropping decisions (the ADR 0057 failure mode). They are tracked as **furqan-app/web#510** (`status:backlog`, ~5 plans/PR). This task's `ship-task.md` rule handles any that a later task organically touches.
- Do not run the archive sweep (moving `implemented` plans to `archive/`). Explicitly deferred by ADR 0059 and the issue; safe to do later on top of the frontmatter.
- Do not convert `decisions/*.md` or ADRs to YAML frontmatter — they keep their `**Status:**` bold-line convention. This is plans only.
- Do not invent `area` values, add extra frontmatter keys, or carry `trello:`.
- Do not migrate `docs/plans/*.excalidraw` or other non-`.md` files.
- Do not reformat or "clean up" plan bodies during the migration — header only.

## Decisions Made

- **Q1 → coarse `area` from a fixed vocabulary** (not free-text component, not dropped) — best signal for step 0's "is there a plan for this bug class".
- **Q2/Q3 → real YAML frontmatter, migrate all 135**, strip the redundant bold-line header, infer `status`/`date` per the Decision Tree, backfill `date` from git.
- **Q4 → fold-addenda-on-ship** with a `## Revision History` trail; scope = any plan in the diff with an unfolded addendum.
- **Q5 → this task ships frontmatter + INDEX + rules; the 29 existing folds are a tracked follow-up** (cleanest *reviewable* outcome). The 22 stale bare ADR citations are fixed in this pass.
- **Q6 → ADR 0059** records the contract and the rejected options (archive sweep, graphify, status-grep).
