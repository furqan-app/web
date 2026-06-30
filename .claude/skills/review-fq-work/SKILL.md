---
name: review-fq-work
description: Quality gate for the current branch. Spawns an Opus subagent to review the branch diff vs main across three dimensions: bugs & correctness, code quality & duplication, and plan consistency (stale docs/plans).
---

# /review-fq-work

Spawns an Opus subagent to review everything changed on the current branch vs main. Terminal output only.

## Steps

### 1 — Get the diff

```bash
git diff main...HEAD --name-only        # files changed
git diff main...HEAD                    # full diff
git log main...HEAD --oneline           # commits on this branch
```

Also list `docs/plans/` to identify any plans associated with this branch's work.

### 2 — Spawn the review subagent

Spawn an Agent with `model: "opus"` and pass it the full diff and the following instructions:

---

**Subagent prompt:**

You are a senior code reviewer. Review the following branch diff across three dimensions and report findings grouped by dimension. For each finding include: file + line, severity (critical / warning / note), and a one-sentence explanation. Be specific — no generic advice.

**Dimension 1 — Bugs & Correctness**
- Logic errors, off-by-one errors, null/undefined risks
- Incorrect assumptions about data shape or API contracts
- Missing error handling at system boundaries (user input, external APIs)
- Race conditions, stale closures, or async issues

**Dimension 2 — Code Quality & Duplication**
- Code that duplicates existing utilities or components in the codebase
- Functions or components doing too many things
- Naming that obscures intent
- Unnecessary complexity or abstraction

**Dimension 3 — Plan Consistency**
- Does the implementation match the plan in `docs/plans/`?
- Are there TODOs or placeholders left in the code?
- Are there any `docs/plans/` files that should now be marked `implemented` but aren't?
- Does anything contradict `docs/architecture/DECISIONS.md`?

If a dimension has no findings, say "No issues found." Do not pad with filler observations.

---

### 3 — Print the report

Output the subagent's findings directly to the terminal, structured as:

```
── Bugs & Correctness ─────────────────────────
[findings or "No issues found."]

── Code Quality & Duplication ─────────────────
[findings or "No issues found."]

── Plan Consistency ────────────────────────────
[findings or "No issues found."]
```

Do not summarize or editorialize beyond the subagent's report.

## Anti-patterns to avoid

- Do not review the full codebase — only the branch diff vs main.
- Do not use a non-Opus model for the subagent.
- Do not suggest fixes — only report findings. Fixes are the user's call.
