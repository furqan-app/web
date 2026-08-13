# CLAUDE.md

> All project rules, mandatory workflow, and documentation references are in [`AGENTS.md`](AGENTS.md). Read that first.
> This file contains Claude Code-specific additions only.

## Claude Skills

The workflows in `docs/workflow/` are exposed as Claude Code skills. Trigger them by name:

| Skill | Triggers |
|---|---|
| `/plan-fq-task` | "plan this", "investigate", starting any new task |
| `/start-fq-task` | "implement", "build", "start the task" |
| `/ship-fq-task` | "ship it", "I'm done", "commit and push" |
| `/review-fq-work` | "review my work", "check the branch" |
| `/retrospect` | end of session |
| `/release <bump>` | full release orchestration |
| `/cut-release <bump>` | cut a release branch |
| `/promote-to-staging <version>` | open release → stg PR |
| `/promote-release <version>` | open release → prod PR |
| `/sync-main-from-prod` | sync prod back to main |
| `/mujaz` | toggle terse-response mode on/off |
| `/compress-fq-docs` | compress verbose docs |
| `/confirm-dangerous-git` | gate before destructive git commands |

## Hooks

The mujaz (موجز, "concise") system injects terse-response rules each turn when active.
See `docs/workflow/terse-mode.md` for the concept and Furqan vocabulary.
Claude-specific implementation: `.claude/hooks/`.
