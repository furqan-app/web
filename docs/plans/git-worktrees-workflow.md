# Git Worktrees Workflow Integration

**Type:** feature  
**Date:** 2026-07-08  
**Status:** implemented

## Summary

Add git worktree support to `/start-fq-task` and `/ship-fq-task` so each task runs in an isolated working directory with its own dev server. When a task starts, a worktree is created at `../furqan-<slug>/`, `node_modules` and `.env.local` are symlinked in, a port is assigned (3001+), and `npm run dev` is started in the background. The dev URL is printed clearly. When the task ships, the dev server is stopped and the worktree is removed.

## Approach

The problem is accidentally working on the wrong branch when juggling multiple tasks. Git worktrees solve this by giving each task its own directory — you can't be on the wrong branch because each directory is pinned to one branch.

Key design decisions agreed on in planning:
- Worktree at `../furqan-<slug>/` where slug = plan filename without `.md` (e.g. `../furqan-fix-search-debounce`)
- `node_modules` and `.env.local` symlinked from the main worktree (no reinstall, instant startup)
- Ports assigned incrementally from 3001, tracked in `~/.claude/furqan-worktrees.json`
- Dev server started in background on task start, killed on ship
- Branch is created at `/start-fq-task` time (needs to exist before `git worktree add -b`)

## Decision Tree / Algorithm

### Port assignment (`/start-fq-task`)

```
IF ~/.claude/furqan-worktrees.json exists AND is valid JSON:
  used_ports = all .port values from existing entries
ELSE:
  used_ports = []

port = 3001
WHILE port in used_ports:
  port += 1

Write entry { slug, worktreePath, port, branch } to ~/.claude/furqan-worktrees.json
```

### Worktree creation (`/start-fq-task` — idempotent)

```
IF ../furqan-<slug> already exists (git worktree list shows it):
  Read port from ~/.claude/furqan-worktrees.json for this slug
  Print "Worktree already running at http://localhost:<port>"
  STOP (skip re-creation)

ELSE:
  git worktree add ../furqan-<slug> -b <branch-name>
  ln -s $(pwd)/node_modules ../furqan-<slug>/node_modules
  IF .env.local exists:
    ln -s $(pwd)/.env.local ../furqan-<slug>/.env.local
  ELSE:
    Warn: "No .env.local found — dev server may fail auth"
  Assign port (algorithm above)
  cd ../furqan-<slug> && PORT=<port> npm run dev &
  Print "Task dev server: http://localhost:<port>"
```

### Worktree cleanup (`/ship-fq-task`)

```
Read ~/.claude/furqan-worktrees.json
Find entry where entry.branch == current branch

IF entry found:
  lsof -ti :<entry.port> | xargs kill -TERM 2>/dev/null || true
  git worktree remove <entry.worktreePath> --force
  Remove entry from ~/.claude/furqan-worktrees.json
ELSE:
  Skip cleanup (no worktree was started via this flow)
```

## Files to Change

- `.claude/skills/start-fq-task/SKILL.md` — after moving the Trello card to In Progress (step 1), add new step 1b: derive branch name from Trello card + plan type, create worktree, symlink deps, assign port, start dev server in background, print URL
- `.claude/skills/ship-fq-task/SKILL.md` — add new step 7 after Trello update: stop dev server, remove worktree, update state file

## Edge Cases

- **No `.env.local`:** Warn and skip that symlink; dev server starts without it (auth will fail but worktree is valid)
- **Worktree already exists:** Detect via `git worktree list`, read port from state file, print URL, skip re-creation
- **No state file entry at ship time:** Skip cleanup gracefully — worktree was never started via this flow (e.g. task started before this feature was added)
- **Branch creation moves earlier:** `/start-fq-task` now creates the branch (needed for `git worktree add -b`). `/ship-fq-task` step 2 already says "skip if already on a feature branch" — no change needed there

## Constraints

- `node_modules` and `.env.local` are symlinks, not copies — edits in the worktree affect the main repo. This is intentional (shared config) and means you cannot have per-task env overrides
- `~/.claude/furqan-worktrees.json` is user-level ephemeral state — not committed, not shared. If lost, cleanup must be done manually (`git worktree remove ../furqan-<slug>`, kill the process on the port)
- Port range starts at 3001; port 3000 is left free for the main worktree if ever needed

## What NOT to Do

- Do not copy `node_modules` — symlink only; copying doubles disk usage and falls out of sync
- Do not store the state file inside the project repo (not `.claude/worktrees.json`) — it is ephemeral machine state, not project config
- Do not change the branch naming convention from `/ship-fq-task` — same `<type>/<id>-<slug>` format, just applied at start time instead of ship time
- Do not block `/start-fq-task` if the dev server fails to start — warn and continue; the worktree is still usable

## Decisions Made

- State file at `~/.claude/furqan-worktrees.json` (user-level, not project-level) — keeps ephemeral machine state out of the repo
- Worktree path `../furqan-<slug>` uses the plan slug (not branch name) to avoid `/` in directory names
- Port 3001+ reserved for task worktrees; 3000 left for main worktree

## Addendum — skip dev server for non-app tasks

**Date:** 2026-07-08

Tasks that only touch `docs/` or `.claude/` (docs fixes, workflow/skill changes, ADRs) don't need a running dev server. Starting one is wasteful and clutters port assignments.

**Rule:** after reading the plan's "Files to Change" section, check whether every listed path is under `docs/` or `.claude/`. If yes → create the worktree for branch isolation but skip the port assignment, state file entry, and `npm run dev`. If any path is under `app/`, `components/`, `lib/`, `prisma/`, or similar app directories → proceed with the full dev server flow as originally planned.
