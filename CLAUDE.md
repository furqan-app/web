# CLAUDE.md

> All project rules, mandatory workflow, and documentation references are in [`AGENTS.md`](AGENTS.md). Read that first.
> This file contains Claude Code-specific additions only.

## Claude Skills

The workflows in `docs/workflow/` are exposed as Claude Code skills. Trigger them by name:

| Skill | Triggers |
|---|---|
| `/refine-fq-task` | "refine this", "break this down", "create issues for this" |
| `/plan-fq-task` | "plan this", "investigate", starting any new task |
| `/start-fq-task` | "implement", "build", "start the task" |
| `/check-fq-standards` | run automatically by `/start-fq-task`; or "check standards", "check invariants" |
| `/ship-fq-task` | "ship it", "I'm done", "commit and push" |
| `/review-fq-work` | "review my work", "check the branch" |
| `/retrospect` | end of session |
| `/release <bump>` | full release orchestration (GitHub Actions under the hood) |
| `/cut-release <bump>` | cut release branch + promote to stg (GitHub Action) |
| `/promote-release` | promote release → prod, version auto-detected (GitHub Action) |
| `/sync-main-from-prod` | sync prod back to main |
| `/mujaz` | toggle terse-response mode on/off |
| `/compress-fq-docs` | compress verbose docs |
| `/confirm-dangerous-git` | gate before destructive git commands |

## Hooks

The mujaz (موجز, "concise") system injects terse-response rules each turn when active.
See `docs/workflow/terse-mode.md` for the concept and Furqan vocabulary.
Claude-specific implementation: `.claude/hooks/`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
