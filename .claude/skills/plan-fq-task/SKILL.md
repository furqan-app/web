---
name: plan-fq-task
description: Socratic planning and investigation for Furqan features and bugs. Produces a docs/plans/<slug>.md spec before any code is written.
---

# /plan-fq-task

Socratic planning and investigation for features and bugs.

## What this skill does

**For features:** Reads the codebase and asks adversarial questions one at a time until shared understanding is reached, then writes a spec.

**For bugs:** Investigates root cause through the codebase first (reads relevant files, traces data flow, forms a hypothesis), then documents findings.

Output: `docs/plans/<slug>.md`.

## Steps

1. **Load context**
   - Read `docs/architecture/DECISIONS.md`
   - Read the relevant standards file(s) from `docs/standards/` based on the task domain

2. **Investigate (bugs) or clarify (features)**

   For bugs:
   - Trace the bug through the codebase before asking anything
   - Read all files in the relevant data flow
   - Form a root cause hypothesis
   - Then present your findings and ask any remaining clarifying questions

   For features:
   - Read the parts of the codebase the feature will touch
   - Ask one adversarial question at a time — wait for the answer before asking the next
   - Questions should surface: scope ambiguity, edge cases, mobile/RTL behavior, interaction with existing systems, timing concerns
   - Stop when you have 95% confidence in what needs to be built

3. **Write the plan**
   - Create `docs/plans/<slug>.md` with:
     - What we're building / what the bug is
     - Root cause (bugs) or approach (features)
     - Files to change and what changes
     - Edge cases and decisions made
     - What NOT to do (constraints discovered)

4. **Record decisions**
   - If any architectural decisions were made during planning, update `docs/architecture/DECISIONS.md`
   - If significant enough, create a `docs/architecture/adr/NNNN-<slug>.md`

## Plan file format

```markdown
# <Task Title>

**Type:** feature | bug  
**Date:** YYYY-MM-DD  
**Status:** ready-to-implement

## Summary
One paragraph.

## Root Cause / Approach
...

## Files to Change
- `path/to/file.ts` — what changes and why
- ...

## Constraints
- ...

## Decisions Made
- ...
```
