---
name: review-fq-work
description: >-
  Quality gate for the current branch. Spawns a review subagent (model of your choice — Opus by default) to review the branch diff vs main across three dimensions: bugs and correctness, code quality and duplication, and plan consistency (stale docs/plans).
---

# /review-fq-work

Read and follow [`docs/workflow/review-work.md`](../../../docs/workflow/review-work.md).

## Spawning the reviewer

Spawn the review subagent (e.g. using `runSubagent` or subagent capability):
- Opus / Frontier model (most thorough, default)
- Sonnet / Fast reasoning model
- Haiku / Lightweight model

## Scope — the default is the WORKING TREE, not `main...HEAD`

`/ship-fq-task` is the only sanctioned path to `git commit` here, and this review runs *before* it, so
the branch normally has **zero commits** when this fires. Defaulting to `git diff main...HEAD` hands
the reviewer an empty diff and the result is indistinguishable from a clean review.

- _(no arg)_ — everything uncommitted: `git status --short` + `git diff HEAD` (default)
- `--staged` / `--unstaged` — one half only
- `--committed` — `main...HEAD`, for an already-pushed branch or someone else's PR

**If the chosen scope is empty, STOP and say so** — name the command that returned nothing and the
scope that likely holds the work. Never report "no issues found" for a diff the reviewer never saw.

When delegating this review to an agent that does not share this session's context (a subagent, or an
external CLI), the brief must state the scope explicitly and carry the constraints itself — including
the umbrella `INDEX.md` invariants when the plan is a child of one.

---
<!-- original content preserved below this line for reference only -->

Spawns a subagent to review code changes across three dimensions. Terminal output only.

Accepts an optional scope argument (**superseded — see "Scope" above; the default is the working
tree, not `main...HEAD`**):
- _(no arg)_ — ~~committed changes on this branch vs main~~ → now `git diff HEAD` (staged + unstaged)
- `--staged` — staged changes only (`git diff --cached`)
- `--unstaged` — unstaged working-tree changes only (`git diff`)
- `--committed` — commits on this branch vs main (`git diff main...HEAD`)

## Choosing the review model

Before spawning, decide which model runs the review:
- If the caller already specified a model (e.g. `/review-fq-work sonnet`, or `/ship-fq-task` passing a choice), use it.
- Otherwise ask once, presenting: **Opus** (recommended — most thorough), **Sonnet** (faster/cheaper), **Haiku** (fastest, light sanity check).

Map the choice to the Agent `model` value: `opus` / `sonnet` / `haiku`. Opus is the default if the user gives no preference.

## Steps

### 1 — Get the diff

Pick the right commands based on the scope argument:

**`--committed` (branch vs main — NOT the default, see "Scope" above):**
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

### 2 — Spawn the review subagent

Spawn an Agent with `model` set to the chosen model (see "Choosing the review model"; `opus` by default) and pass it the full diff and the following instructions:

---

**Subagent prompt:**

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
- Does anything contradict `docs/architecture/DECISIONS.md`'s invariants or a `docs/architecture/decisions/*.md` entry for a touched domain?

If a dimension has no findings, say "No issues found." Do not pad with filler observations. Number findings within each dimension (1., 2., 3., ...), continuing the count across dimensions rather than restarting at 1 for each one, so every finding has a stable reference number for follow-up discussion.

---

### 3 — Print the report

Output the subagent's findings directly to the terminal, structured as:

```
── Bugs & Correctness ─────────────────────────
1. [finding] (or "No issues found.")
2. [finding]

── Code Quality & Duplication ─────────────────
3. [finding] (or "No issues found.")

── Plan Consistency ────────────────────────────
4. [finding] (or "No issues found.")
```

Numbering continues across all three dimensions (do not restart at 1 per section). Do not summarize or editorialize beyond the subagent's report.

## Anti-patterns to avoid

- Do not review the full codebase — only the diff for the chosen scope.
- Do not default to `main...HEAD` when `--staged` or `--unstaged` was passed.
- Do not suggest fixes — only report findings. Fixes are the user's call.
