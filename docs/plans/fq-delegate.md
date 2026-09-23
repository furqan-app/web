---
title: "fq-delegate: fq-aware wrapper over the upstream delegate relays"
type: feature
date: 2026-09-10
status: implemented
area: workflow
issue: 573
adr: [0068]
---

# fq-delegate: fq-aware wrapper over the upstream delegate relays

## Summary

A **doc-only thin skill** — `.claude/skills/fq-delegate/SKILL.md` pointing at a new
`docs/workflow/delegate.md` — that turns the upstream `*-delegate` relays into Furqan's
*Implement* phase. The relays already run a foreign CLI (`codex` / `agy` / `opencode` /
`claude` / `copilot`) headless, write-capable, against the real worktree at `--cd` and return a
`result.json` with `touchedFiles` and a resumable session id. What they do not carry is
Furqan: its load-bearing constraints, its local gate discipline, its commit boundary, or its
lane vocabulary. `delegate.md` is that missing layer. The orchestrator (or a human typing
`/fq-delegate`) follows the doc to resolve an implementer from the human-approved lane map,
wrap the task in a fixed Furqan brief envelope, dispatch the relay backgrounded, and turn the
returned `result.json` into a review-ready summary whose every path ends in "re-verify, never
accept". `fq-delegate` never commits, never pushes, and never creates a worktree.

Third child of Epic #490 (Track 2 — agent orchestrator). Blocked by #571 (shipped:
`detect-fleet` / `setup-fq-fleet` / `.delegate` lane map). Consumed by #574 (the orchestrator),
which sequences `fq-delegate` calls without adding delegation mechanics of its own.

## Approach

`fq-delegate` is documentation, not code — the same shape as `detect-fleet` and
`setup-fq-fleet`. `SKILL.md` is thin frontmatter + a pointer; `docs/workflow/delegate.md`
carries the whole flow, in five steps.

### 1. Resolve the implementer

For a target lane — `implementation` (write), `planning` or `second-opinion` (both read-only):

- An explicit caller-supplied implementer **always wins**.
- Otherwise pass `--lane <name>` to the relay. The relay resolves it from
  `<repo>/.delegate/config.json` via `delegate-setup`'s `scripts/lane.mjs` — `fq-delegate`
  does not read that file itself.
- Cross-check `.claude/fleet.json`: the resolved implementer is on PATH, authenticated, and its
  `~/.agents/skills/<tool>-delegate/scripts/relay.mjs` resolves. If the cache looks stale, run
  `/detect-fleet --refresh` first.
- **No `.delegate/config.json`** → stop and tell the caller to run `/setup-fq-fleet`.
- **Resolved implementer is the same `claude` the orchestrator runs as** → surface a first-class
  choice, do not pick silently: dispatch through `claude-delegate` to a *separate* `claude`
  process, or run `/start-fq-task` inline. The orchestrator decides; it escalates to
  `fq-ask-human` if it cannot.

### 2. Compose the brief

Orchestrator judgment, guided by a template in `delegate.md`. The task-specific body
(`<task>`: the bounded job from the agreed plan, current state, what to change, what to leave
untouched) is wrapped in a fixed Furqan envelope:

- **Load-bearing `AGENTS.md` constraints, copied in verbatim** — `delegate.md` lists which
  sections are load-bearing for a delegated run (Radical transparency, the workflow-scope
  carve-out, project terminology, the two-DB no-FK invariant when the task touches data).
- **The 1–3 `docs/architecture/decisions/*.md` domain files the task touches** (index +
  domains, per ADR 0057) — never all of them.
- **The plan link** (`docs/plans/<slug>.md`) and the **worktree path** for `--cd`.
- **`<verification_loop>`** = Furqan's local gate discipline exactly, per
  `docs/workflow/start-task.md`: `npm run lint` + `npx tsc --noEmit`, and
  `npx vitest run <path>` only for pure logic/util files that have specs — **not** full
  `npm test`, **not** `npm run build`, **not** local e2e. Note that CI enforces the rest on the
  PR after the orchestrator commits.
- **`<action_safety>`** = scoped changes only; **no `git add` / `git commit`** — the
  orchestrator commits via `/ship-fq-task`. Leave the work uncommitted in the worktree.
- **`<structured_output_contract>`** = a delimited report the orchestrator can find past any
  environment preamble the implementer's local setup injects.

The brief file is written to a temp / scratch dir, **never** the repo. The foreign implementer
is never told to invoke a Furqan skill — it does not have `check-fq-standards` et al.; the
envelope carries the *content* those skills would check.

### 3. Dispatch

