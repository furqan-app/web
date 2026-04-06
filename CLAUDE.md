# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Style

Don't make any changes until you have 95% confidence in what we need to build. Ask me follow up questions until you reach that confidence.

## Project Overview

Furqan is a word-focused Qur'an reading application built with Next.js 14 (App Router), featuring multi-language support (Arabic/English), user authentication via Google OAuth, bookmarking/marking features, and customizable Quranic font scaling.

## Common Commands

```bash
npm run dev              # Start development server (port 3000)
npm run build            # Production build
npm run lint             # ESLint check
npm run prisma-studio    # GUI database explorer (requires .env.local)
npm run prisma-generate  # Generate Prisma client
npm run extract-translations  # Extract i18n strings
```

**Database:** MySQL runs on port 3307 (non-standard). Connection configured in `app/utils/db.ts`.

## Architecture

### Tech Stack
- **Framework:** Next.js 14.2 with App Router, Server Components, Server Actions
- **Database:** MySQL via Prisma ORM
- **Auth:** NextAuth with Google OAuth provider
- **State:** TanStack React Query for server state, React Context for client state
- **Styling:** Tailwind CSS with dark mode support
- **i18n:** next-intl with AR (default) and EN locales

### Path Aliases (tsconfig.json)
- `@components/*` → `./app/components/*`
- `@contexts/*` → `./app/contexts/*`
- `@hooks/*` → `./app/hooks/*`
- `@utils/*` → `./app/utils/*`
- `@types` → `./app/types/index.ts`
- `@constants/*` → `./app/constants/*`
- `@fonts/*` → `./app/fonts/*`
- `@messages/*` → `./messages/*`
- `@/*` → `./*`

### Data Flow
1. All 604 Quran pages are statically generated at build time via `generateStaticParams`
2. Page data fetched directly via Prisma (`getPageWords`) — no API self-call
3. Words grouped by `line_number` for rendering
4. Sidebar data (surahs, rubs) fetched server-side in `app/[locale]/pages/layout.tsx`, Sidebar component loaded via `next/dynamic` for deferred JS hydration
5. User interactions (marks/bookmarks) load client-side via React Query (auth required)

### Middleware Chain (middleware.ts)
Two middleware piped in order:
1. **intl-middleware** - Locale detection and routing
2. **auth-middleware** - Protects routes matching `/api/quran/pages/[0-9]+/marks`

### Key API Routes
- `GET /api/quran/pages/[pageId]` - Page words grouped by line (used by vertical reading client component)
- `GET/POST /api/quran/pages/[pageId]/marks` - User marks (auth required)
- `GET /api/search/verses` - Verse search
- `GET /api/search/chapters` - Chapter search

### Font System
- **Core fonts** (loaded at build time): Uthmanic script (`/app/fonts/hafs/uthmanic/`), Surah names (`/app/fonts/surah/v1/`)
- **Page fonts** (inline per-page): Each Quran page inlines a single `@font-face` for `quran-p{pageId}` pointing to `/fonts/v1/ttf/p{pageId}.ttf`, plus a `<link rel="preload">` for immediate download. No global CSS font declarations.
- **Font scaling**: 1-10 scale persisted in localStorage via `QuranFontScaleContext`

### Database Schema (Prisma)
Key models:
- **Chapter** - Surah metadata. `pages` column is a string in `"startPage-endPage"` format (e.g. `"1-21"`), not an array — use `.split('-')[0]` to get the starting page.
- **Verse** - Quranic verses with page/line mapping
- **Word** - Individual words with position and formatting
- **User** - User accounts
- **Mark** - User marks (verse/word level, type: note or highlight, value: text or color)
- **Rub/RubVerseMapping** - Quarter divisions of Quran

### Server Data Functions (app/hooks/)
- `getSurahs()` - Prisma query for chapter list (used by home page and sidebar layout)
- `getPageWords(pageId)` - Prisma query for page words grouped by line_number (used by static page generation)
- `getRubs()` - Prisma query for rub divisions (used by sidebar layout)

### React Query Hooks (app/hooks/)
- `usePage(page)` - Fetch page words via API (used by vertical reading mode)
- `useMarks(page)` - Fetch user marks (auth required, client-side)
- `useSearch()` - Search verses/chapters

### Highlighting System (app/utils/highlight.ts)
Central utility for verse/word highlighting with support for:
- Search results
- User selection
- Last-read position
- Colored marks (user bookmarks)

### Static Generation Strategy
- Quran content is immutable (604 pages, 114 surahs) — all pages should be statically generated at build time
- Pages must be generated for each locale (AR/EN)
- User interactions (marks, bookmarks, highlights) are dynamic — handled client-side via React Query + auth
- Static data (surah list, page info like juz/hizb) should be pre-computed, not calculated at runtime
- Home page (`app/[locale]/page.tsx`) fetches surahs directly via `getSurahs()` (Prisma) in a server component — no API call, no React Query

### Companion Projects
- **quran-scrapper** (https://github.com/furqan-app/scraper) — Data collection and DB preparation. Temporary project; will be retired once database schema is finalized.

## Internationalization

- Locales: `ar` (Arabic, default, RTL), `en` (English, LTR)
- Translation files: `/messages/ar.json`, `/messages/en.json`
- Locale routing: `/[locale]/...` pattern in app directory
- Direction helper: `app/utils/i18n.ts`

## MCP Server Setup (Trello)

This project uses an MCP server for Trello integration with Claude Code. To set it up:

1. **Get your Trello API Key:**
   - Go to https://trello.com/power-ups/admin
   - Click "New" to create a Power-Up (or use an existing one)
   - Copy the **API Key** from the Power-Up's API Key section

2. **Generate a Trello Token:**
   - Open this URL in your browser (replace `YOUR_API_KEY` with the key from step 1):
     ```
     https://trello.com/1/authorize?expiration=never&name=furqan&scope=read,write&response_type=token&key=YOUR_API_KEY
     ```
   - Authorize the app when prompted
   - Copy the generated token

3. **Create your `.mcp.json`:**
   - Copy the example file: `cp .mcp.json.example .mcp.json`
   - Replace `<your-trello-api-key>` and `<your-trello-token>` with your values

`.mcp.json` is gitignored — your credentials stay local.

### Troubleshooting: MCP Server Failed to Connect

**`npx` not found in Claude Code's PATH:**

Claude Code launches MCP servers with a different shell environment than your terminal, so `npx` may not be found. Fix by using the absolute path:

```bash
# Find where npx lives
which npx
```

Then update `"command"` in your `.mcp.json` to the full path (e.g. `"/usr/local/bin/npx"`).

**nvm users — Node not available in non-interactive shells:**

If you use nvm, find your exact paths:

```bash
which node   # e.g. /home/you/.nvm/versions/node/v20.11.0/bin/node
which npx    # e.g. /home/you/.nvm/versions/node/v20.11.0/bin/npx
```

Then update your `.mcp.json` to use `node` as the command and `npx` as the first arg:

```json
{
  "type": "stdio",
  "command": "/home/you/.nvm/versions/node/v20.11.0/bin/node",
  "args": ["/home/you/.nvm/versions/node/v20.11.0/bin/npx", "-y", "@delorenj/mcp-server-trello"],
  "env": {
    "TRELLO_API_KEY": "<your-trello-api-key>",
    "TRELLO_TOKEN": "<your-trello-token>"
  }
}
```
