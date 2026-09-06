# Plan a Task

Socratic planning and investigation for features and bugs. Output: `docs/plans/<slug>.md`. May also produce `docs/architecture/adr/NNNN-<slug>.md`.

**For features:** Reads the codebase and asks adversarial questions one at a time until shared understanding is reached, verifies the proposed solution against concrete examples, then writes a spec.

**For bugs:** Investigates root cause through the codebase first (reads relevant files, traces data flow, forms a hypothesis), builds shared understanding with the user through real data and examples, then writes a spec.

**The plan is the last thing written — not the first.** Reaching agreement on the what and the how comes before any document is produced. Do not write the plan until the user has confirmed the solution handles all known cases.

## Steps

### 0. Check for an existing related plan — before anything else

Read [`docs/plans/INDEX.md`](../plans/INDEX.md) — one row per active plan (area, title, status, type) — and scan the rows in the same `area` as this task for one touching the same component/feature/bug class, even if the current ask feels small or unrelated to what that plan's title suggests.

- If one fits (e.g. this is a follow-on, a regression from it, or the same bug class), extend that plan with a new `## Addendum` section instead of creating a new file — do not create a new plan file. Reset its frontmatter `status` to `ready-to-implement` if it was `implemented`, then regenerate `INDEX.md` (`.claude/skills/scripts/gen-plans-index.sh`).
- If genuinely unrelated to anything existing, proceed to a new plan file as normal.

This check is a literal, mandatory action every time — it has been skipped before despite being documented, so read `INDEX.md`; don't rely on memory. `INDEX.md` lists only active plans; the ~100 finished plans in [`docs/plans/archive/`](../plans/archive/INDEX.md) are history — never open one for context, its durable content is in `docs/architecture/decisions/*.md` + ADRs. Reading a full plan file at all is only for the one active plan you are extending here (or, in `/start-fq-task`, implementing).

### 1. Load context — mandatory gate, before investigating or writing anything

