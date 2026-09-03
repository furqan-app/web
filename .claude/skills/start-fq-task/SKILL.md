---
name: start-fq-task
description: Context-aware implementation of a planned Furqan task. Loads the DECISIONS.md index + the task-domain decisions/*.md files + relevant standards + plan, then implements and records any new decisions.
---

# /start-fq-task

Read and follow [`docs/workflow/start-task.md`](../../../docs/workflow/start-task.md).

## Step 1 — GitHub issue integration

When the workflow doc says "move the task to In Progress in your project management system":
```bash
gh issue edit <issue-number> --repo furqan-app/web --remove-label "status:todo" --add-label "status:in-progress" --add-assignee @me
```
One call — `@me` resolves to the authenticated `gh` account, no separate identity lookup needed.

## Step 1b — Worktree / Branch setup (runs before step 2 in the workflow doc)

**Check for an existing worktree first:**
- Run `git worktree list` and look for a path ending in `furqan-<slug>`
- Resolve the worktree's **absolute path** from that same `git worktree list` output (first column) and use it for every file read/write and command — the `../furqan-<slug>` forms are naming conventions, not literal paths.
- If found: read `~/.claude/furqan-worktrees.json` and find the entry for this slug.
  - If the entry has a `port`: print `Worktree running at http://localhost:<port>` and skip to step 2 in the workflow doc.
  - If the entry has no `port`: skip to "Assign a port" below.

**If no existing worktree:**
1. Derive the branch name from the GitHub issue: `<type>/<issue-number>-<short-description>`
2. Create the worktree:
   ```bash
   # If branch does NOT exist yet (defaults to updated origin/main):
   git fetch origin
   git worktree add ../furqan-<slug> -b <branch-name> origin/main

   # If starting from a specific base branch:
   git fetch origin
   git worktree add ../furqan-<slug> -b <branch-name> <base-branch>

   # If branch already exists:
   git worktree add ../furqan-<slug> <branch-name>
   ```
3. Symlink `node_modules` and generate the Prisma client:
   ```bash
   ln -s $(pwd)/node_modules ../furqan-<slug>/node_modules
   (cd ../furqan-<slug> && npm run postinstall)   # prisma generate for both schemas -> app/generated
   ```
   Do not symlink `app/generated` from another worktree — it breaks `next build`
   (`Module not found: @/app/generated/app-client`), which local E2E now relies on.

**Determine whether a dev server is needed** — scan the plan's "Files to Change" section:
- If **every** listed path is under `docs/` or `.claude/` → docs/tooling task; skip dev server steps.
- If **any** path is under `app/`, `components/`, `lib/`, `prisma/`, or other app directories → proceed.

**Symlink `.env.local` and `.mcp.json` if they exist:**
```bash
ln -s $(pwd)/.env.local ../furqan-<slug>/.env.local   # warn if missing
ln -s $(pwd)/.mcp.json ../furqan-<slug>/.mcp.json     # needed for MCP tools (e.g. quranhub) in the worktree
```

**Assign a port:** read `~/.claude/furqan-worktrees.json`, collect all `.port` values, find the lowest integer ≥ 3001 not already in use.

**Record the entry in `~/.claude/furqan-worktrees.json`:**
```json
{ "<slug>": { "worktreePath": "../furqan-<slug>", "port": <port>, "branch": "<branch-name>" } }
```
Merge with existing entries. If `/plan-fq-task` already wrote an entry without a `port`, update it in place.

**Ensure the port is free before starting:**
```bash
lsof -ti :<port> | xargs -r kill -9 2>/dev/null || true
sleep 1
ss -tlnp | grep :<port> && echo "WARNING: port <port> still in use" || true
```

**Start the dev server:**
```bash
cd ../furqan-<slug> && PORT=<port> npm run dev > /tmp/furqan-<slug>-dev.log 2>&1 &
```

Print: `Task dev server: http://localhost:<port>`

### Context paths (step 2 in the workflow doc)

When loading context, use the worktree path (`<abs>/docs/...`) rather than the main repo's `docs/`:
- `<abs>/docs/architecture/DECISIONS.md` (the index) + the task-domain `<abs>/docs/architecture/decisions/*.md` files it routes to
- `<abs>/docs/architecture/COMPONENTS.md`

---
<!-- original content preserved below this line for reference only -->

## What this skill does (legacy)

Loads the right context (decisions + standards + plan), then implements the task. Ends by checking for new decisions and recording them.

## Steps

1. **Identify the plan**
   - Ask the user which plan to implement if not specified
   - Derive the slug from the plan filename (e.g. `fix-search-debounce`)
   - **Read the plan you are implementing in full, from the worktree path: `../furqan-<slug>/docs/plans/<slug>.md`** — `Constraints` and `What NOT to Do` especially. If that path does not exist, fall back to `docs/plans/<slug>.md` (or `docs/plans/archive/<slug>.md`) in the main repo. This is the one plan file to read — do not pull in other plans for background; archived and already-`implemented` plans are history, their durable content is in `docs/architecture/decisions/*.md` + ADRs. If the plan still carries a `## Addendum` (rare — folded on ship), the newest one wins.
    - Find the plan's GitHub issue (linked in the plan) and move it to In Progress and assign it to yourself before starting implementation:
      ```bash
      gh issue edit <issue-number> --repo furqan-app/web --remove-label "status:todo" --add-label "status:in-progress" --add-assignee @me
      .claude/skills/scripts/sync-issue-board-status.sh <issue-number> status:in-progress
      ```
    - The second command moves the card on the Furqan Kanban board (fallback if the `issue-status-to-project.yml` workflow hasn't fired yet). It needs gh project scopes (`gh auth refresh -s read:project -s project`); if it fails with a scope error, continue — the workflow will sync it.

1b. **Set up worktree and start dev server**

   **Check for an existing worktree first:**
   - Run `git worktree list` and look for a path ending in `furqan-<slug>`
   - Resolve the worktree's **absolute path** from that same `git worktree list` output (first column) and use it for every file read/write and command below — the `../furqan-<slug>` forms in this skill are naming conventions, not literal paths to pass to tools. The relative form resolves against the shell's cwd, and the Write tool silently creates missing directories, so a wrong resolution writes files into a stray directory outside the repo (this happened; see /plan-fq-task step 6).
   - If found: read `~/.claude/furqan-worktrees.json` and find the entry for this slug.
     - If the entry has a `port`: print `Worktree running at http://localhost:<port>` and skip to step 2.
     - If the entry has no `port` (worktree was created by `/plan-fq-task` before the dev server step): skip steps 1–3 below and continue from step 4 to assign a port and start the dev server.

   **If no existing worktree** (rare — `/plan-fq-task` normally creates it; this path covers tasks planned before that flow or worktree revival):
   1. Derive the branch name from the GitHub issue using the project convention: `<type>/<issue-number>-<short-description>` (e.g. `feature/83-git-worktrees-workflow`)
   2. Create the worktree — check whether the branch already exists first:
      ```bash
      # If branch does NOT exist yet (defaults to updated origin/main):
      git fetch origin
      git worktree add ../furqan-<slug> -b <branch-name> origin/main

      # If starting from a specific base branch:
      git fetch origin
      git worktree add ../furqan-<slug> -b <branch-name> <base-branch>

      # If branch already exists (e.g. PR was opened, continuing after review):
      git worktree add ../furqan-<slug> <branch-name>
      ```
      Use `git branch --list <branch-name>` to decide which form to run.
   3. Symlink `node_modules` and generate the Prisma client into the worktree:
      ```bash
      ln -s $(pwd)/node_modules ../furqan-<slug>/node_modules
      (cd ../furqan-<slug> && npm run postinstall)
      ```
      `npm run postinstall` runs `prisma generate` for both schemas, producing a complete local `app/generated`. Do **not** symlink `app/generated` from another worktree — it holds the Prisma client, and a symlink resolves inconsistently under `next build` (`Module not found: @/app/generated/app-client`, often surfacing as a misleading `not-found.tsx doesn't have a root layout`). Local E2E now runs a build, so the worktree must be buildable.
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
      # .mcp.json must be present in the worktree so MCP servers (e.g. quranhub) are
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
   - Read `../furqan-<slug>/docs/architecture/DECISIONS.md` (the index): its Non-negotiable Invariants block, plus the 1–3 `../furqan-<slug>/docs/architecture/decisions/*.md` domain files this task touches (the index's Domains table maps them). When a decision links an ADR in `docs/architecture/adr/`, open that ADR for the full invariant. Non-negotiable; if the plan appears to conflict with one, stop and raise it with the user rather than picking one silently.
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
     - If the task involves animation, transitions, or interactive states (press/hover/enter/exit), read the Motion section of `docs/standards/styling.md`

3. **Implement**
   - **Before editing, verify the current code matches what the plan/docs describe.** Open the files the plan names and confirm their present state lines up with the plan's assumptions — plans can go stale, and acting on a stale claim ("X is unchanged", "Y still renders here") is how documented behavior gets broken. If reality and the doc disagree, stop and reconcile with the user before changing anything.
   - Follow the plan exactly (the latest addendum's approach). If you discover the plan needs revision, pause and discuss — do not silently deviate.
   - Follow the relevant standards strictly, and honor every ADR and every `Constraints` / `What NOT to Do` item you loaded — do not undo a documented decision as a side effect of the change.
   - Apply the decisions you loaded from `docs/architecture/decisions/` — do not re-litigate them.
   - Run lint and type check after making changes: `npm run lint` and check for TypeScript errors (`npx tsc --noEmit`).
   - **Do NOT run full test suites or local E2E by default** — running tests locally consumes significant time and system resources, and GitHub Actions CI already enforces `lint`, `type-check`, `npm test` (Vitest), and Playwright E2E on PRs. Only run tests locally when there is a specific need:
     - **Targeted Unit Tests:** Only run targeted tests (`npx vitest run <path/to/test>`) when authoring or modifying pure business logic, calculations, or utilities that have corresponding unit tests. Never run unit tests for UI/CSS, layout, copy, translation, config, or docs changes.
     - **Local E2E:** Never run locally unless explicitly requested by the user or when authoring/updating an E2E spec itself (`npx playwright test e2e/tests/<spec>.spec.ts --project=desktop` against `npm run e2e:serve`).

4. **Record decisions**
   - If the task added, removed, or reorganised any components: update `docs/architecture/COMPONENTS.md` to reflect the new state.
   - After implementation, check: were any new architectural decisions made during implementation?
   - If yes, add a `## ` section (`**Status:** active`) to the matching `docs/architecture/decisions/*.md` file (new domain → new file + a `DECISIONS.md` Domains-table row; cross-cutting rule → also a `DECISIONS.md` invariant line).
   - Mark the plan status as `implemented`.

5. **Report**
   - Summary of what changed (files modified, decisions made).
   - Anything the user should verify manually.

## Anti-patterns to avoid

- Do not load all standards files when only one is relevant.
- Do not start implementing before both gates are done: the whole plan read (all addenda, Step 1) and the decisions index + task-domain `decisions/*.md` files + their linked ADRs loaded (Step 2).
- Do not implement an approach a later addendum revised or reverted — the newest addendum wins.
- Do not act on a stale doc claim without checking the code first — verify current state before editing.
- Do not undo or contradict an ADR, a `Constraints` item, or a `What NOT to Do` item as a side effect of the change.
- Do not skip the decisions check at the end.
- Do not add features beyond what the plan specifies.
- Do not add an addendum while the branch is still open — edit the plan in place instead. Addenda are for corrections made when returning to a merged task on a new branch; mid-task they just create reconciliation noise.
- Do not write documentation (plans, COMPONENTS.md, decisions/*.md, standards files) with illustrative code blocks when a prose rule captures the constraint fully — one tight sentence beats a code block. Keep a code example only when the exact syntax or shape is the constraint (e.g. an API envelope, a Prisma field name, a non-obvious import path).
- Do not run test suites or local E2E by default — do not run full `npm test` on non-logic changes (UI, styles, copy, config), and never spin up local E2E (`e2e:serve` / Playwright) unless specifically working on an E2E spec or requested by the user. Rely on CI for PR regression testing.
