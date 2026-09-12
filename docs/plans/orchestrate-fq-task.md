---
title: "orchestrate-fq-task: the align→plan→implement→review→retrospect→ship phase driver"
type: feature
date: 2026-09-11
status: implemented
area: workflow
issue: 574
adr: [0069]
---

# orchestrate-fq-task: the align→plan→implement→review→retrospect→ship phase driver

## Summary

The last child of Epic #490 (Track 2). A **doc-only thin skill** —
`.claude/skills/orchestrate-fq-task/SKILL.md` pointing at a new `docs/workflow/orchestrate.md` —
that lets the main agent drive **one** GitHub issue through the Core Cycle
(align → plan → implement → review → retrospect → ship) **without ever typing app code itself**.
Every phase is an existing skill; the orchestrator sequences them, decides how wide to fan out
in each phase, carries the load-bearing constraints into every delegated brief, re-verifies
every result it gets back, and escalates to Slack (`fq-ask-human`) what it genuinely cannot
decide. It stops at an **open PR** — the caller tests the PR in a separate context.

This ticket builds the **capability**, not a policy for using it. Task selection, batch/queue
behaviour, and any auto-ship decision belong to whatever *consumes* the orchestrator (a human at
the terminal, or a scheduled routine someone writes later) — they are explicitly out of scope.

## Approach

`orchestrate.md` carries the whole flow; `SKILL.md` is thin frontmatter + a pointer, matching
`detect-fleet` / `setup-fq-fleet` / `fq-delegate`. No script, no state file — see
[ADR 0069](../architecture/adr/0069-orchestrator-doc-only-phase-sequencer.md).

### Entry

```
/orchestrate-fq-task <issue-number> [--to <phase>] [--from <phase>]
```

- `<issue-number>` — the one task. Required. The caller picks the issue; the orchestrator never
  selects tasks from a backlog.
- `--to <phase>` — stop after this phase. Default `ship` (run all the way to an open PR).
- `--from <phase>` — start/resume at this phase. Default: **inferred from artifacts** (see
  *Resumption*).
- Prose works too — "align and plan only", "take it all the way to a PR" — the flags are just
  the written form.

**Interactive vs unattended is not a flag.** The orchestrator asks its questions in the
terminal. If a question goes unanswered — the caller walked away, or a routine invoked it — the
same question is escalated through `fq-ask-human`. One code path.

### Fan-out sizing — a runtime decision, never a fixed number

For any phase that can run more than one agent (**align**, **review**):

- **The caller may set it** — "send 2 planners", "review with codex and opencode".
- **Otherwise the orchestrator decides**, from three inputs:
  - **Fleet size** (`/detect-fleet`) — you cannot fan out to providers you do not have; a
    one-provider fleet collapses every phase to a single pass.
  - **Blast radius** — a DB-schema / cross-cutting-invariant / many-file change favours ≥2
    independent agents; a copy / config / single-file change does not.
  - **Context budget** — every spawned agent re-pays the context tax (ADR 0057 bounds what each
    one loads); an N-agent phase multiplies it by N.
- **Plan** and **implement** are inherently single — one plan file, one diff. "More than one
  agent" there means *a sequential retry on a different provider after a failure*, not parallel
  work.

The doc must **not** hard-code a count (no "always 2–3 align agents").

### The phases

