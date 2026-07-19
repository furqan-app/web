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
   - **Offer a review pass:** ask once whether the user wants to run `/review-fq-work` on the branch before shipping. If yes, **also ask which model to run the review with** — present the list Opus (recommended, most thorough), Sonnet (faster/cheaper), Haiku (fastest, light sanity check) — then run `/review-fq-work` with the chosen model and let the user act on the findings. Do **not** continue to step 1 until they say to ship. If no (or already reviewed this session), proceed. Ask this together with the ticket question so there is a single upfront pause.
   - Once the ticket is confirmed and the review offer is answered, execute steps 1–7 in sequence without pausing for approval. Step 7 (worktree cleanup) is mandatory — do not skip it.

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

7. **Clean up the worktree** (mandatory — always run, even if Trello step 6 was skipped)
   - Read the current branch name (`git branch --show-current`)
   - Read `~/.claude/furqan-worktrees.json` — if the file doesn't exist or has no entry whose `branch` matches the current branch, skip this step entirely
   - Derive the **absolute** worktree path first (`<abs>`) by resolving `<worktreePath>` from the registry against the main repo root (`git worktree list | head -1 | awk '{print $1}'`), not the relative `../furqan-<slug>` form. Use `<abs>` for every command below so this works whether the session is inside the worktree or the main repo.
   - If an entry is found:
     1. Kill the dev server. The recorded port can be **stale** — Next.js auto-increments (3000→3001→…) when the port is busy — so kill by *both* the recorded port and any process rooted in the worktree:
        ```bash
        lsof -ti :<port> | xargs -r kill -9 2>/dev/null || true
        lsof -t +D <abs> 2>/dev/null | xargs -r kill -9 2>/dev/null || true
        sleep 1
        ss -tlnp | grep :<port> && echo "WARNING: port <port> still in use" || true
        ```
        Use `-9` (SIGKILL), not `-TERM` — Next.js dev servers ignore SIGTERM and stay alive. `xargs -r` skips the kill when nothing matched. The `sleep 1` lets the OS release the socket before the next step reads from it.
     2. Remove the worktree, then force-delete the folder — `git worktree remove` **leaves gitignored dirs behind** (`.next`, `node_modules` symlink, etc.), so the folder always survives unless you also `rm -rf` it. Run both unconditionally:
        ```bash
        git worktree remove <abs> --force || true
        rm -rf <abs>
        git worktree prune
        ```
        Do **not** rely on `git worktree remove` alone — it never fully cleans the directory.
     3. Verify the folder is actually gone with a real filesystem check:
        ```bash
        ls <abs> 2>/dev/null && echo "WARNING: folder still exists at <abs>" || echo "Worktree removed successfully"
        ```
        `[ ! -e <abs> ]` can silently pass on some shells even when the directory exists — use `ls` instead so a leftover folder is always reported.
     4. Remove the entry from `~/.claude/furqan-worktrees.json` and write the updated file back (preserve all other entries)

## No AI signatures — anywhere

Never add any AI attribution in this flow: no `Co-Authored-By: Claude` in commit messages, no "Generated with Claude Code" or similar in PR titles, bodies, or comments, no AI footer/trailer anywhere.

## What NOT to do

- Do not run `git commit` or `git push` from any other skill or ad hoc request — redirect here instead.
- Do not skip the Trello ticket check — if there's no ticket, stop and create one before touching git.
- Do not force-push, reset --hard, or otherwise rewrite history as part of this flow — that's out of scope and covered separately by `/confirm-dangerous-git`.
- Do not merge the PR — this skill only opens it; merging is a separate, explicit user action.
