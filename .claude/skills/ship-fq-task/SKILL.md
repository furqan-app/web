---
name: ship-fq-task
description: The only sanctioned way to commit and push in this project. Syncs with main, creates a branch, commits, opens a PR, and updates the Trello ticket. Trigger explicitly via /ship-fq-task, or recognize it from phrases like "I'm done", "ship it", "wrap this up".
---

# /ship-fq-task

Closes out a finished task: sync, branch, commit, PR, ticket update.

**This is the only path through which `git commit` and `git push` may run in this project.** If the user asks for a commit or push outside of this flow, do not run it directly — explain that commits/pushes go through `/ship-fq-task` and offer to run it.

## Preconditions

- There must be a Trello ticket for this work (created during `/plan-fq-task`, step 5). If none exists, stop and create one first — do not proceed without a ticket.
- There must be actual changes to ship (`git status` shows modifications).

## Steps

0. **Resolve ambiguity upfront — ask once, then proceed without further confirmation**
   - Identify the Trello ticket from: the plan file, the current branch name, or context from the conversation. If there is any ambiguity about which ticket this work belongs to, ask now and only now — do not ask again mid-flow.
   - Once the ticket is confirmed, execute steps 1–6 in sequence without pausing for approval.

1. **Sync with main**
   - `git fetch origin`
   - Check the current branch. If on `main`, `git pull` (fast-forward).
   - If already on a feature branch, `git merge origin/main` to bring it up to date.

2. **Create the branch** (skip if already on a feature branch created for this ticket)
   - Name it from the Trello card: `<type>/<card-id-or-short-slug>-<short-description>` (e.g. `fix/142-search-debounce`)
   - `git checkout -b <branch-name>`

3. **Commit**
   - `git add` the relevant files (never `git add -A` blindly — review what's staged)
   - Invoke `commit-staged` to draft the message
   - Run `git commit` immediately — do not pause for confirmation
   - See "No AI signatures" section — no AI attribution anywhere in this flow

4. **Push**
   - `git push -u origin <branch-name>` — do not pause for confirmation

5. **Create the PR**
   - `gh pr create` with a title matching the Trello card title and a body summarizing the change (what/why), linking the Trello card URL
   - Report the PR URL to the user

6. **Update the Trello ticket**
   - `mcp__trello__update_card_details`: append the PR URL and a short summary to the card description
   - Move the card to **In Review** (`mcp__trello__move_card`)

7. **Clean up the worktree** (if one exists for this task)
   - Read the current branch name (`git branch --show-current`)
   - Read `~/.claude/furqan-worktrees.json` — if the file doesn't exist or has no entry whose `branch` matches the current branch, skip this step entirely
   - If an entry is found:
     1. Kill the dev server on that port (gracefully):
        ```bash
        lsof -ti :<port> | xargs kill -TERM 2>/dev/null || true
        ```
     2. Remove the worktree:
        ```bash
        git worktree remove <worktreePath> --force
        ```
     3. Remove the entry from `~/.claude/furqan-worktrees.json` and write the updated file back (preserve all other entries)

## No AI signatures — anywhere

Never add any AI attribution in this flow: no `Co-Authored-By: Claude` in commit messages, no "Generated with Claude Code" or similar in PR titles, bodies, or comments, no AI footer/trailer anywhere.

## What NOT to do

- Do not run `git commit` or `git push` from any other skill or ad hoc request — redirect here instead.
- Do not skip the Trello ticket check — if there's no ticket, stop and create one before touching git.
- Do not force-push, reset --hard, or otherwise rewrite history as part of this flow — that's out of scope and covered separately by `/confirm-dangerous-git`.
- Do not merge the PR — this skill only opens it; merging is a separate, explicit user action.
