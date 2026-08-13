# Workflow Index

All AI workflow instructions for this project. Load the relevant file when a workflow is triggered.

## Core Cycle

```
Plan → Implement → Review → Ship → Retrospect
```

1. **[Plan a task](plan-task.md)** — investigate, clarify, write a spec in `docs/plans/`
2. **[Implement a task](start-task.md)** — load context, implement from the plan
3. **[Review work](review-work.md)** — check for bugs, quality issues, plan drift
4. **[Ship a task](ship-task.md)** — sync, branch, commit, PR, ticket update
5. **[Retrospect](retrospect.md)** — end-of-session feedback loop

---

## All Workflows

### Task Workflow

| Trigger | Instructions | Description |
|---|---|---|
| `/plan-fq-task` | [plan-task.md](plan-task.md) | Socratic planning → `docs/plans/<slug>.md` |
| `/start-fq-task` | [start-task.md](start-task.md) | Implement from a plan, load all context |
| `/check-fq-standards` | [check-fq-standards.md](check-fq-standards.md) | Pre/post-implementation guardrail vs DECISIONS.md + engineering bar |
| `/review-fq-work` | [review-work.md](review-work.md) | Code review on current branch diff |
| `/ship-fq-task` | [ship-task.md](ship-task.md) | Commit → push → PR → ticket update |
| `/retrospect` | [retrospect.md](retrospect.md) | End-of-session retrospective |

### Git Utilities

| Trigger | Instructions | Description |
|---|---|---|
| `commit-staged` | [commit-message.md](commit-message.md) | Draft a structured commit message from staged diff |
| `/confirm-dangerous-git` | [confirm-dangerous-git.md](confirm-dangerous-git.md) | Gate before destructive git commands |

### Release Workflow

| Trigger | Instructions | Description |
|---|---|---|
| `/release <bump>` | [release.md](release.md) | Full orchestration: cut → staging → prod → sync |
| `/cut-release <bump>` | [release.md](release.md) | Branch, bump version, tag, push |
| `/promote-to-staging <ver>` | [release.md](release.md) | Open release → `stg` PR |
| `/promote-release <ver>` | [release.md](release.md) | Open release → `prod` PR |
| `/sync-main-from-prod` | [release.md](release.md) | Sync `prod` back into `main` after release |

### Doc & UI Utilities

| Trigger | Instructions | Description |
|---|---|---|
| `/compress-fq-docs` | [compress-docs.md](compress-docs.md) | Compress verbose `docs/plans/` and `docs/standards/` files |
| `ui-motion` | [ui-motion.md](ui-motion.md) | Animation and interaction-polish guidelines |
| Terse mode | [terse-mode.md](terse-mode.md) | Concise-response mode: concept, rules, Furqan vocabulary |
