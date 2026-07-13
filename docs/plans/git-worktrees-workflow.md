# Git Worktrees Workflow Integration

**Type:** feature  
**Date:** 2026-07-08  
**Status:** implemented

## Summary

Each task runs in an isolated working directory (`../furqan-<slug>/`) with its own dev server. `/start-fq-task` creates the worktree, symlinks `node_modules` and `.env.local`, assigns a port, and starts `npm run dev`. `/ship-fq-task` kills the server and removes the worktree. Tasks that only touch `docs/` or `.claude/` get the worktree for branch isolation but skip the dev server and port assignment.

## Port Assignment (`/start-fq-task`)

```
IF ~/.claude/furqan-worktrees.json exists AND is valid JSON:
  used_ports = all .port values from existing entries
ELSE:
  used_ports = []

port = 3001
WHILE port in used_ports: port += 1

Write { slug, worktreePath, port, branch } to ~/.claude/furqan-worktrees.json
```

Port 3000 left free for the main worktree. State file is user-level, not committed.

## Worktree Creation (`/start-fq-task` — idempotent)

```
IF git worktree list shows ../furqan-<slug>:
  Read port from ~/.claude/furqan-worktrees.json
  Print "Worktree already running at http://localhost:<port>"
  STOP

ELSE:
  git worktree add ../furqan-<slug> -b <branch-name>
  ln -s $(pwd)/node_modules ../furqan-<slug>/node_modules
  IF .env.local exists:
    ln -s $(pwd)/.env.local ../furqan-<slug>/.env.local
  ELSE:
    Warn: "No .env.local found — dev server may fail auth"

  # Only if plan's "Files to Change" includes app/, components/, lib/, prisma/, etc.:
  Assign port; cd ../furqan-<slug> && PORT=<port> npm run dev &
  Print "Task dev server: http://localhost:<port>"
  # If all changes are under docs/ or .claude/ only: skip port/server
```

## Worktree Cleanup (`/ship-fq-task`)

```
Read ~/.claude/furqan-worktrees.json
Find entry where entry.branch == current branch

IF entry found:
  lsof -ti :<entry.port> | xargs kill -9 2>/dev/null || true   # SIGKILL — Next.js ignores SIGTERM
  git worktree remove <absolute-path> --force
  Remove entry from ~/.claude/furqan-worktrees.json
ELSE:
  Skip (no worktree was started via this flow)
```

Use the absolute worktree path (from the registry, resolved against `git worktree list | head -1`) — not `../furqan-<slug>` relative form.

## Files Changed

- `.claude/skills/start-fq-task/SKILL.md` — add step 1b: branch creation, worktree, symlinks, conditional port/dev server
- `.claude/skills/ship-fq-task/SKILL.md` — add step 7: kill server, remove worktree, update state file

## Constraints

- `node_modules` and `.env.local` are symlinks, not copies — edits in the worktree affect the main repo. No per-task env overrides.
- If state file is lost, cleanup is manual: `git worktree remove ../furqan-<slug>` + kill the port process.
- Do not block `/start-fq-task` if dev server fails to start — warn and continue.
- Branch is created at `/start-fq-task` time (needed before `git worktree add -b`); `/ship-fq-task` step 2 already skips branch creation if already on a feature branch.
