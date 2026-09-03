---
title: Agent-surface consolidation + graphify ignore-set
type: chore
date: 2026-09-03
status: implemented
area: workflow
issue: 498
---

# Agent-surface consolidation + graphify ignore-set

## Summary

Part of epic #491 (Track 1: workflow & docs cleanup). Two independent cleanups:

1. **Surface consolidation** — `AGENTS.md` is the single canonical agent-instruction
   surface. `GEMINI.md`, `.cursorrules`, and `.github/copilot-instructions.md` currently
   re-state the full MANDATORY WORKFLOW block and the full graphify block. Reduce each to a
   pointer + only its tool-specific delta. Also fix a dead path: `GEMINI.md:6` and
   `AGENTS.md:7` both reference `.agents/skills/`, which does not exist.
2. **graphify ignore-set** — no `.graphifyignore` exists. Add one so agent-tooling
   directories (`.claude/skills/scripts/`, `.agents/`, `.codex/`, `.opencode/`) never enter
   the knowledge graph. `graphify-out/` is gitignored (local, regenerable) — the branch ships
   only `.graphifyignore`; `graphify update .` picks it up locally.

## Root Cause / Approach

### 1. Surface duplication

- `AGENTS.md` already carries the canonical MANDATORY WORKFLOW section (links
  `docs/workflow/plan-task.md` + `start-task.md`), a Response style section, a Documentation
  section (links `docs/workflow/INDEX.md`), and a graphify section.
- `.cursorrules` (2.1K) and `.github/copilot-instructions.md` (2.4K) each restate the
  plan-first workflow as 3–4 numbered rules and copy the 4-line graphify block verbatim.
  Both files already open with "Read `AGENTS.md`", so the duplication is pure drift risk.
- `GEMINI.md` (564 B) is already short but line 6 sends Antigravity to `.agents/skills/`
  (`plan-fq-task`, `start-fq-task`, …) — a directory that does not exist. `.agents/` contains
  only `rules/graphify.md` and `workflows/graphify.md`. Those Claude skills are themselves
  thin wrappers around `docs/workflow/*.md`, so the correct target is
  `docs/workflow/INDEX.md`.

**Tool-specific deltas that must be preserved:**

| Surface | Delta to keep |
|---|---|
| `.cursorrules` | Cursor works on an **in-repo branch** (`git fetch origin && git checkout -b <type>/<issue>-<slug> origin/main`), **not** an external `../furqan-<slug>` worktree. |
| `.github/copilot-instructions.md` | Typing **`/graphify`** in Copilot Chat builds/updates the graph; the repo is wired for VS Code Copilot Chat via `.github/copilot-instructions.md` itself. |
| `GEMINI.md` | Planning override: follow `docs/workflow/plan-task.md`, output `docs/plans/<slug>.md`, not internal Antigravity plan artifacts. |

Everything else (load `DECISIONS.md` + domain files, concise responses, the graphify
query-first rule) is generic and lives in `AGENTS.md` — the pointer files drop it.

### 2. graphify ignore-set

- graphify honors `.gitignore` + `.graphifyignore`. No `.graphifyignore` exists today.
- The `.claude/skills/impeccable/scripts/live-browser.js` monster (~12.5k lines) that
  motivated the original issue text is **already gone** — impeccable was removed in #494.
- What remains in `graphify-out/graph.json` from tooling: nodes for
  `.claude/skills/scripts/gen-plans-index.sh`, `.claude/skills/scripts/sync-issue-board-status.sh`,
  `.agents/rules/graphify.md`, `.agents/workflows/graphify.md`, `.opencode/opencode.json`,
  `.opencode/plugins/graphify.js`. Low volume now, but the rule should stand so no future
  skill `scripts/` dir pollutes queries.
- The issue's proposed glob `.claude/skills/**/scripts/**` does **not** match the actual flat
  layout `.claude/skills/scripts/*.sh` (no per-skill subdir). Use both the flat and nested
  forms.

## Decision Tree / Algorithm

Not applicable — mechanical doc edits + one new config file. Target end-state per file:

**`.graphifyignore`** (new, repo root):
```
# Agent-tooling directories — implementation detail, not app architecture.
# Keep these out of the graphify knowledge graph (T1.7 / issue #498).
.claude/skills/scripts/
.claude/skills/*/scripts/
.agents/
.codex/
.opencode/
```

**`GEMINI.md`** — line 6 becomes a pointer to the workflow index instead of `.agents/skills/`:
> Progressive Disclosure: follow the Core Cycle in `docs/workflow/INDEX.md` — open the
> relevant `docs/workflow/*.md` before executing each step.

**`AGENTS.md`** — line 7 drops `and .agents/skills/`:
> Antigravity (AGY): see `GEMINI.md`.

**`.cursorrules`** — reduce to: title, "Read `AGENTS.md` + `docs/workflow/INDEX.md` first",
and the one Cursor delta (in-repo branch, not a worktree). Drop the numbered workflow
re-statement and the `## graphify` block.

