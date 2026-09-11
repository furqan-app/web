# Orchestrate a Task

`orchestrate-fq-task` is the last piece of Epic #490 (Track 2): the phase driver. The main agent
invokes `/orchestrate-fq-task <issue>` and then **follows this doc** to drive that one issue
through the Core Cycle — align → plan → implement → review → retrospect → ship — **without ever
typing app code itself**. Every phase is an existing skill; this doc only sequences them, sizes
the agent fan-out in each phase, carries the load-bearing constraints into every delegated
brief, re-verifies every result, and escalates what it cannot decide to
[`fq-ask-human`](ask-human.md). It **stops at an open PR** — the caller tests the PR in a
separate context.

This is the whole skill; `.claude/skills/orchestrate-fq-task/SKILL.md` is a pointer to it. See
[ADR 0069](../architecture/adr/0069-orchestrator-doc-only-phase-sequencer.md) for why it is a
doc-only sequencer with no orchestration code and no state file, and why phase position is
reconstructed from artifacts.

**It builds on the three siblings:** [`fleet-setup.md`](fleet-setup.md) (which providers this
machine has), [`delegate.md`](delegate.md) (how one bounded task is handed to an implementer),
[`ask-human.md`](ask-human.md) (how a blocked decision reaches a human). The orchestrator adds
nothing to their mechanics — it calls them.

## Scope

This skill drives **one already-identified issue**. It does not:

- Pick which tasks to work on, or work a backlog / queue / batch.
- Decide whether to ship — it runs to an open PR and stops; a human or a routine decides what
  happens next.
- Merge anything.

A "morning routine that clears some tickets" is a *consumer* of this skill — it names the
issues and sets the policy. Building that routine is not this skill's job.

## Entry

```
/orchestrate-fq-task <issue-number> [--to <phase>] [--from <phase>]
```

- **`<issue-number>`** — required. The one task. The caller picks it.
- **`--to <phase>`** — stop after this phase. `<phase>` ∈ `align | plan | implement | review |
  retrospect | ship`. Default `ship` (run the whole cycle to an open PR).
- **`--from <phase>`** — start or resume at this phase. Default: **inferred from the artifacts**
  (see *Resumption*). Pass it only to override a wrong inference.

Prose is equivalent — "align and plan only" is `--to plan`, "take it all the way to a PR" is the
default. Read the caller's intent; the flags are just the written form.

**Interactive vs unattended is not a flag.** The orchestrator asks its questions on the
terminal. When a question goes unanswered — the caller stepped away, or a routine invoked the
skill — the *same* question is escalated through `fq-ask-human`. One code path, two audiences.

## Preflight

Runs before any phase, on every entry including a resume. Every phase after plan needs
`fq-delegate`, and [`delegate.md`](delegate.md) Step 1 treats a missing lane map as a hard stop;
finding that out at Implement wastes align and plan. Check these prerequisites first:

1. **`.delegate/config.json` present** — if absent, **STOP** and tell the caller to run
   `/setup-fq-fleet`. Do not start align or plan first.
2. **`delegate-setup` installed beside the relays** (`~/.agents/skills/delegate-setup/`) — `--lane`
   resolution shells out to it and fails hard without it. If missing, tell the caller to run
   `/setup-fq-fleet`.
3. **`.claude/fleet.json` present and not stale** — run `/detect-fleet --refresh` if it is missing
   or stale.

**Exception:** A caller who names the implementer explicitly bypasses lane resolution
([`delegate.md`](delegate.md) Step 1, first row), so preflight may proceed on a named implementer
with no `.delegate/config.json`.

## Fan-out sizing — a runtime decision, never a fixed number

Two phases can run more than one agent: **align** (N planners in parallel) and **review** (N
reviewers). For those:

1. **If the caller said how many, do that** — "send two planners", "review with codex and
   opencode".
2. **Otherwise decide from three inputs:**
   - **Fleet size** — run `/detect-fleet` (or read a fresh `.claude/fleet.json`). You cannot fan
     out to providers the machine does not have; a one-provider fleet collapses every phase to a
     single pass, and that is not a failure.
   - **Blast radius** — a change that touches the DB schema, a non-negotiable invariant, or many
     files wants ≥2 independent agents; a copy / config / single-file change does not.
   - **Context budget** — every spawned agent re-pays the context tax (ADR 0057 bounds what each
     one loads); an N-agent phase multiplies it by N. Spend it where divergence is likely to
     catch something.

