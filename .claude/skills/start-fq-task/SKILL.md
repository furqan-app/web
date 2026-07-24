---
name: start-fq-task
description: Context-aware implementation of a planned Furqan task. Loads DECISIONS.md + relevant standards + plan, then implements and records any new decisions.
---

# /start-fq-task

Context-aware implementation of a planned task.

## What this skill does

Loads the right context (decisions + standards + plan), then implements the task. Ends by checking for new decisions and recording them.

## Steps

1. **Identify the plan**
   - Ask the user which plan to implement if not specified
   - Derive the slug from the plan filename (e.g. `fix-search-debounce`)
   - **Read the plan in full from the worktree path: `../furqan-<slug>/docs/plans/<slug>.md`**. If that path does not exist, fall back to `docs/plans/<slug>.md` in the main repo (older tasks pre-dating the worktree-first flow). Read every addendum, especially `Constraints` and `What NOT to Do` — the newest addendum is the source of truth.
   - Find the plan's Trello card (linked in the plan) and move it to **In Progress** (`mcp__trello__move_card`) before starting implementation.
   - Assign the card to the person starting the task: read `TRELLO_API_KEY`/`TRELLO_TOKEN` from `.mcp.json` (`mcpServers.trello.env`) and call `GET https://api.trello.com/1/members/me?key=<key>&token=<token>&fields=id,fullName,username` to resolve the authenticated member directly from the token — this identifies the actual Trello account regardless of local git config. Then `mcp__trello__assign_member_to_card` with that member's `id`. Never print or log the key/token values themselves. If the request fails (missing `.mcp.json`, network error), skip silently — don't block implementation over it.

1b. **Set up worktree and start dev server**

   **Check for an existing worktree first:**
   - Run `git worktree list` and look for a path ending in `furqan-<slug>`
   - If found: read `~/.claude/furqan-worktrees.json` and find the entry for this slug.
     - If the entry has a `port`: print `Worktree running at http://localhost:<port>` and skip to step 2.
     - If the entry has no `port` (worktree was created by `/plan-fq-task` before the dev server step): skip steps 1–3 below and continue from step 4 to assign a port and start the dev server.

   **If no existing worktree** (rare — `/plan-fq-task` normally creates it; this path covers tasks planned before that flow or worktree revival):
   1. Derive the branch name from the Trello card using the project convention: `<type>/<card-short-id>-<short-description>` (e.g. `feature/83-git-worktrees-workflow`)
   2. Create the worktree — check whether the branch already exists first:
      ```bash
      # If branch does NOT exist yet (new task):
      git worktree add ../furqan-<slug> -b <branch-name>

      # If branch already exists (e.g. PR was opened, continuing after review):
      git worktree add ../furqan-<slug> <branch-name>
      ```
      Use `git branch --list <branch-name>` to decide which form to run.
   3. Symlink shared dependencies into the worktree:
      ```bash
      ln -s $(pwd)/node_modules ../furqan-<slug>/node_modules
      ln -s $(pwd)/app/generated ../furqan-<slug>/app/generated
      ```
      The `app/generated` symlink is required — it holds the Prisma client, which the dev server needs at startup. Missing it causes Prisma import errors before the first page loads.
   4. **Determine whether a dev server is needed** — scan the plan's "Files to Change" section:
      - If **every** listed path is under `docs/` or `.claude/` → this is a docs/tooling task; skip steps 5–8 (no port, no state file entry, no dev server)
      - If **any** path is under `app/`, `components/`, `lib/`, `prisma/`, or other app directories → proceed with steps 5–8
   5. Symlink `.env.local` and `.mcp.json` if they exist:
      ```bash
      # if .env.local exists:
      ln -s $(pwd)/.env.local ../furqan-<slug>/.env.local
      # if not: warn the user ("No .env.local found — dev server may fail auth") and continue

      # if .mcp.json exists:
      ln -s $(pwd)/.mcp.json ../furqan-<slug>/.mcp.json
      # .mcp.json must be present in the worktree so MCP servers (e.g. Trello) are
      # available in sessions started from the worktree directory
      ```
   6. Assign a port — read `~/.claude/furqan-worktrees.json` (treat as `{}` if missing or empty), collect all `.port` values from existing entries, then find the lowest integer ≥ 3001 not already in use
   7. Record the entry in `~/.claude/furqan-worktrees.json`:
      ```json
      { "<slug>": { "worktreePath": "../furqan-<slug>", "port": <port>, "branch": "<branch-name>" } }
      ```
      Merge with any existing entries — do not overwrite the whole file. If `/plan-fq-task` already wrote an entry for this slug without a `port`, update it in place by adding the port field.
   8. Before starting the dev server, ensure the port is actually free — Next.js silently increments the port if something is already listening, causing the recorded port to be wrong for the entire session:
      ```bash
      lsof -ti :<port> | xargs -r kill -9 2>/dev/null || true
      sleep 1
      ss -tlnp | grep :<port> && echo "WARNING: port <port> still in use" || true
      ```
   9. Start the dev server in the background:
      ```bash
      cd ../furqan-<slug> && PORT=<port> npm run dev > /tmp/furqan-<slug>-dev.log 2>&1 &
      ```
      Log to `/tmp/furqan-<slug>-dev.log` so errors are inspectable without attaching to the process.
   10. Print clearly: `Task dev server: http://localhost:<port>`

