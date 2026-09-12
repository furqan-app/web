---
name: orchestrate-fq-task
description: Drive one GitHub issue through the full Core Cycle (align → plan → implement → review → retrospect → ship) as an orchestrator that never types app code — it sequences the existing phase skills, sizes per-phase agent fan-out at runtime, re-verifies every delegated result, escalates undecidable points to Slack via fq-ask-human, and stops at an open PR. Trigger via /orchestrate-fq-task <issue>, or when a human or a routine wants the whole cycle run on one planned task. DO NOT use to pick which tasks to work on, run a batch/queue, or auto-merge.
---

# /orchestrate-fq-task

Read and follow [`docs/workflow/orchestrate.md`](../../../docs/workflow/orchestrate.md) — the
entry contract, the per-phase fan-out rule, the phase table, the escalation triggers, the
scope-change rule, and how phase position is reconstructed on resume. See
[ADR 0069](../../../docs/architecture/adr/0069-orchestrator-doc-only-phase-sequencer.md) for why
this is a doc-only sequencer with no orchestration code and no state file.

## Entry

`/orchestrate-fq-task <issue-number> [--to <phase>] [--from <phase>]` — `<issue>` is the one task
the caller names; `--to` stops after a phase (default `ship`); `--from` overrides the
artifact-inferred resume point. Prose ("align and plan only") works in place of the flags.

## Two hard boundaries

- **Never types app code.** Implementation is always delegated through `fq-delegate`; the
  orchestrator only composes briefs, re-verifies diffs, and runs the gates.
- **Stops at an open PR.** `/ship-fq-task` opens it; the orchestrator never commits directly,
  never merges, never runs past the PR. The caller tests the PR in a separate context.