**Plan** and **implement** are inherently single — one plan file, one diff. "More than one
agent" there means a *sequential retry on a different provider after a failure*, never parallel
work.

Do not write a count into this doc. "Always 2–3 align agents" is exactly the rule this section
refuses to make.

## The phases

| Phase | Mechanism | Fan-out | What the orchestrator does |
|---|---|---|---|
| **Align** *(skippable)* | [`fq-delegate`](delegate.md) `--lane planning --read-only`, ×N in parallel | 0, or N | Give every agent the **same** scoped brief — the issue body, the `DECISIONS.md` index, and the 1–3 domain files the task touches. Collect the proposed directions. **Reconcile them into one, and write down where they diverged and how each disagreement was resolved** — divergence is the signal the phase exists to produce, not noise to discard. Put the reconciliation in the plan's approach section; when align runs before a plan file exists, put it in an issue comment. If the agents split on something with no defensible winner → `fq-ask-human`. Skip align entirely for a low-blast-radius task. |
| **Plan** | [`/plan-fq-task`](plan-task.md) | single | Runs **unchanged**. Socratic with the human while one is answering; an unresolved design question goes to `fq-ask-human` when unattended. Seeded with the aligned direction. Produces `docs/plans/<slug>.md` and the worktree that `fq-delegate` then implements in (`delegate.md` *Prerequisites*). |
| **Implement** | [`/fq-delegate`](delegate.md) `--lane implementation` | single (retry ≠ parallel) | **Never the orchestrator itself.** Compose the brief per `delegate.md` — verbatim load-bearing `AGENTS.md` constraints, the 1–3 domain files, the plan link, the `<verification_loop>`, the no-commit boundary. `delegate.md`'s `<task>` block already tells the implementer to stop and check a doubtful plan premise against its source before coding against it. On return: re-run `npm run lint`, `npx tsc --noEmit`, and targeted `npx vitest run`, then `check-fq-standards` on the **uncommitted working tree** (never `main...HEAD` — nothing is committed yet, so a base-branch diff inspects nothing and reports clean). Never accept a self-reported "gates passed". **If gates fail:** compose a delta brief carrying the actual gate output, re-dispatch to the same implementer with `--resume-last` / the recorded session id (bounded to 1–2 attempts), and escalate via `fq-ask-human` if it still fails. The delegated implementer does not run `start-task.md`'s decision-recording step — the orchestrator records any new decision and flips the plan to `status: implemented` itself. |
| **Review** | [`/review-fq-work`](review-work.md) (working tree) and/or `fq-delegate --lane second-opinion` | 1–N | Point every reviewer at the **ADRs and specs**, not only the plan's summary of them (`review-work.md` §3). For a **UI-affecting** task the orchestrator runs a browser smoke **first** — both locales, all three themes, the persisted round-trip — because a static review plus unit tests structurally cannot catch layout / RTL / i18n / data-shape breakage. Fold findings via a delta brief to the implementer, reviewed like the first pass. |
| **Retrospect** | [`/retrospect`](retrospect.md) | single | **Non-optional.** Runs before ship so its `decisions/*.md` and `docs/workflow/` edits land inside the PR. |
| **Ship** | [`/ship-fq-task`](ship-task.md) | single | The **stopping point.** Opens the PR, moves the issue to `status:in-review`. The orchestrator **never merges** and never acts past the open PR. |

## Escalation

When the orchestrator hits a decision it genuinely cannot make, it escalates through
`fq-ask-human` — a numbered question with a recommendation and an explicit terminal state
(`default` or `halt`). Canonical triggers, not an exhaustive list:

- Align agents diverge and the reconciliation has no defensible winner.
- The resolved implementation lane is the orchestrator's own `claude` — separate process vs
  inline (`delegate.md` Step 1).
- A plan premise turns out false mid-implement and the fix changes scope.
- `/plan-fq-task` reaches a design question with no human answering.
- A relay failure whose remedy is a judgment call — a `--dangerously-skip-permissions`
  re-dispatch, or switching implementer.

A human at the terminal is asked **there**, directly. `fq-ask-human` is the unattended path.
`no-token`, `error`, and `timed-out` with `onTimeout:halt` all mean the same thing: surface the
question, stop this task. What happens to the rest of a batch is the caller's concern.

## Scope changes stop the orchestrator

