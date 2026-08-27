# GEMINI.md

All project rules, mandatory workflows, external worktree practices, and architectural decisions are defined in [`AGENTS.md`](AGENTS.md).

- **Planning Override:** Follow [`docs/workflow/plan-task.md`](docs/workflow/plan-task.md) and produce specifications in `docs/plans/<slug>.md` rather than internal Antigravity plan artifacts.
- **Progressive Disclosure:** Activate the task-specific skills in `.agents/skills/` (`plan-fq-task`, `start-fq-task`, `check-fq-standards`, `review-fq-work`, `ship-fq-task`) by viewing them before executing each step.
