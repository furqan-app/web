# ADR 0041: Impeccable design commands wired into the plan/implement/review cycle, plan-driven not ad hoc

**Date:** 2026-08-13
**Status:** Accepted

## Context

`/impeccable` (design/UX skill) and the Furqan Trello/worktree/plan workflow (`/plan-fq-task`, `/start-fq-task`, `/review-fq-work`) have run side by side with no integration: `/impeccable critique` was run standalone once (card #206) and its findings hand-copied into a plan. `check-fq-standards`'s guardrail checks (swipe/flicker, nav, mushaf layout, DB, PWA, theming invariants) don't cover impeccable's territory (a11y contrast, aesthetic specificity, UX heuristics), so there's no dedup risk in running both — the gap is purely that nothing calls impeccable automatically.

## Options Considered

**Option A — Direct Skill call, scoped command + target**
`/start-fq-task` (and `/plan-fq-task`, `/review-fq-work`) invoke the impeccable Skill in-process with an explicit command and file target (e.g. `polish app/components/SurahListItem.tsx`). Per impeccable's own routing rules, an explicit command+target skips its PRODUCT.md/new-work gates and runs that command's reference playbook directly — no subprocess, no second agent, full in-context reasoning (`craft-floor.md`, `context.mjs` directives) available.

**Option B — Bash CLI shell-out**
Shell out to `npx impeccable <command> --target <path>` and parse output. Fully decoupled, but loses in-context reasoning and the richer playbook-following behavior of the Skill path.

**Option C — Sub-agent delegation**
Spawn a background Agent to run impeccable against target files and report back. Isolates context but adds latency and a report-parsing seam for what is otherwise a synchronous implementation step.

## Decision

Option A. Three integration points, all plan-driven (no skill freelances a design command the plan didn't authorize):

1. **`/plan-fq-task`**, UI-mode investigation: runs `/impeccable critique` (or `audit` for technical-quality-leaning tasks) against the files under investigation. Findings with suggested commands become a `## Design Remediation` plan section — `command → target file(s)` pairs, taken verbatim from critique's own "Suggested command" per finding.
2. **`/start-fq-task`**, after functional implementation: executes each `## Design Remediation` entry via direct Skill call, in the existing worktree. Eligible commands: all Evaluate/Refine/Enhance/Fix categories (`critique`, `audit`, `polish`, `bolder`, `quieter`, `distill`, `harden`, `onboard`, `animate`, `colorize`, `typeset`, `layout`, `delight`, `overdrive`, `clarify`, `adapt`, `optimize`) — excludes Build/Iterate (`craft`, `shape`, `init`, `document`, `extract`, `live`), which are pre-implementation or standalone-only.
3. **`/review-fq-work`**: adds Dimension 4 — if the diff touches UI-relevant files, runs `/impeccable critique` on the changed surfaces and folds it into the report, continuing the existing sequential numbering across all 4 dimensions.

`check-fq-standards` is untouched — no overlap to reconcile. `AGENTS.md` gains a policy section (mirroring the existing `## graphify` section) naming impeccable as the standing authority for UI/UX design questions, critique, and discussion generally, not just inside these three skills.

## Consequences

- **+** One mechanism everywhere (direct Skill call) — no subprocess/parsing seam, no extra agent latency.
- **+** Deterministic: `/start-fq-task` only ever runs commands the plan named, at the files the plan named — never a freelance design pass mid-implementation.
- **+** Reuses critique's existing "Suggested command" output verbatim — no new mapping logic between findings and remediation commands.
- **+** `/review-fq-work`'s design dimension reuses the same critique command already used in planning — one code path, two call sites.
- **-** UI-mode planning now always spends a critique pass even on small UI tasks; no cheap-task skip defined yet.
- **-** `## Design Remediation` entries can go stale if code changes between planning and implementation — mitigated by `start-task.md`'s existing "verify current code matches plan before editing" gate, but not specific to design commands.