| Phase | Mechanism | Fan-out | What the orchestrator does |
|---|---|---|---|
| **Align** *(skippable)* | `fq-delegate --lane planning --read-only`, ×N in parallel | 0, or N | Hand each agent the **same** scoped brief (issue body + `DECISIONS.md` index + the 1–3 domain files the task touches). Collect the proposed directions. **Reconcile** into one, and **write down where they diverged and how it was resolved** — divergence is the signal, not noise. Record the reconciliation in the plan's approach section, or an issue comment when align runs before the plan exists. Agents split on something the orchestrator cannot adjudicate → `fq-ask-human`. Skip align entirely for a low-blast-radius task. |
| **Plan** | `/plan-fq-task` | single | Runs **unchanged**. Socratic with the human when one is answering; unresolved design questions go to `fq-ask-human` when unattended. Seeded with the aligned direction. Produces `docs/plans/<slug>.md` and the worktree `fq-delegate` implements in (`delegate.md` *Prerequisites*). |
| **Implement** | `/fq-delegate --lane implementation` | single (retry ≠ parallel) | **Never the orchestrator itself.** Compose the brief per `delegate.md` — verbatim load-bearing `AGENTS.md` constraints, the 1–3 domain files, the plan link, `<verification_loop>`, the no-commit boundary. **Add one line:** *if you come to doubt a premise the plan carries, stop and read the source ADR/spec before proceeding — do not write code against it.* On return: re-run `npm run lint` + `npx tsc --noEmit` + targeted `npx vitest run`, then `check-fq-standards` on the diff; never accept a self-reported "gates passed". The orchestrator records any new decision and flips the plan to `status: implemented` — the delegated implementer runs none of `start-task.md`'s tail. |
| **Review** | `/review-fq-work` (working tree) and/or `fq-delegate --lane second-opinion` | 1–N | Point every reviewer at the **ADRs and specs**, not only the plan's summary of them (`review-work.md` §3). **UI-affecting task:** the orchestrator itself runs a browser smoke first — both locales, all three themes, the persisted round-trip — because a static review + unit tests structurally cannot catch layout / RTL / i18n / data-shape breakage. Fold findings via a delta brief to the implementer, reviewed like the first pass. |
| **Retrospect** | `/retrospect` | single | **Non-optional.** Runs before ship so its `decisions/*.md` + `docs/workflow/` edits land inside the PR. |
| **Ship** | `/ship-fq-task` | single | The **stopping point**. Opens the PR, updates the issue to `status:in-review`. The orchestrator **never merges** and never runs past the open PR. |

### Escalation — `fq-ask-human`

A decision the orchestrator genuinely cannot make → a numbered Slack question with a
recommendation and an explicit terminal state (`default` or `halt`). Canonical triggers (not
exhaustive):

- Align agents diverge and the reconciliation has no defensible winner.
- The resolved implementation lane is the orchestrator's own `claude` — separate process vs
  inline (`delegate.md` Step 1).
- A plan premise turns out false mid-implement and the fix changes scope.
- `/plan-fq-task` hits a design question with no human answering.
- A relay failure whose remedy is a judgment call (`--dangerously-skip-permissions` re-dispatch,
  or switch implementer).

A human at the terminal is asked **there**, directly — `fq-ask-human` is the unattended path.
`no-token` / `error` / `timed-out:halt` all mean: surface the question, stop this task. What
happens to the rest of a batch is the caller's concern, not the orchestrator's.

### Scope changes stop the orchestrator

