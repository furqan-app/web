# Delegate an Implementation

`fq-delegate` is Epic #490's *Implement* phase: the orchestrator never types code — it hands one
bounded, already-planned task to a fleet implementer CLI, then reviews the diff and lands it through
the normal cycle. This doc is the whole skill; `.claude/skills/fq-delegate/SKILL.md` is a pointer to
it. See [ADR 0068](../architecture/adr/0068-fq-delegate-brief-envelope-and-lane-resolution.md) for the
design rationale.

It wraps the upstream `*-delegate` relays (`amElnagdy/delegate-skills`, the same source as
`detect-fleet` / `setup-fq-fleet`). Each relay already runs its CLI headless, write-capable, against
the real worktree at `--cd` and writes a `result.json`. What the relays do not carry is Furqan —
its constraints, its gate discipline, its commit boundary. That envelope is what this doc adds.

**`fq-delegate` never commits, never pushes, and never creates a worktree.** `/ship-fq-task` is the
only sanctioned commit path; the worktree is created in the plan phase.

## Prerequisites

1. **The plan exists and its worktree exists.** `docs/plans/<slug>.md` is written and
   `../furqan-<slug>` is a live worktree (both from `/plan-fq-task`). `fq-delegate` implements a
   plan; it does not create one.
2. **`/setup-fq-fleet` has run at least once.** It installs `delegate-setup` beside the relays
   (the `--lane` resolution shells out to `delegate-setup/scripts/lane.mjs` and fails hard without
   it), writes the human-approved lane map at global scope, and installs the `*-delegate`
   skill for each implementer a lane actually uses. If no lane map resolves, stop and
   tell the caller to run `/setup-fq-fleet`.
3. **`.claude/fleet.json` is reasonably fresh** (`/detect-fleet`, or `--refresh` if it looks
   stale) — it is the availability check in step 1.

## The three lanes

| Lane | Write? | Relay flag | Used by |
|---|---|---|---|
| `implementation` | yes | `--lane implementation` | the Implement phase — a bounded coding task, diff reviewed before landing |
| `planning` | no | `--lane planning --read-only` | #574's align phase — a provider proposes a direction, touching no files |
| `second-opinion` | no | `--lane second-opinion --read-only` | a delegated review / critique of work already done |

The brief envelope and the `result.json` handling are the same across lanes; only write-capability
and the brief body differ.

## Step 1 — Resolve the implementer

| Condition | Action |
|---|---|
| Caller named an implementer explicitly | Use that relay directly, and **drop `--lane`** unless that lane's implementer *is* the tool you named: `lane.mjs` is called with the relay's own hardcoded key, so a mismatch exits 2 (`fleet lane "<lane>" → <other> (use <other>-delegate); this relay is <named>`). A named implementer therefore inherits **nothing** from a lane bound to a different tool — pass its dials explicitly, and note `opencode` always requires `--model`. Same tool as the lane is the one case where `--lane` still applies: the lane's dials fill in and any flag you passed wins. The per-lane `--read-only` rule (Step 3) still applies — an explicit `planning` / `second-opinion` dispatch is still read-only. |
| No lane map resolves (`config.mjs load --cwd <dir>` empty) | **Stop** — "run `/setup-fq-fleet` first". The map lives at global scope (`~/.config/delegate-skills/config.json`); a project `.delegate/config.json` is gitignored and so is absent from the per-task worktrees dispatch runs in. |
| `delegate-setup` missing beside relays (`~/.agents/skills/delegate-setup/` absent) | **Stop** — `delegate-setup` is not installed; run `/setup-fq-fleet` (it installs `delegate-setup`). |
| Lane in `.claude/fleet.json` resolves; implementer is on PATH, authenticated, and its `~/.agents/skills/<tool>-delegate/scripts/relay.mjs` resolves | Dispatch (step 3). |
| Lane in `.claude/fleet.json` maps to missing / unauthenticated implementer or no `*-delegate` skill | **Stop** — "run `/setup-fq-fleet`" (or `/detect-fleet --refresh` if the cache is just stale). |
| Lane resolves to the same `claude` the orchestrator is running as | **First-class choice, do not pick silently:** dispatch through `claude-delegate` to a *separate* `claude` process (keeps the never-implement boundary, costs a second context/quota hit), or run `/start-fq-task` inline (cheaper, breaks the boundary for a one-subscription user). The orchestrator decides; escalate to `fq-ask-human` if it cannot. |

