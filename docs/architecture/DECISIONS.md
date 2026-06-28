# Active Decisions

This file is the single source of truth for current architectural decisions.
AI agents load this file at the start of every task. The `adr/` directory contains the historical audit trail for humans.

---

## Static Generation Strategy

**Decision:** All 604 Quran pages are statically generated at build time via `generateStaticParams` for each locale (ar, en).

**Rationale:** Quran content is immutable. Static generation eliminates per-request DB queries for content and enables edge caching. User interactions (marks, bookmarks) are dynamic and handled client-side.

**Constraints:**
- Never add server-side dynamic rendering to Quran page routes.
- Static data (surah list, juz/hizb info) must be pre-computed, not calculated at runtime.
- User-specific data is always fetched client-side via React Query after hydration.

---

## Font System

**Decision:** Each Quran page inlines a single `@font-face` for `quran-p{pageId}` pointing to `/fonts/v1/ttf/p{pageId}.ttf`, with a `<link rel="preload">` for immediate download. No global CSS font declarations for Quran fonts.

**Rationale:** Loading all 604 page fonts globally would be prohibitively large. Inlining per-page means only the current page's font is loaded.

**Constraints:**
- Do not add Quran page fonts to the global CSS.
- Font scaling (1–10) is persisted in `localStorage` via `QuranFontScaleContext`.

---

## Database Connection

**Decision:** MySQL runs on port 3307 (non-standard). Prisma client is used exclusively for all DB queries. A raw `mysql2` connection is also exported from `app/utils/db.ts` for queries that need it, but Prisma is the default.

**Constraints:**
- Do not use port 3306 — will fail in dev.
- `Chapter.pages` is a `"startPage-endPage"` string (e.g. `"1-21"`), not an array. Use `.split('-')[0]` to get the starting page.

---

## Middleware Chain

**Decision:** Two middleware are piped in order: `intl-middleware` (locale detection and routing) → `auth-middleware` (protects `/api/quran/pages/[0-9]+/marks`).

**Rationale:** next-intl requires its middleware to run first. Auth is layered on top.

**Constraints:**
- Do not add new protected routes without updating the auth-middleware matcher pattern.
- The middleware chain uses the `pipeMiddlewares` utility in `app/middlewares/pipe.ts`.

---

## Auth

**Decision:** Google OAuth via NextAuth. Session is stored server-side. The authenticated user object is forwarded to protected API routes as a JSON-stringified `user` header (injected by `auth-middleware`).

**How to read user in an API route:**
```ts
import { extractUser } from "@/app/api/request";
const user = extractUser(request); // { id, email, ... }
```

**Constraints:**
- Do not attempt to read the session via `getServerSession` inside API routes — use `extractUser` instead, which reads the header the middleware sets.

---

## i18n

**Decision:** `next-intl` with two locales: `ar` (Arabic, default, RTL) and `en` (English, LTR). All routes are under `app/[locale]/`. Translation keys live in `messages/ar.json` and `messages/en.json`.

**Constraints:**
- Always call `setRequestLocale(locale)` in async server components/layouts before accessing translations.
- Default locale is `ar` — Arabic must always have translation coverage; English is supplementary.
- Direction is determined at the layout level via `app/utils/i18n.ts`.

---

## API Response Shape

**Decision:** All API routes return a consistent envelope via `jsonResponse()` from `app/api/response.ts`:
```json
{ "data": ..., "success": true|false, "error": ..., "code": 200, "message": ... }
```

**Constraints:**
- Never return raw `NextResponse.json({ ... })` in API routes — always use `jsonResponse()` (exception: the page words route which predates this convention).
- Validate inputs before DB writes; return `code: 422` with `message` on missing required fields.

---

## UI Component Library

**Decision:** shadcn/ui (Radix primitives + Tailwind) for all new UI components. Lucide React for icons. Components are installed into `components/ui/` via `npx shadcn@latest add`.

**Constraints:**
- Do not install a separate icon library — use `lucide-react` only.
- Do not hand-roll components that have a shadcn equivalent.

---

## Sidebar Loading

**Decision:** The `Sidebar` component is loaded via `next/dynamic` (deferred JS hydration) in `app/[locale]/pages/layout.tsx`. Sidebar data (surahs, rubs) is fetched server-side in that layout.

**Rationale:** Sidebar is non-critical for initial render of the Quran page; deferring it reduces the JS bundle that blocks hydration.

---

## PageMetadata

**Decision:** Per-page structural info (surah_id, juz_number, hizb_number, hizb_position) is stored in the `PageMetadata` DB table and fetched at page-generation time. Not computed at runtime.

**`hizb_position` values:** `null` (no new rub starts on this page), `"hizb"`, `"hizb-quarter"`, `"hizb-half"`, `"hizb-three-quarters"`.

---

## Documentation & Workflow System

**Decision:** AI-first docs system adopted 2026-06-28. CLAUDE.md is a slim pointer file. Heavy context lives in `docs/`. Skills (`/plan-fq-task`, `/start-fq-task`) load context on demand. Decisions are tracked in this file; ADR history is in `docs/architecture/adr/`.

**Constraints:**
- Never put architecture detail, standards, or decisions back into CLAUDE.md.
- Always update this file in the same commit as any new ADR.
