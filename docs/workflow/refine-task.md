# Refine a Task

Breaks a big or vague task into separate, independently implementable issues. Output: GitHub issues only — no code, no plans, no worktrees.

Each refined issue later flows through the plan workflow on its own when picked up. Refinement answers "what are the pieces and where does each one stop"; planning answers "how is one piece built".

## Steps

### 0. Check for existing coverage — before anything else

- Run `ls docs/plans/` and scan for plans that already decompose this area.
- Search the tracker for open issues overlapping the big task; link or fold them in rather than creating duplicates.

### 1. Load context — mandatory gate, before investigating or writing anything

- Read `docs/architecture/DECISIONS.md` (the index) and the `docs/architecture/decisions/*.md` domain files the big task spans. When a decision it touches links an ADR in `docs/architecture/adr/`, open that ADR too for the full constraint. Treat all of it as non-negotiable: the breakdown must not contradict it. If the big task genuinely requires contradicting one, surface it to the user explicitly — never override silently.
- Read the relevant standards file(s) from `docs/standards/` based on the task domain.

### 2. Investigate the boundary

Query the graph first if `graphify-out/graph.json` exists (`graphify query "<question>"`), then read the codebase areas the big task touches. Goal: ground the split in reality — what exists, what systems interact, what constraints apply. This is boundary-level investigation, not root-cause depth: enough to name real files and real constraints in each issue, not enough to write the implementation.

### 3. Clarify scope with the user

Ask one question at a time — wait for each answer before asking the next. Questions should surface: what is IN, what is explicitly OUT, priorities, and sequencing/dependencies between the pieces.

### 4. Propose the breakdown as a table

Present one row per workable point: title, in-scope, out-of-scope, files/systems touched, dependencies on sibling points. Each point must be independently implementable — one plan, one branch, one PR. Iterate until the user explicitly approves the table. Do not create issues before that approval.

### 5. Create the issues

Create one parent issue for the big task (context, overall boundary, checklist of children) and one child issue per approved point. Each child carries: summary, in/out scope, codebase pointers from step 2, constraints from ADRs/plans, and links to the parent and any blocking siblings. Tool-specific commands live in the agent's skill file.

### 6. Output the summary

End with a table of the created issues (number, title, URL) and note the expected next step: each child goes through the plan workflow when picked up.

## What NOT to do

- Do not write code, edit source files, create branches, or create worktrees.
- Do not write `docs/plans/` files — each child gets its own plan when picked up later.
- Do not create ADRs — if the investigation surfaces an architectural question, record it in the relevant child issue for the plan phase.
- Do not create issues before the user explicitly approves the breakdown table.
- Do not contradict a `decisions/*.md` entry or an ADR — surface conflicts instead.
- Do not ask multiple questions at once — one at a time.
- Do not use refinement for a single, already-scoped task — that goes straight to the plan workflow.
