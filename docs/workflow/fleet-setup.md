# Fleet Detection & Setup

Two skills for Epic #490 (Track 2: agent orchestrator): `detect-fleet` (read-only capability
report) and `setup-fq-fleet` (interactive install + lane configuration). Together they let the
orchestrator ([`orchestrate.md`](orchestrate.md)) route work across whichever coding CLIs a team
member actually has installed, without ever assuming a specific fleet. See
[ADR 0063](../architecture/adr/0063-fleet-detection-wraps-delegate-setup.md) for why both wrap
the upstream `delegate-setup` skill instead of reimplementing discovery and lane setup.

**A one-CLI team member is a first-class case.** Nothing here may require more than `claude`
itself to be useful — `detect-fleet` degrades to a single-provider report, and
`delegate-setup`'s own lane proposal already handles an all-claude fleet without any special
case on fq's side.

## Fleet role taxonomy

`setup-fq-fleet` steers `delegate-setup`'s lane proposal toward exactly three role names, kept
consistent across the team regardless of which CLIs an individual has:

| Role | Meaning |
|---|---|
| `implementation` | A CLI is handed a bounded coding task; its diff is reviewed before landing. |
| `planning` | A CLI is asked to reason or plan; no write access implied. |
| `second-opinion` | A CLI reviews or critiques work already done; read-only in intent. |

If a human already has a lane map shaped differently, `setup-fq-fleet` shows it as-is rather
than forcing a rename — the taxonomy is a starting proposal, not an enforced schema.

## `detect-fleet`

1. Ensure the upstream `delegate-setup` skill is installed (`npx skills add
   amElnagdy/delegate-skills -s delegate-setup --global`), confirming with the human first if
   it's missing. **`--global` is load-bearing.** Without it `npx skills` auto-detects project
   scope inside a repo and installs into `<repo>/.agents/skills/` — which here is a symlink to
   `.claude/skills/`, so the skill lands *inside the repo*, untracked and not gitignored, and
   drops a `skills-lock.json` at the root. The relays also resolve `delegate-setup` at
   `~/.agents/skills/` relative to themselves, so a project-scope install is invisible to them
   anyway.
2. Run `node <delegate-setup-dir>/scripts/discover.mjs` for live CLI/auth/model capability
   data. This already covers every CLI in the `amElnagdy/delegate-skills` catalog (18 skills
   at last count), not just the four already installed for this repo.
3. Layer fq-only enrichment on top of `discover.mjs`'s output:
   - `delegateSkillInstalled` — whether that CLI's own `*-delegate` skill is resolvable at
     `~/.agents/skills/<tool>-delegate/scripts/relay.mjs`.
   - `costTier` — see the derivation table in ADR 0063. `discover.mjs` reports capability, never
     billing, so this is fq's own best-effort layer, never a provider-billing-API scrape.
4. If a lane map is configured and trusted (`config.mjs load --cwd <repo>` — global, or a
   project `<repo>/.delegate/config.json` overlaying it), include the current effective lane map
   for visibility only — `detect-fleet` never proposes or writes lanes itself.
5. Cache the merged result to `.claude/fleet.json` with a `detectedAt` timestamp. This file
   describes one machine and is gitignored — never commit it.
6. Support `--refresh` to force a re-probe instead of reusing the cache.

Degrade cleanly: a machine with only `claude` produces a valid single-provider report, not an
error.

## `setup-fq-fleet`

1. Confirm and install `delegate-setup` if `detect-fleet` reports it missing.
2. Run `detect-fleet` for the "before" state.
3. Hand off entirely to `delegate-setup`'s own flow (`discover → load → grounding menu →
   propose (with Basis) → scope → approve → write`), steering:
   - Lane **names** toward `implementation` / `planning` / `second-opinion`.
   - Scope toward **global** (`~/.config/delegate-skills/config.json`), *not* project.
     Project scope is the natural choice — each teammate's installed CLI subset differs — but it
     does not survive this project's flow: `.delegate/` is gitignored, `/plan-fq-task` creates a
     fresh `../furqan-<slug>` worktree for every task, and `fq-delegate` dispatches with `--cd
     <worktree>`. A project lane map therefore does not exist where the work actually happens,
     and every lane resolve there fails `fleet lane not found` (exit 2). Global resolves from
     both the main repo and any worktree. Prefer one scope only — a project map that duplicates
     the global one silently wins in the main checkout and is absent in worktrees, which is worse
     than either alone.
   - When `delegate-setup`'s proposal would bind the `implementation` lane to `agy`, surface the
     caveat from `agy-delegate`'s own `SKILL.md`: headless writes in `--print` mode can be
     silently auto-denied. This is a note for the human to weigh, not an automatic exclusion —
     `delegate-setup` already asks for basis and flags uncertainty on every lane.
4. On approval, `delegate-setup` writes the config itself (`config.mjs write --scope global`).
   `setup-fq-fleet` does not touch that file directly. The write also records the approval that
   the relays check — a hand-edited config fails closed with "project fleet config is not
   trusted".
5. Only **after** approval, for each implementer actually assigned a lane, install its
   `*-delegate` skill if missing (`npx skills add amElnagdy/delegate-skills -s
   <tool>-delegate --global`), confirming each install individually. Never install a skill for a CLI that
   didn't end up in the lane map.
6. Re-run `detect-fleet` for the "after" state and show the before/after diff.
7. For any CLI that needs a login or a paid subscription the human doesn't have yet, **print**
   the install/login command — never execute it. Credentials are never this skill's concern.

## What NOT to do

- Do not reimplement `delegate-setup`'s discovery, interview, or config-writing logic — wrap it
  (ADR 0063).
- Do not write the lane map to project scope (`<repo>/.delegate/config.json`) — it is gitignored
  and so is absent from the per-task worktrees where dispatch actually runs. Use global.
- Do not commit `.delegate/` or `.claude/fleet.json` — both describe one machine.
- Do not install a `*-delegate` skill before the human has approved a lane map that uses it.
- Do not auto-execute a CLI install or login command, even with `--yes`-style flags — print it
  and stop.
- Do not try to detect or recover from a dispatch-time failure caused by a since-deprecated
  model in an already-approved lane — `fq-delegate` owns that failure class ([ADR 0068](../architecture/adr/0068-fq-delegate-brief-envelope-and-lane-resolution.md)), not fleet setup.
