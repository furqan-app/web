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

**Decision:** Each Quran page inlines `@font-face` rules for both pages in the current pair (`quran-p{rightPageId}` and `quran-p{leftPageId}`), pointing to `/fonts/v1/ttf/p{id}.ttf`. Only the current page's font gets a `<link rel="preload">` — the pair partner's font is not preloaded. The `@font-face` rules are injected via `FontFaceInjector` (`"use client"`) rather than inline in `ReaderPage` — see [ADR 0020](adr/0020-client-component-for-inline-style-injection.md). Three global fonts are loaded in `app/layout.tsx`: `--uthmanic` and `--surah-names` via `next/font/local`, and `--tajawal` (Tajawal, Arabic/Latin UI font) via `next/font/google`.

**Rationale:** Loading all 604 page fonts globally would be prohibitively large. Inlining per-page means only the current page's font is loaded.

**Font–Column Encoding Contract** (see `adr/0002-non-page-quran-text-rendering.md`, `standards/quran-rendering.md`):

| Font | Tailwind class | Column to use | Context |
|---|---|---|---|
| `quran-p{n}` | — (inline style) | `code_v1` | Quran page words only |
| `UthmanicHafs1Ver18` | `font-uthmanic` | `qpc_uthmani_hafs` | Word text in search, modals, any non-page context |
| `UthmanicHafs1Ver18` | `font-uthmanic` | `text_uthmani` | Verse-level text (Verse has no `qpc_uthmani_hafs` column) |
| `sura_names.ttf` | `font-surahnames` | Zero-padded surah number e.g. `"001"` | Surah name display — font maps `001`–`114` to calligraphic glyphs, NOT Arabic text |

**Constraints:**
- Do not add Quran page fonts to the global CSS.
- `<style dangerouslySetInnerHTML>` for per-page `@font-face` rules **must** live in a `"use client"` component (`FontFaceInjector`), never in a Server Component. Next.js App Router treats `<style>` in RSC output as a resource and hoists it to a different DOM position on the client, causing React hydration mismatches. `<link rel="preload">` is NOT affected and may remain in the Server Component. See [ADR 0020](adr/0020-client-component-for-inline-style-injection.md).
- Font scaling (1–10) is persisted in `localStorage` via `QuranFontScaleContext`.
- `QuranSafha`'s word font-size Tailwind class is built at runtime from `FONT_V1` and requires a matching literal-string safelist (`tailwindFontUtility` in `QuranSafha.tsx`) for Tailwind's JIT to generate the CSS. Any change to `FONT_V1.baseScaleViewHeight` or the per-scale multiplier must regenerate that safelist for the new `quranFontScale` 1–10 range in the same commit, or the font size silently fails to apply. See [ADR 0005](adr/0005-quran-font-size-safelist.md).
- `UthmanicHafs1Ver18` supports both `qpc_uthmani_hafs` (preferred for words) and `text_uthmani` (for verse-level display). Never pair it with `code_v1`.
- When displaying a word outside the page (search, modal), use `word.qpc_uthmani_hafs`.
- `Verse` has no `qpc_uthmani_hafs` column — when displaying verse text, prefer reconstructing from `word.qpc_uthmani_hafs` filtered to `char_type_name === 'word'` if words are in scope; fall back to `verse.text_uthmani` only when words are unavailable.
- Never use `verse.text_uthmani` for verse display in search — always join `word.qpc_uthmani_hafs` across all words. Do **not** filter by `char_type_name` for full verse display: `UthmanicHafs1Ver18` renders markers (۞ rub el hizb, etc.) correctly and they should be visible. Filter to `char_type_name === 'word'` only in truncated/title contexts (e.g. MarkModal) where markers in a short string are unwanted.

---

## Database Connection

**Decision:** MySQL runs on non-standard ports — `furqan_quran` on **3307**, `furqan_app` on **3308** (local dev; see "Database Split" below). Prisma is used exclusively for all DB queries: content queries go through `quranPrisma`, user/interaction queries through `appPrisma`, both exported from `app/utils/db.ts`. PrismaClient instances are constructed **without explicit datasource URLs** — Prisma reads `QURAN_DATABASE_URL`/`APP_DATABASE_URL` from the environment at query time via schema `env()` declarations. See [ADR 0010](adr/0010-prisma-no-explicit-datasource-url.md).

**Constraints:**
- Do not use port 3306 — will fail in dev.
- Both local DBs run as separate containers via `compose.yml`; app-db is 3308, not 3307.
- `Chapter.pages` is a `"startPage-endPage"` string (e.g. `"1-21"`), not an array. Use `.split('-')[0]` to get the starting page.
- Do not pass explicit datasource URLs to PrismaClient constructors — `new URL()` at module scope crashes Next.js builds when env vars are absent (ADR 0010).
- `connection_limit=1` must be embedded in the DATABASE_URL string (e.g. `?connection_limit=1`) rather than added programmatically. The value must be 1, not higher: during `next build`, Next.js spawns multiple worker processes for static generation; each worker holds its own `quranPrisma` + `appPrisma` pool, so total open connections = N_workers × 2 × connection_limit. Hostinger caps at 75 connections per DB user — deploying with `connection_limit=5` exhausted that cap at ~8 workers. With `connection_limit=1`, up to 37 workers can run before hitting the ceiling.
- There is no raw `mysql2` connection export from `db.ts` — if a raw connection is ever needed, create it inside the function that uses it, not at module scope.
- In dev, `quranPrisma`/`appPrisma` are cached on `globalThis` (guarded to `NODE_ENV !== "production"`) so Next.js HMR reuses the same client/pool across module reloads instead of creating a new one — and a new set of open connections — on every edit. Production is unaffected (module loads once per process there already). See `docs/plans/fix-dev-hmr-prisma-connections.md`. Do not remove this guard as "unnecessary" — without it, a dev session of repeated edits exhausts the MySQL connection cap.

---

## Database Split (Quran vs Application)

**Decision:** Quran content and application data live in two separate MySQL databases, each with its own Prisma schema and generated client. See [ADR 0008](adr/0008-quran-app-database-split.md).

| Domain | Database | Env var | Client | Models |
|---|---|---|---|---|
| Quran content (read-only, portable) | `furqan_quran` | `QURAN_DATABASE_URL` | `quranPrisma` | `Chapter`, `Verse`, `Word`, `PageMetadata`, `Rub`, `RubVerseMapping` |
| Application data (mutable, shared remote) | `furqan_app` | `APP_DATABASE_URL` | `appPrisma` | `User`, `Mark` |

Schemas live at `prisma/quran/schema.prisma` and `prisma/app/schema.prisma`; clients generate to `app/generated/quran-client` and `app/generated/app-client` (imported via `@/app/generated/…`) and are both re-exported from `app/utils/db.ts`. `furqan_app` uses **versioned Prisma migrations** (`migrate dev` locally, `migrate deploy` in the build script) — see [ADR 0017](adr/0017-prisma-migrations-app-db.md). `furqan_quran` is applied with `prisma db push --force-reset` by the seeder (ADR 0009) — no migration history, by design.

`app/generated/` is git-ignored (build artifact). A `postinstall` script regenerates both clients on `npm install` (no `.env.local` needed — `prisma generate` reads no DB URL), so CI/builds always have them. `npm run prisma-generate` runs both; per-domain scripts are `quran-generate`/`app-generate`, `quran-studio`/`app-studio`, `quran-db-push` (Quran only — App DB schema changes use `app-migrate-dev`).

**Constraints:**
- **Never add a foreign key or Prisma relation that crosses the two domains.** `Mark`/`User` reference Quran locations and users by scalar id only (`marked_id`, `page_number`, `from_user`, `to_user`). A cross-domain relation would make the databases inseparable and break the future device-local Quran DB (mobile). This is the load-bearing invariant of the split.
- Use `quranPrisma` for Quran content queries, `appPrisma` for user/interaction queries. Never reach for a single `prisma` — it no longer exists.
- Prisma types (`Verse`, `Mark`, `Prisma`, etc.) import from the correct generated client output path, not `@prisma/client`.
- The Quran schema must stay self-contained and provider-agnostic (no dependency on the app schema) so it can ship as a device-local DB later.

---

## Local Development Databases (Docker & Seeding)

**Decision:** Local dev runs the two split databases as **two separate MySQL 8.0 containers** via `compose.yml`: `quran-db` (`furqan_quran`, host port 3307, user `quran_user`), `app-db` (`furqan_app`, host port 3308, user `app_user`), plus `phpmyadmin` on 8081 (`PMA_HOSTS` lists both; no shared auto-login, since the two DBs have distinct credentials). Two containers with **distinct credentials** (not one container / one shared user) mirrors ADR 0008's separate-hosting model. `.env.local`'s `QURAN_DATABASE_URL`/`APP_DATABASE_URL` must match these per-DB users; changing a container's `MYSQL_USER` only takes effect on a fresh data dir, so recreate that DB's volume when its user changes.

