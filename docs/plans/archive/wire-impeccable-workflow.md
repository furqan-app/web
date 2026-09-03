---
title: Wire /impeccable into the plan/implement/review workflow
type: feature
date: 2026-08-13
status: superseded
area: workflow
---

# Wire /impeccable into the plan/implement/review workflow

## Summary

`/impeccable` (design/UX skill) and the Furqan Trello/worktree/plan workflow have never talked to each other — `/impeccable critique` was run standalone once (card #206) and its findings hand-copied into a plan. This wires it into three points: `/plan-fq-task` runs critique during UI-mode investigation and records remediation commands in the plan; `/start-fq-task` executes them during implementation; `/review-fq-work` gains a 4th dimension that runs critique on UI diffs. `AGENTS.md` also gains a policy section naming impeccable as the standing UI/UX authority for ad hoc design questions and discussion, not just inside these three skills.

Trello: [#207](https://trello.com/c/jYO7cqNd/207-wire-impeccable-fix-commands-into-start-fq-task-for-ui-tasks).

## Approach

See [ADR 0041](../../architecture/adr/0041-wire-impeccable-into-fq-workflow.md) for the full mechanism and rejected alternatives (Bash CLI shell-out, sub-agent delegation). Summary: every invocation is a direct Skill call (command + explicit target), never a subprocess — this lets impeccable's own routing skip its PRODUCT.md/new-work gates and run the target command's playbook in-process, with full craft-floor.md/context.mjs reasoning available.

## Decision Tree / Algorithm

**1. `/plan-fq-task` (`docs/workflow/plan-task.md`, Step 2 — Investigate/clarify)**

| Condition | Action |
|---|---|
| Task is UI-mode (components/pages/layout/styling) | Run `/impeccable critique <target>` (or `audit` if the task reads as technical-quality-leaning rather than UX) against the files under investigation |
| Critique returns findings with suggested commands | Add a `## Design Remediation` section to the plan: one `command → target file(s)` line per finding, taken verbatim from critique's "Suggested command" |
| Critique returns no findings, or task is not UI-mode | Skip the section entirely — omit, don't write "None" |

**2. `/start-fq-task` (`docs/workflow/start-task.md`, after Step 4 — Implement)**

| Condition | Action |
|---|---|
| Plan has a `## Design Remediation` section | After functional implementation is verified working, execute each entry via direct `/impeccable` Skill call (command + target), in order listed |
| Plan has no such section | Skip — no design commands run |
| A listed target file no longer matches what the plan describes (stale plan) | Reconcile with the user before running the command — same rule `start-task.md` Step 4 already applies to functional changes |

Eligible commands (Evaluate/Refine/Enhance/Fix categories only): `critique`, `audit`, `polish`, `bolder`, `quieter`, `distill`, `harden`, `onboard`, `animate`, `colorize`, `typeset`, `layout`, `delight`, `overdrive`, `clarify`, `adapt`, `optimize`. Never Build/Iterate (`craft`, `shape`, `init`, `document`, `extract`, `live`) — those are pre-implementation planning or standalone-only, not mid-implementation remediation.

**3. `/review-fq-work` (`docs/workflow/review-work.md`)**

| Condition | Action |
|---|---|
| Diff touches UI-relevant files (components, pages, `.css`/`.scss`) | Run `/impeccable critique` on the changed surfaces; fold findings in as Dimension 4 — "Design & UX" — continuing the existing sequential numbering across all 4 dimensions |
| Diff is backend-only | Skip Dimension 4 — report "No issues found" is wrong here; omit the dimension header entirely rather than padding it |

**4. `AGENTS.md`** — new `## impeccable` section (same shape as the existing `## graphify` section): states impeccable is the standing authority for any UI/UX design question, critique, or discussion in this repo — applies in conversation generally, not gated behind these three skills. This documents behavior that mostly already happens via impeccable's own skill-description auto-triggering; the section exists so it's an explicit, durable expectation rather than an implicit one.

## Verified Test Cases

Walked through against the real #206 (`home-page-design-fixes`) precedent — see conversation. If this workflow had existed:

1. `/plan-fq-task` investigates home page (UI-mode) → runs `/impeccable critique app/[locale]/page.tsx` → same critique that actually ran (P0×2, P1×2, P2×1) produces:
   ```
   audit → app/components/SurahListItem.tsx (dark-theme badge contrast, :52)
   polish → app/components/SurahListItem.tsx (card shadow depth)
   distill → app/[locale]/page.tsx (hero sizing)
   clarify → app/components/nav/... (mobile nav icon labels)
   audit → app/components/SurahListItem.tsx (secondary badge contrast, :66)
   ```
2. Plan gets a `## Design Remediation` section with those 5 entries.
3. `/start-fq-task` implements the plan's functional changes, then runs the 5 impeccable invocations against their named targets in the worktree.
4. `check-fq-standards` post-check runs after, unaffected — no overlap with what impeccable checked.
5. Result matches what actually shipped (`0a4d759 fix(nav): fix WCAG contrast, mobile nav collapse, and card depth on home page`), minus the manual copy-paste step that #206 needed.

## Files to Change

- `docs/workflow/plan-task.md` — add the UI-mode critique step and `## Design Remediation` plan section to Step 2/output format
- `.claude/skills/plan-fq-task/SKILL.md` — no change expected (already delegates to the workflow doc); verify during implementation
- `docs/workflow/start-task.md` — add the Design Remediation execution step after Step 4 (Implement)
- `.claude/skills/start-fq-task/SKILL.md` — no change expected; verify during implementation
- `docs/workflow/review-work.md` — add Dimension 4 (Design & UX), update numbering/report format
- `.claude/skills/review-fq-work/SKILL.md` — no change expected; verify during implementation
- `docs/architecture/DECISIONS.md` — done (this plan's own step 4/ADR check, already written)
- `docs/architecture/adr/0041-wire-impeccable-into-fq-workflow.md` — done
- `AGENTS.md` — add `## impeccable` policy section

## Constraints

- `/start-fq-task` never runs an impeccable command the plan didn't name — no freelance design passes mid-implementation.
- `check-fq-standards` stays unchanged; no dedup logic needed against impeccable's checks.
- Dimension 4 in `/review-fq-work` only runs conditionally (UI-touching diffs) — don't force it on every review.
- This is a tooling/meta change (`.claude/`, `docs/workflow/`, `AGENTS.md`) — per `AGENTS.md`'s own scope note, exempt from the plan→implement gate for future edits, but this plan itself was still produced via `/plan-fq-task` at the user's explicit request.

## What NOT to Do

- Do not have `/start-fq-task` invoke impeccable commands ad hoc based on its own judgment during implementation — only plan-authored entries.
- Do not shell out to `npx impeccable` or spawn a sub-agent for these invocations — direct Skill call only (ADR 0041, Option A).
- Do not merge impeccable's checks into `check-fq-standards` or vice versa — keep them as separate, sequential steps.
- Do not run Dimension 4 in `/review-fq-work` unconditionally — gate it on the diff touching UI files.
- Do not touch the actual app theme colors (mushaf frame/text/ayah decoration, navbar, sidebar, settings sidebar, recitation bar) as part of this task — that's a separate, already-agreed-to-sequence-after task (theme-color enhancement), out of scope here.

## Decisions Made

- Invocation mechanism: direct Skill call, not CLI shell-out or sub-agent (ADR 0041).
- Command set: all Evaluate/Refine/Enhance/Fix commands, excluding Build/Iterate.
- Trigger is plan-authored (`## Design Remediation` section), not automatic/ad hoc during implementation.
- `/review-fq-work` gains a 4th dimension, conditional on the diff touching UI files.
- Scope is one plan/card covering all four touch points (not split into separate cards).