Step 1 resolves the implementer from `.claude/fleet.json`'s effective lane map (never by
parsing `.delegate/config.json` directly). Step 3 then dispatches that tool's relay,
passing `--lane <name>` so the relay applies the lane's dials (model/effort/sandbox) and
validates that the lane is assigned to this implementer via `delegate-setup`. Explicit
relay flags override lane dials.

## Step 2 — Compose the brief

The implementer sees **only** the brief text plus what it can read in the worktree. Write the brief
to a temp / scratch file — **never** into the repo. Wrap the task-specific body in this envelope:

```xml
<task>
The bounded job, from docs/plans/<slug>.md: what to build, the current state, what to change, and
explicitly what to leave untouched. Implement exactly what the plan specifies — do not expand scope.
The plan file and its Constraints / What NOT to Do sections are in the worktree; read them.
If you come to doubt a premise the plan states as fact — an invariant, a "this never happens", a
claim that some file stays untouched — stop and check it against the ADR or spec it derives from
before you write code against it. A plan can be confidently wrong.
</task>

<constraints>
[Copy in, verbatim:]
- The load-bearing AGENTS.md sections (see the list below).
- The 1–3 docs/architecture/decisions/*.md domain files this task touches (index + domains, per
  ADR 0057) — never all of them. Name them by path; the implementer reads them from the worktree.
</constraints>

<verification_loop>
Run before finishing and fix what they surface — do not just report:
  npm run lint
  npx tsc --noEmit
  npx vitest run <path>   # ONLY for pure logic/util files that have specs
Do NOT run full `npm test`, `npm run build`, or any local e2e — CI enforces those on the PR after
the orchestrator commits. Confirm `git status` shows only the intended changes.
</verification_loop>

<action_safety>
Scope changes to the task. No unrelated refactors, renames, or cleanup. Do NOT run `git add`,
`git commit`, or `git push`, and do NOT create, push to, or merge any PR — the orchestrator ships
through `/ship-fq-task` after review. Leave the work uncommitted in the working tree.
</action_safety>

<structured_output_contract>
End with a clearly delimited report: (1) what changed and why, (2) files touched, (3) gate outcomes
with counts, (4) anything you deviated on, left open, or want a decision on.
</structured_output_contract>
```

**Load-bearing `AGENTS.md` sections to copy in:**

- *Radical transparency* — no silent substitution, admit when unclear, report failures openly.
- *Response style* — project terminology (surah / verse / word-level / mushaf; match `docs/standards/`
  and the Prisma model casing).
- The MANDATORY WORKFLOW section is **not** copied — the implementer is mid-workflow already; the
  `<task>` block's "implement exactly what the plan specifies" is the scope boundary.

`codex-delegate` auto-reads the repo's `AGENTS.md` and `claude-delegate` the repo's `CLAUDE.md`;
`agy` reads only `GEMINI.md`. Do not rely on any of that — the brief carries what the run needs.

The implementer is **never** told to invoke a Furqan skill (`check-fq-standards`, `/review-fq-work`,
…) — it does not have them. The orchestrator runs `check-fq-standards` on the returned diff.

## Step 3 — Dispatch

```bash
node ~/.agents/skills/<tool>-delegate/scripts/relay.mjs \
  --brief <brief-file> --cd <abs-worktree-path> --lane <lane> [--read-only] --timeout 2h
```

- `<tool>` is `codex` / `agy` / `opencode` / `claude` / `copilot`. Confirm the relay path — Claude
  Code prints "Base directory for this skill" when a `*-delegate` skill loads; otherwise
  `find ~ -name relay.mjs -path '*<tool>-delegate*'`.
- `--read-only` for `planning` and `second-opinion`. Never for `implementation`.
- `opencode` has no default model — a fresh run needs `--model <provider/model>` (or the lane
  supplies one). `--variant <name>` sets its reasoning effort.
- `--timeout 2h` by default — implementation runs routinely need 1–2h. **For `agy`, also pass
  `--print-timeout 2h`** — agy's own print-mode timeout defaults to 30m and fires before the relay
  watchdog.
- **Background it.** On Claude Code, run the `Bash` call with `run_in_background: true`. A run is
  finished when the process has exited **and** `result.json` exists — never trust a progress line.
- For rework, send a delta brief (not the whole task) and resume the same session: `--resume-last`
  anywhere, or the recorded id — `--session <id>` for codex / claude / opencode / copilot,
  `--conversation <id>` for `agy`.

