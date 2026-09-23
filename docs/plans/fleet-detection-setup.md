---
title: Fleet Detection + On-Demand Setup (detect-fleet, setup-fq-fleet)
type: feature
date: 2026-09-06
status: implemented
area: workflow
issue: 571
adr: [0063]
---

# Fleet Detection + On-Demand Setup (detect-fleet, setup-fq-fleet)

## Summary

Two new skills for Epic #490 (Track 2: agent orchestrator): `detect-fleet`, a read-only report
of which coding CLIs are installed/authenticated on the current machine and what they can do,
and `setup-fq-fleet`, an on-demand, human-confirmed flow that installs missing pieces and
configures a lane map (which implementer handles implementation vs. planning vs. second-opinion
work). Together these let a future orchestrator (T2.4) route work across whatever fleet a given
team member actually has, without ever requiring more than a single `claude` subscription to be
useful. Investigation found that `amElnagdy/delegate-skills` — the upstream source for the
already-installed `claude-delegate`/`codex-delegate`/`agy-delegate`/`opencode-delegate` skills —
also ships `delegate-setup`, a skill that already does live CLI/model discovery and an
interactive propose→approve→write flow for exactly this kind of lane map. Both new fq skills
wrap it rather than reimplementing it (see [ADR 0063](../architecture/adr/0063-fleet-detection-wraps-delegate-setup.md)).

## Approach

**`detect-fleet`** (read-only, side-effect free):
1. Ensure `delegate-setup` is installed (confirm with the human if missing, then `npx skills add
   amElnagdy/delegate-skills -s delegate-setup`).
2. Run `node <delegate-setup-dir>/scripts/discover.mjs` for live capability data: which CLIs
   (from the full `amElnagdy/delegate-skills` catalog — 18 skills, not just the 4 already
   installed) are on PATH, authenticated (`true`/`false`/`null` for "no auth probe wired," e.g.
   `agy`), and their current model lists (`reported` = live query, `aliases` = curated stable
   names, `unsupported`/`failed` otherwise).
3. Layer fq-only enrichment on top: `delegateSkillInstalled` (does
   `~/.agents/skills/<tool>-delegate/scripts/relay.mjs` resolve) and `costTier` (see Decision
   Tree below — `discover.mjs` has no billing signal).
4. If `<repo>/.delegate/config.json` exists and is trusted for this repo, include the current
   effective lane map for visibility only (`config.mjs load --cwd <repo>`) — never propose or
   write lanes from `detect-fleet`.
5. Cache the merged result to `.claude/fleet.json` with a `detectedAt` timestamp; `--refresh`
   forces a re-probe.

