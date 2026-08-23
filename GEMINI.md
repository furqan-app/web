# GEMINI.md

> All project rules, mandatory workflow, and documentation references are in [`AGENTS.md`](AGENTS.md). Read that first.
> This file contains Antigravity (AGY)-specific configuration and operational rules.

## Antigravity (AGY) Invariants

### 1. Mandatory Workflow & Planning Mode Override
* **Do NOT use AGY's internal `implementation_plan.md` artifact** as the sole plan.
* All planning must follow [`docs/workflow/plan-task.md`](docs/workflow/plan-task.md) and produce a specification in `docs/plans/<slug>.md`.
* Socratic planning is required: ask clarifying questions **one at a time**.
* Do not write or edit any application code until the user has explicitly approved the plan.

### 2. Progressive Disclosure & Skills Activation
AGY discovers skills in `.agents/skills/`. Whenever a task involves planning, implementing, reviewing, or shipping, you **MUST** read the corresponding skill file via `view_file`:
* **Planning:** `.agents/skills/plan-fq-task/SKILL.md`
* **Implementation:** `.agents/skills/start-fq-task/SKILL.md`
* **Standards & Invariants:** `.agents/skills/check-fq-standards/SKILL.md`
* **Review:** `.agents/skills/review-fq-work/SKILL.md`
* **Shipping:** `.agents/skills/ship-fq-task/SKILL.md`

### 3. Workspace Boundary & Git Branches
* AGY enforces command execution strictly within the workspace directory.
* **Do NOT create worktrees in `../furqan-<slug>`**.
* Instead, create and switch to a feature branch directly within the repository:
  ```bash
  git checkout -b <type>/<issue-number>-<short-description>
  ```

### 4. Mandatory Context Loading
Before editing any code in implementation phase:
* Read `docs/architecture/DECISIONS.md` (and any linked ADRs in `docs/architecture/adr/`).
* Read relevant domain standards in `docs/standards/`.
* Run the pre-implementation and post-implementation checks in `.agents/skills/check-fq-standards/SKILL.md`.
