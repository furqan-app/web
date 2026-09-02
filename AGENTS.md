# AGENTS.md

Universal entry point for all AI coding agents working in this repository.

> Claude Code: see `CLAUDE.md` for skill shortcuts and hooks.
> Antigravity (AGY): see `GEMINI.md` and `.agents/skills/`.
> GitHub Copilot: see `.github/copilot-instructions.md`.
> Cursor: see `.cursorrules`.

## MANDATORY WORKFLOW — NO EXCEPTIONS (ALL AGENTS)

**NEVER edit or create any app file without going through both steps in order:**

1. **Plan** — investigate and produce a spec in `docs/plans/<slug>.md` → see [`docs/workflow/plan-task.md`](docs/workflow/plan-task.md)
   - Socratic inquiry: ask clarifying/adversarial questions **one at a time**.
   - Do NOT jump straight to code edits or multi-file diffs.
   - Wait for explicit user confirmation on the plan before writing code.
2. **Implement** — implement from that plan → see [`docs/workflow/start-task.md`](docs/workflow/start-task.md)
   - Load `docs/architecture/DECISIONS.md` (the index) + the 1–3 `docs/architecture/decisions/*.md` domain files your task touches + relevant standards, before editing.
   - Run `check-fq-standards` pre- and post-implementation.

This applies to every change, no matter how small: one-liner fixes, font swaps, copy changes — everything. If you find yourself about to edit a file, stop and plan first.

**Worktrees:**
Every task runs in an isolated worktree at `../furqan-<slug>` (created from updated `origin/main` by default).

**This is not limited to file edits.** It applies equally to operational, data, and infrastructure actions: running scripts (seeders, scrapers, one-off Node scripts), seeding or mutating any database, `prisma db push` / migrations, importing SQL dumps, Docker/`compose` changes, and anything that touches the environment, containers, or running services. Plan first, every time.

When in doubt, ask. Never act unilaterally. Don't make any changes until you have 95% confidence in what we need to build. Ask follow-up questions until you reach that confidence.

**Scope — AI tooling files are exempt.** This workflow governs Furqan app code and content: anything under `app/`, `components/`, `lib/`, `prisma/`, `docs/` (excluding `docs/workflow/`), translation files, and config that affects the running app. Changes to AI agent tooling — `.claude/`, `.agents/`, `docs/workflow/`, `AGENTS.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursorrules` — are meta/infra and do not require the plan → implement flow. Still confirm with the user before making tooling changes.

## Response style

Keep responses concise and direct — no filler, no preamble, no tool-call narration.

Project terminology: use "surah" (not "chapter"), "verse" (not "ayah"), "word-level" for word-granularity marking, "mushaf" for the page/layout view. Match the casing and terms already used in `docs/standards/` and the Prisma schema (`Chapter`/`Verse`/`Word` models, but "surah"/"verse" in prose).

## Project

Furqan — word-focused Qur'an reading app. Users read from print-accurate mushaf page layouts (all 604 pages statically generated), mark progress/memorization at word level, follow reading plans (awrad), and can share their marked mushaf with a teacher or family member through revocable grants.

Stack: Next.js 14 App Router · TypeScript · Tailwind/shadcn (Radix) · next-intl (`ar` RTL default, `en` LTR) · NextAuth (Google OAuth) · TanStack React Query · Sentry · PWA via `@serwist/next` (offline reliability is a hard product requirement). Tests: Vitest (unit) + Playwright (functional e2e).

**Two MySQL databases, never joined by FK** (ADR 0008): `furqan_quran` (read-only content, `quranPrisma`, local :3307) and `furqan_app` (user/interaction data, `appPrisma`, local :3308) — both exported from `app/utils/db.ts`, with separate schemas at `prisma/quran/` and `prisma/app/` and separate generated clients under `app/generated/`.

- Product definition: `PRODUCT.md` — users, positioning, principles
- Design system: `DESIGN.md` + `docs/design/design-principles.md`

## Commands

