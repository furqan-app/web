---
name: plan-fq-task
description: Socratic planning and investigation for Furqan features and bugs. Produces a docs/plans/<slug>.md spec before any code is written.
---

# /plan-fq-task

Socratic planning and investigation for features and bugs.

## What this skill does

**For features:** Reads the codebase and asks adversarial questions one at a time until shared understanding is reached, verifies the proposed solution against concrete examples, then writes a spec.

**For bugs:** Investigates root cause through the codebase first (reads relevant files, traces data flow, forms a hypothesis), builds shared understanding with the user through real data and examples, then writes a spec.

**The plan is the last thing written — not the first.** Reaching agreement on the what and the how comes before any document is produced. Do not write the plan until the user has confirmed the solution handles all known cases.

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
   - Present your findings clearly — what you found, what you think the root cause is, and what approach you'd take — then ask **one clarifying question** at a time
   - Wait for each answer before asking the next

   For features:
   - Read the parts of the codebase the feature will touch
   - Ask one adversarial question at a time — wait for the answer before asking the next
   - Questions should surface: scope ambiguity, edge cases, mobile/RTL behavior, interaction with existing systems, timing concerns
   - If the task removes or relocates an existing UI trigger/control, explicitly verify every breakpoint and route that used it still has equivalent access before writing "unchanged" anywhere in the plan — check what else depends on it, don't assume. (A past plan removed an always-visible floating sidebar trigger and replaced it with a mobile-only one, silently leaving desktop with no way to open the sidebar — see `docs/plans/mobile-nav-ux.md` Addendum 3.)

3. **Verify the solution together — before writing anything**

   First, assess task complexity. A task is **simple** if it meets ALL of these:
   - The change is in one obvious place with no branching logic
   - There are no edge cases (nothing that could behave differently based on data, state, or context)
   - The solution is fully visible from reading the code — no derivation, no algorithm, no classification

   Examples of simple tasks: fix a typo, swap a color token, change a CSS value, add a missing translation key, rename a prop.

   **For simple tasks:** State the change in one sentence and ask "does this look right?" — one confirmation, then write the plan.

   **For everything else (any branching logic, algorithm, data derivation, or non-obvious edge case):** Run the full verification below. Do not skip it because the solution "seems clear" — this session's surah banner bug looked straightforward and still had non-trivial cases (bismillah-only pages, mid-page starts, multi-surah pages) that only surfaced through shared verification.

   - **Propose the decision tree, not just the approach.** For any logic with branching (conditions, rules, classifications), lay it out explicitly — a table or if/then list — so the user can read it and spot gaps. Do not describe it in prose and call it done.
   - **Ask the user for concrete test cases.** Say: "Can you share some real examples — page data, DB output, screenshots — so we can walk through them?" If the user already shared data earlier in the conversation, use it now.
   - **Walk through every example together.** For each case the user provides, show what your algorithm/approach would produce for that specific input. Explain the reasoning step by step. This is not optional even when the answer seems obvious — the act of saying it out loud is what surfaces wrong assumptions.
   - **Ask one verification question at a time.** If a case is ambiguous, resolve it before moving to the next. If an example breaks the proposed approach, revise the approach and re-verify — do not proceed to the plan with an unresolved case.
   - **Do not write the plan until the user confirms all cases are handled correctly.** The signal is explicit agreement: "yes", "that's right", "looks good" — not silence or the absence of objection.

4. **ADR check — do this before writing the plan**

   Ask yourself: did the investigation surface any non-obvious architectural decisions — constraints, encoding contracts, font pairings, security rules, data-flow invariants — that a future developer would not know from reading the code?

   If yes:
   - Determine the next ADR number (`ls docs/architecture/adr/` to check)
   - Create `docs/architecture/adr/NNNN-<slug>.md` now, before writing the plan
   - Update `docs/architecture/DECISIONS.md` with a summary and a link to the ADR

   If no new decisions: skip this step.

