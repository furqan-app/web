# ADR 0068: `fq-delegate` wraps the delegate relays with an fq brief envelope; the implementer is the approved lane, not a fq heuristic

**Date:** 2026-09-10
**Status:** Accepted

## Context

Epic #490 (Track 2) needs an *Implement* phase where the orchestrator never types code — it
dispatches to a fleet implementer and reviews the diff. The upstream `*-delegate` skills
(`amElnagdy/delegate-skills`) already run a foreign CLI headless, write-capable, against the
real worktree at `--cd` and return a `result.json`; what they do not carry is Furqan's
constraints, gate discipline, commit boundary, or lane vocabulary. #573's original wording said
`fq-delegate` should "pick the best fit from `.claude/fleet.json` by task-suitability label" —
but #571 shipped afterward with [ADR 0063](0063-fleet-detection-wraps-delegate-setup.md), which
moved lane assignment to a human-approved `.delegate/config.json` and explicitly ruled out a
fq-computed suitability heuristic. This ADR settles `fq-delegate`'s shape against that later
decision.

## Options Considered

**Option A — `fq-delegate` ranks implementers from `fleet.json`**
The skill reads `.claude/fleet.json` and picks an implementer by a fq suitability label /
`cost_tier`, as #573's body literally described.

**Option B — `fq-delegate` resolves the human-approved lane, `fleet.json` only gates availability**
The skill passes `--lane <implementation|planning|second-opinion>` to the relay, which resolves
it from `.delegate/config.json` via `delegate-setup`'s `lane.mjs`. `.claude/fleet.json` is
consulted only to confirm the resolved implementer is installed, authenticated, and has its
`*-delegate` skill. An explicit caller-supplied implementer always overrides.

**Option C — a fq-owned dispatch script**
A `scripts/fq-delegate.mjs` owns brief assembly, dispatch, and result parsing end to end.

## Decision

**Option B**, delivered as a **doc-only thin skill** (`SKILL.md` → `docs/workflow/delegate.md`),
no script — matching `detect-fleet` / `setup-fq-fleet`. Choosing an implementer per task is a
human decision already encoded in the approved lane map ([ADR 0063](0063-fleet-detection-wraps-delegate-setup.md));
`fq-delegate` consumes that decision, it does not re-make it. #573's "fleet.json by suitability
label" wording is superseded by this ADR. Option C is rejected because the load-bearing part of
a brief — which one to three `decisions/*.md` domain files and which `AGENTS.md` constraints
matter for *this* task — is orchestrator judgment a script cannot do well, and the mechanical
remainder (dispatch, `result.json` parsing) is small enough to document.

## The brief envelope

`docs/workflow/delegate.md` tells the orchestrator to wrap the task-specific body in a fixed
Furqan envelope before dispatch:

- **Load-bearing `AGENTS.md` constraints, copied in verbatim.** `claude-delegate` auto-discovers
  the repo's `CLAUDE.md` and `codex-delegate` the repo's `AGENTS.md`, but neither loads the full
  set and `agy` reads only `GEMINI.md` — the brief carries what the run needs regardless of
  implementer.
- **The one to three `decisions/*.md` domain files the task touches** (index + domains, per
  [ADR 0057](0057-decisions-split-by-domain.md)) — never all of them; the per-agent context tax
  is the epic's standing constraint.
- **The plan link** (`docs/plans/<slug>.md`) and the **worktree path** for `--cd`.
- **`<verification_loop>` = Furqan's local gate discipline exactly** (`docs/workflow/start-task.md`):
  `npm run lint` + `npx tsc --noEmit`, and `npx vitest run <path>` only for pure logic with
  specs — never full `npm test`, `npm run build`, or local e2e. CI enforces the rest on the PR
  after the orchestrator commits.
- **`<action_safety>` = no `git add` / `git commit`.** The implementer leaves work uncommitted;
  `/ship-fq-task` remains the only sanctioned commit path.