```bash
npm run dev              # dev server (port 3000)
npm run build            # prisma migrate deploy (app DB) + production build
npm run lint             # ESLint
npm test                 # Vitest unit tests (fast logic & component verification, < 1s)
npm run test:e2e         # Playwright functional e2e (uses dev server on :3000 locally, e2e:build on CI)
npm run prisma-generate  # regenerate BOTH Prisma clients (quran + app)
npm run quran-studio     # Prisma Studio for furqan_quran
npm run app-studio       # Prisma Studio for furqan_app
npm run app-migrate-dev  # schema changes on furqan_app (versioned migrations)
npm run seed:quran -- --force  # rebuild furqan_quran from the QDC API (destructive)
npm run extract-translations  # sync i18n keys
```

Local DBs: `docker compose up -d` (quran :3307, app :3308, phpMyAdmin :8081).

Functional e2e (Playwright; uses dedicated e2e DBs from `compose.e2e.yml` — never touches dev DBs):

```bash
npm run e2e:db:up        # start e2e MySQL containers
npm run e2e:setup        # load the e2e fixture
npm run e2e:test         # run Playwright (dev server locally; e2e:build & e2e:start in CI)
npm run e2e:db:down      # tear down e2e DBs
```

*Note on builds and tests:* Local `next build` / `e2e:build` concurrency is capped at 2 CPU workers in `next.config.mjs` to keep the machine responsive. Agents should always prefer fast unit tests (`npm test`) for business logic and components, and use Playwright against the local dev server for browser interactions. Full SSG builds are validated in CI.

## Documentation

Load these before starting any task:

- **Active decisions**: `docs/architecture/DECISIONS.md` is a thin index — load it always (its Non-negotiable Invariants block), then the 1–3 `docs/architecture/decisions/*.md` domain files matching the task (Domains table maps them). Not every domain file. See ADR 0057.
- **Product & design**: `PRODUCT.md`, `DESIGN.md`, `docs/design/design-principles.md`
- **Standards** (load the file(s) matching the task domain):
  - `docs/standards/api-conventions.md` — route structure, response shape, auth
  - `docs/standards/component-patterns.md` — server vs client, data fetching, props
  - `docs/standards/database.md` — Prisma patterns, schema gotchas
  - `docs/standards/i18n.md` — translation keys, direction, next-intl usage
  - `docs/standards/styling.md` — Tailwind tokens, themes, RTL/LTR
  - `docs/standards/quran-rendering.md` — column–font contract for Quran text
  - `docs/standards/pwa-testing.md` — exercising PWA-gated behavior in the browser
- **Task plans**: `docs/plans/` — start from the generated `docs/plans/INDEX.md` (area / status / type per plan)
- **ADR history**: `docs/architecture/adr/`
- **Deployment**: `docs/deployment/hostinger.md`
- **All AI workflows**: [`docs/workflow/INDEX.md`](docs/workflow/INDEX.md)

## Task tracking

The workflow tracks tasks as GitHub Issues on `furqan-app/web` — no MCP setup needed, agents use the `gh` CLI (or `gh-axi`) directly. Status is a `status:*` label (`backlog` → `todo` → `in-progress` → `in-review` → `to-be-released` → `done`, closed at prod promote); type is the native GitHub Issue Type (Task/Bug/Feature), not a label. Labels sync to the Furqan Kanban board (project #3) automatically via `issue-status-to-project.yml`; skills also call `.claude/skills/scripts/sync-issue-board-status.sh` directly as a fallback.

## Releases

Branching model: work ships from feature branches → `main` (via `/ship-fq-task`). `/release <major|minor|patch>` then cuts `release/x.y.z` from `main`, refreshes `stg` from `main`, promotes the release branch to `prod`, and syncs `prod` back into `main` — GitHub Actions under the hood. Single phase: `/release cut <bump>`, `/release promote`, `/release sync`. Deploy target is Hostinger.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Design & UX

Nobody on the team is a designer. For UI work, consult `docs/design/design-principles.md` (aesthetic direction) and `docs/standards/styling.md` (tokens, RTL/LTR, the Motion section) before making layout or visual decisions, and list any UI/UX concerns in the plan. `/review-fq-work` and `check-fq-standards` carry a Design & UX checklist (contrast, hierarchy, spacing scale, RTL parity, touch-target size, reduced-motion).
