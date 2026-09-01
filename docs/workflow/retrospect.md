# Retrospect

Closes the feedback loop after a meaningful session — review-before-write, nothing is written without approval.

## Steps

### 1 — Scan the session

Read the current conversation history and extract:
- Architectural or process decisions made
- Problems hit and how they were resolved
- Workflow docs that felt incomplete, missing, or were misused
- Workflow friction points
- New considerations worth tracking

If nothing meaningful is found, say so clearly and stop — do not create a file.

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
4. **Memory saves** — show each proposed memory (type + content); ask for approval

Only write after each individual approval. Skip any category with nothing to propose.

### 4 — Confirm before saving

After step 3's approvals are resolved (whether or not anything was actually proposed), ask the user explicitly: "Save a retrospective file for this session?"

- If they decline, stop here. Anything already approved and written in step 3 (decision-file changes, doc edits, memory saves) stays as-is — only the snapshot file itself is skipped.
- If they agree, proceed to step 5.

### 5 — Save the retrospective file

After all approved changes are written, save:
`docs/retrospectives/YYYY-MM-DD.md`

Use the format below. Only include sections that have content.

```markdown
# Retrospective — YYYY-MM-DD

## Session Summary
[1–2 sentences describing what the session covered]

## Changes Made
- [x] Added decision to decisions/<file>.md: …
- [x] Updated workflow doc /foo: …
- [x] Saved memory: …

## Flagged for Later
- Workflow doc /bar needs attention: …
- Consider adding doc /baz for …

## Open Considerations
- …
```

## Anti-patterns to avoid

- Do not write anything without explicit user approval.
- Do not propose changes in bulk — one at a time.
- Do not create the retro file if the session had no meaningful learnings.
- Do not edit workflow docs directly; propose the change, let the user decide.
