# Review Work

Spawns a reviewer to check code changes across three dimensions. Accepts an optional scope argument:

- _(no arg)_ — **everything not yet committed**: staged + unstaged working-tree changes (default)
- `--staged` — staged changes only
- `--unstaged` — unstaged working-tree changes only
- `--committed` — commits on this branch vs `main`

**Why the working tree is the default:** `/ship-fq-task` is the only sanctioned path to `git commit`
in this project, and this review runs *before* it (`review-work.md` step 3 → `/retrospect` →
`/ship-fq-task`; `ship-task.md` step 0 also offers this review before its own commit step). So at the
moment this runs there are normally **zero commits on the branch**, and a `main...HEAD` default hands
the reviewer an empty diff. That failure is silent — a review that saw nothing is indistinguishable
from a clean review. Use `--committed` for the genuine cases (reviewing an already-pushed branch, or
a PR someone else opened).

## Choosing the review model

Before running, decide which model runs the review:
- If the caller already specified a model, use it.
- Otherwise ask once, presenting: **most capable** (recommended — most thorough), **balanced** (faster/cheaper), **fast** (quickest, light sanity check).

Use your most capable available model for thorough reviews; use a faster model when the user explicitly requests a quick pass.

## Steps

### 1 — Get the diff

Pick the right commands based on the scope argument:

**Default (everything uncommitted):**
```bash
git status --short
git diff HEAD --name-only
git diff HEAD
```
`git diff HEAD` covers staged and unstaged together, which is what "the work I just did and have not
shipped" means here.

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

**`--committed` (branch vs main):**
```bash
git diff main...HEAD --name-only
git diff main...HEAD
git log main...HEAD --oneline
```

**If the chosen scope produces an empty diff, STOP.** Report "no changes found in scope `<scope>`",
say which command produced nothing, and name the scope that probably has the work (`git status
--short` shows it). Do **not** proceed into the review prompt and do **not** report "no issues
found" — a review of nothing must never be reportable as a clean review.

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
- **Treat the plan's premises as claims to check, not ground truth.** Where a constraint asserts a
  system-wide invariant — anything of the form "X is always true", "Y never happens" — verify it
  against the ADRs and the e2e specs before judging the code by it. A review that checks code
  against a wrong spec returns a clean verdict on a real bug.
- **If that plan is a child of an umbrella** (it lives in a `docs/plans/<feature>/` directory
  alongside an `INDEX.md`), read the `INDEX.md` too. Its "Cross-cutting invariants" and "What NOT to
  do" bind the child even though the child file does not restate them, so a reviewer reading only the
  child file is checking half the contract.
- Are there TODOs or placeholders left in the code?
- Are there any `docs/plans/` files that should now be marked `implemented` but aren't?
- Does anything contradict `docs/architecture/DECISIONS.md`'s invariants or a `docs/architecture/decisions/*.md` entry for a touched domain?

If a dimension has no findings, say "No issues found." Do not pad with filler observations. Number findings within each dimension (1., 2., 3., ...), continuing the count across dimensions rather than restarting at 1 for each one, so every finding has a stable reference number for follow-up discussion.

### 3 — What this gate does not cover

A review verdict is bounded by the plan it judges against. It cannot catch a constraint that is
itself false, because the code will match it exactly and the reviewer will confirm as much.

This is not hypothetical. `#548`'s plan asserted "on the self mushaf `is_own` is always `true` and
`author_name` `null`". Under [ADR 0012](../architecture/adr/0012-shared-mushaf-access.md) a grant
holder writes marks **into** your mushaf (`to_user` = owner, `from_user` = viewer), so a mark on your
own mushaf can be someone else's — which is why the self marks endpoint always ran
`withAuthorNames`. The implementation followed the plan, a review confirmed it held, and the
attribution silently disappeared. Only `e2e/tests/shared-mushaf.spec.ts` caught it, because it
encodes the actual behaviour rather than a restatement of it.

Two things follow:

- **A green review is not a substitute for CI.** Never report work as verified on a review verdict
  alone when the suite has not run against it.
- **When the reviewer is given the constraints second-hand** — a subagent, or a delegated external
  CLI — it inherits whatever premises the brief carries. Point it at the ADRs and the specs, not
  only at the plan's summary of them.

### 4 — Next step

Once the findings are resolved, run `/retrospect` **before** `/ship-fq-task` — its `decisions/*.md` and workflow-doc edits must be committed inside this PR, not produced after ship opens it. See [retrospect.md](retrospect.md).
