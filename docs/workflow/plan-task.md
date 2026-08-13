# Plan a Task

Socratic planning and investigation for features and bugs. Output: `docs/plans/<slug>.md`. May also produce `docs/architecture/adr/NNNN-<slug>.md`.

**For features:** Reads the codebase and asks adversarial questions one at a time until shared understanding is reached, verifies the proposed solution against concrete examples, then writes a spec.

**For bugs:** Investigates root cause through the codebase first (reads relevant files, traces data flow, forms a hypothesis), builds shared understanding with the user through real data and examples, then writes a spec.

**The plan is the last thing written — not the first.** Reaching agreement on the what and the how comes before any document is produced. Do not write the plan until the user has confirmed the solution handles all known cases.

## Steps

### 0. Check for an existing related plan — before anything else

Run `ls docs/plans/` and scan for a plan touching the same component/feature/bug class, even if the current ask feels small or unrelated to what that plan's title suggests.

- If one fits (e.g. this is a follow-on, a regression from it, or the same bug class), extend that plan with a new `## Addendum` section instead of creating a new file — do not create a new plan file. Reset its `Status` to `ready-to-implement` if it had been marked `implemented`.
- If genuinely unrelated to anything existing, proceed to a new plan file as normal.

This check is a literal, mandatory action every time — it has been skipped before despite being documented, so run the `ls`/grep; don't rely on memory.

### 1. Load context — mandatory gate, before investigating or writing anything

- Read `docs/architecture/DECISIONS.md` — its entries are your working set of active decisions. When a decision the task touches links an ADR in `docs/architecture/adr/`, open that ADR too for the full constraint, encoding contract, or invariant behind the summary. Treat both as non-negotiable: the plan must not contradict them, and if it needs to, raise that with the user explicitly and supersede it — never override silently.
- Read the relevant standards file(s) from `docs/standards/` based on the task domain.
- **If step 0 found an existing plan to extend, read that plan in full — every addendum, and especially its `Constraints` and `What NOT to Do` sections.** In a plan with multiple addenda the newest one is the current source of truth; approaches a later addendum revised or reverted are dead — never re-propose them. Your new addendum must stay consistent with every still-active constraint above it.

### 2. Investigate (bugs) or clarify (features)

**Query the graph first.** If `graphify-out/graph.json` exists, run `graphify query "<question>"` (or `graphify path "A" "B"` for a specific relationship) before reading files manually — it's cheaper than grepping cold. Use its answer as your map to the relevant files. If it has no answer, is stale, or doesn't exist, fall back to manual tracing below without commenting on it.

**For bugs:**
- Trace the bug through the codebase before asking anything
- Read all files in the relevant data flow
- Form a root cause hypothesis
- Present your findings clearly — what you found, what you think the root cause is, and what approach you'd take — then ask **one clarifying question** at a time
- Wait for each answer before asking the next

**For features:**
- Read the parts of the codebase the feature will touch
- Ask one adversarial question at a time — wait for the answer before asking the next
- Questions should surface: scope ambiguity, edge cases, mobile/RTL behavior, interaction with existing systems, timing concerns
- If the task removes or relocates an existing UI trigger/control, explicitly verify every breakpoint and route that used it still has equivalent access before writing "unchanged" anywhere in the plan — check what else depends on it, don't assume.

**UI-mode design pass.** If the task involves components, pages, layout, or styling, run `/impeccable critique` (or `audit` for a technical-quality-leaning task) against the files under investigation. If it returns findings with suggested commands, carry them into a `## Design Remediation` section in the plan (see Plan file format below) — `command → target file(s)`, taken verbatim from each finding's suggested command. No findings, or a non-UI task: skip the section (ADR 0041).

### 3. Verify the solution together — before writing anything

First, assess task complexity. A task is **simple** if it meets ALL of these:
- The change is in one obvious place with no branching logic
- There are no edge cases (nothing that could behave differently based on data, state, or context)
- The solution is fully visible from reading the code — no derivation, no algorithm, no classification

Examples of simple tasks: fix a typo, swap a color token, change a CSS value, add a missing translation key, rename a prop.

**For simple tasks:** State the change in one sentence and ask "does this look right?" — one confirmation, then write the plan.

**For everything else (any branching logic, algorithm, data derivation, or non-obvious edge case):** Run the full verification below.

- **Propose the decision tree, not just the approach.** For any logic with branching (conditions, rules, classifications), lay it out explicitly — a table or if/then list — so the user can read it and spot gaps. Do not describe it in prose and call it done.
- **Ask the user for concrete test cases.** Say: "Can you share some real examples — page data, DB output, screenshots — so we can walk through them?" If the user already shared data earlier in the conversation, use it now.
- **Walk through every example together.** For each case the user provides, show what your algorithm/approach would produce for that specific input. Explain the reasoning step by step.
- **Ask one verification question at a time.** If a case is ambiguous, resolve it before moving to the next. If an example breaks the proposed approach, revise the approach and re-verify — do not proceed to the plan with an unresolved case.
- **Do not write the plan until the user confirms all cases are handled correctly.** The signal is explicit agreement: "yes", "that's right", "looks good" — not silence or the absence of objection.

### 4. ADR check — do this before writing the plan

Ask yourself: did the investigation surface any non-obvious architectural decisions — constraints, encoding contracts, font pairings, security rules, data-flow invariants — that a future developer would not know from reading the code?

If yes:
- Determine the next ADR number (`ls docs/architecture/adr/` to check)
- Create `docs/architecture/adr/NNNN-<slug>.md` now, before writing the plan
- Update `docs/architecture/DECISIONS.md` with a summary and a link to the ADR

If no new decisions: skip this step.

### 5. Ensure a task ticket exists

Every task should have a ticket in your project management system before implementation starts. Check whether one already covers this work; if not, create one with the plan's title, a one-paragraph summary, and a reference to `docs/plans/<slug>.md`.

### 6. Write the plan

Write `docs/plans/<slug>.md` (or the addendum if extending an existing plan) with the content below.

---

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

## Design Remediation
(UI tasks only, omit entirely otherwise) `command → target file(s)` pairs from the Step 2 `/impeccable critique`/`audit` pass, for `/start-fq-task` to execute after implementation (ADR 0041).

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

`## What NOT to Do` is a required section — the implement workflow reads it to avoid re-implementing a superseded approach. If nothing is ruled out yet, keep the heading with a single "None known" bullet rather than omitting it.

---

## Anti-patterns to avoid

- Do not create a new plan file without first checking `docs/plans/` for an existing related one — extend it instead if the bug/feature class matches.
- Do not write a plan that contradicts an ADR or a still-active constraint/`What NOT to Do` item in the plan you are extending. If the task genuinely requires overriding one, surface it to the user and supersede it explicitly — never silently.
