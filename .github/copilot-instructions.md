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
   - Before writing any code or proposing solutions, read [`docs/architecture/DECISIONS.md`](../docs/architecture/DECISIONS.md) and the relevant standards in `docs/standards/`.

3. **CONCISE & TERSE RESPONSES:**
   - Follow [`docs/workflow/terse-mode.md`](../docs/workflow/terse-mode.md) — keep explanations concise and avoid conversational filler.

4. **ALL WORKFLOWS:**
   - For all step-by-step workflow command instructions, see [`docs/workflow/INDEX.md`](../docs/workflow/INDEX.md).

