# Git Workflow Skills (commit/push gating + confirm-dangerous-git)

**Type:** feature
**Date:** 2026-07-03
**Status:** implemented (backfilled — see note below)

> **Note:** This plan was written after implementation, not before. The work
> was originally treated as Claude Code tooling/meta-config (`.claude/`
> skills and `~/.claude/settings.json`) rather than Furqan app work, so it
> was done directly instead of through `/plan-fq-task` → `/start-fq-task`.
> That was a judgment call the user flagged as inconsistent with CLAUDE.md's
> "any file, no exceptions" wording. This doc backfills the plan record per
> the user's request, and the interpretation question (does `.claude/`
> tooling fall under the mandatory workflow?) remains open — see
> `docs/architecture/DECISIONS.md` if a decision gets recorded there later.

## Summary

Replaced the machine-wide hard-block hook (`~/.claude/hooks/block-dangerous-git.sh`)
— which blocked `git push`, `git reset --hard`, `git clean -f/-fd`,
`git branch -D`, `git checkout .`, `git restore .` unconditionally, in every
project — with two project-scoped skills for Furqan:

- `/confirm-dangerous-git` — pauses and asks the user to confirm before
  running any of the same dangerous commands, instead of hard-blocking them.
- `/ship-fq-task` — the only sanctioned path for `git commit` and
  `git push` in this repo: syncs with main, creates a branch, commits (via
  `commit-staged`), pushes, opens a PR, and updates the Trello ticket.

## Root Cause / Approach

The global hook was too blunt: it blocked `git push` outright everywhere,
with no path to actually ship work short of disabling the hook by hand each
time. The fix was to move from a global, always-on block to project-scoped,
context-aware gating:

- Destructive/hard-to-reverse commands (force-push, reset --hard, clean -f,
  branch -D, checkout/restore .) still require explicit confirmation, but
  now via `AskUserQuestion` inside the repo rather than an unconditional
  `exit 2` from a shell script.
- Ordinary `commit`/`push` are no longer blocked at all, but are corralled
  into a single skill (`/ship-fq-task`) that enforces the project's actual
  process (Trello ticket precondition, branch naming, PR creation) rather
  than being run ad hoc.

`commit-staged` was split out as its own small skill so both `/ship-fq-task`
and any future flow can generate a consistent structured commit message
from `git diff --staged` without duplicating the format spec.

## Files Changed

- `~/.claude/settings.json` — removed the global `PreToolUse`/`Bash` hook
  entry pointing at `block-dangerous-git.sh` (hook left on disk, disabled).
- `.claude/skills/confirm-dangerous-git/SKILL.md` — new skill; gates the
  same command list the old hook blocked, but asks instead of hard-blocking.
- `.claude/skills/ship-fq-task/SKILL.md` — new skill; sole path for
  `git commit` / `git push` in this project, wraps Trello ticket check,
  branching, commit, push, PR, and card update.
- `.claude/skills/commit-staged/SKILL.md` — new skill; generates a
  structured commit message from staged changes only, no git side effects.

## Constraints

- `/confirm-dangerous-git` explicitly does **not** cover `git commit` /
  `git push` — those redirect to `/ship-fq-task` instead of being
  asked-and-run inline.
- `/ship-fq-task` explicitly does **not** cover force-push, reset --hard, or
  other history-rewriting — those stay with `/confirm-dangerous-git`.
- `/ship-fq-task` requires a Trello ticket to exist before it will touch
  git; if none exists it stops and creates one first.
- Confirmation for dangerous commands must happen via `AskUserQuestion` (or
  an unambiguous same-turn restatement) even if the command is covered by a
  permission `allow` rule — auto-approval isn't treated as the user saying
  "yes, do it" in the moment.

## Decisions Made

- Global hard-block hook → project-scoped ask-first skill. Reason: the
  global hook made `git push` impossible without manually disabling it,
  which defeated its own purpose (it trained working around it rather than
  respecting it).
- `git commit`/`git push` funneled through one skill (`/ship-fq-task`)
  rather than left ungated, so process steps (Trello, branch naming, PR)
  aren't skippable by going around the skill.
- `commit-staged` kept as a separate, reusable skill rather than inlined
  into `/ship-fq-task`, since message drafting is a distinct concern from
  the git/GitHub/Trello orchestration.
