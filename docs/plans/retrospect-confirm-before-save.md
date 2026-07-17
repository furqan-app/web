# Retrospect: Confirm Before Saving File

**Type:** bug  
**Date:** 2026-07-02  
**Status:** implemented

## Summary

`/retrospect` Step 4 was writing `docs/retrospectives/YYYY-MM-DD.md` automatically after all per-item approvals. Add an explicit yes/no confirmation gate before that file is generated. Declining does not undo already-approved DECISIONS.md/skill/memory changes from Step 3.

## Files Changed

- `.claude/skills/retrospect/SKILL.md` — insert new "Confirm before saving" step between Step 3 and Step 4; renumber current Step 4 to Step 5; add anti-pattern: "Do not write the retrospective file without an explicit save confirmation."
