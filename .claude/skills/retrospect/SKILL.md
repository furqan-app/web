---
name: retrospect
description: End-of-session retrospective. Reads conversation history, scans DECISIONS.md for stale entries, proposes workflow improvements (decisions, skill edits, memories) review-before-write, then saves a dated file to docs/retrospectives/.
---

# /retrospect

Closes the feedback loop after a meaningful session — review-before-write, nothing is written without approval.

## Steps

### 1 — Scan the session

Read the current conversation history and extract:
- Architectural or process decisions made
- Problems hit and how they were resolved
- Skills that felt incomplete, missing, or misused
- Workflow friction points
- New considerations worth tracking

If nothing meaningful is found, say so clearly and stop — do not create a file.

### 2 — Scan DECISIONS.md for stale entries

Read `docs/architecture/DECISIONS.md`. For each decision, ask:
- Has it been superseded or contradicted by something in this session?
- Does it reference files, patterns, or conventions that no longer exist?

Flag any stale decisions — do not edit the file yet.

### 3 — Propose changes one at a time (review-before-write)

Present each proposed change to the user individually and wait for approval before writing anything. Order:

1. **Stale DECISIONS.md flags** — show which entries may be outdated and why; ask if they should be removed or updated
2. **New DECISIONS.md additions** — show the proposed decision text; ask for approval
3. **Skill edits or flags** — name the skill, describe what's wrong or missing, propose the fix or ask if a new skill is needed
4. **Memory saves** — show each proposed memory (type + content); ask for approval

Only write after each individual approval. Skip any category with nothing to propose.

### 4 — Confirm before saving

After Step 3's approvals are resolved (whether or not anything was actually proposed), ask the user explicitly: "Save a retrospective file for this session?"

- If they decline, stop here. Do not write the retrospective file. Anything already approved and written in Step 3 (DECISIONS.md changes, skill edits, memory saves) stays as-is — only the snapshot file itself is skipped.
- If they agree, proceed to Step 5.

### 5 — Save the retrospective file

After all approved changes are written, save:
`docs/retrospectives/YYYY-MM-DD.md`

Use the format below. Only include sections that have content.

```markdown
# Retrospective — YYYY-MM-DD

## Session Summary
[1–2 sentences describing what the session covered]

## Changes Made
- [x] Added decision to DECISIONS.md: …
- [x] Updated skill /foo: …
- [x] Saved memory: …

## Flagged for Later
- Skill /bar needs attention: …
- Consider adding skill /baz for …

## Open Considerations
- …
```

## Anti-patterns to avoid

- Do not write anything without explicit user approval.
- Do not propose changes in bulk — one at a time.
- Do not create the retro file if the session had no meaningful learnings.
- Do not edit skill files directly; propose the change, let the user decide.
- Do not write the retrospective file without an explicit save confirmation, even if all individual changes were approved.
