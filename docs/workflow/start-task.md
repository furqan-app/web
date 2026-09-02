# Implement a Task

Context-aware implementation of a planned task. Loads the right context (decisions + standards + plan), then implements the task. Ends by checking for new decisions and recording them.

## Steps

### 1. Identify the plan

- Ask the user which plan to implement if not specified
- Derive the slug from the plan filename (e.g. `fix-search-debounce`)
- **Read the plan in full: `docs/plans/<slug>.md`.** Read every addendum, especially `Constraints` and `What NOT to Do` — the newest addendum is the source of truth. Approaches that a later addendum revised or reverted are dead — never re-implement them.
- Move the task to **In Progress** in your project management system before starting implementation.

### 2. Load context — mandatory gate, before writing any code

- Read `docs/architecture/DECISIONS.md` (the index): its Non-negotiable Invariants block always, plus the 1–3 `docs/architecture/decisions/*.md` domain files matching this task's area (the index's Domains table maps them) — not every domain file. When a decision the task touches (or the plan itself) links an ADR in `docs/architecture/adr/`, open that ADR for the full invariant behind the summary. These are non-negotiable; if the plan appears to conflict with one, stop and raise it with the user rather than picking one silently.
- Read `docs/architecture/COMPONENTS.md`
- Read the relevant standards file(s) from `docs/standards/` based on task type:
  - UI/component work → `component-patterns.md` + `styling.md` · decisions: `reader.md` / `nav.md` / `theming.md`
  - API work → `api-conventions.md` · decisions: `api.md`
  - DB work → `database.md` · decisions: `db.md`
  - i18n work → `i18n.md` · decisions: `i18n.md`
  - Reader / pager / swipe / mushaf → decisions: `reader.md` + `rendering.md`
  - PWA / offline / service worker → decisions: `pwa.md`
  - Multiple domains → load all relevant files
- **UI mode** — if the task involves components, pages, layout, or styling, also:
  - Read `docs/standards/styling.md` and `docs/standards/component-patterns.md` (if not already loaded above)
  - Read `docs/architecture/APP_PURPOSE.md` for UX principles before making any layout decisions
  - Read `docs/design/design-principles.md` for aesthetic direction and component conventions
  - If the task involves animation, transitions, or interactive states (press/hover/enter/exit), read the Motion section of `docs/standards/styling.md`

### 3. Pre-implementation guardrail check

- Invoke the `check-fq-standards` skill in **pre-check** mode: list the files/components this task touches, then cross-reference the relevant `docs/architecture/decisions/*.md` files' constraints and the general engineering bar for anything load-bearing. Do this before writing any code.

### 4. Implement

- **Query the graph first for callers/usages.** If `graphify-out/graph.json` exists, run `graphify query "<question>"` or `graphify path "A" "B"` to find what depends on a file/component before touching it — cheaper than grepping cold. Fall back to manual search if it has no answer, is stale, or doesn't exist.
- **Before editing, verify the current code matches what the plan/docs describe.** Open the files the plan names and confirm their present state lines up with the plan's assumptions — plans can go stale, and acting on a stale claim ("X is unchanged", "Y still renders here") is how documented behavior gets broken. If reality and the doc disagree, stop and reconcile with the user before changing anything.
- Follow the plan exactly (the latest addendum's approach). If you discover the plan needs revision, pause and discuss — do not silently deviate.
- Follow the relevant standards strictly, and honor every ADR and every `Constraints` / `What NOT to Do` item you loaded — do not undo a documented decision as a side effect of the change.
- Apply the decisions you loaded from `docs/architecture/decisions/` — do not re-litigate them.
- Run lint and type check after making changes: `npm run lint` and check for TypeScript errors.

### 5. Post-implementation guardrail check

- Invoke the `check-fq-standards` skill in **post-check** mode against the diff: walk its Regression Classes and General Engineering Bar checklists, and re-grep the `docs/architecture/decisions/*.md` files for the domains every changed file touches. Fix any failing item before continuing — do not proceed to Report with a known open violation.

### 6. Record decisions

- If the task added, removed, or reorganised any components: update `docs/architecture/COMPONENTS.md` to reflect the new state.
- After implementation, check: were any new architectural decisions made during implementation?
- If yes, add a `## ` section (with `**Status:** active`) to the matching `docs/architecture/decisions/*.md` file — new domain → new file + a Domains-table row in `DECISIONS.md`; cross-cutting rule → also a one-liner in `DECISIONS.md`'s Non-negotiable Invariants block.
- Mark the plan status as `implemented`.

### 7. Report

- Summary of what changed (files modified, decisions made).
- Which `check-fq-standards` checklist items were relevant and confirmed OK (not a bare "all good").
- Anything the user should verify manually.

---

## Anti-patterns to avoid

- Do not load all standards files when only one is relevant.
- Do not start implementing before both gates are done: the whole plan read (all addenda, step 1) and the decisions index + task-domain `decisions/*.md` files + their linked ADRs loaded (step 2).
- Do not implement an approach a later addendum revised or reverted — the newest addendum wins.
- Do not act on a stale doc claim without checking the code first — verify current state before editing.
- Do not undo or contradict an ADR, a `Constraints` item, or a `What NOT to Do` item as a side effect of the change.
- Do not skip the decisions check at the end.
- Do not skip the pre- or post-implementation `check-fq-standards` guardrail — a plan that looks straightforward can still touch a load-bearing invariant it didn't call out.
- Do not add features beyond what the plan specifies.
- Do not add an addendum while the branch is still open — edit the plan in place instead. Addenda are for corrections made when returning to a merged task on a new branch; mid-task they just create reconciliation noise.
- Do not write documentation with illustrative code blocks when a prose rule captures the constraint fully — one tight sentence beats a code block. Keep a code example only when the exact syntax or shape is the constraint (e.g. an API envelope, a Prisma field name, a non-obvious import path).
