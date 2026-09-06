# ADR 0063: Fleet detection and lane setup wrap upstream `delegate-setup`, not a fq-owned prober

**Date:** 2026-09-06
**Status:** Accepted

## Context

Epic #490 (Track 2: agent orchestrator) needs `detect-fleet` (read-only capability report)
and `setup-fq-fleet` (interactive install + configure) so the future orchestrator (T2.4) can
route work across whichever coding CLIs a given team member actually has. The epic's own
refinement already decided to wrap the upstream `*-delegate` skills rather than fork them.
Investigation for #571 found that `amElnagdy/delegate-skills` (the same source as
`claude-delegate`/`codex-delegate`/`agy-delegate`/`opencode-delegate`) ships 18 skills, not 4
— including `delegate-setup`, which already discovers installed CLIs and their **live**
model lists, runs an interactive discover→propose→approve→write flow for a "lane map"
(implementer + model/effort dials per named lane), and enforces a fail-closed trust model on
project-scope config so a cloned or hand-edited lane file can't silently misfire.

## Options Considered

**Option A — fq owns detection and setup end-to-end**
`detect-fleet` runs its own per-CLI probes (`claude auth status`, `codex login status`, `agy
models`, `opencode auth list`); `setup-fq-fleet` implements its own interview + lane-proposal
+ config-write flow, storing the result in an fq-owned config file.

**Option B — wrap `delegate-setup`**
`detect-fleet` ensures `delegate-setup` is installed, runs its `discover.mjs` for capability
data, and layers only what upstream doesn't provide (per-CLI `cost_tier`, whether each CLI's
own `*-delegate` skill is installed). `setup-fq-fleet` installs the `*-delegate` skills the
human actually assigns a lane to, then hands the interactive proposal/approval/write flow
entirely to `delegate-setup`, steering only the **lane names** toward fq's three roles.

## Decision

Option B. Reinventing discovery and an interactive config-writing flow that upstream already
maintains — including live model enumeration, staleness handling (`models.status: reported`
vs `aliases`), and the fail-closed approval-hash trust model for project-scope config —
duplicates real design work for no fq-specific benefit, and it is exactly what the epic's
"wrap the upstream delegate skills, do not fork" decision already rules out.

## Fleet role taxonomy

`setup-fq-fleet` steers `delegate-setup`'s lane proposal to exactly three fq role names, used
consistently across the team regardless of which CLIs an individual has installed:

- `implementation` — a CLI is handed a bounded coding task and its diff is reviewed before landing.
- `planning` — a CLI is asked to reason/plan; no write access implied.
- `second-opinion` — a CLI reviews or critiques work already done; read-only in intent.

This taxonomy is documented, not enforced by delegate-setup itself — a human could name lanes
anything. `setup-fq-fleet` proposes these three names when kicking off the flow; if the human
already has a differently-shaped lane map, `setup-fq-fleet` shows it as-is rather than forcing
a rename.

## `cost_tier` derivation (fq-only enrichment; `discover.mjs` has no billing signal)

| CLI | Signal | `cost_tier` |
|---|---|---|
| claude | `claude auth status` → `authMethod=="claude.ai"` + `subscriptionType` | `flat-rate (<subscriptionType>)` |
| claude | any other `authMethod` (API key / console / bedrock / vertex) | `metered` |
| codex | `codex login status` text contains "ChatGPT" | `flat-rate (ChatGPT)` |
| codex | text contains "API key" | `metered` |
| agy / opencode | no billing signal exposed by the CLI itself | `unknown` |
| any | not authenticated | `n/a` |

`cost_tier` is best-effort and never scrapes a provider billing API — only what the CLI's own
status output already exposes. This mirrors the "never invent model ids" discipline
`delegate-setup` already applies to models.

## Config scope and storage

`setup-fq-fleet` steers `delegate-setup` toward **project scope** — `<repo>/.delegate/config.json`
— never global, and that path plus fq's own `.claude/fleet.json` detection cache are both
gitignored. Neither file is a repo artifact: each machine's fleet differs (a one-CLI team
member is a first-class case per the epic), so there is nothing to commit. The only thing that
ships in the repo is the role-taxonomy convention itself, in
[`docs/workflow/fleet-setup.md`](../../workflow/fleet-setup.md).

## Consequences

- **+** No fq-owned per-CLI probing code to maintain across 17+ CLIs' auth quirks — `discover.mjs`
  already tracks that, and picks up new CLIs `delegate-setup` adds upstream for free.
- **+** Model staleness (e.g. a free promotional model disappearing) is inherited from
  `delegate-setup`'s live-query discovery and its existing "Reconfigure" flow — no fq-specific
  staleness detection needed for #571.
- **+** The fail-closed approval-hash trust model means a stale or hand-edited `.delegate/config.json`
  can never be silently trusted by a `*-delegate` relay.
- **-** fq is coupled to `delegate-setup`'s schema (`delegate-fleet.v1`) and lane/dial vocabulary;
  a breaking change upstream is a breaking change here. Mitigated by pinning through the existing
  `~/.agents/.skill-lock.json` update flow (`npx skills update`), which is already how the four
  `*-delegate` skills are kept current.
- **-** Detecting and reacting to a dispatch-time failure from an already-approved-but-now-dead
  model (e.g. `opencode/muse-spark-1.3-contributor-free` deprecated after setup) is explicitly
  **not** this issue's job — it belongs to T2.3 (`fq-delegate`) or T2.4 (the orchestrator), which
  actually dispatch through a lane.
