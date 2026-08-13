# Review Work

Spawns a reviewer to check code changes across three dimensions. Accepts an optional scope argument:

- _(no arg)_ — committed changes on this branch vs main (default)
- `--staged` — staged but uncommitted changes
- `--unstaged` — unstaged working-tree changes

## Choosing the review model

Before running, decide which model runs the review:
- If the caller already specified a model, use it.
- Otherwise ask once, presenting: **most capable** (recommended — most thorough), **balanced** (faster/cheaper), **fast** (quickest, light sanity check).

Use your most capable available model for thorough reviews; use a faster model when the user explicitly requests a quick pass.

## Steps

### 1 — Get the diff

Pick the right commands based on the scope argument:

**Default (branch vs main):**
```bash
git diff main...HEAD --name-only
git diff main...HEAD
git log main...HEAD --oneline
```

**`--staged`:**
```bash
git diff --cached --name-only
git diff --cached
```

**`--unstaged`:**
```bash
git diff --name-only
git diff
```

Also list `docs/plans/` to identify any plans associated with this branch's work.

If `graphify-out/graph.json` exists, run `graphify query "<question>"` for each changed file/component to check for existing similar utilities (Dimension 2) and ripple effects on dependents (Dimension 1/3) before reading the wider codebase manually. Fall back to manual search if it has no answer, is stale, or doesn't exist.

### 2 — Run the review

Run the following review prompt against the full diff using the chosen model. Report findings directly in the chat — no separate file needed.

---

**Review prompt:**

You are a senior code reviewer. Review the following branch diff across three dimensions and report findings grouped by dimension, numbered sequentially across all dimensions (1, 2, 3, ... — do not restart the count per dimension). For each finding include: file + line, severity (critical / warning / note), and a one-sentence explanation. Be specific — no generic advice.

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

If a dimension has no findings, say "No issues found." Do not pad with filler observations. Number findings within each dimension (1., 2., 3., ...), continuing the count across dimensions rather than restarting at 1 for each one, so every finding has a stable reference number for follow-up discussion.
