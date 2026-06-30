# AI-First Documentation & Workflow System

**Date:** 2026-06-28  
**Status:** Implemented (extended 2026-06-29 with /retrospect and /review-fq-work)  
**Applies to:** All contributors and their AI agents

---

## Goal

Establish a documentation system and task workflow that eliminates AI context loss between sessions, ensures all contributors (human and AI) follow the same conventions, and enforces discipline around decisions — without creating a maintenance burden heavier than the work itself.

---

## Problems Being Solved

- **AI loses context between sessions** — Every new session starts cold. Agents repeat mistakes or ignore past decisions.
- **No single source of current truth** — ADRs pile up and no one knows which decision is still active without reading them all.
- **CLAUDE.md burns tokens every session** — All context is loaded always, even when irrelevant to the current task.
- **Team agents have no shared standards** — Multiple contributors and their AI agents produce inconsistent code with no guardrails.

---

## Documentation Structure

```
docs/
  product/              # PRD, BRD, feature specs
  architecture/
    DECISIONS.md        # ← LIVING FILE: current state of all decisions (agents load this)
    adr/                # historical audit trail — humans read, agents don't
  standards/
    api-conventions.md
    component-patterns.md
    database.md
    i18n.md
    styling.md
  plans/                # per-task implementation plans (output of /plan-fq-task skill)
  retrospectives/       # dated retro files (output of /retrospect skill)

.claude/
  skills/               # project-scoped skills (committed, shared with team)

CLAUDE.md               # slim pointer file only — no heavy content
```

---

## CLAUDE.md Design

CLAUDE.md becomes a 5-line entry point: project overview + pointers to `docs/`. No architecture detail, no standards, no decisions. Heavy content lives in `docs/` and is loaded on-demand by skills — not burned on every session.

---

## Decisions Made

| Decision | Chosen | Rejected |
|----------|--------|----------|
| CLAUDE.md scope | Slim pointer + on-demand loading | Single monolithic file |
| Decision history | DECISIONS.md living file + ADR archive | ADR-only history |
| Task flow | Unified 2-skill flow for everything | Separate flows for features vs bugs |
| Standards files | Split by concern | Single STANDARDS.md |

---

## Project Skills (`.claude/skills/`)

### `/plan-fq-task`
- **For features:** Asks adversarial Socratic questions one at a time until shared understanding is reached, then writes a spec
- **For bugs:** Investigates root cause through the codebase first, then documents findings
- **Output:** `docs/plans/<slug>.md`
- **Auto-records decisions at end**

### `/start-fq-task`
- Loads `DECISIONS.md` + relevant standard(s) from `docs/standards/` + the plan file
- Implements without needing to re-explain the project or conventions
- **Auto-records any new decisions at end**

### `/review-fq-work`
- Spawns Opus subagent to review the branch diff vs main
- Three dimensions: bugs & correctness, code quality & duplication, plan consistency
- Terminal output only — findings only, no fixes

### `/retrospect`
- End-of-session feedback loop
- Scans conversation history + DECISIONS.md for stale entries
- Proposes changes review-before-write (one at a time, nothing written without approval)
- Saves `docs/retrospectives/YYYY-MM-DD.md`

---

## Task Workflow

```
1. /plan-fq-task   → Socratic grilling → plan file + decisions recorded
2. /start-fq-task  → Load context → implement → decisions recorded
3. /review-fq-work → Opus quality gate (bugs, duplication, plan consistency)
4. Commit + PR + move Trello card to Done
5. /retrospect     → Capture learnings, update DECISIONS.md/skills/memories
```

Same flow for every task — feature or bug, no exceptions.

---

## Standards Files

| File | Covers |
|------|--------|
| `api-conventions.md` | Route structure, response shape, auth patterns, error handling |
| `component-patterns.md` | Server vs Client components, when to use each, hydration rules |
| `database.md` | Prisma patterns, query conventions (will expand after DB split decision) |
| `i18n.md` | Translation key naming, locale handling, RTL/LTR rules |
| `styling.md` | Tailwind conventions, dark mode, responsive breakpoints |

---

## Next Steps

### P1 — Foundation
- [x] Slim down `CLAUDE.md` to pointer-only format
- [x] Create `docs/` folder structure (`product/`, `architecture/`, `standards/`, `plans/`, `retrospectives/`)
- [x] Create `docs/architecture/DECISIONS.md` pre-populated with current project decisions
- [x] Write the 5 initial standards files with current conventions
- [x] Build `/plan-fq-task` skill in `.claude/skills/`
- [x] Build `/start-fq-task` skill in `.claude/skills/`
- [x] Build `/retrospect` skill — end-of-session feedback loop
- [x] Build `/review-fq-work` skill — Opus branch quality gate

### P2 — Product context
- [ ] Write project-level PRD in `docs/product/`

### P3 — Retroactive docs
- [x] Document existing architecture decisions in `DECISIONS.md`
