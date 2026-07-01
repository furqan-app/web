# Plan: /retrospect skill

**Date:** 2026-06-29  
**Status:** implemented

---

## Goal

A consciously-triggered skill that closes the feedback loop after a meaningful session. It reads the conversation history to infer what happened, then proposes targeted improvements to the workflow — review-before-write.

---

## Trigger

User types `/retrospect` at the end of a session.

---

## What it does

### Phase 1 — Infer from conversation history
Reads the current session and extracts:
- Decisions made (architectural, tooling, process)
- Problems hit and how they were resolved
- Skills that felt incomplete, missing, or misused
- Anything that felt like a workflow gap or friction point
- New considerations that should be tracked

### Phase 2 — Propose outputs (one at a time, review-before-write)

1. **DECISIONS.md additions** — new decisions surfaced this session that aren't already documented
2. **Skill edits / flags** — which skills need updating, what specifically is wrong or missing, or whether a new skill is needed
3. **Memory saves** — new user/project/feedback/reference items worth persisting

Each proposed change is shown to the user for approval before being written.

### Phase 3 — Save the retrospective file
Once approved changes are written, save a dated snapshot to:
`docs/retrospectives/YYYY-MM-DD.md`

The file records: session summary, what was changed, what was flagged for later.

---

## Output file format

```md
# Retrospective — YYYY-MM-DD

## Session Summary
[1–2 sentence description of what the session covered]

## Changes Made
- [x] Added decision to DECISIONS.md: …
- [x] Updated skill /foo: …
- [x] Saved memory: …

## Flagged for Later
- Skill /bar needs attention: …
- Consider adding skill /baz for …

## Open Considerations
- …
```

---

## Resolved Decisions

1. `/retrospect` **scans `DECISIONS.md` for stale/superseded decisions** and flags them alongside proposing new ones.
2. If no meaningful learnings are found, it **exits cleanly** with a message — no file is written.

---

## Not in scope

- Reviewing code quality (that's `/review-fq-work`)
- Automatic triggering — always consciously invoked
- Editing skill files directly without user approval