**`.github/copilot-instructions.md`** — reduce to: title, "Read `AGENTS.md` +
`docs/workflow/INDEX.md` first", and the one Copilot delta (`/graphify` in Copilot Chat
builds/updates the graph). Drop the numbered workflow re-statement and the `## graphify`
block.

**`docs/workflow/INDEX.md`** — add a short `## Agent instruction surfaces` section recording
the canonical/pointer rule so a future editor does not re-bloat the pointer files.

## Verified Test Cases

| Scenario | Expected after change |
|---|---|
| Antigravity opens `GEMINI.md` | Reaches `AGENTS.md` + `docs/workflow/INDEX.md`; every workflow step resolves to a real `docs/workflow/*.md` file. No dead `.agents/skills/` path. |
| Cursor loads `.cursorrules` | Gets the pointer + the "in-repo branch, not worktree" delta; picks up plan-first / decisions / graphify rules from `AGENTS.md`. |
| Copilot loads `.github/copilot-instructions.md` | Gets the pointer + the `/graphify` invocation note; picks up the rest from `AGENTS.md`. |
| `grep -rn "\.agents/skills" .` | No matches outside this plan / historical plans. |
| `graphify update .` after `.graphifyignore` lands | 15 nodes pruned from 6 files: `gen-plans-index.sh`, `sync-issue-board-status.sh`, `.agents/*.md`, `.opencode/*`. Verified. |
| `graphify query` for any codebase question | No skill-tooling / agent-config file nodes in the scoped subgraph (AGENTS.md section anchors remain — legitimate). |

## Files to Change

- `.graphifyignore` — **new** file, root. The 6-line ignore set above.
- `GEMINI.md` — line 6: repoint from `.agents/skills/` to `docs/workflow/INDEX.md`.
- `AGENTS.md` — line 7: drop `and .agents/skills/` from the AGY pointer.
- `.cursorrules` — strip the numbered MANDATORY WORKFLOW re-statement and the `## graphify`
  block; keep pointer + the in-repo-branch delta.
- `.github/copilot-instructions.md` — strip the numbered rules and the `## graphify` block;
  keep pointer + the `/graphify`-in-Copilot-Chat delta.
- `docs/workflow/INDEX.md` — add `## Agent instruction surfaces` (canonical = `AGENTS.md`;
  the rest are pointer + tool-delta only; list each surface's delta).
- `graphify-out/` — **not committed** (gitignored, regenerable). Refreshed locally via
  `graphify update .` after `.graphifyignore` is in place.

## Constraints

- **Do not touch `CLAUDE.md`** — it is already a slim pointer and carries Claude Code-specific
  hook/skill shortcuts that are legitimate deltas.
- **Do not delete `.agents/rules/graphify.md` or `.agents/workflows/graphify.md`** — they are
  live Antigravity config (always-on rule + `/graphify` workflow). `.graphifyignore` keeps
  them out of the *graph*; it does not remove them from the repo.
- Keep every pointer file's opening line an explicit instruction to read `AGENTS.md` — that
  is the mechanism that makes thinning safe.
- `.graphifyignore` uses gitignore glob semantics; a trailing `/` matches the directory
  recursively.
- Per `AGENTS.md` scope rule, these are meta/infra files exempt from the plan→implement gate,
  but this plan exists because `/plan-fq-task #498` was invoked explicitly.

## What NOT to Do

- Do **not** create `.agents/skills/*` shim files — rejected in planning; repointing to
  `docs/workflow/INDEX.md` is a smaller edit with nothing new to keep in sync.
- Do **not** drop the `.agents/skills` mention silently without giving AGY a real target —
  repoint, don't just delete.
- Do **not** keep a restated "plan-first" rule in the pointer files — rejected in planning;
  pointer + delta only. `AGENTS.md` is the single source.
- Do **not** narrow `.graphifyignore` to `.claude/skills/**/scripts/**` only — it misses the
  current flat `.claude/skills/scripts/` layout.
- Do **not** add app directories (`app/`, `lib/`, `components/`) to `.graphifyignore` — scope
  is agent-tooling only.
- Do **not** commit `graphify-out/` — it is gitignored and regenerable.

## Decisions Made

- **Canonical surface = `AGENTS.md`.** `GEMINI.md` / `.cursorrules` /
  `.github/copilot-instructions.md` are pointer + one tool-specific delta each. Recorded in
  `docs/workflow/INDEX.md` (workflow/process decisions live there, not in `decisions/*.md`;
  no ADR — no competing alternatives with trade-offs to weigh).
- **`GEMINI.md:6` repoints to `docs/workflow/INDEX.md`** (not a bare drop, not skill shims) —
  keeps the enumerated step list for AGY at one-line cost.
- **`.graphifyignore` covers `.claude/skills/scripts/`, `.claude/skills/*/scripts/`,
  `.agents/`, `.codex/`, `.opencode/`** — broader than the issue's stated scope, per the
  planning decision to keep all agent-config tooling out of the graph.
- No ADR. No `decisions/*.md` change.
