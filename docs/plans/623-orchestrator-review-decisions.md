---
title: Epic #623 follow-up — resolve the 6 open orchestrator doc decisions in one PR
type: chore
date: 2026-09-14
status: implemented
area: workflow
issue: 623
---

# Epic #623 follow-up — resolve the 6 open orchestrator doc decisions in one PR

## Summary

Issue #623 holds 7 post-merge review findings on the Epic #490 orchestrator docs. Item 1
(inline escape hatch) is already resolved by PR #625 — verified clean, no change. Items 2–7
each need a one-line-to-short-paragraph behaviour rule written into `docs/workflow/`. This
plan implements all six in a single PR, all doc-only, no app code, no DB, no e2e.

## Root Cause / Approach

Each finding is a behaviour gap, not a typo: the doc names a gate or rule but leaves the
enforcement undefined (align→plan handoff sink, browser-smoke procedure, null-`touchedFiles`
policy, "unanswered" duration, late-reply fate, partial-align-failure rule). The fix in every
case is to write the missing rule where the gap lives, anchored to the existing file/line,
keeping each edit to the smallest unit that closes the gap.

### Align reconciliation (3 parallel read-only agents, 2026-09-14)

- Agent A: `opencode/nemotron-3-ultra-free` (5m35s) — strict throughout, quorum ≥2.
- Agent B: `opencode/muse-spark-1.3-contributor-free` (27s) — trust-but-verify on item 4,
  re-check on item 6, proceed-on-≥1 on item 7. Caught one scope limit honestly: the
  `readOnly:true` lane-map claim is not visible in repo files (it lives in the global
  delegate config — orchestrator verified via `config.mjs load`: planning/second-opinion
  both carry `readOnly: true`).
- Agent C: `opencode/mimo-v2.5-free` (1m59s) — strict on 4/6, most concrete smoke procedure,
  grounded item 6 in ADR 0069 (no state file ⇒ no `threadTs` carried across phases).
- Full reconciliation posted as an issue comment on #623 (2026-09-14). User approved the
  reconciled directions and forbade `fq-ask-human` for the rest of the run — orchestrator
  decides; no Slack escalation in any phase.

Divergence and resolution:

- Item 4 (2 strict vs 1 lenient) → strict wins (majority + issue suggestion); B's
  false-positive analysis absorbed as an explicit-statement allow (see decision table).
- Item 5 (60s vs 5min attended) → user chose 5min attended.
- Item 6 (2 ignore vs 1 re-check) → ignore wins (majority + ADR 0069 no-state); B's
  transparency concern absorbed by documenting the rule explicitly in `ask-human.md`.
- Item 7 (quorum 2 vs proceed-on-≥1) → user chose proceed-on-survivors with single-source
  flag; retry-once-then-escalate on zero survivors.

## Decision Tree / Algorithm

| Item | Rule to write | Where |
|---|---|---|
| 1 | No change — VERIFIED-CLEAN by all three agents (`delegate.md:50`, `orchestrate.md:116-118/178-182`, `SKILL.md:20-24` consistent) | — |
| 2 | Orchestrator seeds `/plan-fq-task` with the aligned direction and posts the reconciliation as an issue comment for audit; the Plan row gains one seed line; `plan-task.md` stays untouched (no `gh` dependency added to the single-task skill) | `orchestrate.md` Plan row |
| 3 | Browser smoke = short numbered procedure: production build via `e2e:serve` (never `next dev` — Serwist disabled in dev), both locales × three themes on one static mushaf page + one stateful reader route, persisted round-trip = theme + locale + reading position survive reload, PWA-gated bits via the `pwa-testing.md` spoof snippets; anchored with a link to `docs/standards/pwa-testing.md` | `orchestrate.md` Review row |
| 4 | `touchedFiles: null` on a read-only lane = violation: discard the tree, re-dispatch on `codex` hard sandbox. Allow: implementer explicitly states "no file changes" in `finalMessage` → proceed. `git couldn't report` is never read as clean | `delegate.md` Step 4 table |
| 5 | "Unanswered" = no terminal answer within 5 minutes (attended) → escalate via `fq-ask-human`; routine/unattended runs go to `fq-ask-human` directly with its 900s default. Presence test: `process.stdin.isTTY && process.env.CI !== 'true'`. `onTimeout: halt` for scope/implementer-choice questions, `default` for low-stakes picks only | `orchestrate.md` Entry section |
| 6 | A reply landing after the timeout is informational only — the applied decision stands and is recorded; override by re-invoking the task (`--from` the phase to redo). The thread stays for audit | `ask-human.md` Constraints (or Caller contract terminal-state paragraph) |
| 7 | Partial align failure: ≥1 survivor → reconcile survivors; exactly 1 → flag "single-source, no cross-check" in the plan; 0 survivors → retry once on a different model, then `fq-ask-human` halt | `orchestrate.md` Align row |

