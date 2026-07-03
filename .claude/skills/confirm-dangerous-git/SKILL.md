---
name: confirm-dangerous-git
description: Gate for destructive or hard-to-reverse git commands in this project. Invoke before running push --force, reset --hard, clean -f/-fd, branch -D, checkout ., or restore . — asks the user to explicitly confirm before the command runs, instead of relying on a hard block. Plain git push/commit are NOT handled here — see /ship-fq-task.
---

# /confirm-dangerous-git

This project used to rely on a global hook (`~/.claude/hooks/block-dangerous-git.sh`) that hard-blocked these commands everywhere on the machine. That hook has been disabled. In its place, this project-scoped skill makes Claude pause and ask before running any of the commands below, in this repo.

**`git push` and `git commit` are not gated here anymore.** They may only run via `/ship-fq-task` — see that skill. If a request would otherwise land here as a plain push/commit, redirect to `/ship-fq-task` instead of asking-and-running.

## Dangerous commands covered

- `git push --force` / `git push -f`
- `git reset --hard`
- `git clean -f` / `git clean -fd`
- `git branch -D`
- `git checkout .`
- `git restore .`

## Rule

Before running Bash with any command matching the list above in this repo:

1. Stop. Do not run the command yet.
2. State plainly what the command will do and what's at risk (e.g. "This force-pushes and overwrites remote history" or "This discards all uncommitted changes in the working tree").
3. Ask the user to explicitly confirm via `AskUserQuestion` (or, if the intent to run this exact command was already stated unambiguously by the user in their latest message, a direct restatement is enough — no need to ask twice in the same turn).
4. Only run the command after the user confirms.

This applies even if the command would otherwise be covered by a permission `allow` rule — auto-approval is not the same as the user saying "yes, do it" in the moment.

## Non-goals

This skill does not cover `git push`/`git commit` (→ `/ship-fq-task`) or routine, easily-reversed commands (`git add`, `git checkout <branch>`, `git diff`, `git log`, etc.) — those follow normal project workflow rules, not this gate.
