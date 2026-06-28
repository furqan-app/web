---
name: plan-fq-task
description: Socratic planning and investigation for Furqan features and bugs. Produces a docs/plans/<slug>.md spec before any code is written.
---

# /plan-fq-task

Socratic planning and investigation for features and bugs.

## What this skill does

**For features:** Reads the codebase and asks adversarial questions one at a time until shared understanding is reached, then writes a spec.

**For bugs:** Investigates root cause through the codebase first (reads relevant files, traces data flow, forms a hypothesis), then asks clarifying questions one at a time until fully resolved.

Output: `docs/plans/<slug>.md`. May also produce `docs/architecture/adr/NNNN-<slug>.md`.

## Steps

1. **Load context**
   - Read `docs/architecture/DECISIONS.md`
   - Read the relevant standards file(s) from `docs/standards/` based on the task domain

2. **Investigate (bugs) or clarify (features)**

   For bugs:
   - Trace the bug through the codebase before asking anything
   - Read all files in the relevant data flow
   - Form a root cause hypothesis
   - Present findings, then ask clarifying questions **one at a time** — wait for each answer before asking the next
   - Do not write the plan until all questions are fully resolved

   For features:
   - Read the parts of the codebase the feature will touch
   - Ask one adversarial question at a time — wait for the answer before asking the next
   - Questions should surface: scope ambiguity, edge cases, mobile/RTL behavior, interaction with existing systems, timing concerns
   - Do not write the plan until you have 95% confidence in what needs to be built

3. **ADR check — do this before writing the plan**

   Ask yourself: did the investigation surface any non-obvious architectural decisions — constraints, encoding contracts, font pairings, security rules, data-flow invariants — that a future developer would not know from reading the code?

   If yes:
   - Determine the next ADR number (`ls docs/architecture/adr/` to check)
   - Create `docs/architecture/adr/NNNN-<slug>.md` now, before writing the plan
   - Update `docs/architecture/DECISIONS.md` with a summary and a link to the ADR

   If no new decisions: skip this step.

4. **Write the plan**
   - Create `docs/plans/<slug>.md` with:
     - What we're building / what the bug is
     - Root cause (bugs) or approach (features)
     - Files to change and what changes
     - Edge cases and decisions made
     - What NOT to do (constraints discovered)
     - Reference any ADRs created in step 3

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

## Anti-patterns to avoid

- Do not ask multiple questions at once — one at a time, always.
- Do not write the plan before all questions are resolved.
- Do not skip the ADR check — run it explicitly before writing the plan.
- Do not put the ADR check after the plan — it must come before.