If implement or review surfaces that the real scope differs from the plan (the #597 pattern),
the orchestrator **stops and surfaces it** — it does not expand its own mandate to cover the new
scope, and it does not silently absorb an implementer's unasked-for turns; it reports them in
the review.

### Resumption — the artifacts are the state

No state file (ADR 0069). On `/orchestrate-fq-task <issue>` the orchestrator reconstructs the
phase position:

| Signal | Reads as |
|---|---|
| No worktree, no plan file for the issue | Before **align/plan** — check the issue for an align-reconciliation comment |
| Worktree + plan file, `status: ready-to-implement`, `git diff` empty | Before **implement** |
| `git diff` non-empty, plan still `ready-to-implement` | Implement returned — re-verify gates + `check-fq-standards` from scratch (no prior green trusted), then flip the plan to `implemented` |
| `git diff` non-empty, plan `implemented`, no `decisions/*.md` / `docs/workflow/` edits staged | Before **review / retrospect** |
| Retro edits staged, nothing committed | Before **ship** |
| Branch has a commit, or a PR exists | **Done** — report the PR |

"Before review" and "before retrospect" do not always separate by artifact (a clean review folds
nothing; a no-op retrospect stages nothing) — re-running the later phase is cheap; a genuine
ambiguity is a question for the human or `fq-ask-human`. Never assume a phase ran because its
predecessor did.

### Context budget + run report

- Every spawned agent loads the `DECISIONS.md` index + **1–3** domain files, never all
  (ADR 0057). The orchestrator names the files in each brief and **never passes its own
  conversation context** to a spawned agent.
- Every run ends with a short report: phases run, agents spawned per phase (provider + lane),
  each delegated `result.json` outcome, what was escalated, and — best effort, from the relay
  output — the token/turn cost. An N-agent align phase multiplies the context tax by N; the
  report makes that visible.

## Decision Tree / Algorithm

The phase table, the fan-out sizing inputs, and the resumption table above **are** the
algorithm — `orchestrate.md` renders them as the skill's body. ADR 0069 covers only the
doc-only / no-state-file shape; the phase sequence itself comes from Epic #490 and is not an ADR
decision.

## Verified Test Cases

1. **Full run, 3-provider fleet, schema-touching task, human at terminal.**
   `/orchestrate-fq-task 640`. `/detect-fleet` → claude + codex + agy. High blast radius (Prisma
   schema) → align ×2 (`codex`, `agy`, `--lane planning --read-only`). They diverge on column vs
   join-table; orchestrator reconciles to the column, citing the `decisions/db.md` no-FK
   invariant, and records the divergence in the plan's approach section. `/plan-fq-task` runs
   Socratic with the human, writes the plan + worktree. `/fq-delegate --lane implementation` →
   `codex`; brief carries `decisions/db.md` + the premise-doubt line. Returns `status:
   completed`. Orchestrator re-runs lint / tsc / targeted vitest + `check-fq-standards`.
   `/review-fq-work` (opus subagent) + `fq-delegate --lane second-opinion` on `opencode`; 3
   findings folded via delta brief. `/retrospect` adds a `decisions/db.md` note. `/ship-fq-task`
   opens the PR, issue → in-review. Orchestrator stops; report names 2 + 1 + 2 agents and the PR.

2. **`--to plan`, single-provider fleet.**
   `/orchestrate-fq-task 651 --to plan`. `/detect-fleet` → `claude` only. Align degrades to one
   pass (inline, or one `claude-delegate --lane planning` — caller's call). `/plan-fq-task`
   writes the plan + worktree. Orchestrator stops after plan and reports the plan path — no
   implement / review / ship.

3. **Unattended, planning hits an unresolved design question.**
   A routine runs `/orchestrate-fq-task 662`; no human answering. `/plan-fq-task` needs a choice
   between two valid UX approaches → `fq-ask-human` with 2 numbered options, a recommendation,
   `onTimeout: halt`. No reply in 15 min → `timed-out`. Orchestrator stops task 662 and surfaces
   the question; the batch is the caller's concern.

4. **Resume after interruption.**
   Session died mid-implement. New `/orchestrate-fq-task 640`: worktree exists, plan `status:
   ready-to-implement`, `git diff` non-empty, nothing committed or staged. Reads as "implement
   returned, not yet reviewed" → re-runs gates + `check-fq-standards` from scratch (ignores any
   prior green), proceeds to review.

5. **UI-affecting task.**
   `/orchestrate-fq-task 655` (a form change). After `fq-delegate` returns the diff, the
   orchestrator starts the dev server, drives the form in `/en` + `/ar` and light / gold / dark,
   completes create + edit, verifies the persisted card renders. Finds an untranslated string →
   delta brief to the implementer → re-smoke → then review.

6. **Scope change mid-implement.**
   `fq-delegate` returns a note: "plan says the widget is mobile-only, but desktop then has no
   trigger at all". The orchestrator does **not** tell it to also build the desktop trigger. It
   stops, surfaces the gap (human or `fq-ask-human`), and on direction either files a sibling
   issue or expands the plan explicitly before re-dispatching.

7. **Implementation lane resolves to the orchestrator's own `claude`.**
   Single-subscription teammate, unattended. `fq-delegate` Step 1 surfaces the choice; the
   orchestrator cannot decide it alone under a routine → `fq-ask-human`: "separate `claude`
   process (second context hit) vs `/start-fq-task` inline (breaks the never-implement
   boundary)", recommendation = separate process, `onTimeout: default` → separate process.

## Files to Change

- `.claude/skills/orchestrate-fq-task/SKILL.md` — **new.** Thin frontmatter (`name:
  orchestrate-fq-task`, a `description` for skill selection) + a body pointing at
  `docs/workflow/orchestrate.md`, naming the entry (`/orchestrate-fq-task <issue>`), and stating
  the two hard boundaries (never implements; stops at the open PR). Same kebab-`name` +
  non-empty `description` + non-empty body rules the siblings use, so
  `.opencode/plugins/fq-commands.js` surfaces it. No restating of `orchestrate.md`'s flow.
- `docs/workflow/orchestrate.md` — **new.** The whole flow: entry + flags, the fan-out sizing
  rule, the phase table, the escalation triggers, the scope-change rule, the resumption table,
  the context-budget + run-report rule, and one closing "what the orchestrator never does" list.
- `docs/workflow/delegate.md` — **edit.** Three lines added to the `<task>` block of the brief
  envelope: the implementer must stop and check a doubtful plan premise against its source
  ADR/spec before coding against it. Distinct from the existing `<verification_loop>` (gate
  output) and `<action_safety>` (unrelated refactors) lines.
- `docs/workflow/INDEX.md` — **new row** in the "Fleet / Orchestrator (Epic #490, Track 2)"
  table for `/orchestrate-fq-task` → `orchestrate.md`, referencing ADR 0069; **plus** a
  one-line pointer after the Core Cycle's numbered list (an addition, not a rewrite of the
  numbered block) so a reader of the cycle sees the orchestrator over it.
