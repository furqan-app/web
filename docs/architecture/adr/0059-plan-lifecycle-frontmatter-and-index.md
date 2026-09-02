# ADR 0059: Plan lifecycle — YAML frontmatter, a generated INDEX, and fold-addenda-on-ship

**Date:** 2026-09-02
**Status:** Accepted

## Context

`docs/plans/` holds 135 files / ~46k lines and grows unbounded — nothing prunes or
consolidates it. `/plan-task.md` step 0 ("check for an existing related plan") tells the
agent to `ls docs/plans/` and scan 135 filenames; a filename is a weak signal for "is
there already a plan for this bug class", so the check gets skipped or misses. Plan headers
are freeform bold-line key/values (`**Status:**`, `**Type:**`, `**Date:**`, plus dozens of
one-off keys) — not machine-parseable. The addendum convention (corrections appended when a
task returns to a merged plan on a new branch) has produced files up to 13 addenda deep
where the current spec is scattered across a dozen sections. This is the same failure mode
[ADR 0057](0057-decisions-split-by-domain.md) addressed for `DECISIONS.md`.

## Options Considered

**Option A — generated INDEX + YAML frontmatter + fold-on-ship**
Every plan gets a YAML frontmatter block (`status`, `type`, `area`, `date`, `supersedes`,
…). `docs/plans/INDEX.md` is generated from that frontmatter — one row per plan, the file
step 0 reads instead of `ls`. `ship-task.md` gains a rule: when a branch diff touches a
plan carrying `## Addendum` sections, fold them into the body before commit.

**Option B — archive sweep**
Move `status: implemented` plans with zero inbound citations to `docs/plans/archive/`.
Cuts the scan set, but doesn't make what remains parseable, doesn't stop regrowth, and
`DECISIONS.md` cites several plan files as live authority — archiving by status alone moves
cited docs out of the scan path.

**Option C — route plan discovery through graphify**
Ask the knowledge graph "is there a plan for X". Rejected on the same grounds as ADR 0057
rejected it for decisions: docs are ingested headings-only, graphify is a code-symbol
navigator not a prose retriever, and non-Claude agents can't run it.

**Option D — status-grep at step 0**
Keep freeform headers; step 0 greps `**Status:**` + title across 135 files each time.
No migration, but re-greps 135 files every plan, and freeform status strings
(`implemented (Addendum — 2026-08-23)`) don't compare cleanly.

## Decision

**Option A.** YAML frontmatter on every plan (migrate all 135), a generated
`docs/plans/INDEX.md` that step 0 reads, and a fold-addenda-on-ship rule in `ship-task.md`.
The archive sweep (Option B) stays deferred — tracked separately — and is safe to do later
on top of the frontmatter (`status` + a citation check become the archive predicate).

## Consequences

- **+** Step 0 reads one ~135-line index, not 135 files; `area` + `status` columns make
  "is there already a plan for this" a real lookup.
- **+** Frontmatter is machine-parseable — INDEX regeneration is deterministic, and a future
  archive sweep has a clean predicate.
- **+** Fold-on-ship stops addendum stacks from regrowing; plans converge on one coherent
  spec.
- **-** One-time 135-file migration touching every plan header. Mitigated: mechanical,
  header-only, no prose moved.
- **-** The 29 plans that already carry addenda are not folded here (that's 29 delicate
  merges — unreviewable bundled with the migration); they need a follow-up.
- **-** `INDEX.md` can drift if a plan's frontmatter is hand-edited without regenerating —
  mitigated by the regen script + the `/plan-task` and `/ship-task` touchpoints that update
  the row.

---

## Frontmatter contract

```yaml
---
title: <matches the # H1>
type: bug | feature | chore
date: YYYY-MM-DD          # original plan date; backfilled from git first-commit if absent
status: ready-to-implement | in-progress | implemented | superseded | unknown
area: <one value from the fixed vocabulary below>
supersedes: [<slug>, …]   # omit if none
issue: <bare number>      # omit if none
adr: [<NNNN>, …]          # omit if none
---
```

**`area` vocabulary** (mirrors `docs/architecture/decisions/` domains + workflow/infra):
`rendering`, `reader`, `nav`, `surah-layout`, `theming`, `marks`, `recitation`, `pwa`,
`db`, `api`, `search`, `awrad`, `a11y`, `ci`, `release`, `workflow`, `observability`,
`seeder`, `tafsir`.

`status` inference for plans with no prior `**Status:**` line: `implemented` when the plan
predates ~2026-08 and has no open follow-up, `unknown` otherwise. Never guess `implemented`
for a recent plan.
