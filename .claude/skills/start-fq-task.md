# /start-fq-task

Context-aware implementation of a planned task.

## What this skill does

Loads the right context (decisions + standards + plan), then implements the task. Ends by checking for new decisions and recording them.

## Steps

1. **Identify the plan**
   - Ask the user which plan to implement if not specified (list `docs/plans/` to show options)
   - Read `docs/plans/<slug>.md`

2. **Load context**
   - Read `docs/architecture/DECISIONS.md`
   - Read the relevant standards file(s) from `docs/standards/` based on task type:
     - UI/component work → `component-patterns.md` + `styling.md`
     - API work → `api-conventions.md`
     - DB work → `database.md`
     - i18n work → `i18n.md`
     - Multiple domains → load all relevant files

3. **Implement**
   - Follow the plan exactly. If you discover the plan needs revision, pause and discuss — do not silently deviate.
   - Follow the relevant standards strictly.
   - Apply decisions from `DECISIONS.md` — do not re-litigate them.
   - Run lint and type check after making changes: `npm run lint` and check for TypeScript errors.

4. **Record decisions**
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