- `docs/architecture/adr/0069-orchestrator-doc-only-phase-sequencer.md` — **new** (written in
  this plan phase).
- `docs/plans/INDEX.md` — regenerated by `.claude/skills/scripts/gen-plans-index.sh`.

No `decisions/*.md` change — this is a workflow/process decision, recorded in
`docs/workflow/INDEX.md` + ADR 0069. No `.gitignore` change. No pointer-file
(`CLAUDE.md` / `GEMINI.md` / `.cursorrules`) change.

## Constraints

- **Doc-only thin skill, no script, no state file.** Phase position is reconstructed from
  artifacts (ADR 0069). Matches `detect-fleet` / `setup-fq-fleet` / `fq-delegate`.
- **The orchestrator never types app code.** Implementation is always delegated through
  `fq-delegate`. (Epic #490 goal.)
- **`/ship-fq-task` is the only commit path, and the orchestrator stops at the open PR** — it
  never commits directly, never merges, never runs past the PR.
- **Per-agent context is bounded** to the `DECISIONS.md` index + 1–3 domain files, never all
  (ADR 0057). The orchestrator never passes its own conversation context to a spawned agent.
- **Fan-out sizing is a runtime decision** — caller-directed or orchestrator judgment from
  fleet size + blast radius + budget. The doc must not fix a count.
- **A pre-ship gate defaults to the uncommitted working tree** — `/review-fq-work` already does
  (#564); the orchestrator must not pass it `--committed` before `/ship-fq-task` has run.
- **UI-affecting tasks get an orchestrator-run browser smoke before review** — both locales, all
  three themes, the persisted round-trip. (Lesson from #610 / #594.)
- **Scope changes stop the orchestrator.** It surfaces; it does not absorb.
- **`fq-delegate` owns all delegation mechanics** — brief composition, lane resolution, relay
  dispatch, `result.json` parsing. The orchestrator calls it; it does not re-implement any of
  that.
- **AI tooling** (`.claude/`, `docs/workflow/`) — meta/infra, exempt from the plan→implement
  gate per `AGENTS.md` "Scope"; this plan exists only because the user asked for one. Workflow
  decisions are recorded in `docs/workflow/INDEX.md`, not `docs/architecture/decisions/`.

## What NOT to Do

- Do not add `scripts/orchestrate.mjs` or any phase-driver code (ADR 0069, Option A rejected).
- Do not add an `orchestrator-state.json` or any per-run state / log file (ADR 0069, Option C
  rejected).
- Do not build task selection, backlog-queue logic, or batch/multi-task mode — the caller names
  one issue; a "morning routine" is a separate consumer, not this ticket.
- Do not build any auto-ship or auto-merge policy — the orchestrator stops at the open PR.
- Do not change the semantics of `/plan-fq-task`, `/review-fq-work`, `/retrospect`, or
  `/ship-fq-task` — sequence them, do not rewrite them.
- Do not hard-code a fan-out count anywhere in `orchestrate.md` (no "always 2–3 align agents").
- Do not re-implement `fq-delegate`'s brief envelope, lane resolution, or `result.json` handling
  in `orchestrate.md` — link to `delegate.md`.
- Do not pass the orchestrator's conversation context to a spawned agent, or load every
  `decisions/*.md` into a brief.
- Do not have the orchestrator merge a PR, or run itself on a schedule.
- Do not create a Claude Code plugin or marketplace entry (Epic #490 decision — the skills.sh +
  symlink route already reaches the multi-tool team).
- Do not re-bloat `CLAUDE.md` / `GEMINI.md` / `.cursorrules` with orchestrator rules — `AGENTS.md`
  + `docs/workflow/INDEX.md` are the canonical surfaces.

## Decisions Made

- **Skill name `orchestrate-fq-task`, entry `/orchestrate-fq-task <issue>`.** Matches the
  `*-fq-task` family so `/plan-fq-task` → `/orchestrate-fq-task` → `/ship-fq-task` reads as one
  sequence. *(User confirmed the name this session; shipped unchanged.)*
- **Doc-only thin skill; phase position reconstructed from artifacts, no state file** — ADR
  0069.
- **Fan-out per phase is a runtime decision** (caller-directed, else orchestrator judgment sized
  by fleet + blast radius + budget), never a fixed count. *(User, this session.)*
- **The orchestrator runs to an open PR and stops; the caller tests the PR in a separate
  context.** *(User, this session.)*
- **Align dispatches through `fq-delegate --lane planning`**; the reconciliation write-up goes in
  the plan's approach section, or an issue comment when align runs pre-plan. *(`delegate.md`
  already reserves the planning lane for #574's align phase.)*
- **`fq-ask-human` is the unattended decision path; a human at the terminal is asked there
  directly — "unattended" is not a flag, it is one code path.** *(User, this session.)*
- **The implement brief gains one line** — stop and read the source ADR/spec when you doubt a
  plan premise, no context passing. *(From the #574 scope comment, this session; mirrors
  `review-work.md` §3's second-hand-constraints guidance.)*
- **UI-affecting tasks: the orchestrator runs the browser smoke itself before review.** *(Lesson
  from #610 / #594 — a static loop shipped 6 visible bugs past every gate.)*
- **Task selection, batch mode, and auto-ship are out of scope** — the epic builds the
  capability, consumers set the policy. *(User, this session — repeatedly.)*

## What NOT to Do — sweep (step 3b)

- **Existing tests:** none. All-new tooling files under `.claude/` and `docs/workflow/`; no unit
  or e2e spec asserts any of this.
- **Service worker / `/api/*`:** untouched — no runtime code, no route, no cache interaction.
- **Offline-sensitive signals:** none — nothing here reads `useSession()`, `navigator.onLine`,
  or a network timeout.
- **"Unchanged" claims to verify at implement time:** the four sequenced skills'
  (`plan-fq-task` / `review-fq-work` / `retrospect` / `ship-fq-task`) contracts — `orchestrate.md`
  asserts it sequences them without modifying them; the implementer must confirm no edit to
  those docs is needed to make the sequencing work, and if one is, stop and raise it (it would
  contradict the "unchanged semantics" constraint).
- **Removed/relocated UI affordance:** n/a — no UI.
- **`delegate.md` premise-doubt line:** adding it touches `docs/workflow/delegate.md` Step 2,
  which #573 shipped — confirm the exact insertion point and that it does not duplicate the
  existing `<verification_loop>` "fix what they surface" wording.

## Revision History

- **2026-09-11 — Review (sonnet) + retrospect, folded on-branch.** Review: the plan's phase-table
  Align fan-out `0–3` contradicted the "never a fixed count" rule → `0, or N`; `delegate.md`
  added to Files to Change; the delegated Implement phase now explicitly assigns
  `start-task.md`'s tail (mark plan `implemented`, record decisions) to the orchestrator;
  `SKILL.md` trimmed to a pointer + entry + boundaries (was restating `orchestrate.md`); ADR
  0069 Consequences notes the review/retrospect artifact gap; title gained `→ ship`. Retrospect:
  `docs/workflow/fleet-setup.md` de-staled ("future orchestrator (T2.4)" → `orchestrate.md`;
  dead-lane-model line → `fq-delegate` / ADR 0068); `docs/workflow/delegate.md` Step 5 now states
  the delegated implementer runs none of `start-task.md`'s tail and whoever drove the dispatch
  does it.
