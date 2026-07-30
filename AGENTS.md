# AGENTS.md

Universal entry point for all AI coding agents working in this repository.

> Claude Code: see `CLAUDE.md` for skill shortcuts and hooks.
> GitHub Copilot: see `.github/copilot-instructions.md`.

## MANDATORY WORKFLOW — NO EXCEPTIONS

**NEVER edit or create any file without going through both steps in order:**

1. **Plan** — investigate and produce a spec in `docs/plans/` → see [`docs/workflow/plan-task.md`](docs/workflow/plan-task.md)
2. **Implement** — implement from that plan → see [`docs/workflow/start-task.md`](docs/workflow/start-task.md)

This applies to every change, no matter how small: one-liner fixes, font swaps, copy changes — everything. If you find yourself about to edit a file, stop and plan first.

**This is not limited to file edits.** It applies equally to operational, data, and infrastructure actions: running scripts (seeders, scrapers, one-off Node scripts), seeding or mutating any database, `prisma db push` / migrations, importing SQL dumps, Docker/`compose` changes, and anything that touches the environment, containers, or running services. Plan first, every time.

When in doubt, ask. Never act unilaterally. Don't make any changes until you have 95% confidence in what we need to build. Ask follow-up questions until you reach that confidence.

**Scope — AI tooling files are exempt.** This workflow governs Furqan app code and content: anything under `app/`, `components/`, `lib/`, `prisma/`, `docs/` (excluding `docs/workflow/`), translation files, and config that affects the running app. Changes to AI agent tooling — `.claude/`, `docs/workflow/`, `AGENTS.md`, `.github/copilot-instructions.md` — are meta/infra and do not require the plan → implement flow. Still confirm with the user before making tooling changes.

## Project

Furqan — word-focused Qur'an reading app. Next.js 14 App Router, MySQL/Prisma, NextAuth (Google OAuth), next-intl (ar/en), Tailwind/shadcn.

## Commands

```bash
npm run dev              # dev server (port 3000)
npm run build            # production build
npm run lint             # ESLint
npm run prisma-studio    # DB GUI (requires .env.local)
npm run prisma-generate  # regenerate Prisma client
npm run extract-translations  # sync i18n keys
```

## Documentation

Load these before starting any task:

- **Active decisions**: `docs/architecture/DECISIONS.md` — non-negotiable constraints; load before any task
- **Standards** (load the file(s) matching the task domain):
  - `docs/standards/api-conventions.md` — route structure, response shape, auth
  - `docs/standards/component-patterns.md` — server vs client, data fetching, props
  - `docs/standards/database.md` — Prisma patterns, schema gotchas
  - `docs/standards/i18n.md` — translation keys, direction, next-intl usage
  - `docs/standards/styling.md` — Tailwind tokens, dark mode, RTL/LTR
- **Task plans**: `docs/plans/`
- **All AI workflows**: [`docs/workflow/INDEX.md`](docs/workflow/INDEX.md)

## MCP Setup (Trello)

The workflow integrates with Trello to track tasks. Each agent reads its own config file:

| Agent | Config file | Setup |
|---|---|---|
| Claude Code | `.mcp.json` | Copy `.mcp.json.example` → `.mcp.json`, fill in keys |
| VS Code / Copilot | `.vscode/mcp.json` | Already committed — VS Code prompts for keys on first use |
| OpenCode | `opencode.json` | Copy `opencode.json.example` → `opencode.json`, fill in keys |
| Cursor | `.cursor/mcp.json` | Copy `.cursor/mcp.json.example` → `.cursor/mcp.json`, fill in keys |

Get your API key: https://trello.com/power-ups/admin
Get your token: `https://trello.com/1/authorize?expiration=never&name=furqan&scope=read,write&response_type=token&key=YOUR_API_KEY`