**Seeding:** `furqan_quran` is (re)generated by the reproducible seeder — see [ADR 0009](adr/0009-reproducible-quran-seeder.md). One command runs `prisma db push --force-reset` (Prisma owns the schema), fetches `chapters` (QDC `/chapters`) and `verses`+`words` (QDC by-page), and **derives** `page_metadata`/`rubs`/`rub_verse_mappings` from `verses` in FK order. It is destructive and refuses without `--force`. This replaces the earlier one-time path (scraper for `verses`/`words`/`page_metadata` + `quran_db.sql` dump-copy for `chapters`/`rubs`/`rub_verse_mappings`). App tables `users`/`marks` → `npm run app-db-push`.

**Constraints:**
- Prisma owns the `furqan_quran` schema; the seeder never hand-writes DDL. `hizbs`/`hizb_verse_mappings` are not in the Prisma schema and are out of scope until the models are added.
- `Verse.rub_el_hizb_number` is a **global** rub index (1–240), not within-hizb 1–4 — the seeder groups by it directly to build `rubs`/`rub_verse_mappings` (same fact behind the page-metadata `hizb_number*4 - rub_el_hizb_number` math). QDC `chapters.pages` is an array → store as `"start-end"` string; `translated_name` is an object → store `.name`.
- `Verse.text_uthmani`/`Verse.text_imlaei_simple` hold **full verse text** and are `String @db.Text` — Prisma's default `VARCHAR(191)` overflows on long verses (e.g. 2:282). Word-level text columns (`Word.text_uthmani`, `code_v1`, `code_v2`, `qpc_uthmani_hafs`, `text`) are single-word and correctly stay plain `String`; don't widen those "for consistency."
- If a compose DB container ever comes up with a host-port conflict, it can end up detached from the compose network (no service-name DNS — phpMyAdmin can't resolve it); `docker compose down && docker compose up -d` recreates it cleanly. Check `ss -tlnp | grep 3307` before starting if the scraper project's own MySQL (also 3307) might be running.
- `Word.audio_url`'s trailing file number is rewritten to always equal `Word.position` for `char_type_name === "word"` rows — QDC's raw number double-counts Rub-el-hizb/waqf marks it fuses into the adjacent word's `text_uthmani` instead of giving them their own row (see ADR 0009 Addendum 2026-07-15). Never trust the raw QDC `audio_url` number as-is.

---

## Middleware Chain

**Decision:** Two middleware are piped in order: `intl-middleware` (locale detection and routing) → `auth-middleware` (protects `/api/quran/pages/[0-9]+/marks`).

**Rationale:** next-intl requires its middleware to run first. Auth is layered on top.

**Constraints:**
- Do not add new protected routes without updating the auth-middleware matcher pattern.
- The middleware chain uses the `pipeMiddlewares` utility in `app/middlewares/pipe.ts`.
- Any new top-level static asset directory served from `public/` (or a new Next metadata-route file) must be added to the root `middleware.ts` `config.matcher` exclusion list, alongside `_next/static`, `fonts/*`, `manifest.webmanifest`, `sw.js`, etc. Without it, `intl-middleware` treats the request as a page route and redirects it into a locale prefix (e.g. `/icons/icon-512.png` → `/en/icons/icon-512.png`), 404ing the asset. This bit the PWA icons (`public/icons/`) — see `docs/plans/pwa-offline-support.md` Addendum 1 — because the matcher was updated for `fonts/*`/`manifest.webmanifest`/`sw.js` but not the new `icons/` directory added in the same feature.
- RSC flight responses (Next.js App Router client-side navigation fetches, identified by the `?_rsc=<hash>` query parameter) must carry `Cache-Control: no-store`. This is set in `next.config.mjs` via `headers()` + `has: [{ type: "query", key: "_rsc" }]`. Hostinger's reverse proxy cache strips query parameters from cache keys and ignores the `Vary: RSC` header, so without `no-store`, RSC wire format gets cached under the bare page URL (e.g. `/ar`) and served to subsequent plain navigation requests — users see raw JSON instead of HTML. Do not remove this header rule. See `docs/plans/fix-rsc-cache-poisoning.md`.

---

## Auth

**Decision:** Google OAuth via NextAuth. Session is stored server-side. For protected API routes, `auth-middleware` validates the NextAuth token and forwards it to the handler as a JSON-stringified `user` **request** header via `NextResponse.next({ request: { headers } })`. It first **strips any incoming `user` header** so a client can never forge one, and it does **not** set the token on the response (which the handler can't read and which would leak the decoded token to the browser).

**How to read user in an API route:**
```ts
import { extractUser } from "@/app/api/request";
const user = extractUser(request); // { id, email, ... }
```

**Constraints:**
- Do not attempt to read the session via `getServerSession` inside API routes — use `extractUser` instead, which reads the header the middleware sets.
- The `user` header is only forwarded for routes the `auth-middleware` matcher protects (all under `/api/...`). **Server components / layouts are not covered** — the middleware forwards the header to matched API-route requests, not to RSC renders. So page/layout server components that need the user (e.g. the `/mushaf/[grant]` grant guard) must call `getServerSession(authOptions)` directly; `extractUser` is API-routes-only. `session.user` carries the full app `User` row (incl. `id`) via the session callback, but is not type-augmented — read `id` via a cast (`(session.user as { id?: number }).id`). Layout guards should `redirect()`, not `notFound()`, for both the unauthenticated case (→ locale home) and the authorized-but-no-longer case (a revoked/foreign grant → `/{locale}/mushaf?removed=1`, where the hub shows a generic "access removed" banner — never the owner's name, per ADR 0012). Genuine 404s all render the root `app/not-found.tsx` (Next routes every unmatched URL there; a segment `not-found.tsx` only catches an explicit `notFound()` in a *page*, which the app no longer has). That root file must therefore use **theme tokens** (so it's themed against the inline-script theme class, not stark) and **plain `<a>` links** (a `next/link` client-nav from the root-layout 404 into the locale tree can paint before that tree's CSS chunk loads in prod).
- The middleware strips any client-supplied `user` request header before injecting the trusted token, and forwards it via `NextResponse.next({ request: { headers } })` — never `response.headers.set`. A client cannot forge identity, and the token is never echoed to the browser.
- `extractUser` returns `null` (never throws) if the `user` header is missing or malformed — every call site must check for `null` and return `jsonResponse({ code: 401, message: "Unauthorized" })` before using `user.id`. This is a defensive boundary check for a state that shouldn't occur (middleware is expected to always set the header correctly) — see `app/api/quran/pages/[pageId]/marks/route.ts` for the pattern.

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
- `DialogContent` (`components/ui/dialog.tsx`) supports an opt-in `hideDefaultClose` prop (default `false`) to suppress its built-in absolutely-positioned close button, for callers that need to render their own `DialogClose` in-flow (e.g. `MarkModal`, whose header needs the close button vertically centered against a flex sibling rather than absolutely positioned). Default behavior for all other callers (`SignInModal`) is unchanged.
- Every `DialogContent`/`SheetContent` (both wrap the same underlying `@radix-ui/react-dialog` primitive) **must** render a `DialogTitle`/`SheetTitle` — Radix hard-errors without one — and a `DialogDescription`/`SheetDescription` (or explicit `aria-describedby={undefined}` opt-out) to avoid a console warning. If the dialog already has a natural visible heading, promote it to `DialogTitle`/`SheetTitle` directly (its default classes are safely overridden via `cn()`'s `tailwind-merge`); otherwise add both as `sr-only`. See `docs/plans/fix-dialog-missing-description.md` for the fix across `MarkModal`, `SignInModal`, `Sidebar`, `SearchBar`, and `SettingsSidebar`.

---

## Sidebar Loading

**Decision:** The `Sidebar` component is loaded via `next/dynamic` (deferred JS hydration) in `app/[locale]/pages/layout.tsx`. Sidebar data (surahs, rubs) is fetched server-side in that layout.

**Rationale:** Sidebar is non-critical for initial render of the Quran page; deferring it reduces the JS bundle that blocks hydration.

---

## Sidebar Trigger Architecture

**Decision:** `Nav` (global, `app/[locale]/layout.tsx`) and `Sidebar` (pages-only, `app/[locale]/pages/layout.tsx`) live at different layout levels and cannot share state via props. `SidebarContext` (`app/contexts/SidebarContext.tsx`), provided in the locale layout, bridges them: `Nav` owns the trigger button and calls `setOpen(true)`; `Sidebar`'s `Sheet` is a controlled component reading `open`/`setOpen` from the same context. The trigger is visible at all breakpoints, gated only by `pathname.includes("/pages/")` (trailing slash required — a bare `"/pages"` substring match false-positives on any route containing that string, e.g. a hypothetical `/pages-list`).

**Rationale:** Replaces an earlier design where `Sidebar` rendered its own always-visible floating-pill `SheetTrigger`.

**Constraints:**
- Do not add a second/duplicate trigger — one trigger, in `Nav`, on pages routes only.
- If relocating or removing this trigger in future work, verify every breakpoint retains equivalent access before assuming "unchanged" — an earlier revision of this pattern silently removed desktop's only way to open the sidebar by adding `md:hidden` to the replacement trigger without noticing the original floating pill had no such guard. See `docs/plans/mobile-nav-ux.md` (Addendum 3) for the incident.

---

## Surah Banner Placement — DEFERRED (not implemented)

**Current state:** Surah names render **inline at the surah's first verse** (`app/components/QuranLine.tsx`, `shouldRenderSurahHeader = verseNumber === 1 && wordNumber === 1`) — glyph + bismillah, no frame. This is always positionally correct (the name appears where the surah actually starts) but is **not** the printed madani layout, which places a surah-name banner at the end of the previous surah's last page and starts the next page with the bismillah only.

**Why deferred:** Two prior approaches were abandoned. (1) The [ADR 0016](adr/0016-surah-banner-position-denormalized-fields.md) plan to store `start_banner_surah_id` / `end_banner_surah_id` / `bismillah_only_surah_id` on `PageMetadata` was never seeded (those columns are **not** in `prisma/quran/schema.prisma`). (2) A later algorithmic derivation in `QuranSafha` (start/end banner from a `wordLineCount === 15` line-count heuristic) shipped briefly, produced wrong banners on mid-page and multi-surah pages, and was **reverted** — the code is gone.

**When picked up (Trello #72):** each `Word` already carries its true `line_number` (1–15), and `getPageWords` groups by it, so the **gaps** between occupied line numbers are exactly where surah-name / bismillah lines sit (including mid-page) — position-accurate placement is derivable with no schema change; or ingest the canonical QPC per-line `line_type` (`ayah`/`surah_name`/`basmallah`) via the seeder. Banner elements, when reintroduced, must be direct children of `.fq-quran-safha` (the flex container) so the mobile/desktop `space-between` counts them as real line slots. See `docs/plans/fix-surah-banner-placement.md` Addendum 2. ADR 0016 is superseded.

---

## PageMetadata

**Decision:** Per-page structural info (surah_id, juz_number, hizb_number, hizb_position) is stored in the `PageMetadata` DB table and fetched at page-generation time. Not computed at runtime.

**`hizb_position` values:** `null` (no new rub starts on this page), `"hizb"`, `"hizb-quarter"`, `"hizb-half"`, `"hizb-three-quarters"`.

---

## Search

**Decision:** `/api/search/verses` and `/api/search/chapters` cap results to `take: 10` with a deterministic `orderBy: { id: 'asc' }`, and both the client (`useSearch`, `SearchBar`) and the API routes themselves require the trimmed query to be 2+ characters before searching (`app/constants/search.ts`'s `isSearchQueryValid`).

**Rationale:** The verse search eager-loads each matching verse's full `Word[]` array; without a cap, a common search term could return a very large payload whose render blocks the main thread right as the (500ms-debounced) result lands — felt as input lag, not a debounce bug. The min-length gate must be enforced server-side too, not just client-side, so a direct API call can't bypass it. See `docs/plans/fix-search-debounce-lag.md`.

**Constraints:**
- Any new search endpoint added later should follow the same cap + min-length pattern, using `isSearchQueryValid` from `app/constants/search.ts` rather than re-deriving the threshold.
- Do not remove the `take`/`orderBy` pair or the query-length gate as a "cleanup" — they are load-bearing for perceived typing responsiveness, not arbitrary.
- `take: 10` is a UI-payload cap, not a hard ceiling on search capability — a "see all results" affordance to escape it is a known, deliberately deferred future addition (not yet built).

**Arabic query normalization:** `Verse.text_imlaei_simple` is sourced from the upstream `qdc` API and is confirmed hamza-free across the entire table — it never contains `أ`/`إ`/`آ`, only bare `ا`. Verse search normalizes the incoming query (hamza-alif variants → bare alif) before the Prisma `contains` match; the column itself is never touched. See [ADR 0007](adr/0007-arabic-search-query-normalization.md).

**Constraints:**
- `Chapter.name_arabic` is real Arabic text and is **not** hamza-free (e.g. `الأنعام`) — the query-only normalization used for verse search does not apply to chapter search. This is an accepted characteristic, not a defect: chapter names are a small (114), low-cardinality list users can select visually rather than type from memory. Do not assume chapter search shares verse search's normalization behavior.
- Do not extend query-only normalization to any column that isn't verified hamza-free; check the actual DB data first (see ADR 0007 Option A vs B).

---

## Theme Architecture

**Decision:** Named CSS palette classes (`.theme-light`, `.theme-dark`, etc.) on `<html>` define the full shadcn token set per theme. The `.dark` class is applied separately alongside the palette class to activate Tailwind's `dark:` utilities — so switching to dark mode means applying both `.theme-dark` and `.dark`. See [ADR 0003](adr/0003-multi-theme-architecture.md).

**Constraints:**
- Always apply `.dark` together with any dark-variant theme class; never apply one without the other.
- The flash-prevention `<script>` in `layout.tsx` must mirror the class logic in `useTheme` — they share responsibility but cannot share code at runtime.
- `globals.css` must use `.theme-light` / `.theme-dark` selectors, not `:root` / `.dark`, for token definitions.
- No hardcoded color values anywhere outside theme class blocks in `globals.css`.

---

## Quran Safha Viewport Fit

**Decision:** All vertical rhythm in `QuranSafha`/`QuranLine` below the site nav (wrapper padding, card padding, header/footer band gaps, per-line gap, surah-heading block) is derived from the same `vh`-based `FONT_V1` scale that drives word font-size, exposed as CSS custom properties on the `QuranSafha` root. Reading font size itself is never shrunk to make pages fit. See [ADR 0004](adr/0004-quran-safha-viewport-fit.md).

**Constraints:**
- Never reduce `FONT_V1.baseScaleViewHeight` (or the per-scale multiplier) as a fix for overflow — that's the reading text size, off-limits for this concern.
- Any new fixed-`px`/`rem` vertical spacing added to `QuranSafha`/`QuranLine` reintroduces the overflow bug — new spacing must be `vh`-derived from `FONT_V1`, consistent with the existing CSS custom properties.
- The 15-slot budget (13 normal lines + 1 two-slot heading, or 15 normal lines) is calibrated to fit at the default font scale (`quranFontScale` = 1) down to ~700px viewport height. Higher font scales are expected to scroll — that's out of scope.
- The site nav bar's fixed 56px height is the one accepted fixed-px term in the budget; do not attempt to compensate for it inside `QuranSafha` — if it ever needs to change, recalibrate the budget in ADR 0004.
- Word font-size, per-line gap, and the surah-heading block all have a minimum px floor (`FONT_V1.minFontSizePx = 24`, applied via CSS `max()`) so they never shrink below a readable size on very short viewports (e.g. DevTools docked open). Below the viewport height where this floor kicks in, a few px of scroll may reappear — accepted, per [ADR 0006](adr/0006-quran-font-size-minimum-floor.md). Any change to `minFontSizePx` requires the same `tailwindFontUtility` safelist regeneration as `baseScaleViewHeight` changes (ADR 0005).
- **Desktop spread (md+):** The two facing pages are made **equal height by content, not by a fixed viewport height.** They share one flex parent (`.fq-spread`, `align-items: stretch`), so the shorter page stretches to match the **taller** one — adaptive to any font scale, and short opening pages (Al-Fatiha) are not forced to full screen height. Mechanism: the ReaderPage background is `min-h-[calc(100dvh-3.5rem)]` (a floor, **not** a fixed `h-*`) with `md:justify-center` so a short spread centers and a tall one can grow/scroll. `.fq-spread`'s `items-stretch` equalizes the two page-wrapper divs — those wrappers must **not** carry an explicit height (`md:h-full`), because a flex item with an explicit height is not stretched and `100%` resolves to `auto` against the content-height parent (this collapses the shorter page). Below each stretched wrapper, `h-full` propagates through `fq-full-safha` → relative wrapper → card → `fq-content` (a stretched flex item has a definite cross-size, so these `%` heights resolve). Inside `fq-content`, header/footer are `shrink-0` and `fq-quran-safha` is `flex-1`; a `.fq-spread .fq-quran-safha` CSS block (at `md:`) mirrors the mobile `space-between` layout with `margin-bottom: 0 !important` on direct children, so lines distribute evenly within the stretched height. **Standalone `QuranSafha` (VerticalQuranPages) is NOT affected** — all rules are scoped to `.fq-spread`. (An earlier attempt pinned a fixed `h-[calc(100dvh-3.5rem)]` and pushed `h-full` top-down; it broke on font-scale changes and stretched opening pages — superseded. See `docs/plans/fix-surah-banner-placement.md` Addendum 2.)
- On mobile (below `md`), the Safha card fills the full viewport and is sized by **two facts, no budget formula** (see [ADR 0011](adr/0011-mobile-quran-font-scale-vw-formula.md)). (1) **Font size comes from width:** `calc((100vw - <padding>) / 14.7)`, where the worst-case line-width/font-size ratio across all 604 pages is `14.42` (measured 14.13–14.42; page 580 is worst) and the `14.7` divisor leaves ~2% margin so cross-device rendering variance can't push a line past the width. (2) **Leftover height is distributed by flexbox:** the lines live in a full-height flex column with `justify-content: space-between`, so the browser turns remaining vertical space into even inter-line gaps — filling the page like a native mushaf with no `dvh`/chrome accounting, no `22.089` slot budget, and no per-font line-height constant. Two backstops make this robust: mobile rows are `flex-wrap: nowrap` with `flex-shrink: 0` words so a hair of overflow clips invisibly (card is `overflow-hidden`) instead of wrapping a word to a new row; and the text column has `padding-block: 0.5em` for breathing room above/below the header and footer. Short opening pages (1–2) center as a block (`fq-safha-center`) instead of stretching. The only calibrated number is `14.7`; revisit it only if a future page font's justified width ratio exceeds its margin. Font size tracks screen width (wider phone → larger text) and is not user-adjustable on mobile; font scale controls stay hidden in the Settings sheet on mobile. The formula is capped at 28px (the value it produces at ~430px, the widest common phone width) so tablet-width portrait viewports — still under the 768px `md` breakpoint, e.g. an 11.5" tablet at ~720px CSS width — don't render an oversized, uncapped font; above the cap, lines no longer touch both card edges, which is accepted, and `.fq-quran-safha` uses `align-items: center` (rather than the default `stretch`) so those narrower capped lines center instead of hugging the RTL start edge. The page wrapper around the card (`page.tsx`) and the card itself must use the same viewport unit — `dvh`, not `vh` — for any full-viewport height/min-height; mixing them (wrapper on `vh`, card on `dvh`) makes the wrapper demand the largest-possible viewport height while the card tracks the actual visible one, producing a vertical scrollbar on real devices with a collapsible toolbar (invisible in Chrome DevTools' device emulation, which doesn't simulate that dynamic chrome).

---

## Shared Mushaf Access

**Decision:** A user can view and edit another user's mushaf marks. Access is granted by redeeming a **one-time share code** the owner generates (the code *is* the consent — no approval step, no directory/user-search). Redeeming a code creates a persistent `MushafAccessGrant` (`owner_user` → `viewer_user`) and marks the code spent. The viewer opens the mushaf at the dedicated route `/[locale]/mushaf/[grant]/pages/[id]` (`[grant]` = the grant's random id) and reads/writes marks via `/api/mushaf/[grantId]/pages/[pageId]/marks`. See [ADR 0012](adr/0012-shared-mushaf-access.md).

**Constraints:**
- New models (`MushafAccessGrant`, `MushafShareCode`) live in `furqan_app` only and reference users by scalar `Int` id (no Prisma relations), matching `Mark` and preserving ADR 0008's no-cross-domain-FK invariant.
- No change to `Mark`: the unique key stays `[marked_type, marked_id, mark_type, to_user]` (one mark per spot per mushaf, **last author wins**). Grant-scoped writes set `to_user = grant.owner_user`, `from_user = authenticated user`.
- The grant id in the URL is **not** a capability — every grant-scoped endpoint (marks GET/POST/DELETE and the `/mushaf/[grant]` page/layout) must re-verify `grant.viewer_user === extractUser(request).id` server-side. A random grant id mitigates enumeration but does not replace this check.
- Marks responses now include `from_user` and the author's display name so any viewer can see who made each mark. Author is surfaced in `MarkModal`. `getColorMark`/existing consumers must stay backward-compatible (fields added, none removed).
- Add `/api/mushaf/[0-9a-z]+/pages/[0-9]+/marks` to the `auth-middleware` `protectedRoutes` matcher — new protected routes require the same middleware coverage as the self marks route (see Middleware Chain).
- The `/mushaf/[grant]/...` reader reuses the self-reader components but must thread a **base path** (`/${locale}/mushaf/${grant}/pages` vs `/${locale}/pages`) through page-navigation links (arrows, `QuranSwipeNav`, `Sidebar`), or navigation silently falls back to the viewer's own mushaf. Revocation is owner-driven and immediate.
- **Implementation:** the self and grant readers share one server component, `app/components/reader/ReaderPage.tsx` (params `basePath` + optional `grantId`) — the self `pages/[id]/page.tsx` keeps `generateStaticParams`; the grant `mushaf/[grant]/pages/[id]/page.tsx` omits it (dynamic). Sidebar/search links (`SurahListItem`, `RubList`, `SearchQueryResults`) derive the prefix at render time from `useReaderBasePath()` (reads the locale-less pathname) rather than prop-threading — this is why they stay grant-aware even though `SearchBar` lives in the global nav above the grant layout. Don't reintroduce hardcoded `/pages/...` hrefs in those components.

---

## Mushaf Double-Page Spread

**Decision:** Users can toggle between single-page and double-page (facing-spread) mushaf view, `lg` (1024px+) and up only — below `lg`, including all of mobile, the layout is forced single-page. Pages pair up in fixed pairs `(1,2), (3,4), (5,6)…(603,604)` (302 complete pairs, no singleton); `getPagePair(n)` derives a pair from either member. `/pages/[id]` keeps its existing route shape — either id of a pair renders that same pair. `ReaderPage` always fetches **both** pair members' words server-side at build time, regardless of the client-side view toggle; the toggle only shows/hides the second `QuranSafha` via CSS, so switching is instant with no extra request. The two fetches run **sequentially, not via `Promise.all`** — each `getPageWords` already issues 2 concurrent queries, so fetching both pair members concurrently would peak at 4 connections per static-generation worker and can exceed the dev DB's `max_connections` during a full 604-page build. See [ADR 0013](adr/0013-mushaf-double-page-spread.md).

**Constraints:**
- View preference persists in `localStorage` (`quranSafhaView`, via `QuranSafhaViewContext`, mirroring `QuranFontScaleContext`) — default `"double"`.
- The single-vs-double **display** is gated by CSS, not JS: a pre-paint inline script (`app/layout.tsx`, alongside the theme flash-preventer) sets `html[data-safha-view]` from `localStorage` before first paint, and CSS (`:root[data-safha-view="double"] .fq-spread …` at `@media(min-width:1024px)`) shows the second card / applies the width cap / drops the compensate margin. This is correct at first paint even on slow connections (no `matchMedia` in the display path). `useIsLgUp` survives only to choose the nav-arrow href. `setView` updates the attribute for live toggling. See ADR 0013 Addendum 4.
- In single-page mode (including forced-single below `lg`), prev/next steps by one page (`pageId ± 1`, unchanged from before this feature). In double-page mode, prev/next steps by a whole pair (`± 2`), anchored to the odd (right-hand) id of the neighboring pair.
- Both pair members' `@font-face` blocks are always inlined, but only the current page's font gets `<link rel="preload">` — the pair partner's font is not preloaded, so it isn't fetched at all unless that card is actually rendered (relies on browsers not fetching fonts for `display:none` content).
- The prior corner-star/rounded-border decoration (`quran-page-mushaf-design.md`) was replaced, and after iteration the ornamental frame was removed **entirely** (no SVG border, medallions, or diamond markers). The card is now a plain `bg-card` surface with its `md:`-only shadow, plus 2 small offset stacked "pages underneath" layers (`bg-card dark:bg-muted`, `border-muted-foreground/30`) that peek toward each card's outer edge via `stackPeekSide` and double as a left/right-page indicator. All theme-token driven, no hardcoded colors. Renders at `md:`+ regardless of single/double mode; only the second card and the pair-step nav are gated at `lg`.
- **Double-view width fit:** in single-page view the card is sized purely by the `vh`-driven font (ADR 0004), so its width tracks viewport *height* (~14.42× the font size, per ADR 0011's justified-line ratio). Two such cards can overflow the viewport width at some `lg` sizes. In **double** view only, the word font is therefore capped by a from-width budget — `min(vh-font, per-half-width budget)`, the same width-driven technique as ADR 0011's mobile formula — so both facing pages always fit and shrink together on narrower `lg` screens. Single-page reading size is never touched (ADR 0004 holds). This is a deliberate, double-view-only exception to "reading size is height-controlled."
- Do not add a new URL scheme for pairs (no `/pages/2-3`) — the existing per-page route shape is load-bearing for `generateStaticParams` and every other basePath-deriving consumer (sidebar/search links, grant reader).
- Applies to both the self reader (`/pages/[id]`) and the shared-access grant reader (`/mushaf/[grant]/pages/[id]`) — `ReaderPage` is shared between them.

---

## PWA & Offline Quran Page Caching

**Decision:** The app is installable (web app manifest + icons, generated via Next's `app/manifest.ts` convention) via Serwist. When running as the **installed PWA** (`display-mode: standalone`), a service worker pre-caches all 604 Quran pages for the current locale, plus their per-page fonts, in the background — resuming on later app launches if a previous attempt was interrupted. Regular (non-installed) browser visits never trigger this pre-cache. Marks stay **online-only**: the mark UI is disabled with an inline notice when offline, rather than queuing writes. See [ADR 0014](adr/0014-pwa-offline-architecture.md).

**Constraints:**
- Never unconditionally pre-cache page fonts for regular web visitors — this would reintroduce the exact problem the per-page font-inlining architecture (Font System decision, above) was built to avoid. The `display-mode: standalone` gate is load-bearing.
- Do not add offline write-queueing for marks without re-opening ADR 0014 — the shared-mushaf last-author-wins model (ADR 0012) makes queued offline writes a silent data-loss risk against concurrent viewers.
- The pre-cached page/font cache is versioned independently of Serwist's per-deploy build-asset revisioning. Only bump the page-cache version manually when a change actually affects cached page output (reader markup, font logic) — bumping it on every deploy would force ~92MB re-downloads for every installed user on every deploy.
- Pre-cache only the current locale's 604 pages, not both `ar`/`en` — fonts are locale-independent and cached once regardless; only the thin page shell differs per locale.
- iOS Safari's Cache Storage quota/eviction behavior for installed web apps is stricter and less predictable than Chrome/Android; a ~92MB cache may be partially evicted there. This is an accepted platform limitation — the only mitigation is the existing "resume incomplete cache on next launch" behavior, not a guarantee of full offline coverage on iOS.
- The manual `pages-v{N}` version constant lives in `app/sw.ts` (`PAGES_CACHE_VERSION`) — bump it there when reader markup/font logic changes.
- Serwist is disabled in development (`disable: process.env.NODE_ENV === "development"` in `next.config.mjs`) — `npm run dev` never registers a service worker. To test install/offline behavior, use `npm run build && npm start`.

---

## Release & Deployment Workflow

**Decision:** Prod deploys go through a required `release/x.y.z` stabilization branch, not directly from `main`. See [ADR 0015](adr/0015-release-branch-workflow.md).

```
main → /cut-release → release/x.y.z → (local testing) → /promote-release → prod → /sync-main-from-prod → main
```

- `/cut-release <major|minor|patch>` — branches `release/x.y.z` off `main`, bumps `package.json` version + tags `vX.Y.Z`, labels every card in **"To Be Released"** with the version and moves them to **Done**, then creates a GitHub Release whose notes are built from those same cards (title + URL) — not `--generate-notes`, since Trello is the curated "what's included" source, not raw commit/PR history.
- `/promote-release <version>` — opens the PR `release/x.y.z` → `prod`. Hostinger auto-deploys on any push to `prod`, so merging the PR is sufficient — no manual hPanel redeploy click needed.
- `/sync-main-from-prod` — opens the PR `prod` → `main` afterward, to capture any fixes made on the release branch back into `main`.
- `/release <major|minor|patch>` — orchestrator that runs the above three in one continuous flow, pausing only at genuine human checkpoints (confirm local testing passed, confirm the prod PR merged, confirm the Hostinger redeploy was clicked). Verifies PR merges via `gh pr view` rather than trusting the user's word where that's possible.

**Constraints:**
- `protect-prod.yml` only accepts PRs into `prod` whose source branch starts with `release/` — direct `main → prod` PRs are no longer permitted, including for hotfixes (cut a release branch for those too).
- Testing happens locally (`npm run build && npm start` against the release branch) — there is no staging deployment. Hostinger hosts prod only.
- Cards move into "To Be Released" manually when their PR merges to `main`; `/cut-release` is what stamps the version label and moves them to `Done`, not the merge itself.
- Do not skip `/sync-main-from-prod` after a release — without it, fixes made directly on a release branch during stabilization silently disappear from `main`'s history.
- `/release` must not skip its checkpoints — only local testing lacks a programmatic check and must be taken on the user's word; PR merges must always be verified via `gh`, never assumed.

---

## Error Tracking

**Decision:** Sentry (`@sentry/nextjs`) captures production errors only — no performance tracing (`tracesSampleRate: 0`), no session replay. Gating is by DSN presence, not `NODE_ENV`: `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN })` runs unconditionally in `sentry.client.config.ts`/`sentry.server.config.ts`/`sentry.edge.config.ts`, and the SDK no-ops when the DSN is unset. The var is left empty in `.env.local`/`.env.example` and set only in Hostinger's build/runtime env panel, so dev and local builds stay silent by default. Server/Route Handler/Server Component errors are captured automatically via `instrumentation.ts`'s `onRequestError = Sentry.captureRequestError` hook — no per-route code changes. Client render errors are captured via `app/[locale]/error.tsx` (nested inside the locale layout, so `Nav`/`NextIntlClientProvider`/theme stay mounted — not bare `app/error.tsx`, which would sit outside them) and `app/global-error.tsx` (root-layout-crashing last resort; replaces `app/layout.tsx` entirely, so it uses plain inline-safe CSS instead of theme tokens, since the theme flash-prevention script never runs there). Both call `Sentry.captureException` before rendering their fallback. See [ADR 0017](adr/0017-sentry-error-tracking.md).

**Constraints:**
- Do not add `NODE_ENV` branching around `Sentry.init()` — DSN presence is the only gate; keeping it that way means dev/prod behavior is controlled entirely by which env file sets the var, with no code to keep in sync.
- Never commit a real `NEXT_PUBLIC_SENTRY_DSN` to `.env.production` or `.env.example` — both are checked in; only Hostinger's panel should hold the real value.
- `experimental.instrumentationHook: true` in `next.config.mjs` is required for `instrumentation.ts` to run on Next.js 14.2.15 (pre-15). Do not remove it without first confirming the installed Next major version makes it a no-op.
- `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` are build-time-only, read inside `next.config.mjs`'s `withSentryConfig` call for source-map upload — never expose them as `NEXT_PUBLIC_*` or reference them from client code.
- If performance tracing or session replay is added later, revisit ADR 0017 rather than silently bumping `tracesSampleRate` or adding `replayIntegration()` — both were deliberately scoped out (cost, and replay's privacy surface against the sign-in/marks flows).

---

## Swipe Animation — Core Gesture Only

**Decision:** `QuranSwipeNav` is a single-slot wrapper: one `overflow-hidden` outer div with a `stripRef` inner div that holds only the current page content. On drag it translates `stripRef` live. On commit (≥80px threshold) it animates to `translateX(±100%)` over 220ms then calls `router.push(href)`. On sub-threshold release it snaps back. `prefers-reduced-motion` skips the animation and calls `router.push()` directly. No adjacent page prefetching, no `startTransition`, no `router.prefetch()`. A post-navigation flicker (browser compositor artifact) is accepted as a platform limitation; the View Transitions API would address it but requires Safari 18+ and experimental Next.js support — out of scope. ADR 0019 (the original sessionStorage approach) and the three-page strip approach (Addenda 2–8) are both superseded. See Addendum 9.

**Constraints:**
- Swipe right = next page, swipe left = previous page (Quran RTL convention — constant regardless of UI locale).
- Do not add adjacent page fetches back — investigated in Addenda 2–8, confirmed zero benefit for the flicker, removed in Addendum 9.
- Do not add a positional/transform entry animation on mount — a transform-based entry reads as a second swipe (Addendum 4/5 incident).
- Do not add `startTransition` — Next.js App Router already wraps its router dispatch in `startTransition` internally; double-wrapping is a no-op (confirmed in Addendum 8/9).
- Do not use `sessionStorage` or `document.documentElement` attributes as fade-signal carriers — these mechanisms are superseded.

---

## Sentry-to-Slack Alerting

**Decision:** Sentry's native Slack alert-rule action requires a paid (Team+) plan; the app is on the free Developer plan. Instead, a self-hosted relay endpoint (`app/api/webhooks/sentry/route.ts`) receives Sentry's Internal Integration webhook for triggered alert-rule events, verifies its signature, and forwards a formatted message to a Slack Incoming Webhook. See [ADR 0018](adr/0018-sentry-slack-relay-webhook.md).

**Constraints:**
- Only the `event_alert` resource is relayed to Slack; other `sentry-hook-resource` values (e.g. `installation`) are acknowledged with `200` and dropped, not forwarded or rejected.
- The route must verify `sentry-hook-signature` (HMAC-SHA256 of the raw body using `SENTRY_WEBHOOK_SECRET`) before doing anything else — this is a public, unauthenticated-by-user endpoint.
- A failed Slack post must `throw`, not be swallowed — it needs to propagate to `instrumentation.ts`'s `onRequestError` (ADR 0017) so it's captured by Sentry itself and shows as a failed delivery in Sentry's own integration dashboard.
- `SENTRY_WEBHOOK_SECRET` and `SLACK_WEBHOOK_URL` are Hostinger-panel-only env vars, never committed with real values, mirroring the pattern from the Error Tracking decision above.
- If the org ever upgrades to Sentry Team+, this relay can be retired in favor of Sentry's native Slack action — revisit ADR 0018 rather than running both in parallel.

---

## Structured Logging (fq-logger)

**Decision:** `lib/fq-logger/` wraps `pino` for structured, leveled, request-correlated server-side logs (stdout only — JSON in prod, `pino-pretty` in dev; no hosted log vendor). It has two separate entry points rather than one runtime-branching module: `@/lib/fq-logger` (Node — API routes, Server Actions, NextAuth callbacks) and `@/lib/fq-logger/edge` (Edge — `middleware.ts`/`auth-middleware.ts`), both exposing the identical 6-level API (`trace/debug/info/warn/error/fatal` + `.child()`). `logger.error()` both emits the structured log line and calls `Sentry.captureException`, amending [ADR 0017](adr/0017-sentry-error-tracking.md)'s "Sentry = exceptions only" scope — see [ADR 0019](adr/0019-fq-logger-sentry-integration.md). A generated `x-request-id` is set by a `withRequestId` middleware wrapper (first in `middleware.ts`'s pipe) and forwarded on request headers the same way `auth-middleware.ts` already forwards the `user` header; Node call sites obtain a request-scoped child logger via `getLogger()` (reads the header via `next/headers`). A fixed key list (`email`, `password`, `token`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `secret`) is redacted before either the log line or the Sentry `extra` payload is emitted.

**Constraints:**
- Client-side code (e.g. `app/utils/storage.ts`'s `console.warn` calls) is out of scope — fq-logger is server-only; do not import it from client components. This also covers `app/server/actions/**` — despite the directory name, those files have no `"use server"` directive, call `fetch()` with relative paths, and are invoked from `useQuery` hooks in client components, so they run in the browser, not on the server.
- Never import `@/lib/fq-logger` (the Node/pino entry) from an Edge-runtime file (`middleware.ts`, `auth-middleware.ts`, anything reachable from them) — it statically imports `pino`, which needs `worker_threads`/`fs` and isn't available in the Edge bundle. Edge files import `@/lib/fq-logger/edge` instead.
- Do not pass `pino-pretty` via pino's `transport` option — that spawns a worker thread that resolves the target module from disk, which fails inside Next's webpack-bundled Route Handlers (`unable to determine transport target for "pino-pretty"`). `lib/fq-logger/node.ts` instead passes a `PinoPretty(...)` stream directly as pino's second constructor argument, which works bundled.
- Reserve `.error()` for true dead-ends — an error caught and NOT rethrown. Anywhere an error is caught only to rethrow, or is left to propagate to `instrumentation.ts`'s `onRequestError` (which already reports it to Sentry per ADR 0017), do not also call `.error()` on it — that double-reports the same failure to Sentry. Use `.warn()` there instead (log line only, no Sentry call). This also means every `.error()` call consumes Sentry's free-tier event quota (ADR 0018's context) beyond just uncaught exceptions, so it should stay reserved for genuine, non-propagating failures.
- Any new sensitive field logged anywhere (auth, sessions, mushaf codes) must be added to `lib/fq-logger/redact.ts`'s key list, not redacted ad hoc at the call site. `redact()` special-cases `Error` instances (extracting `name`/`message`/`stack`) since `Object.entries()` on an `Error` returns nothing — its properties are non-enumerable.
- Do not call `getLogger()` outside a request context (e.g. build-time scripts) — it depends on `headers()`, which throws outside Server Components/Actions/Route Handlers.

---

## Visual E2E Testing

**Decision:** Playwright (`@playwright/test`) drives visual regression tests against a committed, **full-dataset** fixture database (all 604 pages) — not a trimmed slice. This is required, not optional: `app/[locale]/pages/[id]/page.tsx`'s `generateStaticParams` hardcodes all 604 page ids, so `next build` always statically generates every page regardless of which ones the tests visit; a trimmed fixture would crash the build on every page outside the trim. A fixture-generation script (`scripts/e2e-fixture/generate.js`, reusing the seeder's fetch/derive modules) produces one committed SQL dump (`e2e/fixtures/quran-fixture.sql`) with all 114 `chapters` + all 604 pages' `verses`/`words`/`page_metadata`/`rubs`/`rub_verse_mappings`. CI (GitHub Actions) and local baseline regeneration both load this file into a **dedicated, disposable** MySQL setup (`compose.e2e.yml` locally — separate ports/volumes from dev's `compose.yml`; GitHub Actions service containers in CI), then `next build && next start` against it. Five fixed screens are screenshotted across `{ar, en} × {light, dark}` (home/surah-list, Quran page 1, Quran pages 2–3 double-spread, search results, settings sheet), with a mobile viewport added for 4 of the 5 (the double-spread is desktop/`lg`-only by design) — 36 baseline PNGs total. See [ADR 0022](adr/0022-visual-e2e-testing.md).

**Constraints:**
- Never point `e2e:setup` (or `compose.e2e.yml`) at the dev databases in `compose.yml` — it force-resets both schemas on every run. The e2e DBs are separate containers/ports (`quran-db-e2e` 3309, `app-db-e2e` 3310) specifically so this is never destructive to real dev data.
- `app-db` gets its Prisma schema pushed but no seed rows for these tests — none of the five screens require authentication; do not add auth-gated screens to this suite without also adding seed data and re-opening this decision.
- A visual diff fails the GitHub Actions check but is not added to `protect-prod.yml`'s hard source-branch rule — it's a soft-blocking check like any other, not a merge-gate rule.
- Baselines are only ever regenerated via the `workflow_dispatch` CI job (`playwright test --update-snapshots` run inside CI) — never by committing locally-generated PNGs, which would reintroduce font-rendering/anti-aliasing drift between a developer's machine and CI. Because the target branch (e.g. `main`) enforces a PR-required repository ruleset, the job cannot push its commit directly to it: it pushes to a uniquely-named `update-baselines/<target>-<run_id>` branch instead and opens a PR into the target branch, which is then merged like any other PR (never auto-merged by the workflow itself).
- If the Quran schema (ADR 0009) changes, `scripts/e2e-fixture/generate.js` must be re-run and `e2e/fixtures/quran-fixture.sql` regenerated — it is a full derivative of the same seeder logic, not an independent source of truth. Regenerating re-fetches all 604 pages from QDC (slow, one-time), not part of any CI run.
- Screenshot coverage (which pages get *screenshotted*) is intentionally limited to pages 1–3 even though the fixture *data* now covers all 604 — do not assume this suite catches rendering bugs on other pages (multi-surah pages, page-metadata edge cases, etc.). Expanding screenshot coverage is a deliberate future addition.

---

## Documentation & Workflow System

**Decision:** AI-first docs system adopted 2026-06-28. CLAUDE.md is a slim pointer file. Heavy context lives in `docs/`. Skills load context on demand:
- `/plan-fq-task` — Socratic planning → `docs/plans/<slug>.md`
- `/start-fq-task` — load context → implement
- `/retrospect` — end-of-session feedback loop; proposes DECISIONS.md updates, skill edits, memory saves review-before-write; saves `docs/retrospectives/YYYY-MM-DD.md`
- `/review-fq-work` — Opus subagent quality gate on branch diff vs main (bugs, quality, plan consistency)

Decisions are tracked in this file; ADR history is in `docs/architecture/adr/`.

**Constraints:**
- Never put architecture detail, standards, or decisions back into CLAUDE.md.
- Always update this file in the same commit as any new ADR.
- Use `docs/architecture/adr/TEMPLATE.md` when creating a new ADR. A valid ADR must name alternatives and record trade-offs — if there are no alternatives, write a standards doc instead.

---

## Verse/Word Comments

> **SUPERSEDED by [ADR 0025](adr/0025-mark-is-category-plus-comment.md) / "A Mark Is a Category Plus an Optional Comment" below.** Comments are no longer an independent `mark_type: "note"` row — they are an optional `comment` column on the single mark row. The `dir="auto"` free-text rules below still apply.

**Decision:** Comments are a new `Mark.mark_type: "note"` value, not a new model — `mark_value` is widened from `VARCHAR(191)` to `@db.Text` to hold free text. See [ADR 0022](adr/0022-verse-word-comments-as-mark-type.md).

**Constraints:**
- The generic `upsertMark`/`deleteMark`/marks API routes/`getPageMarks`/`useMarks` require no changes — they already parameterize over `mark_type`.
- A word/verse can carry an independent `"color"` mark and `"note"` mark simultaneously (separate rows under the same unique key shape), each with its own author. Any UI showing "Marked by X" attribution must read it **per `mark_type`**, never once for the whole word/verse — `MarkModal`'s Bookmarks and Notes tabs each show their own author independently, since a shared-mushaf color and note on the same spot can come from different people.
- A verse-level note (added via the end-of-verse marker, same trigger as verse color marks) reuses the existing mechanism where `marks[verse_key]` is spread onto every word in that verse (`QuranLine`) — no separate code path for "note belongs to a verse vs a word."
- No hover tooltip — the reader shows only a `border-b-2 border-dotted border-primary` indicator on any word carrying a note; reading/editing the comment happens in `MarkModal`'s Notes tab (same click/tap that already opens the modal for color marks).
- `/api/marks` (My Marks page) fetches both `"color"` and `"note"` mark types; `MyMarksList` buckets by `mark_type`, not by color key alone — a word/verse with both a color and a note appears once in its color tab and once in the new Notes tab, since they are independent `Mark` rows.
- Comment text (the Notes tab `<Textarea>`, the My Marks comment preview) uses `dir="auto"`, not the locale-locked `dir={getLanguageDirection(locale)}` pattern every other RTL-sensitive element in this codebase uses — free-form user text should render by its own content direction (an `ar`-locale user can write an English note and vice versa). Every other element (UI chrome, Quran text) keeps the existing locale-locked or Quran-text-locked convention; do not spread `dir="auto"` beyond actual free-text user content. Form controls (`input`/`textarea`/`select`) do not reliably inherit `direction` from an ancestor `<html dir>` in this codebase's experience — always set `dir` explicitly on them, never rely on inheritance.
- When a container's `dir="auto"` is meant to auto-detect direction from a specific text-bearing descendant (e.g. the My Marks note box — a flex row with an icon + comment text, where the icon's side should flip with the comment's language), **do not also put `dir="auto"` (or any explicit `dir`) on that descendant.** Per the HTML living standard, an element's `dir="auto"` scan for the first strongly-typed character explicitly **excludes the text of any descendant that has its own `dir` attribute** (that descendant is treated as its own bidi context). Two `dir="auto"` on both container and descendant means the container's scan finds nothing (skips the only text-bearing child) and always resolves to `ltr`, regardless of actual content — confirmed live via `getComputedStyle` (`docs/plans/verse-word-comments.md` Addendum 4). Put `dir="auto"` on exactly one element in the chain — the outermost one whose layout should react to the content — and let plain (non-form-control) descendants inherit the resolved `direction` via normal CSS inheritance.

---

## Color Marks Are Semantic Categories

**Decision:** A mark stores a stable **category key** (`forgetting`, `similar`,
`tashkeel-error`, `tajweed-error`, `linking`, `other`), not a color. The display
color is **derived** from the category via a single `MARK_CATEGORIES` table
(`app/constants/marks.ts`) — color is never persisted. See
[ADR 0024](adr/0024-color-marks-encode-category.md).

> **Amended by [ADR 0025](adr/0025-mark-is-category-plus-comment.md) below:** the
> category is stored in a dedicated `category` column (not `mark_value`), and
> `mark_type` is dropped — a mark is one row (category + optional comment). The
> category → color derivation and the fixed-constant / literal-Tailwind rules
> below are unchanged.

**Constraints:**
- The unique key `[marked_type, marked_id, to_user]` (per ADR 0025) allows one
  category per spot per mushaf (a word/verse is a single classification).
- The category set is a fixed app-side constant, not a DB model/FK — a
  cross-domain FK would break the DB split (ADR 0008). New categories are added
  by extending `MARK_CATEGORIES`.
- Two class sets are keyed by the same category key and must stay in sync:
  the **solid** picker/My-Marks chip classes live in `MARK_CATEGORIES`; the
  **translucent** on-page highlight classes live in `highlight.ts`
  (`HIGHLIGHT_COLORS`, keyed `${categoryKey}-mark`). Both must be **literal**
  Tailwind class strings (never interpolated) so JIT emits them.
- The render path must fall back to **no highlight** for any unrecognized
  `category` — legacy `red`/`blue`/`green` rows are unknown keys. No data
  migration is written (test data is disposable); do not add one.

---

## A Mark Is a Category Plus an Optional Comment

**Decision:** A `Mark` is **one row per spot per mushaf** carrying a required
`category` (VARCHAR, the ADR 0024 key) and an optional `comment` (`String? @db.Text`,
`null` when absent). `mark_type` and `mark_value` are **dropped**; the unique key
is `[marked_type, marked_id, to_user]`. A comment cannot exist without a category
— the `other` category is the comment-only escape hatch. See
[ADR 0025](adr/0025-mark-is-category-plus-comment.md) (supersedes ADR 0022,
amends ADR 0024).

**Constraints:**
- One `from_user` per mark (last-author-wins on a shared mushaf) — the
  per-`mark_type` split authorship of ADR 0022/0012 is gone. "Marked by X" is
  shown once per mark, not per field.
- The modal is a single flow (no Bookmarks/Notes tabs): category picker + a
  comment textarea disabled until a category is selected. Save writes both;
  Remove deletes the whole row.
- Reader page shows the category highlight only — **no on-page comment
  indicator** (the old dotted-underline note cue is removed).
- My Marks buckets by category only; a row renders its `comment` preview inline
  when present. The `dir="auto"` free-text rules (Verse/Word Comments section
  above) still govern the comment textarea and preview.
- Schema reshape via `prisma db push` on disposable data — no migration script.

---

## Recitation Playback

**Decision:** Full-Quran recitation audio, reciter selection, and word-level ("karaoke") highlighting are powered by QDC's audio API, proxied live through new internal routes (`app/api/quran/recitations/...`) rather than seeded into the DB or called directly from the client. QDC serves one audio file **per chapter** (not per page), so a `RecitationContext` mounted once in `app/[locale]/layout.tsx` owns the `<audio>` element and drives page auto-navigation via `router.push` whenever the recited verse's `page_number` falls outside the currently-visible page set (single page, or the pair in double-page view). See [ADR 0021](adr/0021-recitation-playback.md).

**Rationale:** Keeps the Quran DB/seeder untouched (no new schema, no re-seed) while still delivering continuous, page-following playback — reusing `/pages/[id]`'s existing pair-derivation instead of new routing logic. Mounting the context above the reader's route tree is what lets playback survive both page navigation (auto-advance) and leaving the reader entirely (background mini-player).

**Constraints:**
- QDC is now a **runtime** dependency, not just a seed-time one (previously only `scripts/quran-seed/` called it at build time) — if QDC is down, playback breaks, not just re-seeding.
- Word-level highlight updates use a direct DOM ref registry, not React state/re-renders down the `QuranSafha`/`QuranWord` tree — `timeupdate` fires ~4×/second and re-rendering the full word list at that rate is a real perf risk. Do not copy this pattern for lower-frequency UI; the existing URL-param-driven `highlight.ts` approach remains the norm elsewhere.
- Auto-advance always navigates by exact target page number (`router.push(`${basePath}/${versePageNumber}`)`) — never by the locale-flipped `next`/`prev` href logic (`ReaderPage.tsx`'s `getNavigationHref`), which encodes *visual* swipe direction, not reading-order page sequence.
- Manual navigation (arrows/swipe/sidebar) during playback does **not** pause or sync with audio — audio keeps running on its own timeline and may auto-navigate again once the recited verse leaves the manually-viewed page. Do not add logic that pauses playback on manual nav; this was explicitly decided against.
- Chapter-end stops playback (no auto-continue into the next surah) — do not add cross-chapter auto-continue without revisiting this decision.
- Recitation is available on both the self reader (`/pages/[id]`) and the shared-access grant reader (`/mushaf/[grant]/pages/[id]`) — any new recitation UI/context must not assume it's only reachable from the self-reader route tree.
- The QDC integration itself sits behind a `RecitationProvider` adapter (`app/lib/recitation/provider.ts` interface, `qdc-provider.ts` implementation) rather than being inlined in the route handlers — `app/lib/recitation/` is the established location for server-only third-party integrations (distinct from `app/providers/`, which is React context providers, and `app/server/actions/`, which is Next.js server actions). The adapter throws `RecitationProviderError` on fetch failure and returns `null` for "valid response, nothing found" (e.g. no audio for a reciter/chapter) — routes map throw → `502`, `null` → `404`. No provider registry/factory exists; add one only when a second provider is real.

---

## Tajweed Mushaf Mode

**Decision:** An opt-in reading mode color-codes Quran text by Tajweed rule using per-page COLRv1 (color-glyph) fonts — one font file per Mushaf page (`public/fonts/v4/colrv1/ttf/p{n}.ttf`, ~161MB total, committed to git same as the existing non-colored per-page font). No new schema/seed work: the font pairs with the **already-seeded, previously-unused** `Word.code_v2` column. See [ADR 0023](adr/0023-tajweed-mushaf-mode.md) for why `code_v2` — not a new column — is correct.

**Constraints:**
- Font/glyph pairing is mode-gated, not a free choice: `tajweedMode=false` → render `word.code_v1` with font `quran-p{page}`; `tajweedMode=true` → render `word.code_v2` with font `quran-p{page}-tajweed`. Never mix `code_v1` with the tajweed font or `code_v2` with the base font.
- The tajweed `@font-face` (and its `@font-palette-values` block) must only be injected when `tajweedMode` is true, for the page pair actually being viewed — never unconditionally. This keeps the ~9-10x-heavier font (avg 266KB/page vs 28KB/page) out of the load path for users who don't enable the mode.
- `FontFaceInjector` reads `QuranTajweedContext` itself rather than receiving the mode as a prop — `ReaderPage` (its only caller) is an `async` Server Component and cannot call a context hook, and the self reader is statically generated at build time so it has no per-request client preference to thread through anyway. Any future caller must follow the same pattern (read the context inside the client leaf), not prop-drill from a server component.
- The COLRv1 files embed 3 baked-in color palettes at fixed indices — `0` = light, `1` = dark, `2` = sepia/gold — matching Furqan's three themes 1:1. Theme→palette selection is a global CSS rule (`font-palette: --Light/--Dark/--Gold` scoped to `.theme-light`/`.theme-dark`/`.theme-gold`), not per-component logic.
- Tajweed fonts are **excluded** from the PWA offline pre-cache (`app/sw.ts`'s `fontUrl()`/`precacheAllPages()`, per the PWA & Offline decision above) — they load over the network on demand, same as any other opt-in asset. Do not add them to the install-time pre-cache list; doing so would nearly triple the installed-PWA cache size against an already-fragile iOS quota (see PWA decision).
- No Firefox COLRv1 dark-mode fallback (the reference project ships a second full OT-SVG font set + UA-sniffing for this) — accepted as a known v1 limitation, not replicated. Revisit only if it becomes a real user complaint.
- Toggle state (`tajweedMode: boolean`, default `false`) persists in `localStorage`, mirroring the `QuranSafhaViewContext`/`QuranFontScaleContext` pattern — provided globally so both the self reader and the shared-mushaf grant reader, and both single- and double-page view, pick it up automatically with no route-specific wiring.
- The COLRv1 font is a different font design, not a recolored clone of the base font — its glyphs measure ~1.42x taller at the same CSS `font-size` (measured via `fontTools` bounding-box comparison across 20 real word pairs). A single CSS custom property, `--fq-tajweed-scale` (starting at `0.7`), is layered on top of all three existing font-sizing mechanisms (mobile `--fq-mobile-font` ADR 0011, desktop single Tailwind-class-driven, desktop double-view `--fq-dv-word` width cap ADR 0013) via `.fq-tajweed`-scoped override rules in `globals.css` — never by editing `FONT_V1` or either formula directly. See Addendum 1 of `docs/plans/tajweed-mushaf-mode.md`.
- COLRv1 glyphs ignore the CSS `color` property outright — they paint their own baked-in palette colors. Any interactive/hover state on tajweed-mode text must use `background-color` (or `text-shadow`/opacity), never `color`; `QuranWord`'s hover cue branches on `tajweedMode` for exactly this reason (`hover:bg-primary/25` in tajweed mode vs `hover:text-yellow-500` otherwise). Use `--primary`, not `--accent`, for background tints on top of `--card` surfaces (the Quran page card) — `--accent`'s lightness is nearly identical to `--card`'s in all 3 themes (same lightness in dark theme) and is effectively invisible there regardless of opacity; `--accent` is calibrated for hover states over `--background`-level chrome (nav/buttons), not over cards.
- **Resolved: `mushaf=19` is final.** `code_v2` is confirmed mushaf-independent; `line_number` is not (diffing `mushaf=19` vs `mushaf=2` on page 343 showed 23% of words on a different line). Two mushaf-ID candidates were evaluated — `mushaf=19` (matches the font asset naming, and the live quran.com web app's own rendering) and `mushaf=11` (matched the original reference screenshot from the Quran Android app more closely on one boundary check). `mushaf=11` was abandoned: the Android app that produced that screenshot has **no Tajweed rendering code at all** (confirmed via a full-history search of its repo — it only downloads pre-rendered page images), so there is no reachable algorithm to replicate its exact layout. `mushaf=19` is used going forward — see [ADR 0023's Addendum 2](adr/0023-tajweed-mushaf-mode.md) and Addendum 6 of `docs/plans/tajweed-mushaf-mode.md`.
- **Alternative approach explored and rejected:** an alternative, non-font-based rendering technique using QDC's `text_uthmani_tajweed` field (CSS-colored `<rule class=X>` spans over the same standard Uthmani text/line-layout as `code_v1`, instead of a second COLRv1 glyph font) was built and visually evaluated. Rejected: plain Unicode Uthmani text has no per-line kashida calibration at all (unlike `code_v1`/`code_v2`, typeset per mushaf page with kashida baked in), so lines fell visibly short of the container edge regardless of line grouping — a structural data limitation, not a fixable bug. The diagnostic code was removed; the COLRv1/`mushaf=19` approach remains the shipped one. See [ADR 0023's Addendum 3](adr/0023-tajweed-mushaf-mode.md) and Addendum 7 of `docs/plans/tajweed-mushaf-mode.md` for the full record (kept for future reference in case this path is revisited with a real justification algorithm).
- **Implemented and seeded:** production wiring of `mushaf=19` (Addendum 4's deferred schema change) — see [ADR 0023's Addendum 6](adr/0023-tajweed-mushaf-mode.md) and Addendum 10 of `docs/plans/tajweed-mushaf-mode.md`. A new generic `WordMushafLayout` table (`word_id`, `mushaf_id`, `line_number`) is seeded from QDC's `mushaf=19` response; `getPageWords` attaches a `layouts: Record<number, number>` map per word (mushafId → lineNumber, only mushafs with divergent groupings); `QuranSafha` is the only component that re-groups client-side into `activeLines` when `tajweedMode` is true, and its existing surah-banner gap-detection algorithm runs against that grouping unmodified (verified: the gap position is identical between mushaf=2/19 groupings on a real mid-page surah-transition page, even though other words on that page shift lines). QDC has no `line_type`/`is_centered` fields at all (confirmed live) — those stay out of scope here and remain tracked solely under Trello #72. The diagnostic test pages that stood in for this (`app/[locale]/test-tajweed-mushaf/[page]/page.tsx`, `test-tajweed-mushaf-11`) are deleted — superseded by real seeded data.
- **`mushaf=19` and `mushaf=2` disagree on page *boundaries*, not just line groupings within a page** — discovered when the seeder's first run failed: verse 5:77's words sit on `mushaf=2`'s page 121 but `mushaf=19`'s page 120 (same word ids either way). The tajweed-layout seed step (`scripts/quran-seed/tajweed-layout.js`) therefore aggregates `word_id → line_number` **globally** across all 604 of `mushaf=19`'s own pages rather than validating page-by-page — a word only needs to resolve *somewhere* in mushaf=19's pagination, not on the same page number mushaf=2 assigned it. Any future per-mushaf data fetch (e.g. if Trello #72 is picked up later) should assume page boundaries can shift between mushaf editions, not just line breaks within a page.
- **`app/api/quran/pages/[pageId]/route.ts` now calls `getPageWords` instead of re-querying independently.** Discovered during the above: this route (used by the vertical/virtualized reader's `usePage` hook) had its own untracked duplicate of `getPageWords`'s query, predating it. Any future change to `getPageWords`'s shape (this one included) must not assume it's the only place building `{ lines, pageMetadata }` — check this route too, or better, keep it delegating like this rather than reintroducing a second copy.
- **CPAL palette-slot → Tajweed rule mapping (empirically derived):** the COLRv1 font's 16 shared palette slots already encode per-rule coloring at the glyph layer (each word-glyph is built from multiple color-layered sub-glyphs) — recoloring Tajweed to match a different reference palette is therefore a CSS-only `@font-palette-values`/`override-color` change, never a font, schema, or `code_v1`/`code_v2`-alignment change (both fields encode a whole word as one glyph — there is no sub-word granularity to align against `text_uthmani_tajweed`'s per-character rule tags, and none is needed). Slot→rule correlation (e.g. slot 8=`qalaqah`/cyan, slot 5=`madda_normal`/gold, slot 9=`madda_obligatory_*`/red, slot 6=`ikhafa`/`ghunnah`/`iqlab`/green, slot 2=`slnt`/`idgham_wo_ghunnah`/grey) was verified across ~600 words on 13 pages, most at 100% confidence. See [ADR 0023's Addendum 4](adr/0023-tajweed-mushaf-mode.md) and Addendum 8 of `docs/plans/tajweed-mushaf-mode.md` for the full table.
- **Tajweed color + always-edge-to-edge lines is not achievable with current font assets.** Root cause (found via direct `fontTools` inspection): `code_v1`'s font has Apple AAT justification tables (`just`/`morx`/`feat`/`prop`, carrying real kashida-stretch data used by the text engine to self-justify) but zero color capability (no `COLR`/`CPAL` — cannot be recolored by any means); `code_v2`'s Tajweed font has `COLR`/`CPAL` but is missing the AAT justification tables entirely, which is the direct explanation for its 7.7%-CV line-width inconsistency (vs `code_v1`'s 2.7%). No current font asset has both. The reference project (quran.com) has the same gap and uses the same centering work-around Furqan already ships (Addendum 3) — this is an ecosystem-wide asset limitation, not fixable from CSS. The only real path to both properties at once would be constructing a merged font (splicing AAT tables onto COLR/CPAL glyphs) — a real font-engineering effort, not attempted, and a legitimate future option if this becomes a priority. See [ADR 0023's Addendum 5](adr/0023-tajweed-mushaf-mode.md) and Addendum 9 of `docs/plans/tajweed-mushaf-mode.md`.
- Furqan's mushaf lines rely on the per-page font's own glyph kerning (kashida baked into the text/glyph data at specific points, chosen by the original typesetter) to "self-justify" — no `text-align: justify` anywhere. This holds for `code_v1` (measured: 13.9–15.1×font-size across all 604 pages, ~2.7% coefficient of variation) but **not** for `code_v2`/the tajweed COLRv1 font (measured: 5.8–22.7×font-size, ~7.7% CV, ~3x the relative spread) — so many tajweed lines don't naturally reach the container edges. **Do not "fix" this with `justify-content: space-between`** — inserting gaps *between* whole words has nothing to do with where the font's kashida actually is, and visibly shifts every word off its authentic mushaf position (confirmed by direct screenshot comparison; tried and reverted, see Addendum 2→3 of `docs/plans/tajweed-mushaf-mode.md`). The correct technique — matching how quran.com itself handles this (hardcoded per-scale line-width lookup table + `text-align: center`, never `space-between`) — is to **center** each tajweed line as a rigid block when it falls short of the container width (`QuranLine.tsx`: `justify-center` for tajweed mode on every page, not just 1–2); centering only shifts the whole line, never the relative gaps between words. The raw per-line width-ratio measurement (worst case `22.73×font-size` at p.123 l.8) is retained in Addendum 3 for a still-**deferred** follow-up: the mobile/double-view font-size formulas still derive from `code_v1`'s `14.7` divisor, so the rare worst-case tajweed line could clip slightly (accepted for now) — revisit only after visually confirming it's actually a problem, since calibrating to the true worst case up front would leave *typical* lines filling only ~70% of the container (median ratio 16.08 vs worst-case 22.73), a worse-looking tradeoff than the rare clip it would prevent.