2. **Load context — mandatory gate, before writing any code**
   - Read `../furqan-<slug>/docs/architecture/DECISIONS.md` — its entries are the active decisions to apply. When a decision the task touches (or the plan itself) links an ADR in `docs/architecture/adr/`, open that ADR for the full invariant behind the summary. These are non-negotiable; if the plan appears to conflict with one, stop and raise it with the user rather than picking one silently.
   - Read `../furqan-<slug>/docs/architecture/COMPONENTS.md`
   - Read the relevant standards file(s) from `docs/standards/` based on task type:
     - UI/component work → `component-patterns.md` + `styling.md`
     - API work → `api-conventions.md`
     - DB work → `database.md`
     - i18n work → `i18n.md`
     - Multiple domains → load all relevant files
   - **UI mode** — if the task involves components, pages, layout, or styling, also:
     - Read `docs/standards/styling.md` and `docs/standards/component-patterns.md` (if not already loaded above)
     - Read `docs/architecture/APP_PURPOSE.md` for UX principles before making any layout decisions
     - Read `docs/design/design-principles.md` for aesthetic direction and component conventions
     - If the task involves animation, transitions, or interactive states (press/hover/enter/exit), invoke the `ui-motion` skill for motion and polish guidance

3. **Implement**
   - **Before editing, verify the current code matches what the plan/docs describe.** Open the files the plan names and confirm their present state lines up with the plan's assumptions — plans can go stale, and acting on a stale claim ("X is unchanged", "Y still renders here") is how documented behavior gets broken. If reality and the doc disagree, stop and reconcile with the user before changing anything.
   - Follow the plan exactly (the latest addendum's approach). If you discover the plan needs revision, pause and discuss — do not silently deviate.
   - Follow the relevant standards strictly, and honor every ADR and every `Constraints` / `What NOT to Do` item you loaded — do not undo a documented decision as a side effect of the change.
   - Apply decisions from `DECISIONS.md` — do not re-litigate them.
   - Run lint and type check after making changes: `npm run lint` and check for TypeScript errors.

4. **Record decisions**
   - If the task added, removed, or reorganised any components: update `docs/architecture/COMPONENTS.md` to reflect the new state.
   - After implementation, check: were any new architectural decisions made during implementation?
   - If yes, update `docs/architecture/DECISIONS.md`.
   - Mark the plan status as `implemented`.

5. **Report**
   - Summary of what changed (files modified, decisions made).
   - Anything the user should verify manually.

## Anti-patterns to avoid

- Do not load all standards files when only one is relevant.
- Do not start implementing before both gates are done: the whole plan read (all addenda, Step 1) and DECISIONS.md + its linked ADRs loaded (Step 2).
- Do not implement an approach a later addendum revised or reverted — the newest addendum wins.
- Do not act on a stale doc claim without checking the code first — verify current state before editing.
- Do not undo or contradict an ADR, a `Constraints` item, or a `What NOT to Do` item as a side effect of the change.
- Do not skip the decisions check at the end.
- Do not add features beyond what the plan specifies.
- Do not add an addendum while the branch is still open — edit the plan in place instead. Addenda are for corrections made when returning to a merged task on a new branch; mid-task they just create reconciliation noise.
- Do not write documentation (plans, COMPONENTS.md, DECISIONS.md, standards files) with illustrative code blocks when a prose rule captures the constraint fully — one tight sentence beats a code block. Keep a code example only when the exact syntax or shape is the constraint (e.g. an API envelope, a Prisma field name, a non-obvious import path).