**`setup-fq-fleet`** (on-demand, human-confirmed):
1. Confirm + install `delegate-setup` if missing.
2. Run `detect-fleet` for the "before" state.
3. Hand off entirely to `delegate-setup`'s own flow (`discover → load → grounding menu →
   propose (with Basis) → scope → approve → write`), steering:
   - Lane **names** toward `implementation` / `planning` / `second-opinion`.
   - Scope toward **project** (`<repo>/.delegate/config.json`), never global.
   - A note (not an automatic exclusion) when the proposal would bind `implementation` to `agy`,
     surfacing `agy-delegate`'s own documented headless-write auto-deny risk.
4. On approval, `delegate-setup` writes `.delegate/config.json` itself — `setup-fq-fleet` never
   touches that file directly.
5. Only after approval, install the `*-delegate` skill for each implementer actually assigned a
   lane (confirming each install individually) — never install one for a CLI that didn't end up
   in the lane map.
6. Re-run `detect-fleet` for the "after" state and show the before/after diff.
7. For any CLI needing a login or paid subscription the human doesn't have, print the
   install/login command — never execute it, never touch credentials.

## Decision Tree / Algorithm

**`cost_tier`** (fq-only enrichment; `discover.mjs` exposes no billing signal):

| CLI | Signal | `cost_tier` |
|---|---|---|
| claude | `claude auth status` → `authMethod=="claude.ai"` + `subscriptionType` | `flat-rate (<subscriptionType>)` |
| claude | any other `authMethod` (API key / console / bedrock / vertex) | `metered` |
| codex | `codex login status` text contains "ChatGPT" | `flat-rate (ChatGPT)` |
| codex | text contains "API key" | `metered` |
| agy / opencode | no billing signal exposed by the CLI itself | `unknown` |
| any | not authenticated | `n/a` |

**Lane suitability** is *not* an fq-computed classification — `delegate-setup`'s own rule is
"discovery reports capability, never task fit." Which CLI/model handles which of fq's three
roles is a human decision made during `setup-fq-fleet`'s handoff to `delegate-setup`'s
interactive flow, not a heuristic `detect-fleet` applies.

**Install ordering** (`setup-fq-fleet`): install `delegate-setup` first (needed for the flow
itself) → run the interactive flow to get an approved lane map → install `*-delegate` skills
only for implementers that ended up in that map. Never install a `*-delegate` skill before the
human has approved a lane using it.

## Verified Test Cases

- **This machine, 4 CLIs already installed** (`claude` 2.1.261, `codex` 0.146.0, `opencode`
  1.18.29, `agy` 1.1.27): `discover.mjs` reports all four as `authenticated: true` (except `agy`,
  which is `null` — no status probe exists for it, not a failure) with live model lists (e.g.
  opencode: 23 models including `opencode/muse-spark-1.3-contributor-free`;
  codex: `gpt-5.6-sol`, `gpt-5.6-terra`, …). `cost_tier`: claude → `flat-rate (pro)`
  (`authMethod: "claude.ai"`, `subscriptionType: "pro"`); codex → `flat-rate (ChatGPT)`
  (`codex login status` → "Logged in using ChatGPT"); opencode and agy → `unknown`. No
  `.delegate/config.json` yet → fleet.json reports "no lanes configured."
- **Single-subscription teammate, only `claude` installed:** `detect-fleet` reports just claude;
  the other 17 CLIs land in `discover.mjs`'s `missing` list. `setup-fq-fleet` hands off to
  `delegate-setup`, which — with only one implementer available — proposes all three lanes
  (`implementation`/`planning`/`second-opinion`) bound to claude, varying only effort/model
  dials. No special-case code needed on fq's side; this is `delegate-setup`'s existing behavior
  for a one-CLI fleet.
- **A lane's model goes stale later** (e.g. `opencode/muse-spark-1.3-contributor-free` is
  deprecated after setup): `discover.mjs` queries live on every run, so a later
  `setup-fq-fleet` reconfigure pass simply won't offer that model anymore and the human re-picks
  during the normal "Reconfigure" flow. Detecting/handling a *dispatch-time* failure from an
  already-approved-but-now-dead model is explicitly out of scope for #571 — it belongs to
  whichever skill actually dispatches through a lane (T2.3 `fq-delegate` or T2.4 the
  orchestrator).

## Files to Change

- `.claude/skills/detect-fleet/SKILL.md` — new, thin pointer to `docs/workflow/fleet-setup.md`.
- `.claude/skills/setup-fq-fleet/SKILL.md` — new, thin pointer to `docs/workflow/fleet-setup.md`.
- `docs/workflow/fleet-setup.md` — new, the full flow for both skills + the role taxonomy.
- `docs/workflow/INDEX.md` — new "Fleet / Orchestrator" table section.
- `docs/architecture/adr/0063-fleet-detection-wraps-delegate-setup.md` — new ADR.
- `.gitignore` — add `.claude/fleet.json` and `/.delegate/`.
- `docs/plans/INDEX.md` — regenerated to include this plan.

## Constraints

- Never scrape a provider billing API to compute `cost_tier` — only what a CLI's own status
  output already exposes; report `unknown` otherwise.
- Never auto-install a CLI itself or run a login/auth command — print it for the human.
- Never write to `delegate-setup`'s global config path — always steer to project scope.
- Never install a `*-delegate` skill before its CLI is actually assigned a lane in an approved
  config.
- `detect-fleet` must stay side-effect free — no installs, no config writes, no lane proposals.
- Workflow/process decisions for this task live in `docs/workflow/`, not
  `docs/architecture/decisions/*.md` (per `DECISIONS.md`'s "Recording new decisions" rule) — this
  plan's ADR is referenced from `docs/workflow/INDEX.md`, not a `decisions/` domain file.

## What NOT to Do

- Do not reimplement per-CLI probing (`claude auth status`, `codex login status`, `agy models`,
  `opencode auth list`) as fq's primary detection path — `discover.mjs` already does this for
  the whole `amElnagdy/delegate-skills` catalog; fq only adds `cost_tier` and
  `delegateSkillInstalled` on top.
- Do not reimplement `delegate-setup`'s interview/usage-scan/propose/approve/write flow —
  `setup-fq-fleet` hands off to it entirely, only steering lane names and scope.
- Do not build fq-specific Copilot CLI support. It was raised during scoping as a possible
  addition; it turns out `amElnagdy/delegate-skills` already ships `copilot-delegate`, so it is
  picked up automatically by wrapping `delegate-setup`, like every other catalog CLI — there is
  nothing fq-specific to build for it.
- Do not commit `.delegate/config.json` or `.claude/fleet.json` to the repo — both describe one
  machine.
- Do not build an fq-computed "task-suitability" heuristic (e.g. auto-restricting `agy` from
  `implementation`) — that was an earlier draft of this plan, superseded once `delegate-setup`'s
  human-approved lane map was found to already cover this; fq only surfaces the `agy` write-risk
  as a note during the interactive flow, never as an automatic filter.

## Decisions Made

- Wrap `delegate-setup` rather than build fq's own detection/setup flow from scratch — see
  ADR 0063 for the full rationale and rejected alternative.
- Fleet config lands at project scope, gitignored — never global, never committed. Team-wide
  consistency comes only from the documented role-naming convention in
  `docs/workflow/fleet-setup.md`, not from a shared config file.
- `cost_tier` is fq's own enrichment layer on top of `discover.mjs`, derived only from
  CLI-exposed signals, never a billing-API scrape.
- GitHub Copilot support was raised during scoping and confirmed as in-scope only if it exists in
  `amElnagdy/delegate-skills` — it does (`copilot-delegate`), and since fq wraps the whole catalog
  via `delegate-setup` rather than a hardcoded 4-CLI list, it is already covered with no
  additional fq-side work.
