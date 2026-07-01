# Retrospect: Confirm Before Saving File

**Type:** bug
**Date:** 2026-07-02
**Status:** implemented

## Summary

`.claude/skills/retrospect/SKILL.md`'s Step 4 currently writes `docs/retrospectives/YYYY-MM-DD.md` automatically once Step 3's per-item approvals (DECISIONS.md changes, skill edits, memory saves) are done. The user wants an explicit yes/no confirmation before that file is generated, distinct from the per-item approvals in Step 3.

## Root Cause / Approach

Step 3 already gates individual content changes one at a time ("review-before-write"), but the retrospective snapshot file itself has no separate gate — it's implied to always be written once Step 3 finishes. Add an explicit confirmation between Step 3 and Step 4: ask the user whether to save the retrospective file; only proceed to Step 4 if they agree. Declining does not undo the already-approved Step 3 changes — those are independent artifacts (DECISIONS.md, skill files, memory) that stay written regardless.

## Files to Change

- `.claude/skills/retrospect/SKILL.md`:
  - Insert a new step ("### 4 — Confirm before saving") between the current Step 3 and Step 4, asking the user e.g. "Save a retrospective file for this session?" and stopping without writing if declined.
  - Renumber the current Step 4 ("Save the retrospective file") to Step 5.
  - Add an anti-pattern: "Do not write the retrospective file without an explicit save confirmation, even if all individual changes were approved."

## Edge Cases

- User approved zero changes in Step 3 (nothing to propose) but the session still had meaningful learnings worth summarizing — the confirmation step still applies; ask before saving regardless of whether Step 3 had any approvals.
- User declines the save confirmation — stop cleanly, do not write `docs/retrospectives/YYYY-MM-DD.md`. Already-approved DECISIONS.md/skill/memory changes from Step 3 remain as-is.

## Constraints

- Do not change Step 3's existing per-item approval behavior — this adds one more gate specifically for the file-save action, it doesn't replace the existing gates.
- Do not conflate this confirmation with the "if nothing meaningful is found, stop" early-exit in Step 1 — that's a different, earlier gate for a different condition (no learnings at all vs. user declining to snapshot).

## Decisions Made

- The new confirmation is a single yes/no question asked once, after all Step 3 approvals are resolved, before any retrospective file is written.
