# CLAUDE.md

## MANDATORY WORKFLOW — NO EXCEPTIONS

**NEVER edit or create any file without going through both skills in order:**

1. `/plan-fq-task` — investigate and produce a plan in `docs/plans/`
2. `/start-fq-task` — implement from that plan

This applies to every change, no matter how small: one-liner fixes, font swaps, copy changes — everything. If you find yourself about to call Edit, Write, or a Bash command that modifies a file, stop and run `/plan-fq-task` first.

Don't make any changes until you have 95% confidence in what we need to build. Ask follow-up questions until you reach that confidence.

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

- **Active decisions** (load before any task): `docs/architecture/DECISIONS.md`
- **Standards** (load relevant files per task): `docs/standards/`
  - `api-conventions.md` — route structure, response shape, auth
  - `component-patterns.md` — server vs client, data fetching, props
  - `database.md` — Prisma patterns, schema gotchas
  - `i18n.md` — translation keys, direction, next-intl usage
  - `styling.md` — Tailwind tokens, dark mode, RTL/LTR
- **Task plans**: `docs/plans/`
- **Skills**: `/plan-fq-task` (plan a task), `/start-fq-task` (implement a plan), `/retrospect` (end-of-session workflow retrospective), `/review-fq-work` (Opus code review of current branch)

## MCP Server Setup (Trello)

Copy `.mcp.json.example` → `.mcp.json` and fill in your Trello API key and token.
Get key: https://trello.com/power-ups/admin
Get token: `https://trello.com/1/authorize?expiration=never&name=furqan&scope=read,write&response_type=token&key=YOUR_API_KEY`

If `npx` isn't found, use the absolute path from `which npx`. nvm users: set `"command"` to the full node path and pass npx as the first arg.
