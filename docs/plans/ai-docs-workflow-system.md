# AI-First Documentation & Workflow System

**Date:** 2026-06-28  
**Status:** Implemented (extended 2026-06-29 with /retrospect and /review-fq-work)

## Goal

Eliminate AI context loss between sessions, ensure all contributors follow the same conventions, and enforce discipline around decisions — without a maintenance burden heavier than the work itself.

## Documentation Structure

```
docs/
  product/              # PRD, BRD, feature specs
  architecture/
    DECISIONS.md        # LIVING FILE: current state of all decisions (agents load this)
    adr/                # historical audit trail — humans read, agents don't
  standards/            # api-conventions, component-patterns, database, i18n, styling
  plans/                # per-task implementation plans (output of /plan-fq-task)
  retrospectives/       # dated retro files (output of /retrospect)
.claude/skills/         # project-scoped skills (committed, shared with team)
CLAUDE.md               # slim pointer file only — no heavy content
```

CLAUDE.md is a 5-line entry point: project overview + pointers to `docs/`. Heavy content lives in `docs/` and is loaded on-demand by skills — not burned on every session.

## Skills

| Skill | Purpose |
|---|---|
| `/plan-fq-task` | Socratic questioning for features; root-cause investigation for bugs. Output: `docs/plans/<slug>.md`. Auto-records decisions. |
| `/start-fq-task` | Loads `DECISIONS.md` + relevant standards + plan file, then implements. Auto-records decisions. |
| `/review-fq-work` | Spawns Opus subagent: bugs & correctness, code quality & duplication, plan consistency. Terminal output only. |
| `/retrospect` | End-of-session feedback. Scans history + DECISIONS.md for stale entries. Proposes changes one at a time before writing. Saves `docs/retrospectives/YYYY-MM-DD.md`. |

## Task Workflow

```
1. /plan-fq-task   → Socratic grilling → plan file + decisions recorded
2. /start-fq-task  → Load context → implement → decisions recorded
3. /review-fq-work → Opus quality gate
4. Commit + PR + move Trello card to Done
5. /retrospect     → Capture learnings, update DECISIONS.md/skills/memories
```

Same flow for every task — feature or bug.

## Decisions Made

| Decision | Chosen | Rejected |
|---|---|---|
| CLAUDE.md scope | Slim pointer + on-demand loading | Single monolithic file |
| Decision history | DECISIONS.md living file + ADR archive | ADR-only history |
| Task flow | Unified 2-skill flow for everything | Separate flows for features vs bugs |
| Standards files | Split by concern | Single STANDARDS.md |