```bash
node ~/.agents/skills/<tool>-delegate/scripts/relay.mjs \
  --brief <brief-file> --cd <worktree> --lane <lane> [--read-only] [--timeout 2h]
```

`--read-only` for `planning` / `second-opinion`. Default `--timeout 2h` (implementation runs
routinely need 1–2h per the relay docs). Backgrounded — on Claude Code, the `Bash` call with
`run_in_background: true`; completion is when the process has exited **and** `result.json`
exists.

### 4. Read `result.json` → review-ready summary

Report `touchedFiles`, the implementer's `finalMessage` claims, and the `threadId` / `session`
for rework. Classify the relay outcome into a specific remedy — see the Decision Tree below.
Every summary ends with: gate claims and "done" are **re-verified by the orchestrator, never
accepted**.

### 5. Hand off

`fq-delegate` is a drop-in for the *Implement* phase. Its summary feeds `/review-fq-work` (which
already defaults to the uncommitted working tree) → `/retrospect` → `/ship-fq-task`. The
orchestrator runs `check-fq-standards` on the returned diff as part of review. Rework: a delta
brief via `--resume-last`, or the recorded id (`--session` for codex / claude / opencode /
copilot, `--conversation` for `agy`), reviewed exactly like the first run.

## Decision Tree / Algorithm

### Implementer resolution

| Condition | Outcome |
|---|---|
| Caller named an implementer | Use it; skip lane resolution |
| `.delegate/config.json` absent | Stop → "run `/setup-fq-fleet`" |
| Lane resolves; implementer installed + authed + `*-delegate` skill present | Dispatch |
| Lane resolves; implementer missing / unauthed / no delegate skill | Stop → "`/setup-fq-fleet`" (or `/detect-fleet --refresh` if the cache is stale) |
| Lane resolves to the orchestrator's own `claude` | First-class choice: separate `claude` via `claude-delegate`, or `/start-fq-task` inline — caller / `fq-ask-human` decides |

### Relay outcome → remedy

The canonical table lives in [`docs/workflow/delegate.md`](../workflow/delegate.md) Step 4 —
not duplicated here (a second copy drifts). It maps each `result.json` `status` / exit code to
a specific remedy: `completed` (review-ready, or empty/`null` `touchedFiles` = no diff);
headless write auto-deny (`agy` `--print`, `copilot` without `--allow-all-tools`);
`<cli>_unavailable` (exit 127) → `/setup-fq-fleet`; exit 2 with no result file, split by stderr
into a missing `delegate-setup` vs a malformed dispatch; dead lane model (the ADR 0063 punt) →
`/setup-fq-fleet` reconfigure, classified after the denial cases; `timeout` / `aborted` (inspect
the tree first); read-only lane breach (`readOnlyViolation` on `agy` / `claude`, or a non-empty
`touchedFiles` on `opencode` / `copilot`) → discard the tree.

## Verified Test Cases

Walked through against this machine's state and the sibling plan's verified fleet
(`docs/plans/fleet-detection-setup.md`):

1. **`implementation` lane bound to `codex`, task is a pure-logic util change.** Brief embeds
   `AGENTS.md` transparency + terminology sections, `decisions/plans.md`,
   `<verification_loop>` = `npm run lint` + `npx tsc --noEmit` + `npx vitest run <path>`. Relay
   dispatched `--cd <worktree> --lane implementation --timeout 2h`, backgrounded. `result.json`
   → `status: completed`, `touchedFiles` = the util + its spec. Summary: review-ready,
   orchestrator re-runs lint / tsc / the targeted spec, runs `check-fq-standards` post-check,
   then `/review-fq-work`.
2. **`implementation` lane bound to `agy`; headless write auto-denied.** `result.json` →
   `status: failed`. `fq-delegate` surfaces the `agy` permission remedy verbatim from
   `agy-delegate`'s `SKILL.md`, not a generic failure. Orchestrator either gets explicit human
   approval for `--dangerously-skip-permissions` on a re-dispatch or picks another implementer —
   it does not add the flag on its own judgment.
3. **`.delegate/config.json` absent (fresh clone).** Step 1 stops immediately with "run
   `/setup-fq-fleet`"; nothing is dispatched.
4. **Single-subscription teammate, `claude`-only fleet.** Lane resolves to the same `claude`
   the orchestrator is. `fq-delegate` surfaces the two options; the orchestrator picks
   `claude-delegate` (separate process) for this task to keep the never-implement boundary, and
   pays the second context hit knowingly.