## Verified Test Cases

Doc-only change: verification is by grep, not runtime. Premises below were checked by the
orchestrator before align and re-confirmed by all three agents (none found wrong):

- `plan-task.md` contains no `gh issue` / issue-comment read (grep `gh issue|issue comment`
  hits only `orchestrate.md`, `start-task.md`) → item 2 premise holds.
- `browser smoke` / `persisted round-trip` occur only in `orchestrate.md:105` (plus the epic
  plan, not a standard); `pwa-testing.md` has no smoke procedure → item 3 premise holds.
- `delegate.md:149` (`null` = git couldn't report) + `:158` (only `agy`/`claude` emit
  `readOnlyViolation`) → item 4 premise holds.
- `unanswered` occurs only in `orchestrate.md:50,117` with no duration → item 5 holds.
- `scripts/ask-human.mjs` applies default, acks, exits; no thread re-read → item 6 holds.
- `orchestrate.md:76-93` sizes fan-out with no per-agent-failure rule → item 7 holds.
- No `breaks the boundary` / inline text remains in `delegate.md` → item 1 resolved, no-op.

Post-implement check: `git diff --stat` shows only the three workflow files (+ this plan file + regenerated INDEX) under Files to Change;
each new rule greppable from the decision table above.

## Files to Change

- `docs/workflow/orchestrate.md` — Plan row seed line (item 2); Review-row smoke procedure
  + `pwa-testing.md` anchor (item 3); Entry-section "unanswered" definition (item 5); Align-row
  partial-failure rule (item 7).
- `docs/workflow/delegate.md` — Step 4 table: null-`touchedFiles` on read-only lane =
  violation + explicit-statement allow (item 4).
- `docs/workflow/ask-human.md` — late replies informational-only + re-invoke override (item 6).

## Constraints

- Doc-only: no `app/`, `components/`, `lib/`, `prisma/`, translation, or config changes.
- Each rule stays where its gap lives; no new workflow files, no new ADR (behaviour
  clarifications, not architectural decisions).
- Keep edits tight: one line where one line closes it (items 2, 5, 6, 7), short numbered
  list only for item 3, one table-row rewrite for item 4.
- Cite the anchor file + line each rule derives from; never label an unverified premise
  "VERIFIED" in the diff (lesson from the #623 comment thread).
- No commit, no push, no PR from the implementer — uncommitted working tree only.
- No `fq-ask-human` anywhere in this run (caller forbade it) — decide and record instead.

## What NOT to Do

- Do not touch item 1 — already resolved by PR #625; any drift found must be reported, not
  "fixed" by rewording the boundary.
- Do not add a `gh`/issue-comment read step to `plan-task.md` (widens the single-task skill
  for one caller; rejected in align).
- Do not write a full e2e spec for the smoke gate (wrong layer; CI Playwright gate exists).
- Do not re-dispatch policy onto `codex` for THIS run — caller restricted this run to
  opencode free models; `codex` appears only as the future-run guarantee in item 4's rule.
- Do not carry `threadTs` across phases or add re-poll logic (ADR 0069: no state file).
- Do not run full `npm test`, `npm run build`, or local e2e — CI enforces on the PR.

## Decisions Made

- Step-0 check: `docs/plans/INDEX.md` workflow rows (`orchestrate-fq-task.md` = epic build
  plan, implemented; `fq-delegate.md`, `fq-ask-human.md`, `fleet-detection-setup.md`) cover
  building the skills, not these 7 review decisions — new plan file justified, no addendum.
- Single PR for all six rules (caller: small fixes, one PR, no merge — stopping at open PR).
- Implementer model: `opencode/mimo-v2.5-free` (thorough align performer; gives a second
  model implement-phase data for the run report ranking). Reviewers: `muse-spark-1.3` +
  `nemotron-3-ultra` (both different from implementer → review independence).
- Sweep (3b): no unit/e2e spec asserts workflow-doc text (docs are not imported by code);
  no service-worker or offline-derived state involved; every "unchanged" claim above was
  read in the worktree files, not assumed.
