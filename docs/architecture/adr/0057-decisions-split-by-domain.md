# ADR 0057: Architectural decisions are split into per-domain files; DECISIONS.md is a thin always-loaded index

**Date:** 2026-09-02
**Status:** Accepted

## Context

`docs/architecture/DECISIONS.md` grew to 55 sections / ~1130 lines / ~58k tokens. `AGENTS.md`, `plan-task.md`, `start-task.md` and `check-fq-standards.md` all instruct agents to read it **in full** before any task — and `/start-fq-task` and `/plan-fq-task` each do so, so a single task burns ~58k tokens on decisions plus ~17k on `COMPONENTS.md` before the plan or any code is read. The 2026-06-28 docs-system design (`docs/plans/ai-docs-workflow-system.md`) explicitly wanted heavy content "loaded on-demand, not burned on every session"; that intent inverted as the file accreted.

`docs/standards/` already solved the same problem for its domain: it is split into `api-conventions.md`, `component-patterns.md`, `database.md`, `i18n.md`, `styling.md`, `quran-rendering.md`, `pwa-testing.md`, and the workflow docs load only the file(s) matching the task's domain.

Two options for `DECISIONS.md` were weighed and rejected (see `docs/plans/split-decisions-by-domain.md` for the full analysis, pressure-tested by an Opus review):

- **Collapse each section to a 2-line summary + ADR pointer.** Rejected: the ADRs are the *thin* files. `DECISIONS.md` carries detail that exists nowhere else (e.g. the four abandoned `fontReady` mechanisms; the `connection_limit=1` × workers × 75-cap arithmetic). Collapsing deletes the highest-value anti-repeat-mistake knowledge in the repo.
- **Point workflow docs at graphify for "prior decisions".** Rejected: markdown is ingested headings-only (no prose), graphify is a code-symbol navigator not a prose retriever, and three of the four agent types (Cursor, Copilot, Codex) cannot run it.

## Decision

Split `DECISIONS.md`'s sections, **verbatim, with full prose**, into per-domain files under `docs/architecture/decisions/`, mirroring `docs/standards/`. `DECISIONS.md` stays at its path and becomes a **thin always-loaded index**:

1. A short **Non-negotiable invariants** block — the handful of cross-cutting rules a task in any domain can violate (one line each, full text in the domain file).
2. A **routing table** — one row per domain file: domain → file → one-line "what's in it".

Workflow docs change from "read `DECISIONS.md` in full" to "read `DECISIONS.md` (the index) always, then load the 1–3 `decisions/*.md` files your task's domain touches" — the same task-type→file mechanism `start-task.md` already uses for `docs/standards/`.

Every moved section gains an explicit `**Status:** active` / `**Status:** superseded by <x>` line, replacing the status markers previously smuggled into section titles ("— IMPLEMENTED", "(in progress)").

`check-fq-standards`'s pre/post grep retargets from `DECISIONS.md` to the `decisions/*.md` files for the task's domain — narrower and cheaper than grepping one 233 KB file.

The two meta sections ("Documentation & Workflow System", "Impeccable Design Workflow Integration") move to `docs/workflow/`, out of the decisions tree entirely. (The latter file, `docs/workflow/impeccable-integration.md`, was deleted by #494 when the `/impeccable` skill was removed.)

The split lands in **one commit** that also updates every file referencing `DECISIONS.md`, so no branch ever sees a half-migrated state. Open worktrees are drained/merged first: a worktree branched before the split whose `check-fq-standards` greps the now-thin `DECISIONS.md` would find nothing and pass vacuously, which is worse than failing — so `DECISIONS.md` keeps enough structure (the routing table) that a stale grep obviously misses rather than silently succeeds.

## Consequences

- **+** Per-task decisions context drops from ~58k tokens to ~5–12k (index + 1–3 domain files), with **zero information loss**.
- **+** `/retrospect`'s "scan every decision for staleness" step becomes affordable — it scans only the domains the session touched. This is what revives the dead feedback loop (T1.4 / #495).
- **+** `check-fq-standards`'s grep becomes precise instead of scanning 233 KB per changed file.
- **+** Makes an agent orchestrator (#490) feasible — "which decision files does this task need" is routable; "read 233 KB × N sub-agents" is not.
- **-** One structural migration touching ~17 reference sites; must land atomically and after open worktrees drain.
- **-** A new discipline: a decision that spans domains must pick a home file and the index row must point there; without care the domain files re-accrete toward monoliths. Mitigated by the `**Status:**` field and the small per-file size target.
- **-** ~18 files where there was one — but each is small and focused, matching `docs/standards/`, and a task opens only the relevant few.
