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
   - Read `docs/plans/<slug>.md`
   - Find the plan's Trello card (linked in the plan) and move it to **In Progress** (`mcp__trello__move_card`) before starting implementation.

2. **Load context**
   - Read `docs/architecture/DECISIONS.md`
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
   - Follow the plan exactly. If you discover the plan needs revision, pause and discuss — do not silently deviate.
   - Follow the relevant standards strictly.
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
- Do not re-read the plan multiple times — read once, implement.
- Do not skip the decisions check at the end.
- Do not add features beyond what the plan specifies.
