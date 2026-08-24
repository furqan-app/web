---
name: ship-fq-task
description: The only sanctioned way to commit and push in this project. Syncs with main, creates a branch, commits, opens a PR, and updates the GitHub issue. Trigger explicitly via /ship-fq-task, or recognize it from phrases like "I'm done", "ship it", "wrap this up".
---

# /ship-fq-task

Read and follow [`docs/workflow/ship-task.md`](../../../docs/workflow/ship-task.md).

## Claude-specific additions

### Step 6 — GitHub issue integration

When the workflow doc says "update the task ticket":
```bash
gh issue comment <issue-number> --repo furqan-app/web --body "PR: <pr-url>

<short summary>"
gh issue edit <issue-number> --repo furqan-app/web --remove-label "status:in-progress" --add-label "status:in-review"
```
The PR body (step 5) must reference the issue as `Refs #<issue-number>` — **not** `Fixes #<issue-number>` or `Closes #<issue-number>`. Merging into `main` is not the same as shipping a release here; using `Fixes`/`Closes` would let GitHub auto-close the issue on merge, before the release that actually ships it. A GitHub Action (`.github/workflows/issue-status-on-merge.yml`) reads the `Refs #N` reference on merge and advances the issue from `status:in-review` to `status:to-be-released` automatically — `/cut-release` is what finally closes it.

### Step 7 — Clean up the worktree (mandatory — always run, even if step 6 was skipped)

- Read the current branch name (`git branch --show-current`)
- Read `~/.claude/furqan-worktrees.json` — if the file doesn't exist or has no entry whose `branch` matches the current branch, skip this step entirely
- Derive the **absolute** worktree path (`<abs>`) by resolving `<worktreePath>` from the registry against the main repo root (`git worktree list | head -1 | awk '{print $1}'`), not the relative `../furqan-<slug>` form.
- If an entry is found:
  1. Kill the dev server. The recorded port can be stale — kill by both the recorded port and any process rooted in the worktree:
     ```bash
     lsof -ti :<port> | xargs -r kill -9 2>/dev/null || true
     lsof -t +D <abs> 2>/dev/null | xargs -r kill -9 2>/dev/null || true
     sleep 1
     ss -tlnp | grep :<port> && echo "WARNING: port <port> still in use" || true
     ```
     Use `-9` (SIGKILL), not `-TERM`. `xargs -r` skips the kill when nothing matched.
  2. Remove the worktree:
     ```bash
     git worktree remove <abs> --force || true
     git worktree prune
     ```
  3. Delete the folder in a **separate** Bash call:
     ```bash
     rm -rf <abs>
     ```
  4. Verify the folder is gone in a **separate** Bash call (never combine with the `rm -rf` call):
     ```bash
     ls <abs> 2>/dev/null && echo "WARNING: folder still exists at <abs>" || echo "Worktree removed successfully"
     ```
     If the WARNING fires, run `rm -rf <abs>` again and re-verify.
  5. Remove the entry from `~/.claude/furqan-worktrees.json` and write the updated file back (preserve all other entries).

---
<!-- original content preserved below this line for reference only -->

Closes out a finished task: sync, branch, commit, PR, ticket update.

**This is the only path through which `git commit` and `git push` may run in this project.**

- There must be a GitHub issue for this work (created during `/plan-fq-task`, step 5). If none exists, stop and create one first — do not proceed without an issue.
- There must be actual changes to ship (`git status` shows modifications).

## Steps

0. **Resolve ambiguity upfront — ask once, then proceed without further confirmation**
   - Identify the GitHub issue from: the plan file, the current branch name, or context from the conversation. If there is any ambiguity about which issue this work belongs to, ask now and only now — do not ask again mid-flow.
   - **Offer a review pass:** ask once whether the user wants to run `/review-fq-work` on the branch before shipping. If yes, **also ask which model to run the review with** — present the list Opus (recommended, most thorough), Sonnet (faster/cheaper), Haiku (fastest, light sanity check) — then run `/review-fq-work` with the chosen model and let the user act on the findings. Do **not** continue to step 1 until they say to ship. If no (or already reviewed this session), proceed. Ask this together with the ticket question so there is a single upfront pause.
   - Once the ticket is confirmed and the review offer is answered, execute steps 1–7 in sequence without pausing for approval. Step 7 (worktree cleanup) is mandatory — do not skip it.

