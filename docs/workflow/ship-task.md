# Ship a Task

Closes out a finished task: sync, branch, commit, PR, ticket update.

**This is the only path through which `git commit` and `git push` may run in this project.** If asked to commit or push outside this flow, redirect here instead.

## Preconditions

- There must be a task ticket for this work (created during planning). If none exists, stop and create one first.
- There must be actual changes to ship (`git status` shows modifications).

## Steps

### 0. Resolve ambiguity upfront — ask once, then proceed without further confirmation

- Identify the task ticket from: the plan file, the current branch name, or context from the conversation. If there is any ambiguity about which ticket this work belongs to, ask now and only now — do not ask again mid-flow.
- **Offer a review pass:** ask once whether the user wants to run a code review on the branch before shipping (see [review-work.md](review-work.md)). If yes, run the review and let the user act on the findings — do not continue to step 1 until they say to ship. If no (or already reviewed this session), proceed.
- Once the ticket is confirmed and the review offer is answered, execute steps 1–6 in sequence without pausing for approval.

### 1. Sync with main

- `git fetch origin`
- Check the current branch. If on `main`, `git pull` (fast-forward).
- If already on a feature branch, `git merge origin/main` to bring it up to date.

### 2. Create the branch (skip if already on a feature branch created for this ticket)

- Name it from the task: `<type>/<ticket-id-or-short-slug>-<short-description>` (e.g. `fix/142-search-debounce`)
- `git checkout -b <branch-name>`

### 3. Commit

- `git add` the relevant files (never `git add -A` blindly — review what's staged)
- Draft the commit message following [commit-message.md](commit-message.md)
- Run `git commit` — do not pause for confirmation
- No AI signatures (see below)

### 4. Push

- `git push -u origin <branch-name>` — do not pause for confirmation

### 5. Create the PR

- `gh pr create` with a title matching the task ticket title and a body summarizing the change (what/why), linking the task ticket URL
- Report the PR URL to the user

### 6. Update the task ticket

- Append the PR URL and a short summary to the ticket
- Move the ticket to **In Review** status

---

## No AI signatures — anywhere

Never add any AI attribution in this flow: no `Co-Authored-By: Claude` (or any AI) in commit messages, no "Generated with AI" or similar in PR titles, bodies, or comments, no AI footer/trailer anywhere.

## What NOT to do

- Do not run `git commit` or `git push` from any other workflow or ad hoc request — redirect here.
- Do not skip the ticket check — if there's no ticket, stop and create one before touching git.
- Do not force-push, reset --hard, or otherwise rewrite history as part of this flow — that's covered separately by [confirm-dangerous-git.md](confirm-dangerous-git.md).
- Do not merge the PR — this workflow only opens it; merging is a separate, explicit user action.