5. **Ensure a Trello ticket exists**

   Every task must have a Trello ticket on the "Furqan" board before implementation starts (see `mcp__trello__get_active_board_info`).

   - Check whether a card already covers this work (`mcp__trello__get_cards_by_list_id` across the relevant lists, or ask the user if unsure).
   - If none exists, create one in the **Todo** list (`mcp__trello__add_card_to_list`):
     - Title: the plan's task title
     - Description: one-paragraph summary from the plan, plus a link/reference to `docs/plans/<slug>.md`
     - Label: `Feature` or `Bug` matching the plan's `Type`
   - Note the card ID/URL — `/start-fq-task` and `/ship-fq-task` will need it later.

6. **Create the worktree**

   Derive the slug from the planned filename (e.g. `fix-search-debounce`). Then:

   - Check whether a worktree already exists: `git worktree list | grep furqan-<slug>`
   - If one exists, skip the rest of this step — the plan will be written into that worktree in step 7.
   - If none exists:
     1. Derive the branch name from the Trello card using the project convention: `<type>/<card-short-id>-<short-description>` (e.g. `feature/83-git-worktrees-workflow`)
     2. Check whether the branch already exists: `git branch --list <branch-name>`
        ```bash
        # Branch does NOT exist yet:
        git worktree add ../furqan-<slug> -b <branch-name>

        # Branch already exists:
        git worktree add ../furqan-<slug> <branch-name>
        ```
     3. Record the entry in `~/.claude/furqan-worktrees.json` (merge with existing — do not overwrite):
        ```json
        { "<slug>": { "worktreePath": "../furqan-<slug>", "branch": "<branch-name>" } }
        ```
        Omit `port` here — it is assigned by `/start-fq-task` when the dev server is started.

   **Do not** symlink `node_modules`, `.env.local`, or start a dev server here — those steps belong in `/start-fq-task`.

   After creating (or finding) the worktree, resolve its **absolute path** once — `git worktree list | grep furqan-<slug> | awk '{print $1}'` — and use that absolute path (`<abs>` below) for every subsequent file write and command. Never build paths from the relative `../furqan-<slug>` form: it resolves against the shell's cwd, and the Write tool silently creates any missing directories, so a wrong resolution has produced plan files in a stray directory outside the repo.

7. **Write the plan**
   - Write all plan-phase files into the worktree (at its resolved absolute path `<abs>`), not the main repo:
     - Plan: `<abs>/docs/plans/<slug>.md`
     - ADR (if created in step 4): `<abs>/docs/architecture/adr/NNNN-<slug>.md`
     - DECISIONS.md update (if any): `<abs>/docs/architecture/DECISIONS.md`
   - Plan content:
     - What we're building / what the bug is
     - Root cause (bugs) or approach (features)
     - The verified decision tree / algorithm (include the table or if/then list agreed in step 3)
     - The concrete examples that were walked through and their expected outputs
     - Files to change and what changes
     - Edge cases and decisions made
     - What NOT to do (constraints discovered)
     - Reference any ADRs created in step 4

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

## Decision Tree / Algorithm
The verified if/then logic or classification table agreed with the user in step 3.

## Verified Test Cases
The concrete examples walked through in step 3 and what the algorithm produces for each.

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
- Do not write the plan before step 3 is complete and the user has confirmed all cases.
- Do not run the full verification loop on simple tasks (one obvious location, no branching, no edge cases) — a single "does this look right?" confirmation is enough.
- Do not describe the decision tree in prose — make it a table or explicit if/then list the user can read and verify.
- Do not treat silence as agreement — wait for an explicit confirmation before writing the plan.
- Do not skip the ADR check — run it explicitly before writing the plan.
- Do not put the ADR check after the plan — it must come before.
- Do not write plan files into the main repo working tree — they must go into the worktree created in step 6, addressed by its resolved **absolute** path. Writing to the main repo leaves them absent from the feature branch; writing via the relative `../furqan-<slug>` form has created stray directories outside the repo.
- Do not create the worktree before the Trello card exists — the branch name is derived from the card.
- Do not add an addendum while the branch is still open — edit the plan in place instead. Addenda are for corrections made when returning to a merged task on a new branch; mid-task they just create reconciliation noise.
- Do not write documentation (plans, COMPONENTS.md, DECISIONS.md, standards files) with illustrative code blocks when a prose rule captures the constraint fully — one tight sentence beats a code block. Keep a code example only when the exact syntax or shape is the constraint (e.g. an API envelope, a Prisma field name, a non-obvious import path).
