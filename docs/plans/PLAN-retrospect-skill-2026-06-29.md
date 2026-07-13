# Plan: /retrospect skill

**Date:** 2026-06-29  
**Status:** implemented

## Goal

End-of-session skill that reads conversation history, proposes targeted workflow improvements review-before-write, and saves a dated retrospective file.

## What It Does

**Phase 1 — Infer from conversation:**
- Decisions made (architectural, tooling, process)
- Problems hit and how resolved
- Skills that felt incomplete, missing, or misused
- Workflow gaps or friction points

**Phase 2 — Propose outputs (one at a time, review-before-write):**
1. `DECISIONS.md` additions — new decisions not yet documented
2. Skill edits / flags — what specifically needs updating or is missing
3. Memory saves — new user/project/feedback/reference items

Also scans `DECISIONS.md` for stale/superseded decisions and flags them alongside new proposals. If no meaningful learnings are found, exits cleanly — no file written.

**Phase 3 — Save retrospective to `docs/retrospectives/YYYY-MM-DD.md`**

```md
# Retrospective — YYYY-MM-DD

## Session Summary
## Changes Made
## Flagged for Later
## Open Considerations
```

## Scope

Not in scope: code quality review (that's `/review-fq-work`), automatic triggering, editing skill files without user approval.
