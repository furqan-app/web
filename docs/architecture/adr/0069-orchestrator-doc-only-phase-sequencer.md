# ADR 0069: The orchestrator is a doc-only phase sequencer; phase position is reconstructed from artifacts, not persisted

**Date:** 2026-09-11
**Status:** Accepted

## Context

Epic #490 (Track 2) closes with an orchestrator that drives one task through
align → plan → implement → review → retrospect → ship while never typing app code itself. Its
three prerequisites all shipped as **doc-only thin skills** — a `SKILL.md` pointer plus a
`docs/workflow/*.md` flow, no script ([ADR 0063](0063-fleet-detection-wraps-delegate-setup.md),
[ADR 0064](0064-agent-slack-escalation.md) for the one script it does own,
[ADR 0068](0068-fq-delegate-brief-envelope-and-lane-resolution.md)). The orchestrator adds one
new need the siblings did not have: it spans multiple phases over a long wall-clock time and
must **resume after an interruption** — a killed session, a machine switch, a different CLI
picking the task back up. That raises the question of where "which phase are we in" lives.

## Options Considered

**Option A — a stateful driver script**
`scripts/orchestrate.mjs` owns the phase transitions and writes an `orchestrator-state.json`;
resuming means reloading that file and continuing the state machine.

**Option B — a doc-only thin skill, phase position reconstructed from artifacts**
`SKILL.md` → `docs/workflow/orchestrate.md`. The orchestrator is the main agent following the
doc. Each phase already leaves a durable, authoritative trace — the worktree, the plan
frontmatter `status`, the issue's `status:*` label, `git diff`, `fq-delegate`'s `result.json`,
whether `/retrospect` edits are staged. Resuming means reading those the way a human returning
to the task would.

**Option C — doc-only skill plus a lightweight phase log**
Option B plus an append-only `orchestrate.log` in the worktree that records each phase as it
completes.

## Decision

**Option B.** The orchestrator is documentation, matching `detect-fleet` / `setup-fq-fleet` /
`fq-delegate`. It holds no state file. On (re-)entry it reconstructs the phase position from the
artifacts the phases already produce; an ambiguous reconstruction is a question for the human or
`fq-ask-human`, never a guess. Option A is rejected for the same reason ADR 0068 rejected a
dispatch script — the load-bearing work (how many agents a phase needs, which one-to-three
domain files a brief carries, whether a mid-run surprise is a scope change) is judgment a script
cannot do well, and the mechanical remainder is small enough to document. Option C is rejected
because a log the orchestrator writes is a second source of truth that drifts from the artifacts
the moment the two disagree, and the artifacts are already authoritative.

## Consequences

- **+** No orchestration code to maintain, and no state file to corrupt, stale, or desync from
  the real work.
- **+** Resumption works across sessions, machines, and CLIs — the worktree and the issue *are*
  the state, and any agent can read them.
- **+** Slots on top of the existing Core Cycle unchanged; each phase skill keeps its own
  contract.
- **-** The orchestrator re-pays some context on every resume to re-derive where it is (bounded
  — it reads frontmatter, a label, and a diff, not full files).
- **-** Two transitions do *not* leave a distinguishing artifact. The align phase's
  reconciliation — which directions were proposed and how divergence was resolved — has to be
  written into a durable place (the plan's approach section, or an issue comment when align runs
  before the plan exists) or it is lost on resume. And "review done" versus "retrospect done" do
  not separate when a review folds no findings and a retrospect records nothing — the resumption
  table collapses them into one row and falls back to asking, or to safely re-running the later
  phase.
- **-** Nothing enforces that a phase is not skipped — the discipline is documented, not gated,
  exactly as it is for the rest of the cycle.
