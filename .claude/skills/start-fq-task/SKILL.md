---
name: start-fq-task
description: Context-aware implementation of a planned Furqan task. Loads DECISIONS.md + relevant standards + plan, then implements and records any new decisions.
---

# /start-fq-task

Context-aware implementation of a planned task.

## What this skill does

Loads the right context (decisions + standards + plan), then implements the task. Ends by checking for new decisions and recording them.

## Steps

1. **Identify the plan**
   - Ask the user which plan to implement if not specified (list `docs/plans/` to show options)
   - **Read `docs/plans/<slug>.md` in full — every addendum, and especially the `Constraints` and `What NOT to Do` sections.** If the plan has multiple addenda, the newest one is the source of truth: implement the approach it settled on, not an earlier one it revised or reverted. Re-implementing a superseded approach is the single biggest cause of the rework this workflow exists to prevent.
   - Find the plan's Trello card (linked in the plan) and move it to **In Progress** (`mcp__trello__move_card`) before starting implementation.

2. **Load context — mandatory gate, before writing any code**
   - Read `docs/architecture/DECISIONS.md` — its entries are the active decisions to apply. When a decision the task touches (or the plan itself) links an ADR in `docs/architecture/adr/`, open that ADR for the full invariant behind the summary. These are non-negotiable; if the plan appears to conflict with one, stop and raise it with the user rather than picking one silently.
   - Read `docs/architecture/COMPONENTS.md`
   - Read the relevant standards file(s) from `docs/standards/` based on task type:
     - UI/component work → `component-patterns.md` + `styling.md`
     - API work → `api-conventions.md`
     - DB work → `database.md`
     - i18n work → `i18n.md`
     - Multiple domains → load all relevant files
   - **UI mode** — if the task involves components, pages, layout, or styling, also:
     - Read `docs/standards/styling.md` and `docs/standards/component-patterns.md` (if not already loaded above)
     - Read `docs/architecture/APP_PURPOSE.md` for UX principles before making any layout decisions
     - Read `docs/design/design-principles.md` for aesthetic direction and component conventions
     - If the task involves animation, transitions, or interactive states (press/hover/enter/exit), invoke the `ui-motion` skill for motion and polish guidance

3. **Implement**
   - **Before editing, verify the current code matches what the plan/docs describe.** Open the files the plan names and confirm their present state lines up with the plan's assumptions — plans can go stale, and acting on a stale claim ("X is unchanged", "Y still renders here") is how documented behavior gets broken. If reality and the doc disagree, stop and reconcile with the user before changing anything.
   - Follow the plan exactly (the latest addendum's approach). If you discover the plan needs revision, pause and discuss — do not silently deviate.
   - Follow the relevant standards strictly, and honor every ADR and every `Constraints` / `What NOT to Do` item you loaded — do not undo a documented decision as a side effect of the change.
   - Apply decisions from `DECISIONS.md` — do not re-litigate them.
   - Run lint and type check after making changes: `npm run lint` and check for TypeScript errors.

4. **Record decisions**
   - If the task added, removed, or reorganised any components: update `docs/architecture/COMPONENTS.md` to reflect the new state.
   - After implementation, check: were any new architectural decisions made during implementation?
   - If yes, update `docs/architecture/DECISIONS.md`.
   - Mark the plan status as `implemented`.

5. **Report**
   - Summary of what changed (files modified, decisions made).
   - Anything the user should verify manually.

## Anti-patterns to avoid

- Do not load all standards files when only one is relevant.
- Do not start implementing before both gates are done: the whole plan read (all addenda, Step 1) and DECISIONS.md + its linked ADRs loaded (Step 2).
- Do not implement an approach a later addendum revised or reverted — the newest addendum wins.
- Do not act on a stale doc claim without checking the code first — verify current state before editing.
- Do not undo or contradict an ADR, a `Constraints` item, or a `What NOT to Do` item as a side effect of the change.
- Do not skip the decisions check at the end.
- Do not add features beyond what the plan specifies.
