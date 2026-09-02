# Workflow Index

All AI workflow instructions for this project. Load the relevant file when a workflow is triggered.

## Core Cycle

```
Refine → Plan → Implement → Review → Retrospect → Ship
```

0. **[Refine a task](refine-task.md)** — break a big/vague task into scoped issues (epic + children); no implementation
1. **[Plan a task](plan-task.md)** — investigate, clarify, write a spec in `docs/plans/`
2. **[Implement a task](start-task.md)** — load context, implement from the plan
3. **[Review work](review-work.md)** — check for bugs, quality issues, plan drift
4. **[Retrospect](retrospect.md)** — reconcile `decisions/*.md` + workflow docs with what the session learned; runs *before* ship so its edits are committed inside the PR
5. **[Ship a task](ship-task.md)** — sync, branch, commit, PR, ticket update

---

## Architecture & decision records

The AI-first docs system (adopted 2026-06-28): `CLAUDE.md` is a slim pointer, heavy context lives in `docs/` and is loaded on demand — never burned on every session.

- **Active decisions:** [`../architecture/DECISIONS.md`](../architecture/DECISIONS.md) is a thin index. Load it always, then the 1–3 [`decisions/*.md`](../architecture/decisions/) domain files your task touches — never all of them ([ADR 0057](../architecture/adr/0057-decisions-split-by-domain.md)).
- **ADR history:** `docs/architecture/adr/` — the audit trail for humans. A valid ADR names alternatives and records trade-offs; if there are none, add a `decisions/` entry or a standards doc instead. Use `adr/TEMPLATE.md`.
- **`CLAUDE.md` stays a slim pointer** — never architecture detail, standards, or decisions.
- Adding a new decision **domain file** → add its row to the Domains table in `DECISIONS.md` in the same commit.
- Workflow / process decisions are recorded **here**, not in `decisions/`.

---

## All Workflows

### Task Workflow

| Trigger | Instructions | Description |
|---|---|---|
| `/refine-fq-task` | [refine-task.md](refine-task.md) | Break a big task into scoped issues (epic + children, `status:backlog`) — no implementation |
| `/plan-fq-task` | [plan-task.md](plan-task.md) | Socratic planning → `docs/plans/<slug>.md` |
| `/start-fq-task` | [start-task.md](start-task.md) | Implement from a plan, load all context |
| `/check-fq-standards` | [check-fq-standards.md](check-fq-standards.md) | Pre/post-implementation guardrail vs the `decisions/*.md` files + engineering bar |
| `/review-fq-work` | [review-work.md](review-work.md) | Code review on current branch diff |
| `/retrospect` | [retrospect.md](retrospect.md) | Feedback loop — run after review, before ship |
| `/ship-fq-task` | [ship-task.md](ship-task.md) | Commit → push → PR → ticket update |

### Git Utilities

| Trigger | Instructions | Description |
|---|---|---|
| `commit-staged` | [commit-message.md](commit-message.md) | Draft a structured commit message from staged diff |
| `/confirm-dangerous-git` | [confirm-dangerous-git.md](confirm-dangerous-git.md) | Gate before destructive git commands |

### Release Workflow

| Trigger | Instructions | Description |
|---|---|---|
| `/release <bump>` | [release.md](release.md) | Full orchestration: cut → staging → prod → sync |
| `/cut-release <bump>` | [release.md](release.md) | Branch, bump version, tag, push, promote to `stg` (GitHub Action) |
| `/promote-release` | [release.md](release.md) | Open+auto-merge release → `prod` PR, version auto-detected (GitHub Action) |
| `/sync-main-from-prod` | [release.md](release.md) | Sync `prod` back into `main` after release |