- **`<structured_output_contract>`** for a delimited report the orchestrator can parse past
  environment preamble.

The foreign implementer is never asked to invoke a Furqan skill (`check-fq-standards` and the
rest) — it does not have them. The orchestrator runs `check-fq-standards` on the returned diff
during review.

## Failure modes are first-class outcomes

`delegate.md` maps each relay `result.json` state to a specific remedy rather than a generic
"it failed": headless write auto-deny (`status: failed`) — `agy` under `--print`, `copilot`
without `--allow-all-tools`; `<cli>_unavailable` (exit 127, result file written) →
`/setup-fq-fleet`; exit 2 with **no** result file split by stderr — a missing `delegate-setup`
skill (→ `/setup-fq-fleet`) vs a genuinely malformed dispatch; `timeout` (inspect the
half-applied tree); `readOnlyViolation` on a `planning` / `second-opinion` lane (discard the
tree, do not review). Because a permission denial and a dead model both present as `status:
failed` plus stderr, the classification order is denial-first. This ADR also assigns
`fq-delegate` the **dead-lane-model** failure class that ADR 0063 explicitly deferred: when a
lane resolves to a model the CLI now rejects, `fq-delegate` surfaces "re-run `/setup-fq-fleet`
to reconfigure the `<lane>` lane", not a raw error.

## Single-provider fleet

When the resolved lane implementer is the same `claude` the orchestrator runs as, `fq-delegate`
does not silently pick one path: it surfaces a first-class choice — dispatch through
`claude-delegate` to a separate `claude` process (preserves the never-implement boundary, costs
a second context/quota hit), or run `/start-fq-task` inline (cheaper, breaks the boundary for a
one-subscription user). The orchestrator decides, escalating to `fq-ask-human` if it cannot.

> **Amended 2026-09-11 — the inline option is withdrawn.** Offering "run `/start-fq-task` inline"
> as a co-equal choice was wrong twice over. First, its stated justification does not hold:
> `claude-delegate` dispatches to a separate *process*, not a separate *subscription*, so a
> one-subscription user was never blocked — the inline path bought quota, not capability, and what
> it spent was the review independence the whole epic exists to produce (an orchestrator that
> implements then reviews and re-verifies its own diff makes "never accept a self-report"
> self-referential). Second, a hard boundary with a documented, self-serve exception is not a
> boundary; the post-merge audit found agents will take a documented option and believe they are
> compliant, and routing the exception through `fq-ask-human` would be worse still — an
> `onTimeout: "default"` payload would let a timeout waive it unattended.
>
> The replacement is neither inline nor a forced second process, because forcing one burns a
> one-plan user's limit for no gain they chose: **the orchestrator offers the separate process,
> and on a declined or unanswered offer hands the implement phase back to the human** — implement
> with `/start-fq-task` in the worktree, re-enter at `--from review`. A human implementing is not
> a boundary violation; the orchestrator is what must not type app code, and the reviewer still is
> not the implementer. If inline is genuinely the right answer for a task, that task did not need
> the orchestrator at all.

## Consequences

- **+** No fq dispatch code to maintain across five relays; `npx skills update` keeps the
  relays current, as it already does.
- **+** One documented brief envelope means every delegated run carries the same Furqan
  constraints and the same commit boundary, regardless of which CLI implements.
- **+** `fq-delegate` slots into the existing cycle as a drop-in *Implement* phase — its
  summary feeds `/review-fq-work` → `/retrospect` → `/ship-fq-task` unchanged.
- **-** The orchestrator re-pays the context tax to compose each brief by hand; a doc, not a
  script, is the only leverage against that.
- **-** fq is coupled to the relays' `--lane` contract and `result.json` schema
  (`delegate-relay.result.v1`); an upstream breaking change is a breaking change here, mitigated
  only by the pinned `~/.agents/.skill-lock.json` update flow.
- **-** Brief quality is unbounded by tooling — a thin brief still produces a wandering run.
  The `delegate.md` template and the "one task per brief" rule are the only guardrails.
