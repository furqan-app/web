# GitHub Copilot Instructions

Read [`AGENTS.md`](../AGENTS.md) for all project rules and mandatory workflow requirements.

## CRITICAL RULES FOR COPILOT (CHAT & EDITS)

1. **NO DIRECT CODE MODIFICATIONS WITHOUT A PLAN:**
   - NEVER generate multi-file edits or implement features/bugfixes in a single turn without first planning.
   - When given a task or bug, your FIRST response must follow [`docs/workflow/plan-task.md`](../docs/workflow/plan-task.md).
   - Ask clarifying / edge-case questions **one at a time**.
   - Produce a spec in `docs/plans/<slug>.md` using the format defined in `docs/workflow/plan-task.md`.
   - Do NOT edit code until the user explicitly confirms the plan ("yes", "looks good", "proceed").

2. **LOAD ARCHITECTURE INVARIANTS:**
   - Before writing any code or proposing solutions, read [`docs/architecture/DECISIONS.md`](../docs/architecture/DECISIONS.md) (the index) plus the 1–3 `docs/architecture/decisions/*.md` domain files your task touches — not every domain file — and the relevant standards in `docs/standards/`.

3. **CONCISE & TERSE RESPONSES:**
   - Keep responses concise and direct — no conversational filler, no preamble, no tool-call narration.

4. **ALL WORKFLOWS:**
   - For all step-by-step workflow command instructions, see [`docs/workflow/INDEX.md`](../docs/workflow/INDEX.md).

## graphify

For any question about this repo's architecture, structure, components, or how to add/modify/find
code, your first action should be `graphify query "<question>"` when `graphify-out/graph.json`
exists. Use `graphify path "<A>" "<B>"` for relationship questions and `graphify explain "<concept>"`
for focused-concept questions. These return a scoped subgraph, usually much smaller than the full
report or raw grep output.

Triggers: "how do I…", "where is…", "what does … do", "add/modify a <component>",
"explain the architecture", or anything that depends on how files or classes relate.

If `graphify-out/wiki/index.md` exists, use it for broad navigation. Read `graphify-out/GRAPH_REPORT.md`
only for broad architecture review or when query/path/explain do not surface enough context. Only read
source files when (a) modifying/debugging specific code, (b) the graph lacks the needed detail, or
(c) the graph is missing or stale.

Type `/graphify` in Copilot Chat to build or update the graph.
