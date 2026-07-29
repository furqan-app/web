# Confirm Dangerous Git

This project uses a project-scoped gate for destructive git commands instead of a global hard-block hook. When any command below is about to run in this repo, stop and ask for explicit confirmation first.

**`git push` and `git commit` are not gated here.** They may only run via the ship workflow (see [ship-task.md](ship-task.md)). If a request would otherwise land here as a plain push/commit, redirect to the ship workflow instead.

## Dangerous commands covered

- `git push --force` / `git push -f`
- `git reset --hard`
- `git clean -f` / `git clean -fd`
- `git branch -D`
- `git checkout .`
- `git restore .`

## Rule

Before running any command matching the list above in this repo:

1. Stop. Do not run the command yet.
2. State plainly what the command will do and what's at risk (e.g. "This force-pushes and overwrites remote history" or "This discards all uncommitted changes in the working tree").
3. Ask the user to explicitly confirm before proceeding. (If the user's latest message already stated unambiguously that they want this exact command, a direct restatement is enough — no need to ask twice in the same turn.)
4. Only run the command after the user confirms.

This applies even if the command is covered by an auto-approval rule — auto-approval is not the same as the user saying "yes, do it" in the moment.

## Non-goals

Does not cover `git push`/`git commit` (→ ship workflow) or routine, easily-reversed commands (`git add`, `git checkout <branch>`, `git diff`, `git log`, etc.).
