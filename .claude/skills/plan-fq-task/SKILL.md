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

0. **Check for an existing related plan — before anything else**
   - Run `ls docs/plans/` and scan for a plan touching the same component/feature/bug class, even if the current ask feels small or unrelated to what that plan's title suggests.
   - If one fits (e.g. this is a follow-on, a regression from it, or the same bug class), extend that plan with a new `## Addendum` section instead of creating a new file — do not create a new plan file. Reset its `Status` to `ready-to-implement` if it had been marked `implemented`.
   - If genuinely unrelated to anything existing, proceed to a new plan file as normal.
   - This check is a literal, mandatory action every time, not a background principle — it has been skipped before despite being documented, so don't rely on remembering it; just run the `ls`/grep.

1. **Load context — mandatory gate, before investigating or writing anything**
   - Read `docs/architecture/DECISIONS.md` — its entries are your working set of active decisions. When a decision the task touches links an ADR in `docs/architecture/adr/`, open that ADR too for the full constraint, encoding contract, or invariant behind the summary. Treat both as non-negotiable: the plan must not contradict them, and if it needs to, raise that with the user explicitly and supersede it — never override silently.
   - Read the relevant standards file(s) from `docs/standards/` based on the task domain.
   - **If step 0 found an existing plan to extend, read that plan in full — every addendum, and especially its `Constraints` and `What NOT to Do` sections.** In a plan with multiple addenda the newest one is the current source of truth; approaches a later addendum revised or reverted are dead — never re-propose them (that is where most past rework came from). Your new addendum must stay consistent with every still-active constraint above it.

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
   - If the task removes or relocates an existing UI trigger/control, explicitly verify every breakpoint and route that used it still has equivalent access before writing "unchanged" anywhere in the plan — check what else depends on it, don't assume. (A past plan removed an always-visible floating sidebar trigger and replaced it with a mobile-only one, silently leaving desktop with no way to open the sidebar — see `docs/plans/mobile-nav-ux.md` Addendum 3.)
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

5. **Ensure a Trello ticket exists**

   Every task must have a Trello ticket on the "Furqan" board before implementation starts (see `mcp__trello__get_active_board_info`).

   - Check whether a card already covers this work (`mcp__trello__get_cards_by_list_id` across the relevant lists, or ask the user if unsure).
   - If none exists, create one in the **Todo** list (`mcp__trello__add_card_to_list`):
     - Title: the plan's task title
     - Description: one-paragraph summary from the plan, plus a link/reference to `docs/plans/<slug>.md`
     - Label: `Feature` or `Bug` matching the plan's `Type`
   - Note the card ID/URL — `/start-fq-task` and `/ship-fq-task` will need it later.

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

## What NOT to Do
- ... (approaches ruled out, superseded, or explicitly out of scope)

## Decisions Made
- ...
```

`## What NOT to Do` is a required section — `/start-fq-task` reads it to avoid re-implementing a superseded approach. If nothing is ruled out yet, keep the heading with a single "None known" bullet rather than omitting it.

## Anti-patterns to avoid

- Do not create a new plan file without first checking `docs/plans/` for an existing related one — extend it instead if the bug/feature class matches.
- Do not write a plan that contradicts an ADR or a still-active constraint/`What NOT to Do` item in the plan you are extending. If the task genuinely requires overriding one, surface it to the user and supersede it explicitly — never silently.
- Do not re-propose an approach that a later addendum already revised or reverted.
- Do not ask multiple questions at once — one at a time, always.
- Do not write the plan before all questions are resolved.
- Do not skip the ADR check — run it explicitly before writing the plan.
- Do not put the ADR check after the plan — it must come before.
