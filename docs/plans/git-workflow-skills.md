# Git Workflow Skills (commit/push gating + confirm-dangerous-git)

**Type:** feature  
**Date:** 2026-07-03  
**Status:** implemented (backfilled — work was done directly as `.claude/` tooling, not through `/plan-fq-task`)

## Summary

Replaced a machine-wide hard-block hook (`~/.claude/hooks/block-dangerous-git.sh`) — which blocked `git push`, `git reset --hard`, `git clean -f/-fd`, `git branch -D`, `git checkout .`, `git restore .` unconditionally — with two project-scoped skills:

- `/confirm-dangerous-git` — asks confirmation before any of those same commands instead of hard-blocking.
- `/ship-fq-task` — the only sanctioned path for `git commit`/`git push` in this repo: syncs main, creates branch, commits (via `commit-staged`), pushes, opens PR, updates Trello.

`commit-staged` split out as a separate skill so message drafting is reusable without duplicating the format spec.

## Root Cause

The global hook blocked `git push` outright with no path to ship work short of disabling it manually, which trained working around it rather than respecting it. Solution: project-scoped, context-aware gating.

## Files Changed

- `~/.claude/settings.json` — removed global `PreToolUse`/`Bash` hook entry (hook left on disk, disabled)
- `.claude/skills/confirm-dangerous-git/SKILL.md` — new skill
- `.claude/skills/ship-fq-task/SKILL.md` — new skill
- `.claude/skills/commit-staged/SKILL.md` — new skill

## Constraints

- `/confirm-dangerous-git` does not cover `git commit`/`git push` — those redirect to `/ship-fq-task`.
- `/ship-fq-task` does not cover force-push/reset --hard — those stay with `/confirm-dangerous-git`.
- `/ship-fq-task` requires a Trello ticket before touching git — stops and creates one if absent.
- Dangerous command confirmation must happen via `AskUserQuestion` even if covered by a permission `allow` rule.