5. **Lane model went stale** (`opencode/muse-spark-1.3-contributor-free` deprecated after
   setup). Dispatch → `status: failed`, stderr shows the model rejected. `fq-delegate` maps it
   to "re-run `/setup-fq-fleet` to reconfigure the `implementation` lane" — the failure class
   ADR 0063 explicitly punted to this issue.
6. **`second-opinion` lane, `--read-only`, best-effort implementer edits a file anyway.**
   `result.json` → `readOnlyViolation: true`. Summary: discard the tree, do not fold the review
   in; re-dispatch on a hard-sandbox implementer (`codex`) if available.
7. **Relay `--timeout 2h` fires mid-run.** `status: timeout`; the worktree holds a partial
   edit. `fq-delegate` says inspect first, then decide between a longer timeout, a smaller
   brief, or `--session` resume — it does not auto-resume.

## Files to Change

- `.claude/skills/fq-delegate/SKILL.md` — **new.** Thin frontmatter (`name: fq-delegate`,
  one-line `description`) + a body that points at `docs/workflow/delegate.md` and names the two
  entry paths (orchestrator-invoked; human `/fq-delegate <task>`). Frontmatter follows the same
  kebab-case `name` (`^[a-z0-9]+(-[a-z0-9]+)*$`) + non-empty `description` + non-empty body rules
  the sibling skills use so the OpenCode command plugin can surface it. (That plugin,
  `.opencode/plugins/fq-commands.js`, is present locally but **not yet committed** — a
  pre-existing gap shared with #571/#572, out of scope here.)
- `docs/workflow/delegate.md` — **new.** The full flow: the five steps above, the brief
  envelope template with the `<task>` / `<constraints>` / `<verification_loop>` /
  `<action_safety>` / `<structured_output_contract>` blocks, the list of load-bearing
  `AGENTS.md` sections to copy, the per-lane `--read-only` rule, the relay-outcome → remedy
  table, the rework cycle, and the
  hand-off to `/review-fq-work`. Links `references/dispatch-and-poll.md` in each relay for the
  full `result.json` field list rather than restating it.
- `docs/workflow/INDEX.md` — **new row** in the "Fleet / Orchestrator (Epic #490, Track 2)"
  table for `/fq-delegate` → `delegate.md`, referencing ADR 0068.
- `docs/architecture/adr/0068-fq-delegate-brief-envelope-and-lane-resolution.md` — **new**
  (written in this plan phase).
- `docs/plans/INDEX.md` — regenerated by `.claude/skills/scripts/gen-plans-index.sh`.

No `.gitignore` change: brief files live in a temp / scratch dir, and `.delegate/` +
`.claude/fleet.json` are already ignored (lines 83–84).

## Constraints

- **Wrap, never fork.** Do not fork, vendor, or edit `amElnagdy/delegate-skills`. The relays
  stay on the `npx skills update` path via `~/.agents/.skill-lock.json`. (Epic #490 decision.)
- **Implementer = the human-approved lane, not a fq heuristic.** Resolve via the relay's
  `--lane` flag against `.delegate/config.json`. `.claude/fleet.json` gates availability only.
  (ADR 0068, superseding #573's "fleet.json by suitability label" wording.)
- **`fq-delegate` never commits, never pushes, never creates a worktree.** `/ship-fq-task` is
  the only sanctioned commit path; the worktree is created in the plan phase.
- **The brief's `<verification_loop>` is `start-task.md`'s discipline exactly** — lint + tsc +
  targeted vitest for pure logic, never the full suite / build / e2e. CI is the real gate
  post-merge.
- **Never pass `--dangerously-skip-permissions` without explicit human approval for that run.**
- **One task per brief.** A muddled multi-task brief produces a muddled run and a messy review.
- **Never treat an implementer's "gates passed" as evidence.** The summary's default next step
  is re-verification by the orchestrator.
- **The foreign implementer is never asked to run a Furqan skill** — it does not have them; the
  brief carries the content those skills check.
- **Per-agent context stays bounded** to the `DECISIONS.md` index + 1–3 domain files, never all
  of them (ADR 0057; the epic's standing constraint).
- This is AI tooling (`.claude/`, `docs/workflow/`) — meta/infra, exempt from the plan→implement
  gate per `AGENTS.md` "Scope", though this plan exists because the user asked for one.
  Workflow decisions are recorded in `docs/workflow/INDEX.md`, not `docs/architecture/decisions/`.

## What NOT to Do

- Do not add a `scripts/fq-delegate.mjs` or any dispatch code — decided doc-only, like
  `detect-fleet` (ADR 0068, Option C rejected).
- Do not build a fq-computed task-suitability / `cost_tier` ranking over `fleet.json` — that is
  #573's original wording, superseded by ADR 0063 + ADR 0068. Lane assignment is the human's,
  made in `/setup-fq-fleet`.
- Do not have `fq-delegate` read or write `.delegate/config.json` directly — only the relay's
  `--lane` resolution (via `delegate-setup`'s `lane.mjs`) touches it.
- Do not implement the #496 delegate 4→1 consolidation, or anything else from Epic #490's other
  children (#571 shipped; #572 shipped; #574 is the orchestrator that consumes this).
- Do not let `fq-delegate` commit, push, create a worktree, or add a `port` entry to
  `~/.claude/furqan-worktrees.json` — there is no dev server; the deliverable is docs.
- Do not ask the foreign implementer to invoke `check-fq-standards` or any Furqan skill.
- Do not restate the relay `result.json` schema in `delegate.md` — link each relay's
  `references/dispatch-and-poll.md`.
- Do not re-bloat the pointer files (`CLAUDE.md` / `GEMINI.md` / `.cursorrules`) with delegation
  rules — `AGENTS.md` + `docs/workflow/INDEX.md` are the canonical surfaces.

## Decisions Made

- **Implementer resolution = the approved `.delegate` lane, `fleet.json` gates availability
  only.** #573's "fleet.json by suitability label" wording predates ADR 0063 and is superseded.
  (Q1, confirmed 2026-09-10; ADR 0068.)
- **Doc-only thin skill, no script.** `SKILL.md` → `docs/workflow/delegate.md`; the orchestrator
  composes the brief and calls `relay.mjs` by following the doc. Mirrors `detect-fleet` /
  `setup-fq-fleet`. (Q2.)
- **All three lanes in scope for #573.** `delegate.md` documents `implementation` (write),
  `planning` and `second-opinion` (`--read-only`). The envelope and result parsing are near
  identical across lanes; #574 then only sequences `fq-delegate` calls. (Q3.)
- **The delegated brief's `<verification_loop>` mirrors `start-task.md` exactly** — lint + tsc +
  targeted vitest for pure logic, no full suite / build / local e2e; CI enforces the rest
  post-merge. (Q4.)
- **Single-provider fleet = caller decides.** When the only lane implementer is the
  orchestrator's own `claude`, `fq-delegate` surfaces both options (separate `claude` via
  `claude-delegate`, or `/start-fq-task` inline) as a first-class outcome rather than picking.
  (Q5.)
- **`fq-delegate` owns the dead-lane-model failure class** that ADR 0063 explicitly deferred:
  a lane resolving to a since-rejected model is surfaced as "re-run `/setup-fq-fleet`", not a
  raw error. (ADR 0068.)
- **ADR created in this plan phase; `docs/workflow/delegate.md`, `SKILL.md`, and the
  `INDEX.md` row are implementation deliverables** — matching how #571 / #572 split ADR-now vs
  workflow-doc-at-implement.
- **Sweep (step 3b):** no existing test asserts any of this (all-new tooling files); nothing
  here reads or writes through the service worker or any `/api/*` route; no state derives from
  an offline-sensitive signal; the "no `.gitignore` change" claim was verified against
  `.gitignore` lines 83–84 (`.claude/fleet.json`, `/.delegate/`); the "`fq-delegate` is a
  drop-in Implement phase feeding `/review-fq-work`" claim was verified against
  `docs/workflow/INDEX.md`'s Core Cycle and #574's phase list; the claim that the relays resolve
  `--lane` from `.delegate/config.json` was verified against every relay's `applyFleetLane`
  (`../../delegate-setup/scripts/lane.mjs resolve …`, which `fail()`s exit 2 with no result file
  when `delegate-setup` is absent — hence the dedicated Step 1 row).
- **Second-opinion review (opencode/muse, read-only, 2026-09-10):** 7 findings, all verified
  against the relay sources and applied — a missing-`delegate-setup` Step 1 row (was misrouted
  to "malformed dispatch"); `copilot` added as the fifth implementer with its own
  `--allow-all-tools` auto-deny row; the explicit-implementer path now restates the per-lane
  `--read-only` rule; per-relay resume flags (`--conversation` for `agy`, `--session` elsewhere);
  `agy` needs `--print-timeout 2h` alongside `--timeout` (its own 30m default fires first);
  denial-before-dead-model classification order; Step 5 pipeline de-fenced to prose;
  `touchedFiles: null` folded into the empty-diff row. The `.opencode/plugins/fq-commands.js`
  claim above was corrected — that plugin file is present locally but uncommitted (shared gap
  with #571/#572).