## Step 4 — Read `result.json` → review-ready summary

`result.json` (`status` + exit code) is the contract. Full field list is in each relay's
`references/dispatch-and-poll.md` — do not restate it. Report `touchedFiles`, the implementer's
`finalMessage` claims, and the session id for rework, then classify the outcome:

Classify in this order — a permission denial and a dead model both surface as `status: failed`
with stderr text, so check the denial cases first.

| Signal | fq-delegate surfaces |
|---|---|
| `status: completed`, `touchedFiles` non-empty | Review-ready. Re-verify the gates and run `check-fq-standards` on the diff — do not accept the self-report. |
| `status: completed`, `touchedFiles` `[]` or `null` on a write lane | No diff to review (`null` = git couldn't report). Read `finalMessage` for why before re-dispatching. |
| `status: failed`, implementer is `agy` under `--print` | `agy` auto-denied writes headless. Needs **explicit human approval** of `--dangerously-skip-permissions` for one re-dispatch, or a different implementer. Never add that flag on your own judgment. |
| `status: failed`, implementer is `copilot` without `--allow-all-tools` | copilot auto-denied its tool calls headless. Needs **explicit human approval** of `--allow-all-tools` for one re-dispatch (mutually exclusive with `--read-only`), or a different implementer. |
| `status: <tool>_unavailable` (exit 127, result file written) | `<tool>` not on PATH — run `/setup-fq-fleet`. |
| exit 2, **no** result file, stderr names `delegate-setup` | `delegate-setup` not installed beside the relays — run `/setup-fq-fleet`. |
| exit 2, **no** result file, any other stderr | Malformed dispatch (bad args / empty brief) — fix the command and re-dispatch. |
| `status: failed`, not a denial, stderr shows the model was rejected | The `<lane>` lane's model is dead — re-run `/setup-fq-fleet` to reconfigure that lane. |
| `status: timeout` | The watchdog killed the run; the tree may be half-applied. Inspect it before choosing a longer `--timeout` (and `--print-timeout` for `agy`), a smaller brief, or a resume. Do not auto-resume. |
| `status: aborted` | The relay itself was killed. Inspect the working tree and the run's `events.jsonl` before re-dispatching. |
| read-only lane, `readOnlyViolation: true` or `touchedFiles` non-empty | The implementer edited files under a read-only lane — discard the tree, do not fold the output into a review. Only the `agy` and `claude` relays emit `readOnlyViolation`; for `opencode` / `copilot` check `touchedFiles` yourself. Re-dispatch on the hard-sandbox implementer (`codex`) if the lane needs a guarantee. |

Every summary ends the same way: **the orchestrator re-verifies gate claims and "done"; it never
accepts them.**

## Step 5 — Hand off

`fq-delegate` is a drop-in for the Implement phase. Its summary feeds the normal cycle unchanged:
`/review-fq-work` against the uncommitted working tree, then `/retrospect`, then `/ship-fq-task`.

The delegated implementer runs **none** of `start-task.md`'s tail — it does not record new
decisions, update `COMPONENTS.md`, or flip the plan to `status: implemented`. Whoever drove the
dispatch (the orchestrator, or the human who typed `/fq-delegate`) does that after re-verifying
the diff.

The orchestrator surfaces the implementer's design decisions, defensible-but-unasked turns, and
non-blocking nitpicks in the review rather than absorbing them, and stops for scope changes instead
of expanding its own mandate.

## What NOT to do

- Do not build a `fleet.json` suitability / `cost_tier` ranking to pick the implementer — lane
  assignment is the human's, made in `/setup-fq-fleet` (ADR 0068, superseding #573's original
  wording).
- Do not read or write the lane-map config directly — read the effective map from
  `.claude/fleet.json`; only the relay's `--lane` resolution touches the config file itself.
  Never hand-edit it: the relays verify an approval recorded by `config.mjs write`, and an edited
  config fails closed as "not trusted".
- Do not let `fq-delegate` commit, push, create a worktree, or write a brief file into the repo.
- Do not pass a permission-bypass flag (`--dangerously-skip-permissions` for `agy`,
  `--allow-all-tools` for `copilot`) without explicit human approval for that run.
- Do not ask the foreign implementer to run `check-fq-standards` or any Furqan skill.
- Do not put more than one task in a brief.
- Do not treat "gates passed" in the implementer's report as evidence — re-run them.
- Do not load every `decisions/*.md` file into the brief — index + 1–3 domain files (ADR 0057).