1. **Sync with main**
   - `git fetch origin`
   - Check the current branch. If on `main`, `git pull` (fast-forward).
   - If already on a feature branch, `git merge origin/main` to bring it up to date.

2. **Create the branch** (skip if already on a feature branch created for this issue)
   - Name it from the GitHub issue: `<type>/<issue-number>-<short-description>` (e.g. `fix/142-search-debounce`)
   - `git checkout -b <branch-name>`

3. **Commit**
   - `git add` the relevant files (never `git add -A` blindly — review what's staged)
   - Invoke `commit-staged` to draft the message
   - Run `git commit` immediately — do not pause for confirmation
   - See "No AI signatures" section — no AI attribution anywhere in this flow

4. **Push**
   - `git push -u origin <branch-name>` — do not pause for confirmation

5. **Create the PR**
   - `gh pr create` with a title matching the GitHub issue title and a body summarizing the change (what/why), including `Refs #<issue-number>` (not `Fixes`/`Closes` — see Step 6 above for why)
   - Report the PR URL to the user

6. **Update the GitHub issue**
   - `gh issue comment <issue-number> --repo furqan-app/web --body "..."`: post the PR URL and a short summary
   - `gh issue edit <issue-number> --repo furqan-app/web --remove-label "status:in-progress" --add-label "status:in-review"`
   - `.claude/skills/scripts/sync-issue-board-status.sh <issue-number> status:in-review` — moves the card on the Furqan Kanban board (fallback if the `issue-status-to-project.yml` workflow hasn't fired yet; on scope error, continue — the workflow will sync it)

7. **Clean up the worktree** (mandatory — always run, even if step 6 was skipped)
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
     2. Remove the worktree — run `git worktree remove` and `git worktree prune` in one Bash call:
        ```bash
        git worktree remove <abs> --force || true
        git worktree prune
        ```
        Do **not** rely on `git worktree remove` alone — it leaves gitignored dirs behind (`.next`, `node_modules` symlink, etc.).
     3. Delete the folder in a **separate** Bash call — never combine with the `git worktree remove` call above. The shell's cwd can be reset between tool invocations; combining the commands in one call has caused `ls` to falsely report the folder gone while it still existed on disk:
        ```bash
        rm -rf <abs>
        ```
     4. Verify the folder is actually gone in a **separate** Bash call (never combine with the `rm -rf` call):
        ```bash
        ls <abs> 2>/dev/null && echo "WARNING: folder still exists at <abs>" || echo "Worktree removed successfully"
        ```
        `[ ! -e <abs> ]` can silently pass on some shells even when the directory exists — use `ls` instead so a leftover folder is always reported. If the WARNING fires, run `rm -rf <abs>` again and re-verify.
     4. Remove the entry from `~/.claude/furqan-worktrees.json` and write the updated file back (preserve all other entries)

## No AI signatures — anywhere

Never add any AI attribution in this flow: no `Co-Authored-By: Claude` in commit messages, no "Generated with Claude Code" or similar in PR titles, bodies, or comments, no AI footer/trailer anywhere.

## What NOT to do

- Do not run `git commit` or `git push` from any other skill or ad hoc request — redirect here instead.
- Do not skip the GitHub issue check — if there's no issue, stop and create one before touching git.
- Do not use `Fixes #N`/`Closes #N` in the PR body — always `Refs #N`. Merge-to-main auto-closing would skip the `status:to-be-released` stage and let GitHub mark work "done" before it's actually released.
- Do not force-push, reset --hard, or otherwise rewrite history as part of this flow — that's out of scope and covered separately by `/confirm-dangerous-git`.
- Do not merge the PR — this skill only opens it; merging is a separate, explicit user action.
