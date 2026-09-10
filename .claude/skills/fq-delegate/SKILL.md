---
name: fq-delegate
description: Dispatch a planned Furqan task to a fleet implementer CLI (codex / agy / opencode / copilot / a separate claude) and turn the result into a review-ready summary. Wraps the upstream *-delegate relays with a Furqan brief envelope — load-bearing AGENTS.md constraints, the task's decisions/*.md domain files, start-task.md's gate discipline, and an explicit no-commit boundary. Resolves the implementer from the human-approved .delegate lane map, never a heuristic. Never commits, pushes, or creates a worktree. Trigger via /fq-delegate, or from the T2.4 orchestrator's Implement phase.
---

# /fq-delegate

Read and follow [`docs/workflow/delegate.md`](../../../docs/workflow/delegate.md) — it has the full
flow (resolve implementer → compose brief → dispatch → read `result.json` → hand off), the brief
envelope template, and the relay-outcome → remedy table. See
[ADR 0068](../../../docs/architecture/adr/0068-fq-delegate-brief-envelope-and-lane-resolution.md) for
why this is a doc-only wrapper, why the implementer comes from the approved lane and not a
`fleet.json` heuristic, and the failure classes it owns.

## Two entry paths, one flow

- **Orchestrator-invoked (the Implement phase of #574):** the orchestrator has the agreed plan;
  it composes the brief body, dispatches, and folds the summary into `/review-fq-work`.
- **`/fq-delegate <task>` (a human hands off one planned task):** the plan must already exist
  (`docs/plans/<slug>.md`) and its worktree must already be created. Gather the target lane and any
  explicit implementer from the user, then follow `delegate.md`.

## Rules

- The implementer comes from the `--lane` resolution against `.delegate/config.json`, or an
  explicit caller choice — never a `fleet.json` suitability ranking (ADR 0068).
- `fq-delegate` never runs `git add` / `git commit` / `git push` and never creates a worktree.
  `/ship-fq-task` is the only sanctioned commit path.
- Never pass `--dangerously-skip-permissions` to a relay without explicit human approval for that
  run.
- Never present an implementer's "gates passed" as done — the summary's default next step is the
  orchestrator re-running the gates and `check-fq-standards` on the diff.
- One task per brief.