- Read `docs/architecture/DECISIONS.md` (the index): its Non-negotiable Invariants block always, plus the 1–3 `docs/architecture/decisions/*.md` domain files whose area this task touches — not every domain file. When a decision the task touches links an ADR in `docs/architecture/adr/`, open that ADR too for the full constraint, encoding contract, or invariant behind the summary. Treat all of it as non-negotiable: the plan must not contradict it, and if it needs to, raise that with the user explicitly and supersede it (flip the section's `**Status:**`) — never override silently.
- Read the relevant standards file(s) from `docs/standards/` based on the task domain.
- **If step 0 found an existing plan to extend, read that plan in full — especially its `Constraints` and `What NOT to Do` sections.** If it still carries a `## Addendum` (rare — addenda are folded into the body on ship), the newest one is the current source of truth and approaches a later addendum revised are dead. Your new addendum must stay consistent with every still-active constraint above it.

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
- If the task integrates with or wraps a third-party package, check its **full** catalog before scoping around it — not just whatever subset is already installed locally. What's installed reflects one machine's history, not what the package actually offers; scoping from it risks reinventing something the package already ships. Use the package's own listing command (e.g. `npx skills add <source> -l` for a skills.sh-sourced package) or read its upstream repo directly. #571 initially scoped `detect-fleet`/`setup-fq-fleet` around 4 already-installed delegate skills before discovering the source package shipped 18, including one (`delegate-setup`) that already solved most of the task — see [ADR 0063](../architecture/adr/0063-fleet-detection-wraps-delegate-setup.md).

**UI tasks.** If the task involves components, pages, layout, or styling, consult `docs/design/design-principles.md` and `docs/standards/styling.md` (including its Motion section) during investigation, and list any UI/UX concerns — contrast, hierarchy, spacing scale, RTL/LTR parity, touch targets, reduced motion — directly in the plan.

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

### 3b. Sweep the plan before marking it ready

A single self-review over a large plan is not sufficient — in practice successive passes keep
finding real defects after the plan has already been declared correct. Before setting
`status: ready-to-implement`, re-read the finished plan against these questions specifically,
rather than reading it for general correctness:

- **Does an existing test assert the behaviour this plan changes?** `grep` the e2e and unit specs
  for the components and routes named in `Files to Change`. A plan that silently invalidates a
  passing test is incomplete, not "cleanup later".
- **Does anything here read or write through the service worker?** Any same-origin `GET /api/*` is
  cached 24h by `defaultCache` — see the Non-negotiable Invariants block in `DECISIONS.md`.
- **Does any state derive from a signal that behaves differently offline?** `useSession()`,
  `navigator.onLine`, and anything with a network timeout.
- **Every claim of "unchanged", "untouched", "no migration", "reuses the existing X" is a
  hypothesis** — open the file and confirm it. This is where a plan is most confidently wrong.
- **Does a removed or relocated UI affordance leave any breakpoint or route without access?**
  (the rule already stated in step 2).

Record what the sweep found in the plan's `Decisions Made`, including corrections to the plan's
own earlier claims — a plan that quietly fixes itself teaches the next reader nothing.

### 4. ADR check — do this before writing the plan

Ask yourself: did the investigation surface any non-obvious architectural decisions — constraints, encoding contracts, font pairings, security rules, data-flow invariants — that a future developer would not know from reading the code?

If yes:
- Determine the next ADR number (`ls docs/architecture/adr/` to check)
- Create `docs/architecture/adr/NNNN-<slug>.md` now, before writing the plan
- Add the summary + ADR link as a `## ` section (with a `**Status:** active` line) in the matching `docs/architecture/decisions/*.md` domain file. If it introduces a whole new domain, create the file and add its row to the Domains table in `DECISIONS.md`. If it is a cross-cutting rule, also add a one-liner to `DECISIONS.md`'s Non-negotiable Invariants block.

If no new decisions: skip this step.

### 5. Ensure a task ticket exists

Every task should have a ticket in your project management system before implementation starts. Check whether one already covers this work; if not, create one with the plan's title, a one-paragraph summary, and a reference to `docs/plans/<slug>.md`.

### 6. Write the plan

Write `docs/plans/<slug>.md` (or the addendum if extending an existing plan) with the content below, then regenerate the index: `.claude/skills/scripts/gen-plans-index.sh`. Stage `INDEX.md` alongside the plan.

---

## Plan file format

Every plan opens with a YAML frontmatter block ([ADR 0059](../architecture/adr/0059-plan-lifecycle-frontmatter-and-index.md)) — this is what `INDEX.md` is generated from:

```yaml
---
title: <matches the # H1>
type: bug | feature | chore
date: YYYY-MM-DD
status: ready-to-implement    # ready-to-implement | in-progress | implemented | superseded | unknown
area: <one value>             # see the vocabulary in ADR 0059 — mirrors decisions/ domains + workflow/infra
supersedes: [<slug>]          # other plan slugs this replaces; omit if none
issue: <bare number>          # omit if none
adr: [<NNNN>]                 # omit if none
---
```

`area` must be one of the fixed vocabulary in ADR 0059 (`rendering`, `reader`, `nav`, `marks`, `recitation`, `pwa`, `db`, `api`, `search`, `theming`, `awrad`, `a11y`, `ci`, `release`, `workflow`, `observability`, `seeder`, `surah-layout`, `tafsir`) — never free text.

```markdown
# <Task Title>

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

`## What NOT to Do` is a required section — the implement workflow reads it to avoid re-implementing a superseded approach. If nothing is ruled out yet, keep the heading with a single "None known" bullet rather than omitting it.

If step 4 produced an ADR that already spells out a decision table or if/then logic in full, `## Decision Tree / Algorithm` should **link to that ADR section** rather than reproduce the table verbatim — two copies of the same table drift the moment one is edited and the other isn't (caught by `/review-fq-work` on #571, where the plan's copy of an ADR's `cost_tier` table had already gone stale relative to the ADR's).

---

## Anti-patterns to avoid

- Do not create a new plan file without first checking `docs/plans/INDEX.md` for an existing related one — extend it instead if the bug/feature class matches.
- Do not hand-edit `docs/plans/INDEX.md` — it is generated. Change a plan's frontmatter, then run `gen-plans-index.sh`.
- Do not write a plan that contradicts an ADR or a still-active constraint/`What NOT to Do` item in the plan you are extending. If the task genuinely requires overriding one, surface it to the user and supersede it explicitly — never silently.