If implement or review reveals that the task's real scope differs from the plan — the widget the
plan called mobile-only leaves desktop with no trigger, the "always true" invariant the plan
leaned on is not — the orchestrator **stops and surfaces it** (to the human, or `fq-ask-human`).
It does not expand its own mandate to cover the new scope, and it does not quietly absorb an
implementer's defensible-but-unasked-for turns — it reports them in the review so the human
sees them.

## Resumption — the artifacts are the state

There is no state file (ADR 0069). On `/orchestrate-fq-task <issue>` — or when `--from` is
absent — the orchestrator reconstructs the phase position the way a human returning to the task
would:

| What the orchestrator finds | Where it resumes |
|---|---|
| No worktree and no plan file for the issue | Before **align / plan** — check the issue for an align-reconciliation comment before re-running align |
| Worktree + plan file, relay process alive or dispatch produced no `result.json` | **In-flight dispatch** — attach, wait, or inspect; never re-dispatch. A `result.json` with `status: timeout` or `aborted` means a half-applied tree, not "implement returned" |
| Worktree + plan file, frontmatter `status: ready-to-implement` or `in-progress`, `git diff` empty | Before **implement** |
| `git diff` non-empty, plan `status: ready-to-implement` or `in-progress` | Implement has returned — re-verify the gates and `check-fq-standards` **from scratch** (do not trust a prior green), then flip the plan to `status: implemented` |
| `git diff` non-empty, plan `status: implemented`, no unstaged `decisions/*.md` or `docs/workflow/` edits | Before **review / retrospect** |
| Unstaged `decisions/*.md` or `docs/workflow/` edits present (for a non-workflow task), nothing committed | Before **ship** |
| Branch has a commit, but no PR exists (check with `gh pr view`) | **Ship interrupted** — resume ship at push / PR-create (`ship-task.md` steps 4–5) |
| A PR exists for the branch | **Done** — report the PR and stop |
| Plan frontmatter `status: superseded` or `unknown` | **Stop and ask** — never a valid resume point; consult the human or `fq-ask-human` |

"Before review" and "before retrospect" are not always distinguishable by artifact — a passed
review folds no findings, and a retrospect with nothing to record produces no edits. When the
signals do not separate them, re-running the later phase is cheap and non-optional; re-run it
rather than inferring it ran. For workflow or tooling tasks (where `docs/workflow/` edits are the
task's implementation, not a retro artifact), that signal does not separate the phases — run
retrospect anyway. A genuinely ambiguous reconstruction is a question for the human or
`fq-ask-human`, never a guess. Never assume a phase ran just because its predecessor did.

## Context budget and the run report

- Every spawned agent loads the `DECISIONS.md` index + **1–3** domain files, never all of them
  (ADR 0057). The orchestrator names those files in the brief and **never passes its own
  conversation context** to a spawned agent — a spawned agent that hits an unbriefed risk reads
  the relevant ADR or spec from the worktree on demand.
- Every run ends with a short report: which phases ran, how many agents ran in each phase (with
  provider + lane), each delegated `result.json` outcome, everything that was escalated, and —
  best effort, from the relay output — the token / turn cost. An N-agent align phase multiplied
  the context tax by N; the report is where that shows up.

## What the orchestrator never does

- Type app code — `app/`, `components/`, `lib/`, `prisma/`, translation files, running-app
  config. It sequences skills; implementation is always delegated through `fq-delegate`.
- Commit, push, merge, or create a worktree outside `/plan-fq-task`. `/ship-fq-task` opens the
  PR; merging is always a separate, explicit human action, and "PR opened" is not "task done"
  past reporting it.
- Add dispatch or state-tracking code, or re-implement `fq-delegate`'s brief envelope, lane
  resolution, or `result.json` handling — the orchestrator is this document (ADR 0069); it calls
  `delegate.md`.
- Change the semantics of `/plan-fq-task`, `/review-fq-work`, `/retrospect`, or `/ship-fq-task`;
  skip `/retrospect`; or run it after `/ship-fq-task` — its edits belong inside the PR.
- Fix a fan-out count in this doc.
- Load every `decisions/*.md` into a brief, or pass its own conversation context to a spawned
  agent.
- Accept a delegated "gates passed" or "done" — it re-verifies.
- Pick tasks, work a queue, decide whether to ship, or run itself on a schedule — it is invoked
  per task, deliberately.
