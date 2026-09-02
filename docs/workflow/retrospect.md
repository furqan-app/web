# Retrospect

Reconciles the in-repo workflow docs with what a session learned — review-before-write, nothing is written without approval.

**When to run:** after `/review-fq-work`, before `/ship-fq-task`. Its outputs (`decisions/*.md` edits, workflow doc edits) are repo-level, so running it before the commit lands them inside the PR under review — not after `/ship-fq-task` has opened the PR and torn down the worktree.

**Scope:** this skill touches only version-controlled docs. Durable personal learnings (recall for your own future sessions) go in your agent's own memory mechanism, not here.

## Steps

### 1 — Scan the session

Read the current conversation history and extract:
- Architectural or process decisions made
- Problems hit and how they were resolved
- Workflow docs that felt incomplete, missing, or were misused
- Workflow friction points

If nothing meaningful is found, say so clearly and stop.

### 2 — Scan the touched decisions for stale entries

From the Domains table in `docs/architecture/DECISIONS.md`, identify the `decisions/*.md` files whose area this session touched. Read **only those** — not every domain file. For each decision in them, ask:
- Has it been superseded or contradicted by something in this session?
- Does it reference files, patterns, or conventions that no longer exist?

Flag any stale decisions (and note the file) — do not edit yet.

### 3 — Propose changes one at a time (review-before-write)

Present each proposed change to the user individually and wait for approval before writing anything. Order:

1. **Stale decision flags** — name the `decisions/*.md` file + section, show why it may be outdated; ask if it should be removed, updated, or have its `**Status:**` flipped
2. **New decision additions** — name the target `decisions/*.md` file, show the proposed section text; ask for approval
3. **Workflow doc edits or flags** — name the doc in `docs/workflow/`, describe what's wrong or missing, propose the fix or ask if a new doc is needed

Only write after each individual approval. Skip any category with nothing to propose. If nothing was approved in any category, say so and stop — there is no separate report to produce.

## Anti-patterns to avoid

- Do not write anything without explicit user approval.
- Do not propose changes in bulk — one at a time.
- Do not edit workflow docs directly; propose the change, let the user decide.
- Do not save session learnings as a standalone artifact — every output is an edit to an existing `decisions/*.md` or `docs/workflow/` doc.
