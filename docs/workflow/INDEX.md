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
- **A gate that runs before `/ship-fq-task` must default to the uncommitted working tree.** `ship-task.md` owns the only sanctioned `git commit`, so anything in the cycle ahead of it sees a branch with no commits; a `main...HEAD` default silently inspects an empty diff and reports clean. `/review-fq-work` was fixed for this (#564) — apply the same rule to any future pre-ship gate.
- **Task plans** live in [`../plans/`](../plans/), each opening with a YAML frontmatter block; [`../plans/INDEX.md`](../plans/INDEX.md) is generated from that frontmatter by `.claude/skills/scripts/gen-plans-index.sh` and is what `/plan-fq-task` step 0 reads ([ADR 0059](../architecture/adr/0059-plan-lifecycle-frontmatter-and-index.md)). Finished, uncited plans are swept into [`../plans/archive/`](../plans/archive/INDEX.md) by `.claude/skills/scripts/sweep-archived-plans.sh` (explicitly invoked, never automatic) — archived plans are history, not task context.

---

## Agent instruction surfaces

`AGENTS.md` is the **single canonical** agent-instruction file — mandatory workflow, architecture-constraint loading, response style, and the graphify rules all live there. Every other surface is a **thin pointer to `AGENTS.md` + this index plus only its own tool-specific delta** — never a re-statement of the shared rules (that only drifts):

| Surface | Tool | Delta it carries |
|---|---|---|
| `CLAUDE.md` | Claude Code | Skill shortcuts (`/plan-fq-task`, …), hooks, `../furqan-<slug>` worktree flow |
| `GEMINI.md` | Antigravity | Planning override (no internal AGY plan artifacts); progressive disclosure via `docs/workflow/*.md` |
| `.cursorrules` | Cursor | In-repo branch, not an external worktree |
| `.github/copilot-instructions.md` | GitHub Copilot | `/graphify` in Copilot Chat builds/updates the graph |
| `.agents/rules/graphify.md`, `.agents/workflows/graphify.md` | Antigravity | Always-on graphify rule + `/graphify` workflow |

When a shared rule changes, edit `AGENTS.md` only. Do not re-bloat the pointer files.

---

## All Workflows

### Task Workflow

| Trigger | Instructions | Description |
|---|---|---|
| `/refine-fq-task` | [refine-task.md](refine-task.md) | Break a big task into scoped issues (epic + children, `status:backlog`) — no implementation |
| `/plan-fq-task` | [plan-task.md](plan-task.md) | Socratic planning → `docs/plans/<slug>.md` |
| `/start-fq-task` | [start-task.md](start-task.md) | Implement from a plan, load all context |
| `/check-fq-standards` | [check-fq-standards.md](check-fq-standards.md) | Pre/post-implementation guardrail vs the `decisions/*.md` files + engineering bar |
| `/review-fq-work` | [review-work.md](review-work.md) | Code review of the **uncommitted** working tree by default (`--committed` for a pushed branch) |
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
| `/release <bump>` | [release.md](release.md) | Full orchestration: cut → staging → prod → sync (GitHub Actions) |
| `/release cut <bump>` \| `promote` \| `sync` | [release.md](release.md) | Single phase — cut off `main`, promote release → `prod`, or sync `prod` → `main` |

### Fleet / Orchestrator (Epic #490, Track 2)

| Trigger | Instructions | Description |
|---|---|---|
| `/detect-fleet` | [fleet-setup.md](fleet-setup.md) | Read-only capability report — which coding CLIs are installed/authenticated, their live models, `cost_tier`. Wraps upstream `delegate-setup`'s `discover.mjs` ([ADR 0063](../architecture/adr/0063-fleet-detection-wraps-delegate-setup.md)) |
| `/setup-fq-fleet` | [fleet-setup.md](fleet-setup.md) | On-demand, human-confirmed install + lane setup — hands off to `delegate-setup`'s interactive flow, steered to fq's three roles (`implementation` / `planning` / `second-opinion`) |
