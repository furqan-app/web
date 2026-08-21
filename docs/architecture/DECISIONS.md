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
- `app/[locale]/page.tsx`, `app/[locale]/pages/[id]/page.tsx`, and `app/[locale]/pages/vertical/page.tsx` each export `export const revalidate = 300`. Next's default for a static route with no `revalidate` export is `Cache-Control: s-maxage=31536000` (one year) — an assumption that the host purges its edge cache on deploy (Vercel's model). Hostinger's CDN does not reliably do this, so any bad response ever cached under one of these URLs (a deploy race, a leaked RSC payload, stale asset references) would otherwise persist for up to a year with no invalidation path available to us. The 300s bound caps that blast radius to 5 minutes instead. See [ADR 0035](adr/0035-bounded-revalidate-on-static-document-routes.md). Do not remove it as an "unnecessary" cache-hit-rate optimization — routes backed by `getServerSession` (marks, plans, mushaf hub) are already excluded from this risk automatically (cookie reads make Next mark them dynamic).

---

## Font System

**Decision:** Each Quran page's font (`quran-p{id}`, `/fonts/v1/woff2/p{id}.woff2`) is registered client-side via the **immutable FontFace-API registry** (`app/utils/page-font-registry.ts`) — `new FontFace` → `document.fonts.add` → `load`, LRU-capped, evicted per-face via `document.fonts.delete` — never via mutable CSS `@font-face` injection; see [ADR 0029](adr/0029-immutable-page-font-registration.md). Only the current page's font gets a `<link rel="preload">`. Tajweed fonts are the one CSS exception (`@font-palette-values` has no FontFace-API equivalent): `FontFaceInjector` (`"use client"`, per [ADR 0020](adr/0020-client-component-for-inline-style-injection.md)) renders them as one keyed `<style>` per page id whose content never changes after mount. Three global fonts are loaded in `app/layout.tsx`: `--uthmanic` and `--surah-names` via `next/font/local`, and `--tajawal` (Tajawal, Arabic/Latin UI font) via `next/font/google`.

**Rationale:** Loading all 604 page fonts globally would be prohibitively large. Inlining per-page means only the current page's font is loaded.

**Font–Column Encoding Contract** (see `adr/0002-non-page-quran-text-rendering.md`, `standards/quran-rendering.md`):

| Font | Tailwind class | Column to use | Context |
|---|---|---|---|
| `quran-p{n}` | — (inline style) | `code_v1` | Quran page words only |
| `UthmanicHafs1Ver18` | `font-uthmanic` | `qpc_uthmani_hafs` | Word text in search, modals, any non-page context |
| `UthmanicHafs1Ver18` | `font-uthmanic` | `text_uthmani` | Verse-level text (Verse has no `qpc_uthmani_hafs` column) |
| `sura_names.ttf` | `font-surahnames` | Zero-padded surah number e.g. `"001"` | Surah name display — font maps `001`–`114` to calligraphic glyphs, NOT Arabic text |

**Constraints:**
- **Never mutate the text of a live stylesheet containing `@font-face` rules** (rewriting a `<style>`'s content or appending text nodes to it). Any mutation re-parses the whole sheet and resets every face in it to `unloaded`; with `font-display: block` that blanks currently-visible text — the root cause of the reader swipe-commit flicker (ADR 0029). Add fonts by adding immutable units (a registry `FontFace`, a new keyed `<style>`); remove by removing whole units.
- `FontFaceInjector` must render unconditionally (not gated by breakpoint/`isLgUp`) — it's the only mount point for tajweed's per-page-id `<style>` elements, and tajweed mode is available on mobile too. A viewport gate here silently renders tajweed glyphs garbled on mobile with no error (regressed once during the ADR 0029 diagnostic session, caught and fixed 2026-07-25).
- `ensurePageFonts` calls must be scoped to genuinely-visible ids, never "everything in the window." Unlike CSS `@font-face` (lazy — browsers don't fetch for `display:none` content, which is what ADR 0013's always-inline-both-pair-members design relies on), the registry's `face.load()` is eager and downloads regardless of render state. `ReaderPager` passes `FontFaceInjector` a separate `baseFontIds` (pair-expanded only when `isDouble`, else single ids) distinct from the pair-expanded `pageIds` still used for the CSS-only tajweed keyed `<style>` elements, which stay safe to over-list. See ADR 0029's Addendum. The one deliberate exception is the pager's
  Stage B lookahead prefetch ([ADR 0034](adr/0034-page-turn-readiness-on-slow-networks.md)), which
  warms the *next* page's font before it is visible on purpose — it is still bound by the same
  pair-expand-only-when-`isDouble` rule, so it never downloads a font for a page the layout is hiding.
- Do not add Quran page fonts to the global CSS.
- `<style dangerouslySetInnerHTML>` for per-page `@font-face` rules **must** live in a `"use client"` component (`FontFaceInjector`), never in a Server Component. Next.js App Router treats `<style>` in RSC output as a resource and hoists it to a different DOM position on the client, causing React hydration mismatches. `<link rel="preload">` is NOT affected and may remain in the Server Component. See [ADR 0020](adr/0020-client-component-for-inline-style-injection.md).
- Desktop reading size is persisted under the new `desktopQuranFontSize` key as semantic `small` / `medium` / `large` presets (26/28/30px; default `small`). The legacy numeric `quranFontScale` key is deliberately ignored rather than migrated. Mobile is fixed and tablet is auto-fit; neither exposes this preference. See [ADR 0038](adr/0038-reader-size-contracts-and-tablet-double-view.md).
- The resolved desktop reading size is a CSS sizing input, not a runtime Tailwind arbitrary class: it must drive the word ink, card width, frame fallback, and rhythm together. Do not restore `FONT_V1`'s 1–10 Tailwind safelist or change only one of those consumers — that produces a narrow line inside an old-width page. ADR 0005's safelist requirement applies only while a runtime Tailwind class exists.
- `UthmanicHafs1Ver18` supports both `qpc_uthmani_hafs` (preferred for words) and `text_uthmani` (for verse-level display). Never pair it with `code_v1`.
- When displaying a word outside the page (search, modal), use `word.qpc_uthmani_hafs`.
- `Verse` has no `qpc_uthmani_hafs` column — when displaying verse text, prefer reconstructing from `word.qpc_uthmani_hafs` filtered to `char_type_name === 'word'` if words are in scope; fall back to `verse.text_uthmani` only when words are unavailable.
- Never use `verse.text_uthmani` for verse display in search — always join `word.qpc_uthmani_hafs` across all words. Do **not** filter by `char_type_name` for full verse display: `UthmanicHafs1Ver18` renders markers (۞ rub el hizb, etc.) correctly and they should be visible. Filter to `char_type_name === 'word'` only in truncated/title contexts (e.g. MarkModal) where markers in a short string are unwanted.
- `QuranSafha` shows a skeleton loading state (shimmer lines) while the current page's font is downloading, using `document.fonts.load()` to detect readiness. Do not change `font-display: block` to `swap` or `optional` — `block` keeps text invisible during download, which pairs correctly with the skeleton (the skeleton overlays the hidden text elements, so nothing garbled is visible underneath). `swap` would immediately expose the garbled system-font fallback. See `docs/plans/fix-quran-page-font-loading.md`.
- `fontReady` in `QuranSafha` is initialized via a `useState` lazy initializer that reads a **module-level `loadedFonts: Set<string>`**, populated by `useEffect` when each page font finishes downloading. This pattern was chosen after three failed alternatives (see `docs/plans/fix-safha-swipe-flicker.md`): a bare `document.fonts.check()` lazy initializer causes a Suspense hydration mismatch when fonts are browser-cached; `useIsomorphicLayoutEffect` is defeated by React 18 concurrent mode yielding to the browser between commit and paint; `useSyncExternalStore` is defeated by Next.js App Router's RSC navigation calling `getServerSnapshot` on the client. The module-level Set is always empty at hydration time (useEffect has not run), so the lazy initializer starts `false` on both server and client — no mismatch. On swipe navigation remounts, the Set contains fonts loaded by carousel neighbor panels, so the new instance starts `fontReady=true` immediately with no flash.
- `useIsTablet()` uses `useIsomorphicLayoutEffect` (= `useLayoutEffect` on client, `useEffect` on server). This corrects the initial `isTablet=false` state before the browser paints on swipe-navigation remounts, preventing a layout shift from the wrong `md:px-7 md:py-5` / card-width classes being applied. Do not revert to plain `useEffect` — it runs after paint, making the layout shift visible.

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
- Favicon files (`favicon.ico`, `favicon-16.png`, `favicon-32.png`) live under `public/icons/`, not `public/` root — placing them in the already-whitelisted `icons/*` directory avoids editing the `middleware.ts` matcher or `next.config.mjs`'s `globPublicPatterns` (see the point above). A root-level favicon would need both updated first. See `docs/plans/brand-mark-icons.md`.

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
- `components/ui/popover.tsx`'s `PopoverContent` takes an optional `container` prop (forwarded to `PopoverPrimitive.Portal`). **Always pass it, pointed at the enclosing `DialogContent`/`SheetContent`'s DOM node, whenever nesting a `Popover` (or `Command` combobox) inside a `Dialog`/`Sheet`.** Radix's Dialog `FocusScope` traps focus by DOM containment, not visual nesting — a `Popover.Content` portaled to the default `document.body` is a DOM sibling of the Dialog's own portal, so the Dialog keeps yanking focus back into itself on every keystroke, breaking typing and scroll inside the Popover. Fixed for `RecitationSettingsSheet`'s reciter combobox by capturing `SheetContent`'s node via a callback ref (`useState`, since a plain `useRef` wouldn't trigger a re-render once populated) and passing it as `container`. See `docs/plans/recitation-playback.md` Addendum 5b.

---

## Sidebar Loading

**Decision:** The `Sidebar` component is loaded via `next/dynamic` (deferred JS hydration) in `app/[locale]/pages/layout.tsx`. Sidebar data (surahs, rubs) is fetched server-side in that layout.

**Rationale:** Sidebar is non-critical for initial render of the Quran page; deferring it reduces the JS bundle that blocks hydration.

---

## Sheet `top` Overrides Must Also Neutralize `h-full`

**Decision:** `SheetContent`'s left/right variant (`components/ui/sheet.tsx`) sets both `inset-y-0` (top:0, bottom:0) and `h-full` (height:100%). Any consumer that overrides `top` inline (e.g. `Sidebar` clearing the nav bar) must neutralize that `h-full` in the same inline style — never leave it to compute height on its own once `top` is overridden. **Set `height: auto` and let `top` + `bottom` size the box** (updated 2026-08-15, #304). This entry previously required an explicit `height: calc(100dvh - …)` instead; that form is now forbidden here, because a viewport unit goes stale across the installed PWA's fullscreen transition and reproduces the very clipping this decision exists to prevent — see [ADR 0044](adr/0044-viewport-units-are-unreliable-in-the-installed-pwa.md). The rationale below is unchanged and is still what makes `height: auto` mandatory rather than optional: leaving all three of `top`/`height`/`bottom` non-auto is the failure case.

**Rationale:** With `top`, `height`, and `bottom` all non-auto on a `position: fixed` box, the box is CSS-over-constrained; browsers keep `top` + `height` and silently recompute `bottom`. The panel keeps its full 100vh height but starts lower, so its bottom edge extends below the actual viewport by the `top` offset — clipping content near the bottom of the panel (e.g. the last item in a scrollable list) with no way to scroll it into view, since the panel itself is `position: fixed`, not the page. Found via `Sidebar`'s surah/rub list clipping the last item on short viewports (`docs/plans/fix-sidebar-bottom-clip.md`). With `height: auto` there are only two non-auto values, so the box is not over-constrained and its bottom edge lands exactly on the viewport floor without any unit being named at all.

---

## Nav Z-Index Invariant

**Decision:** The `<nav>` element must carry `relative z-10` in its base `className` (non-overlay mode). `backdrop-blur-md` creates a CSS stacking context with `z-index: auto`, and reader content (specifically `.fq-reader-pager-strip` with `transform: translateX(-100%)`) creates its own `z-index: auto` stacking context later in the DOM — painting over the nav and hiding the search dropdown. `relative` makes z-index apply to the nav; `z-10` ensures the nav's stacking context ranks above reader content (z:auto = 0) without competing with RecitationPlayerBar (z-40) or Radix portals. In overlay mode (`fixed top-0 inset-x-0 z-50`) this is already satisfied and unchanged.

**Constraint:** Do not remove `relative z-10` from the nav's base class. Doing so silently hides the desktop search dropdown on all reader pages.

---

## Sidebar Trigger Architecture

**Decision:** `Nav` (global, `app/[locale]/layout.tsx`) and `Sidebar` (pages-only, `app/[locale]/pages/layout.tsx`) live at different layout levels and cannot share state via props. `SidebarContext` (`app/contexts/SidebarContext.tsx`), provided in the locale layout, bridges them: `Nav` owns the trigger button and calls `setOpen(true)`; `Sidebar`'s `Sheet` is a controlled component reading `open`/`setOpen` from the same context. The trigger is visible at all breakpoints, gated only by `pathname.includes("/pages/")` (trailing slash required — a bare `"/pages"` substring match false-positives on any route containing that string, e.g. a hypothetical `/pages-list`).

**Rationale:** Replaces an earlier design where `Sidebar` rendered its own always-visible floating-pill `SheetTrigger`.

**Drift note (found 2026-08-13):** commit `e231f77` (`docs/plans/sidebar-surah-indicator.md`) silently reintroduced the floating-pill trigger in `Sidebar.tsx` — carrying that plan's surah-name/chevron content — without updating this decision or restoring the `Nav`-owned trigger. The code and this decision were inconsistent from that commit until `docs/plans/home-page-design-fixes.md` (Addendum — Universal nav menu) restored the `Nav`-owned trigger, now carrying the surah/chevron content rather than the original `PanelLeftOpen` icon.

**Constraints:**
- Do not add a second/duplicate trigger — one trigger, in `Nav`, on pages routes only.
- If relocating or removing this trigger in future work, verify every breakpoint retains equivalent access before assuming "unchanged" — an earlier revision of this pattern silently removed desktop's only way to open the sidebar by adding `md:hidden` to the replacement trigger without noticing the original floating pill had no such guard. See `docs/plans/mobile-nav-ux.md` (Addendum 3) for the incident.
- Any future change to this trigger's location must update this decision in the same commit — do not let code and doc drift apart again (see Drift note above).

---

## Nav-Mounted State Must Be Live, Not One-Shot

**Decision:** Any client state a `Nav`-mounted component (or other always-mounted, non-remounting layout element) displays and that can change *while the app is already open* must be plain React state kept current by a setter — e.g. a small context updated in lockstep with `localStorage` — never a `localStorage.getItem` read done once in a mount-only `useEffect`.

**Rationale:** `Nav` (`app/[locale]/layout.tsx`) is mounted once per browser session and never remounts during in-app client-side navigation. A component under it that reads `localStorage` once on mount (matching the otherwise-correct hydration pattern used for *initial* preferences like `QuranMushafContext`) silently goes stale the instant something elsewhere in the same session writes a new value — no remount ever happens to trigger a re-read. Confirmed live for `ContinueReadingLink`/`LastReadPageContext` (`docs/plans/save-last-read-page.md`, "What NOT to Do"): scripted browser testing showed the nav link kept pointing at an old page number after in-app navigation had already saved a new one, and clicking the stale link then silently overwrote real progress with the stale page.

**Constraints:**
- The mount-only-`useEffect`-read-from-`localStorage` pattern (as used by `QuranMushafContext`/`QuranSafhaViewContext`/`QuranFontScaleContext`) is still correct for state that's only ever changed by a user action *inside the component that owns it* (a settings toggle, a font-scale slider) — those components re-render on their own write, so staleness never occurs. It is **not** safe for state written by a *different*, independently-mounted component (e.g. a reader-side sync effect writing a value a separate nav link displays).
- When state crosses that boundary — written by one always-mounted piece, displayed by another — route both through a shared context whose setter updates React state and `localStorage` together, so every consumer re-renders live. See `LastReadPageContext` for the reference shape.

---

## Surah Banner Placement — IMPLEMENTED (gap-derived)

**Decision:** Surah-name and bismillah lines are placed by **gap detection**: of line slots 1–15, whichever are absent from the page's occupied line numbers are exactly where the banner/bismillah lines belong. A 2-slot gap renders banner + bismillah, a 1-slot gap renders bismillah only (the name was on the previous page's end banner) or the banner alone for surahs 1 and 9, and a trailing gap after a surah's last verse renders the next surah's end banner. See `docs/plans/fix-surah-banner-placement.md` Addendum 4 for the algorithm and Addenda 5–7 for the decorative frame and sizing.

**Exception — pages 1–2 use a fixed template, not gap detection (Addendum 10, Trello #135).** Banner at slot 4, bismillah at slot 6 (page 2 only — page 1's Bismillah is verse 1:1 text, no SVG), content lines re-sequenced to start at slot 6 (page 1) / 7 (page 2), blank real 1em slots elsewhere (1–3, 5, 13–15). This replaced the earlier "no special-casing" claim below and the `.fq-safha-center` CSS centering trick, which dropped 7 of the 8–9 missing slots per page instead of rendering them. Every other surah-opening page is unaffected — this exception is scoped to `page <= 2` only.

**Verified:** all **114/114** surahs receive a page-level banner, in both the default and the tajweed edition, and no surah ever falls back to the inline header. Measured across all 604 pages of both editions.

**No `line_type` ingestion is needed, ever.** The original Trello #72 alternative — ingest QPC's per-line `line_type` (`ayah`/`surah_name`/`basmallah`) — is permanently unnecessary: gap detection derives the same information from data already seeded, and QDC does not expose `line_type` at any level under any mushaf param anyway (confirmed live, ADR 0023 Addendum 6). ADR 0016's plan to denormalize `start_banner_surah_id` / `end_banner_surah_id` / `bismillah_only_surah_id` onto `PageMetadata` was never seeded and is superseded.

**Constraints:**
- Banner elements must be direct children of `.fq-quran-safha` so the flex `gap`/`space-between` counts them as real line slots.
- Use `1em` for banner/bismillah slot heights — never `var(--fq-word-base)` or `--fq-heading-h` fractions. `leading-none` is required on the outer divs.
- Line keys must be sorted numerically; `Object.keys()` order is not guaranteed.
- Do not suppress the inline header unless a banner was actually rendered for that surah.
- Correct input is a precondition: the algorithm is only as good as the page composition it receives. Feeding it a page composed from one edition and line numbers from another silently drops banners — that was the Trello #155 defect, not an algorithm fault. See the Mushaf Editions & Word Placement decision.
- Two earlier approaches are dead and must not be revived: the `PageMetadata` denormalized-fields plan (ADR 0016, never seeded) and a `wordLineCount === 15` line-count heuristic (shipped briefly, produced wrong banners on mid-page and multi-surah pages, reverted).

**Frame art — layout slot and ink height are deliberately different.** The banner's decorative frame is glyph **U+E000** extracted from QUL's `quran-common.ttf` (the authentic KFGQPC band), native ratio **8.1102:1**, a **single fill** — the font carries no `COLR`/`CPAL`/`SVG ` table. Its ink therefore renders ≈**1.81em** tall when spanning the text column, while its **layout slot stays `1em`** like every other line; the surplus overflows into the inter-line gap via absolute positioning. Measured against QUL's own KFGQPC V1 (1405H) renderer, where the frame is set at 2.33× the body font size so its natural advance equals the line width exactly — the printed frame is full-width and undistorted. See `docs/plans/fix-surah-banner-placement.md` Addendum 8.

**Constraints:**
- Never stretch the frame art to the line ratio — no `preserveAspectRatio="none"`, no viewBox widening, no translating ornaments outward at fixed scale. Addendum 6 did exactly this (`373 → 562`) and it is the defect Addendum 8 reverts.
- The frame SVG must render at `height: auto` with width driving the size. A hardcoded `em` height re-introduces the stretch: the rendered column width is not reliably `QURAN_LINE_WIDTH_RATIO` em (that constant is the card's `minWidth` floor, and the double-view cap can shrink the reading font beneath it), so a fixed height fights the real box — first implemented as `1.81em` and measured 7.87:1 against the true 8.11:1.
- **Frame width is measured from the real rendered DOM, not computed from any fixed em ratio.** `SurahBannerLine` reads the max rendered width of the page's own `.fq-safha-row` elements (`ResizeObserver`-tracked) and sets that exact px value as its own width. Real line width genuinely varies 14.13–14.42em page to page (kashida justification), so no constant — not `QURAN_MAX_LINE_WIDTH_RATIO`, not a percentage of it — can equal "the real line" on every page/mode/breakpoint/edition at once; two earlier attempts at a fixed constant (Addendum 9's tajweed-mode fix, and this addendum's own first pass at a flat 85% shrink) both needed a further correction once real per-page variation showed up. `QURAN_MAX_LINE_WIDTH_RATIO` survives only as the SSR/first-paint fallback before the effect runs once.
- **Frame clearance (both top and bottom) comes from an explicit `marginTop: 0.3em` on the frame, independent of width.** `marginBottom` stays identical to every other row (`var(--fq-line-gap)`, zeroed by the same `!important` rule in `.fq-spread`/mobile that zeroes every row's own margin, with the container's `gap`/`space-between` supplying the real `--fq-line-gap`). `marginTop` is new, is not zeroed anywhere, and is what makes the gap real and visible instead of relying on the ambient `--fq-line-gap` alone (which the ink overflow, below, was already eating into). At full width the ink overflow (≈0.39em/side) left only a few px of real clearance against the line *above* the frame — fine against the bismillah below (its own SVG has internal padding, Addendum 7) but not against arbitrary verse tashkeel above, which has none. Live-measured box gap dropped as low as ~0.25px on viewports shorter than 800px (where the `min-height:800px` reader-rhythm gap boost from the "reader fills height" decision below doesn't apply — a common real laptop case, not an edge case); with the `marginTop`, worst case across a 17-page/4-viewport sample is 6.84px. See `docs/plans/fix-surah-banner-placement.md` Addendum 11.
- The outer div must never exceed `height: 1em`. Extra ink height comes from absolute positioning only, or equal-height spread and the 15-slot budget break — the same rule bismillah follows (Addendum 7).
- The frame has **one** colour role. Do not reintroduce a second or third token: the previous three-role model (`--surah-frame-line` + `--surah-frame-gold` + `hsl(var(--card))`) needed per-theme overrides in two separate bands purely to collapse itself back to one colour.
- Rendering the frame at `height: 1em` in flow is wrong — at its native ratio that gives 55% of the line width, contradicting the measured print layout.
- The QUL glyph's cartouche is empty by design (سورة is a separate element there) and its interior stays unfilled so `--mushaf-paper` shows through, as in print.
- `QURAN_MAX_LINE_WIDTH_RATIO` × `--fq-safha-font` (= `14.42 × base_reading_font`) is the frame's SSR/first-paint width **only**, superseded by a DOM measurement on mount (see above, Addendum 11) — not the steady-state mechanism. `--fq-safha-font` still must be the pre-scale base value at each breakpoint (not the raw `font-size`, which tajweed mode scales down 0.85×/0.88×) so the fallback doesn't flash visibly narrower before the effect corrects it. Never `QURAN_LINE_WIDTH_RATIO` (14.7em) for this fallback either — that one is the card's own padded minWidth floor, a different constant for a different purpose; do not unify them. See `docs/plans/fix-surah-banner-placement.md` Addendum 9 (original constant derivation) and Addendum 11 (superseding DOM measurement).
- **QUL's licence is unresolved, not permissive-by-default.** The `TarteelAI/quranic-universal-library` repo is MIT, but that covers the application code; the FAQ explicitly states resources "vary in their copyright status" and must be reviewed individually, and QUL records the fonts as supplied by KFGQPC. Confirm the terms — ideally once, jointly with the QCF page fonts already shipped from the same publisher — before shipping anything further derived from these assets.

**`is_centered` — resolved by centering every line.** The printed mushaf centers a surah's closing line when it falls short. Measured across all 114 surah-closing lines the median is 100% of a full line (the QCF kashida already fills them); only 7 are short — surahs 1, 101, 106, 108, 110, 113, 114 on pages 1, 597, 600, 602, 603, 604. No per-line `is_centered` data is needed: the card's content box (`font-size × QURAN_LINE_WIDTH_RATIO` = `14.7em`) is slightly wider than a typical page's widest line (median `14.24em`), so centering a *subset* of lines would inset them ~6px from their flush neighbours and read as misalignment. Every line is therefore centered, in every edition, on every page — the slack is distributed symmetrically and all lines on a page stay mutually aligned.

**Constraint:** line justification is edition-independent and page-independent. Never reintroduce a per-edition or per-page justification branch (the old `[1, 2].includes(page_number) || tajweedMode` condition in `QuranLine` is gone, and `words[0].page_number` must not drive rendering — under the per-edition model it is only a default-edition mirror). Pages 1–2 no longer have a distinct vertical layout mode either (Addendum 10, Trello #135) — `.fq-safha-center` is removed; they use the same `space-between` 15-slot flex rhythm as every other page, with real blank slots filling the fixed template's unused positions.

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

## Design Language (reader-lab migration, in progress)

**Decision:** The app is migrating to the visual language proven in the Nocturnal Reader Lab, across all three themes and including the mushaf page face. The canonical design docs are rewritten **before** any token or component work. See [ADR 0047](adr/0047-adopt-reader-lab-design-language.md) and `docs/plans/design-migration/INDEX.md`.

**Constraints:**
- **Two-accent grammar.** Gold carries identity, metadata and ornament; the primary accent carries live state only. This supersedes `design-principles.md`'s "never reach for a second accent colour" — do not re-apply the one-accent rule in review.
- The page face **may be lit**. ADR 0047 is the explicit decision that ADR 0032's "do not light the page face" required, and it supersedes ADR 0031's page-brightness rule too.
- Superseding an *aesthetic* decision is expected and must be recorded in the phase's plan. Superseding a *measurement of the medium* is not: dark's `(7,15,23)` headroom, pixel-sampled depth verification, WCAG AA pairs, and the mushaf no-overlap / line-rhythm / font-size invariants all carry forward unchanged.
- While the migration runs, `visual.spec.ts` snapshots are a **diff-review artifact, not a gate** — they are regenerated per phase. Every phase must therefore carry its own explicit mushaf-correctness verification; do not treat a green snapshot run as coverage.
- `design-principles.md` is canonical and generates root `DESIGN.md` via `/impeccable document`. Changing one without regenerating the other leaves the ADR 0041 review gate enforcing the superseded language.
- The reader lab stays an unlinked sandbox throughout and never ships; it gains light, gold and small-screen variants only as a derivation surface.
- **An atmospheric rule names a light source, never a channel.** Which channel expresses it — lightness or temperature — is decided per theme by measuring that medium's headroom, and so is the gradient's extent. Values derived for one theme measure zero when ported to another (ADR 0047 Addendum, Phase 0.1). Do not port; re-derive and sample.
- **The live accent is emerald in all three themes; only identity is theme-warm.** On the gold theme, `--primary` is itself gold, so reusing it for live state collapses the two-accent grammar into one. On light and gold, identity gold means a deep bronze that separates from the surface by lightness — a bright gold does not survive parchment.

---

## Reader Surface Depth

**Decision:** The reader page face carries **no added light** in any theme — it is a flat `--mushaf-paper` fill. Depth comes from the page's **edges**: rim, sheet stack, binding crease, and a cast shadow where there is a desk to catch it. The rules are declared **once, theme-agnostically**; each theme supplies only values through the `--mushaf-rim-*` / `--mushaf-sheet-*` / `--mushaf-crease*` / `--mushaf-page-cast` / `--reader-chrome-*` token contract. On dark surfaces at or below ~10% lightness drop shadows are **omitted rather than tuned**, because on `(7,15,23)` they produce no visible pixels; dark separates its page from its desk with a **uniformly** lighter paper instead. The ordering invariant holds: page face > surround ≥ far background, creases below both. See [ADR 0032](adr/0032-dark-surface-depth-from-light.md) and its 2026-07-29 supersede.

**Constraints:**
- Do not add drop shadows or inset "dip" shadows to dark-theme reader surfaces expecting them to read — `--background` is RGB `(7,15,23)`, leaving ~7 points of headroom before black, which is below the visible threshold. Reach for a lighter face or a lifted surround instead.
- Any depth or ambient-light change to these surfaces must be verified by **sampling rendered pixels** on a running dev server, not by reading the declaration. A shadow can be mathematically present and produce no visible pixels — this has happened repeatedly.
- A radial ambient pool behind an opaque element must be sized so its lit zone extends **past** that element. Matching the pool's radius to the element's half-width hides the whole effect and leaves only its dead tail visible.
- Depth **rules** are shared by all three themes; only **values** differ. Do not reintroduce a theme-scoped copy of a depth rule to serve one theme — add or retune that theme's tokens instead. Scoping a depth rule by theme is what produced six copies of one idea and two regressions that only review caught.
- The depth tokens (`--mushaf-rim-*`, `--mushaf-sheet-*`, `--mushaf-crease*`, `--mushaf-page-cast`, `--reader-chrome-*`) are defined in **all four** theme blocks (light, gold, `.theme-dark`, `.theme-dark.dark`). Every theme must define the whole family; a missing token silently falls back to an unset value and flattens that theme's page. This reverses an earlier dark-only exception — see ADR 0032's supersede.
- **Do not light the page face.** Shading it (a darkening pass, like mobile's corner dip and inner vignette) is fine; adding a lit core or any brightening gradient is not. A gradient ramp existed here and was removed from every theme and band — do not reinstate it without an explicit decision.
- `--reader-chrome-shadow` is `none` in dark and a real shadow in light/gold: the shadow-vs-light difference is now a **value**, not a forked rule. The recitation bar's *background* remains theme-scoped, which is deliberate and documented in place — light and gold read as translucent glass, which gives no lift over `(7,15,23)`, and a base-layer `background-color` would lose to the JSX utility on source order anyway.
- The ordering of the ladder is the invariant; its step **values** belong to a specific design and live in that design's plan. The desktop reader has no ambient desk pool — surround equals the far background by choice — so a fixed "surround must exceed background" rule would fail a signed-off design. See ADR 0032's addendum.
- Sample verification pixels from the **measured card rectangles of the pager's middle panel**, never from viewport fractions guessed by eye: the pager mounts three panels side by side, so a fraction like 0.955 lands on the desk rather than the paper. A whole round of numbers was recorded wrong this way.
- Floating dark chrome (recitation bar, nav arrows) follows the same rule as the paper — an opaque raised face plus a warm rim, never a shadow, and never the translucent `bg-background/75` glass that light and gold use, which produces no lift over `(7,15,23)`.
- **Contrast is relative to what surrounds a surface, so a value verified in one band does not transfer to another.** Desktop's page reads against a desk; the tablet reader is full-bleed, so the eye can only compare within the page. A desktop ramp copied verbatim to tablet once measured correctly and looked unchanged. Band scoping is for **values**, never for rules.
- **A WCAG contrast pass is not evidence that a reading surface is restful.** Contrast measures luminance difference only. A gold paper at 12.9:1 (comfortably AAA) was rejected as tiring because its saturation had been pushed from 47% to 68% — chroma load, which contrast does not capture. Warmth is reached by lowering lightness, not by raising saturation; measure chroma alongside contrast. Copying a signed-off value into a different context is not the same as copying its effect.
- Tablet keeps **no drop shadows** (an explicit user request recorded in the tablet block) and stays **full-bleed** — `100dvh`, edge-to-edge cards, nav as overlay. The desktop surround cannot be ported without insetting the book, which costs reading area and shrinks double-view text (ADR 0013). Do not add margins there to chase the desktop look.
- The MCP browser clamps its viewport at 1600px, putting the entire tablet band out of reach. Verify tablet-band pixels with `scripts/dev/reader-shot.mjs`, which drives system Chrome headless at any viewport, prints the measured card/stack/arrow/bar rectangles, and takes an optional `extra.css` to probe a candidate treatment **without editing `globals.css` first**. Playwright's own browsers are not installed; it points at `/usr/bin/google-chrome-stable`.

---

## Desktop Reading Group (≥1367px)

**Decision:** At `≥1367px` wide **and** `≥800px` tall, the reader places a fixed vertical rail on the screen-right edge (`right: 24px`, vertically centred, **96px wide**) containing the recitation controls (play/pause, verse key, reciter dropdown trigger, settings, stop). The mushaf spread stays visually centred with no asymmetric offset — the rail overlays the existing lateral whitespace (spread is capped at 860px, leaving ≥253px per side at 1367px — 96px rail + 24px offset stays well inside that budget). Below either threshold, desktop keeps the full-width bottom-edge bar. This replaces the previous "floating centred card below the spread" layout (see `docs/plans/recitation-bar-vertical-rail.md`).

**Reciter dropdown (2026-08-04, Trello #183):** Both the full-width bar's reciter-name text and the rail gained a `ReciterCombobox` trigger (app/components/recitation/ReciterCombobox.tsx, extracted from `RecitationSettingsSheet`) — clicking either opens the same reciter popover the settings sheet uses, calling `updateSettings({ reciterId })` directly. This is what pushed the rail from 56px to 96px (room for a truncated name + chevron). No new reciter-switching logic was needed — `RecitationContext`'s existing mid-session effect already reloads chapter audio and resumes at the same verse when `reciterId` changes. The bar's own `.fq-recitation-info` div (name+verse-key together) is still fully hidden in rail form via the original `display: none` rule — the rail's reciter trigger is a separate element, not a rework of that hidden pair; verse-key visibility in rail was not part of this change despite this section's own wording implying otherwise (a pre-existing, unfixed doc/code gap, flagged not fixed). See `docs/plans/recitation-bar-vertical-rail.md` Addendum.

**Rationale:** Moving the bar off the bottom edge reclaims the 104px bottom padding previously reserved for it, yielding +0.13–0.15 em of inter-line gap at every desktop/large-tablet band (pairs with the reader rhythm ticket #172). The rail is fixed-right at a viewport offset and does not need to know the spread's dimensions.

**Retired contract — `--fq-spread-width` / `--fq-spread-center`:** These custom properties were formerly published by `QuranSpread`'s `useSpreadMetrics` ResizeObserver hook and consumed by the floating bar to match the spread's measured width. Both the hook and its consumers have been removed (2026-08-02). Do not re-add them without a new justification — the bar no longer needs the spread's dimensions.

**Constraints:**
- The rail is desktop-only (≥1367px + ≥800px). Tablet (1024–1366px) has no lateral space (spread fills edge-to-edge); it keeps the full-width bottom bar with nav-overlay sync unchanged.
- Rail position is fixed-right regardless of locale (AR/EN). The mushaf spread layout is not adjusted.
- Never widen the height gate by reducing `baseScaleViewHeight` or any font math — that is the reading size (ADR 0004), and changing it also requires regenerating the `tailwindFontUtility` safelist (ADR 0005).
- Nav arrows need `align-self: center` (the parent is `items-stretch` at `md+`) and ≥24px inline margin: the sheet stack peeks 16px past the card's outer edge, and at 0 margin the arrow sat on top of it.
- Layout declarations on the rail need `!important` to beat the JSX `inset-x-0` / `bottom-0` utilities. Colour declarations that a utility already sets will silently lose on source order — raise specificity deliberately or drop them.
- `--reader-chrome-bar-shadow` is `none` in dark theme; the rail must honour this — do not add a shadow override. Verify by sampling rendered pixels in all three themes.

---

## Quran Safha Viewport Fit

**Decision:** Mobile keeps its width-fit model; tablet and desktop use the per-band reader-size contracts in [ADR 0038](adr/0038-reader-size-contracts-and-tablet-double-view.md). On desktop the resolved semantic preset drives word size and all dependent page geometry together; on tablet the responsive double-page calculation is reduced by a 0.96 density factor so surplus becomes rhythm and surah-start clearance. This supersedes ADR 0004's shared `FONT_V1`-driven desktop/tablet sizing model.

**Constraints:**
- Do not change only the text `font-size`: the resolved size must also drive the page width, frame fallback, line-gap floor, and surah-start budget.
- The 15-slot budget remains load-bearing. A surah start must reserve its own frame-to-Bismillah clearance inside that budget; it may not rely on whatever `space-between` happens to leave.
- The site nav bar's fixed 56px height is the one accepted fixed-px term in the budget; do not attempt to compensate for it inside `QuranSafha` — if it ever needs to change, recalibrate the budget in ADR 0004.
- The 24px readability floor remains for any responsive cap that would otherwise shrink smaller on short viewports; the no-scroll test cases must be re-measured for every desktop preset and the tablet reference viewport.
- **Desktop spread (md+):** The two facing pages are made **equal height by content, not by a fixed viewport height.** They share one flex parent (`.fq-spread`, `align-items: stretch`), so the shorter page stretches to match the **taller** one — adaptive to any font scale, and short opening pages (Al-Fatiha) are not forced to full screen height. Mechanism: the ReaderPage background is `min-h-[calc(100dvh-3.5rem)]` (a floor, **not** a fixed `h-*`) with `md:justify-center` so a short spread centers and a tall one can grow/scroll. `.fq-spread`'s `items-stretch` equalizes the two page-wrapper divs — those wrappers must **not** carry an explicit height (`md:h-full`), because a flex item with an explicit height is not stretched and `100%` resolves to `auto` against the content-height parent (this collapses the shorter page). Below each stretched wrapper, `h-full` propagates through `fq-full-safha` → relative wrapper → card → `fq-content` (a stretched flex item has a definite cross-size, so these `%` heights resolve). Inside `fq-content`, header/footer are `shrink-0` and `fq-quran-safha` is `flex-1`; a `.fq-spread .fq-quran-safha` CSS block (at `md:`) mirrors the mobile `space-between` layout with `margin-bottom: 0 !important` on direct children, so lines distribute evenly within the stretched height. **Standalone `QuranSafha` (VerticalQuranPages) is NOT affected** — all rules are scoped to `.fq-spread`. (An earlier attempt pinned a fixed `h-[calc(100dvh-3.5rem)]` and pushed `h-full` top-down; it broke on font-scale changes and stretched opening pages — superseded. See `docs/plans/fix-surah-banner-placement.md` Addendum 2.) **Partly superseded at ≥800px viewport height — see the next bullet.**
- **Desktop spread, height ≥800px — the card fills the band and the surplus becomes line rhythm ([ADR 0036](adr/0036-reader-fills-height-band.md)).** This supersedes the "equal height by content" clause above at `md+` and `min-height: 800px`: the spread container is `flex: 1 1 auto` + `align-items: stretch`, so the card takes the reader's whole height band, and `.fq-spread .fq-quran-safha` switches to `justify-content: space-between` with `gap: var(--fq-line-gap)` kept as a **floor** (flexbox distributes positive free space only, so a too-tall page degrades to `flex-start` with the floor intact). The stretch must travel by `align-items: stretch` — the chain `.fq-spread-col` → `.fq-spread` → page wrapper is explicitly height-less, because `height: 100%` inside a flex-grown box resolves to `auto`; re-adding `md:h-full` anywhere in it collapses the card back to content height. Below 800px viewport height nothing changes (no surplus to claim, and the fixed recitation bar is in the way); where that bar is still a bottom bar the reader reserves 76px for it, which the rail's own gate (≥1367px + ≥800px) then gives back. Two tuned spacing knobs: desk margin on the spread container (64px at ≥1367px, 16px at 768–1023px) and page side margin (`.fq-content` `padding-inline` 56px at ≥1367px). Opening pages 1–2 use the same `space-between` distribution as every other page (Addendum 10, Trello #135 — the earlier "centre inside a full-height card" behavior is removed). Tablet (1024–1366px) and the standalone `QuranSafha` are untouched.
- On mobile (below `md`), the Safha card fills the full viewport and is sized by **two facts, no budget formula** (see [ADR 0011](adr/0011-mobile-quran-font-scale-vw-formula.md)). (1) **Font size comes from width:** `calc((100vw - <padding>) / 14.7)`, where the worst-case line-width/font-size ratio across all 604 pages is `14.42` (measured 14.13–14.42; page 580 is worst) and the `14.7` divisor leaves ~2% margin so cross-device rendering variance can't push a line past the width. (2) **Leftover height is distributed by flexbox:** the lines live in a full-height flex column with `justify-content: space-between`, so the browser turns remaining vertical space into even inter-line gaps — filling the page like a native mushaf with no `dvh`/chrome accounting, no `22.089` slot budget, and no per-font line-height constant. Two backstops make this robust: mobile rows are `flex-wrap: nowrap` with `flex-shrink: 0` words so a hair of overflow clips invisibly (card is `overflow-hidden`) instead of wrapping a word to a new row; and the text column has `padding-block: 0.5em` for breathing room above/below the header and footer. Opening pages (1–2) use this same `space-between` distribution — no separate centering mode (Addendum 10, Trello #135). The only calibrated number is `14.7`; revisit it only if a future page font's justified width ratio exceeds its margin. Font size tracks screen width (wider phone → larger text) and is not user-adjustable on mobile; font scale controls stay hidden in the Settings sheet on mobile. The formula is capped at 28px (the value it produces at ~430px, the widest common phone width) so tablet-width portrait viewports — still under the 768px `md` breakpoint, e.g. an 11.5" tablet at ~720px CSS width — don't render an oversized, uncapped font; above the cap, lines no longer touch both card edges, which is accepted, and `.fq-quran-safha` uses `align-items: center` (rather than the default `stretch`) so those narrower capped lines center instead of hugging the RTL start edge. The page wrapper around the card (`page.tsx`) and the card itself must use the same viewport unit — `dvh`, not `vh` — for any full-viewport height/min-height; mixing them (wrapper on `vh`, card on `dvh`) makes the wrapper demand the largest-possible viewport height while the card tracks the actual visible one, producing a vertical scrollbar on real devices with a collapsible toolbar (invisible in Chrome DevTools' device emulation, which doesn't simulate that dynamic chrome).

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

**Decision:** Desktop users can toggle between single-page and double-page views; tablet (1024–1366px) is always double-page, and mobile remains single-page. Pages pair up in fixed pairs `(1,2), (3,4), (5,6)…(603,604)` (302 complete pairs, no singleton); `getPagePair(n)` derives a pair from either member. `/pages/[id]` keeps its existing route shape — either id of a pair renders that same pair. `ReaderPage` always fetches **both** pair members' words server-side at build time. See [ADR 0013](adr/0013-mushaf-double-page-spread.md) and ADR 0038.

**Constraints:**
- View preference persists in `localStorage` (`quranSafhaView`, via `QuranSafhaViewContext`) for desktop only — default `"double"`. Tablet ignores a stored `single` preference: CSS always reveals its partner and navigation steps by a pair.
- The single-vs-double **display** is gated by CSS, not JS: a pre-paint inline script (`app/layout.tsx`, alongside the theme flash-preventer) sets `html[data-safha-view]` from `localStorage` before first paint, and CSS (`:root[data-safha-view="double"] .fq-spread …` at `@media(min-width:1024px)`) shows the second card / applies the width cap / drops the compensate margin. This is correct at first paint even on slow connections (no `matchMedia` in the display path). `useIsLgUp` survives only to choose the nav-arrow href. `setView` updates the attribute for live toggling. See ADR 0013 Addendum 4.
- In single-page mode (including forced-single below `lg`), prev/next steps by one page (`pageId ± 1`, unchanged from before this feature). In double-page mode, prev/next steps by a whole pair (`± 2`), anchored to the odd (right-hand) id of the neighboring pair.
- Both pair members' `@font-face` blocks are always inlined, but only the current page's font gets `<link rel="preload">` — the pair partner's font is not preloaded, so it isn't fetched at all unless that card is actually rendered (relies on browsers not fetching fonts for `display:none` content).
- The prior corner-star/rounded-border decoration (`quran-page-mushaf-design.md`) was replaced, and after iteration the ornamental frame was removed **entirely** (no SVG border, medallions, or diamond markers). The card is now a plain `bg-card` surface with its `md:`-only shadow, plus 2 small offset stacked "pages underneath" layers (`bg-card dark:bg-muted`, `border-muted-foreground/30`) that peek toward each card's outer edge via `stackPeekSide` and double as a left/right-page indicator. All theme-token driven, no hardcoded colors. Renders at `md:`+ regardless of single/double mode; only the second card and the pair-step nav are gated at `lg`.
- **Double-view width fit:** in single-page view the card is sized purely by the `vh`-driven font (ADR 0004), so its width tracks viewport *height* (~14.42× the font size, per ADR 0011's justified-line ratio). Two such cards can overflow the viewport width at some `lg` sizes. In **double** view only, the word font is therefore capped by a from-width budget — `min(vh-font, per-half-width budget)`, the same width-driven technique as ADR 0011's mobile formula — so both facing pages always fit and shrink together on narrower `lg` screens. Single-page reading size is never touched (ADR 0004 holds). This is a deliberate, double-view-only exception to "reading size is height-controlled."
- Do not add a new URL scheme for pairs (no `/pages/2-3`) — the existing per-page route shape is load-bearing for `generateStaticParams` and every other basePath-deriving consumer (sidebar/search links, grant reader).
- Applies to both the self reader (`/pages/[id]`) and the shared-access grant reader (`/mushaf/[grant]/pages/[id]`) — `ReaderPage` is shared between them.

---

## PWA & Offline Quran Page Caching

**Decision:** The app is installable (web app manifest + icons, generated via Next's `app/manifest.ts` convention) via Serwist. When running as the **installed PWA** (`display-mode: standalone`), a service worker pre-caches, in the background, the **slim per-page content JSON** (`public/quran/pages/{n}.json`) + each page's **base WOFF2 font** for all 604 pages — NOT the SSR HTML (ADR 0028): the persistent pager renders any page client-side from that JSON + font once the app shell is loaded, so caching ~2.6 MB HTML ×604 (~1.5 GB) is unnecessary. The pre-cache set is locale-independent (Quran content + fonts; the localized app shell is precached via the Serwist build manifest). Resumes on later launches if a previous attempt was interrupted. Regular (non-installed) browser visits never trigger this pre-cache. The reader-page HTML route itself (visited pages, any visitor) is cached `NetworkFirst`, not `CacheFirst` (Trello #122, ADR 0014 Addendum 1) — see Constraints below. Trade-off: an offline *cold* load of a page URL never visited this session lacks its SSR HTML; in-app swiping to any page works offline from the JSON + fonts regardless. Marks stay **online-only**: the mark UI is disabled with an inline notice when offline, rather than queuing writes. See [ADR 0014](adr/0014-pwa-offline-architecture.md) and [ADR 0028](adr/0028-reader-persistent-pager.md).

**Amended (Addendum 2, Trello #187):** the pre-cache is no longer silent or background. It is **user-initiated on an explicit tap**, offered on three surfaces — an in-tab prompt on `appinstalled` (Chromium only; iOS fires no install event at all), a blocking full-screen gate on first standalone launch, and a permanent Settings button. Base (madani) mushaf only: **≈48 MB over the wire** (45.7 MiB WOFF2 + ~2.0 MiB gzipped JSON), **≈67 MiB stored**. Completion is a sentinel entry in the versioned cache, which also stops the 604-iteration loop re-running on every launch (Trello #129). The 200 ms inter-page throttle is removed for concurrency-6 batches, since nothing competes with a foreground download. Tajweed stays excluded (ADR 0023); a separate opt-in download is future scope.

**Amended (Addendum 3, Trello #194):** the "installed PWA" check must test **both** `display-mode: standalone` and `display-mode: fullscreen` — the manifest's `display` was later changed to `"fullscreen"` (status-bar hiding) and every offline surface's gate is a single shared `isStandaloneDisplayMode()`, so missing either mode silently disables the whole feature on platforms that honor it. Offline navigation to a page not already visited/swiped-to now works via a `setCatchHandler`-based fallback (a small always-precached `/{locale}/pages/1` document, independent of the consent-gated bulk download) that self-corrects to the requested page or the last-read page via `ReaderPager.jumpTo` once the client mounts — see ADR 0014 Addendum 3 for the full mechanism. Its "brief page-1 flash" trade-off is **no longer accepted** — the self-correction now runs in a layout effect, before paint, so the fallback document's page-1 words never reach the screen ([ADR 0042](adr/0042-pwa-launch-resolves-before-first-paint.md)). Sidebar/rub/Continue-Reading links use `jumpTo` directly (no navigation at all) whenever a reader is already mounted.

**Amended (Addendum 4, Trello #312):** the reader-page HTML route (`isSelfReaderPage`) returns to **`CacheFirst`**, superseding the "do not change this back to `CacheFirst`" constraint below — not a reopening of Trello #122, but a specific mechanism built to avoid it: the cache name is now auto-versioned per deploy (`reader-html-{hash}`, decoupled from the manually-bumped `PAGES_CACHE_VERSION`), stale versions are deleted on `activate`, and a `controllerchange`-driven "new version available" banner prompts a reload once a new service worker has taken control in the background (`skipWaiting`/`clientsClaim` stay `true`, unchanged — no app-wide update-consent gate). The matcher also gained a `request.mode === "navigate"` guard so it no longer shadows Serwist's own RSC matcher for the same URL. Separately, `setCatchHandler` is now **route-aware**: non-reader routes (e.g. `/plans`, `/settings`) get a dedicated small offline-fallback document instead of the Quran page-1 fallback, which previously left them stuck showing Quran content with no way to self-correct. A residual risk is accepted, not fixed: the CDN in front of the origin (ADR 0035) can serve a response up to 5 minutes stale, and the first fetch that populates a fresh deploy's cache could pin that staleness for the whole deployment instead of self-healing every request the way `NetworkFirst` did — judged rare enough to accept given it fully restores `CacheFirst` speed. See [ADR 0014 Addendum 4](adr/0014-pwa-offline-architecture.md) and `docs/plans/pwa-offline-support.md` Addendum 4.

**Amended (Addendum 5, Issue #256):** the bulk precache is no longer fixed to one hardcoded edition. Any registered mushaf edition (`MUSHAF_EDITION_IDS`) can be independently downloaded from the Settings "Mushaf Layout" list — its own row, own explicit tap, own sentinel, own progress state — with no eviction: a user may keep multiple editions cached offline at once. The first-run gate and post-install prompt are unchanged and still offer the default edition only. See [ADR 0014 Addendum 5](adr/0014-pwa-offline-architecture.md) and [ADR 0023 Addendum 7](adr/0023-tajweed-mushaf-mode.md).

**Constraints:**
- `isStandaloneDisplayMode()` lives in `app/utils/platform.ts` (moved from `use-pwa-precache.ts` when the app-launch-redirect and Android back-exit-guard features needed the same check — see "App Launch & Back Navigation (Android PWA)" below) and must check every `display-mode` value the manifest can produce — currently `standalone` and `fullscreen` — plus iOS's `navigator.standalone`. A manifest `display` change that isn't mirrored here silently disables the Settings row, the first-run gate, the app-launch redirect, the back-exit guard, and (Chromium in-tab prompt aside) the entire consent flow, with no error surfaced anywhere. Every consumer must import this one function — do not re-derive display-mode detection locally.
- The precache sentinel, dismissed-flag, and SW message contract (`runId`/`mushafId`) are per-edition — never share one across editions (ADR 0014 Addendum 5). A shared sentinel silently misreports one edition as "ready" once any other edition finishes.
- The offline navigation fallback document must stay tiny and independent of the bulk 604-page download — it has to work before that download has ever run. Do not make it depend on `isCacheComplete`.
- Serwist registers the service worker for **every** production visitor (`register: true` is `@serwist/next`'s default) — not just installed-PWA users. The `display-mode: standalone` gate only controls the *bulk 604-page pre-cache* (`use-pwa-precache.ts`); it does not scope which visitors the service worker's runtime-caching rules apply to. Any runtime `CacheFirst` rule in `app/sw.ts` therefore affects regular browser tabs too.
- The reader-page HTML response (`/{locale}/pages/{id}`) is **not** immutable content — only the Quran words/verse text and fonts are. That HTML also carries the app shell (nav, layout, any feature UI), which changes on ordinary deploys. It is cached with `CacheFirst` under a cache name auto-versioned per deploy (`reader-html-{hash}`) — **do not** change it to a manually-bumped or static cache name, and do not drop the `controllerchange` update banner or the `request.mode === "navigate"` matcher guard — any of those three regresses toward Trello #122 (Addendum 4, ADR 0014 Addendum 4). Page **fonts** (`isPageFont`) remain `CacheFirst` under the unrelated, manually-bumped `PAGES_CACHE_VERSION` — those genuinely never change.
- Never unconditionally pre-cache page fonts for regular web visitors — this would reintroduce the exact problem the per-page font-inlining architecture (Font System decision, above) was built to avoid. The gating is load-bearing; per Addendum 2 the gate is **explicit consent** (a completed install *plus* a tap), not `display-mode` alone. A browser tab that has not seen an `appinstalled` event must download nothing, ever.
- **`globPublicPatterns` in `next.config.mjs` must stay pinned to the app shell** (`icon.svg`, `icons/**/*`, `quran/chapters.json`). Its `@serwist/next` default of `["**/*"]` swept all of `public/` into the service worker's **install-time** precache manifest — 604 base fonts + 604 tajweed fonts + 1208 page JSON, ~137.7 MiB fetched by every production visitor in a plain browser tab, since install precache ignores `display-mode` entirely and is all-or-nothing. That silently violated the constraint directly above, plus ADR 0023's tajweed exclusion, and rendered the consent gate meaningless. Anything in this list bypasses every gate in the feature — the standalone check, the dismissed flag, and the sentinel. Re-check it whenever a new bulk asset directory is added under `public/`.
- The bulk pre-cache is **user-initiated on an explicit tap** — never auto-started, on any of its three surfaces (in-tab prompt on `appinstalled`, blocking first-run gate, Settings button). Do not reintroduce a silent background pre-cache, including as a post-Skip fallback.
- A precache run carries a `runId`, and `CANCEL_PRECACHE` must name the run it stops. Chromium shares one service worker between a browser tab and the installed PWA — the sharing the `appinstalled` pre-warm depends on — so an unscoped cancel flag let one surface abort a download another surface was actively displaying.
- The client must re-request precache status on `visibilitychange`/`focus`. A run lives inside the worker's `event.waitUntil` and the browser may kill the worker mid-run; without a resync the UI stays on `running` forever with no run behind it.
- The blocking gate must keep a real focus trap and scroll lock (it is built on the Radix Dialog primitive). A bare `fixed inset-0` with `aria-modal` lets keyboard and screen-reader users reach the app it exists to block. Escape and outside-pointer dismissal stay suppressed so Download and Skip are the only exits.
- Keep offline UI at `z-50` or below — that is the app's Radix ceiling, and anything above it floats over open sheets and dialogs.
- Completion is recorded as a sentinel `Response` at `/__fq-precache-complete` inside `pages-v{N}`, written **only** after a fully successful run. Never write it on a partial run — a 603/604 cache cannot serve offline and must not report "Ready". The `localStorage` dismissed flag is scoped to the same cache version and set on dismissal only, never on download start (an interrupted run must be re-offered, not silently abandoned).
- The sentinel's presence is **not** sufficient proof of a servable cache — `isCacheComplete` also requires a `cache.keys()`-derived page count of 604 plus the verse-pages map, and deletes a stale sentinel that fails. iOS evicts entries out from under a completed run, and the old per-launch 604-page re-walk was the only thing that healed that; do not reduce this back to a bare sentinel `match()` as a performance cleanup (the count does no per-entry reads, so #129 stays fixed).
- Progress belongs on the surface that started the download. Settings shows a status row plus a Download button, and renders a progress bar **only while a download is actually in flight** — never the old ambient bar that sat there counting up on every launch regardless of whether the user had asked for anything.
- Do not add offline write-queueing for marks without re-opening ADR 0014 — the shared-mushaf last-author-wins model (ADR 0012) makes queued offline writes a silent data-loss risk against concurrent viewers.
- The pre-cached JSON/font cache is versioned independently of Serwist's per-deploy build-asset revisioning. Only bump the page-cache version manually when a change actually affects cached page output (content JSON shape, font logic) — bumping it on every deploy would force a full re-download of the page cache for every installed user on every deploy.
- The pre-cache set is fully locale-independent (slim JSON + base fonts) — do not reintroduce per-locale HTML precaching; the localized app shell comes from the Serwist build manifest.
- iOS Safari's Cache Storage quota/eviction behavior for installed web apps is stricter and less predictable than Chrome/Android; the page cache may be partially evicted there. This is an accepted platform limitation — the only mitigation is the existing "resume incomplete cache on next launch" behavior, not a guarantee of full offline coverage on iOS. (The JSON+font set is far smaller than the old full-HTML precache, easing this.)
- The manual `pages-v{N}` version constant lives in `app/constants/offline.ts` (`PAGES_CACHE_VERSION`) — bump it there when reader markup/font logic changes. It must stay in that one module: `app/sw.ts` and `app/hooks/use-pwa-precache.ts` both import it, and the client's dismissed-flag key is derived from it, so a duplicated literal would let the cache and the flag drift onto different versions.
- Serwist is disabled in development (`disable: process.env.NODE_ENV === "development"` in `next.config.mjs`) — `npm run dev` never registers a service worker. To test install/offline behavior, use `npm run build:local && npm start`. Use **`build:local`**, not `build`: the latter is the CI/production script and runs `prisma migrate deploy` with no env file, so it fails locally on a missing `APP_DATABASE_URL` before Next even starts. Also stop any dev server first — a dev server and a production build sharing `.next` corrupts the output, which surfaces as prerendered routes 500ing with nothing logged.

---

## App Launch & Back Navigation (Android PWA)

**Decision:** On standalone/fullscreen mobile/tablet PWA (`isStandaloneDisplayMode()`, `app/utils/platform.ts`, excluding desktop via `useIsDesktopUp`), a cold app launch (OS opening `start_url`) opens the last-read reader page directly. See [ADR 0040](adr/0040-android-pwa-back-exit-guard.md) for the related back-button mechanism.

**Amended ([ADR 0042](adr/0042-pwa-launch-resolves-before-first-paint.md)):** every launch-time navigation decision now resolves **before first paint** — a React effect runs after paint by definition, so the original `AppLaunchRedirect` (`useEffect` on the home page) showed the full home surah list before replacing it. `start_url` is `/launch.html`, a static hand-written public file whose synchronous `<head>` script reads the persisted position and calls `location.replace()` during HTML parsing; it never paints, so the OS splash stays up until the reader paints. The position is persisted as a **full path** (`lastReadPath`, e.g. `/ar/pages/300`) written from the one site in `LastReadPageContext.setLastReadPage`, so the pre-React script needs no locale detection at all. `AppLaunchRedirect` and its once-per-session module flag are deleted — home is no longer the launch target, so a hard refresh on home in standalone now stays on home. The manifest also pins `id: "/"`, without which changing `start_url` would re-identify the app and orphan every existing install.

**Amended (ADR 0042 Addendum, 2026-08-18):** `ContinueReadingLink` is no longer hidden on standalone mobile/tablet — see the updated constraint below and `docs/plans/restore-continue-reading-pwa-icon.md`.

On **Android** standalone/fullscreen mobile/tablet only (not iOS — no back button/gesture to trap there), pressing the hardware/gesture back button while anywhere on the user's own reader (`/pages/...`, excluding the shared-mushaf grant reader `/mushaf/[grant]/pages/...`, per the same exclusion `LastReadPageSync` already uses) shows a "press back again to exit" toast on the first press instead of navigating away; a second press within 2s calls `window.close()`. Back navigation is completely unchanged everywhere else (Settings, Marks, Home, the grant reader) — it only intercepts on the reader route, and always attempts exit on the second press rather than falling back to a real prior history entry (e.g. Home), even when one exists. See ADR 0040 for why this requires a double-push history guard rather than a single dummy history entry.

Because reader page-swipes use `history.replaceState`, not `pushState` (Reader Navigation — Persistent Client Pager, below), swiping through any number of pages never grows browser history — back-button behavior after swiping is identical to back-button behavior before swiping. No special-casing was needed for that scenario.

**Constraints:**
- Do not let the back-exit guard re-derive display-mode or Android detection independently — it must import `isStandaloneDisplayMode()` from `app/utils/platform.ts`, same as every other offline/PWA surface.
- Never collapse the double-push history guard to a single pushed entry — see ADR 0040. That silently reintroduces "second back press falls through to home" whenever the reader was reached via real in-app navigation.
- **Allocate a fresh state object on every `history.pushState` call — never a module-level constant.** Next's history patch mutates the object it is handed, stamping `__NA` and the current router tree onto it; a reused object therefore both freezes the tree captured at the first push and, via the patch's `__NA` early-out, bypasses the router sync on every push after that. Combined with the pager's `replaceState`-driven navigation (which Next converts into an `ACTION_RESTORE` that reads the tree back out of history state), a stale tree re-renders the app at the wrong locale and page from cache with no network fetch. This was issue #288; see ADR 0040's 2026-08-14 addendum. Applies to any direct history-state write in this codebase, not only the guard.
- The nav's `ContinueReadingLink` renders unconditionally on every breakpoint and display mode (ADR 0042 Addendum, 2026-08-18) — it is no longer hidden on standalone mobile/tablet. That hiding assumed home was reachable only via a redirect-covered cold launch; ADR 0042 made home a legitimate mid-session screen with no other way back to the last-read page, so the link stays visible there too, matching desktop/browser-tab behavior.
- Never move a launch-time navigation decision into a React effect. `useEffect` runs after paint, so whatever the server rendered is visible first — that is the entire defect ADR 0042 fixes, in both its forms (the home flash online, the page-1 flash offline). Before-paint work belongs in the launch script or in an isomorphic **layout** effect.
- `public/launch.html` must stay in the root `middleware.ts` `config.matcher` exclusion list and in `globPublicPatterns` in `next.config.mjs`. Dropping the first makes `intl-middleware` redirect it into a locale prefix and 404 it (the trap that broke the PWA icons); dropping the second un-precaches it and breaks offline cold launch.
- The launch script must validate `lastReadPath` against `^/(ar|en)/pages/(\d{1,3})$` with the page bounded to 1–604 before navigating. It navigates to a string read from `localStorage` — an unvalidated read is an open redirect, not a cosmetic concern.
- The launch script must keep reading the legacy numeric `lastReadPage` when `lastReadPath` is absent, resolving it to an unprefixed `/pages/{n}`. Every install predating ADR 0042 has only the numeric key, so dropping this fallback sends the whole existing user base to page 1 on the one launch the feature exists to make seamless. There is no safe deadline to remove it — a dormant install can surface at any time.
- The launch script duplicates **two** literals that cannot be imported into a pre-React file: the `display-mode` list from `app/utils/platform.ts` and the `1367px` breakpoint from `DESKTOP_UP_QUERY` (`app/hooks/use-is-desktop-up.ts`). Changing either at its source means editing `public/launch.html` too.
- The manifest's `launch_handler.client_mode` must stay `"focus-existing"`. `"navigate-existing"` focuses the running app **and** navigates it to the launch URL, which drags a user sitting on Settings or Marks back into the reader on every icon tap.
- The manifest's `id` must stay `"/"` and must never be derived from `start_url` again. With no `id`, app identity comes from `start_url`, so changing that field orphans every existing install and duplicates the icon on reinstall.
- `lastReadPath` and `lastReadPage` must keep being written together from `LastReadPageContext.setLastReadPage`. Two write sites would let the launch script and `ContinueReadingLink` disagree about where the user left off.
- `ReaderPager`'s offline fallback self-correction must stay an isomorphic **layout** effect (the `useIsomorphicLayoutEffect` pattern in `app/hooks/use-is-desktop-up.ts`, which exists to suppress React's server-side `useLayoutEffect` warning). Reverting it to `useEffect` reintroduces the page-1 flash ADR 0014 Addendum 3 had accepted.

**Overlay close-on-back-gesture (2026-08-15, [ADR 0043](adr/0043-overlay-close-on-back-gesture.md)):** on mobile/tablet installed PWA (Android **and** iOS, not desktop — `useIsStandaloneMobileOrTablet()`, no `isAndroid()` gate), every modal overlay (`MarkModal`, `SettingsSidebar`, the surah `Sidebar`, `NavOverflowMenu`, `RecitationSettingsSheet`) closes on the first back-gesture instead of letting it navigate the underlying page. All five use one shared hook, `useCloseOnBackGesture(open, onClose)` (`app/hooks/use-close-on-back-gesture.ts`), which pushes a fresh, uniquely-id'd guard history entry on open and closes the overlay on the next real back press. A shared module-level flag (`app/utils/overlay-back-guard.ts`) marks whether an overlay guard is currently armed; `AndroidBackExitGuard`'s `popstate` handler checks it first and defers entirely when set, relying on mount order (the reader's exit-guard always mounts before a user can open anything on top of it) rather than event-timing tricks. At most one overlay is ever open at a time — every one of the five is a modal Radix `Dialog`/`Sheet` that blocks interaction with whatever is behind it, so no stack is needed, just the one flag. `useIsStandaloneMobileOrTablet()` (`app/hooks/use-is-standalone-mobile-or-tablet.ts`) factors out the `!isDesktopUp && isStandaloneDisplayMode()` half shared with `AndroidBackExitGuard`'s own gate.

**Constraints:**
- Any new overlay that should close on back-gesture must use `useCloseOnBackGesture` — do not write a second independent `popstate` listener; it would race with `AndroidBackExitGuard` and any other armed overlay guard with no defined precedence.
- Any new code that adds its own global `popstate` listener on a route that can have a reader-mounted `AndroidBackExitGuard` underneath it must check the shared "overlay armed" flag first, the same way the guard now does.
- Reuse ADR 0040's "fresh state object per `history.pushState` call" rule here too — never hoist the guard's pushed state to a module-level constant.
- The cleanup's "is my entry still on top" check must be **deferred to a microtask** and must compare by the pushed entry's unique **`fqOverlayGuardId`**, not just the shared `fqOverlayGuard` shape. Two overlays can transition in the same React commit (e.g. `NavOverflowMenu`'s Settings row calling `closeMenu()` and `setSettingsOpen(true)` together) — React runs every cleanup before any new setup, so a synchronous, shape-only check sees its own entry as "still on top" even though a sibling's `pushState` is about to land over it moments later in the same commit. Calling `history.back()` on a stale synchronous read pops whatever is *actually* on top when the (asynchronous) traversal resolves — the sibling's freshly-pushed entry, not this guard's own — and the sibling's own `popstate` listener has no way to attribute that echo to someone else's cleanup, so it reads it as a real back press and closes itself immediately. See ADR 0043's 2026-08-15 addendum; found in review before merge, reproduced via exactly this Settings-tap path.
- When the overlay's pushed guard entry (by id) is no longer the top of history at check time, do not call `history.back()` — it would remove the wrong entry. Leave it as a harmless orphan; the cost is one future back press being a no-op instead of a broken navigation or a wrongly-closed sibling.
- A close caused by a `<Link>` navigating inside the overlay must call the hook's `notifyNavigating()` before triggering the close, not rely on the timing check to win the race. Next's own `pushState` for the target route can land *after* the deferred microtask check runs, which would otherwise make the check wrongly conclude the guard's entry is still on top and call `history.back()`, cancelling an in-flight navigation — this is how [#313](https://github.com/furqan-app/web/issues/313)'s "My Marks/My Plans/Shared mushaf do nothing on Android standalone" bug happened. Applies to **both** branches — this same race exists independently in the Navigation-API branch ADR 0045 adds below, not just the `popstate` path described in this section. See ADR 0043's 2026-08-16 addendum.

**Overlay close-on-back-gesture uses the Navigation API where available (2026-08-15, [ADR 0045](adr/0045-navigation-api-for-overlay-close-guard.md)):** on-device testing, instrumented directly through `window.navigation`'s own event log, found a real swipe-back closing an overlay fires TWO separate `navigate` events ~6ms apart — a clean, same-document `traverse` (the guard entry popping correctly; this part was never broken) followed by a distinct, non-user-initiated `navigationType: "reload"` event, which is what actually produces the hard-reload flash. `popstate` fires only after the browser has already dispatched the traversal — confirmed on-device to fire *after* the `reload` event, not before — so it structurally cannot prevent either. `useCloseOnBackGesture` now feature-detects `window.navigation` support and, where available (modern Android Chrome/Samsung Internet, iOS 26.2+), intercepts BOTH events via `event.intercept()`. Where unsupported, it falls back to the exact `popstate`/`pushState` mechanism described above, unchanged. `AndroidBackExitGuard` (ADR 0040) is untouched — it does not exhibit this hard-reload bug.

**Constraints:**
- Do not drop the `popstate`/`pushState` fallback path — Navigation API support is not universal (notably iOS < 26.2), and this hook must not regress below what ADR 0043 already shipped for those browsers.
- `NavigationHistoryEntry.getState()` did not reliably return the object passed to `history.pushState` in on-device testing, even though the legacy `history.state` carried it through correctly in the same capture — do not use `getState()`/`fqOverlayGuardId` to identify "is this my pushed entry" on the Navigation-API branch. Use `NavigationHistoryEntry.key` instead (platform-guaranteed-unique, not dependent on custom state round-tripping): capture `navigation.currentEntry.key` immediately after the guard's own `history.pushState` call, compare against `navigation.currentEntry.key` read again inside the `navigate` handler (which at fire time for a `traverse` is still the entry being LEFT, not `event.destination`).
- The reload-watch timer/listener started after intercepting the closing `traverse` must survive the effect's own cleanup — React runs that cleanup essentially immediately once `onClose()` flips `open` to `false`, well inside the watch window. Gate the cleanup on an `awaitingReload` flag rather than letting it unconditionally clear the timer — found during implementation; the first draft silently defeated the whole fix this way.
- Whether `popstate` also fires alongside an intercepted `navigate` event for the same traversal is still unconfirmed — the implementation does not assume either way, but this needs an on-device pass once deployed (the Navigation-API branch can't be exercised against the installed PWA from a local dev server).
- This branch's cleanup must also check `notifyNavigating()`'s ref before comparing `nav.currentEntry?.key` — see the `notifyNavigating` constraint above (ADR 0043's 2026-08-16 addendum); the same in-flight-`<Link>`-navigation race exists here independently of the `popstate` path.

---

## First-Paint-Critical Positioning Must Be CSS-Gated, Not JS-Hook-Gated

**Decision:** `useIsMobile`/`useIsTablet`/`useIsDesktopUp` (and any other `matchMedia`-backed hook) may only drive UI that's allowed to be wrong for one frame after mount. They must never decide `position`/`display` that has to be correct on the very first paint — SSR always renders their `false` default, and the browser paints that raw HTML before hydration's `useIsomorphicLayoutEffect` ever runs, so even a layout effect can't undo it. Breakpoint-dependent positioning that must be right immediately goes in a CSS `@media` rule instead, using the same width the JS hook encodes; route/state gating that CSS can't express (e.g. `usePathname()`) stays as a class hook, since `usePathname()` — unlike viewport width — resolves correctly on the very first server render. See [ADR 0043](adr/0043-breakpoint-positioning-must-be-css-gated.md); the reader `Nav`'s overlay positioning (`docs/plans/tablet-nav-overlay.md`, "CSS-gate nav overlay positioning" addendum) was migrated to this pattern after the JS-hook version caused a first-paint flash (nav in flow → briefly scrollable page → nav snaps to fixed, content jumps up). The tablet 3-panel carousel offset ([ADR 0027](adr/0027-tablet-swipe-carousel.md)) already used this technique before it was generalized here.

**Constraints:**
- Do not add a pre-hydration inline `<script>` as a substitute — that path already exists for theme/safha-view (`app/layout.tsx`) and is reserved for state that genuinely can't be expressed in CSS (e.g. reading `localStorage`). Breakpoint width can always be expressed in CSS; prefer that.
- Keep the CSS `@media` width and the JS hook's query string numerically identical when either changes — there are now two representations of each breakpoint and no shared constant between them.

---

## Full-Viewport Heights Anchor to the Initial Containing Block, Not to Viewport Units

**Decision:** Any box whose height must equal the visible viewport resolves that height from the initial containing block — `position: fixed` with `inset: 0`, with containment below it — never from `100dvh`/`100svh`/`100lvh`/`100vh`. This traces back to the installed PWA's `display: "fullscreen"` immersive-transition race described below; `display` was later reverted to `"standalone"` (see [feature-pwa-fullscreen-focus-mode.md](../plans/feature-pwa-fullscreen-focus-mode.md) Addendum, #317 — Android's non-sticky immersive mode surfaced the status bar on ordinary taps, not just edge swipes, which was never the intended UX), so the specific race no longer occurs — but the ICB-anchored fix is kept regardless: it's strictly more robust than a viewport unit and costs nothing to keep. In the (now historical) broken state: Android launched non-immersive and Chrome entered immersive fullscreen a moment later; a document that laid out during that transition got its viewport units pinned to the transitional viewport and Chrome never re-resolved them. Measured on-device: `100dvh` read `888.364px` on elements that existed at transition time while `window.innerHeight` was `832` and a *newly created* element read the correct `832.364px` in the same frame — and **no `resize` event is delivered at all**, so nothing in the page can observe or react to it. See [ADR 0044](adr/0044-viewport-units-are-unreliable-in-the-installed-pwa.md). This **supersedes the "use `dvh`, not `vh`" rule below for full-viewport heights only** (the mobile safha entry and the `Sidebar` bottom-clip entry): that rule remains correct about `vh` vs `dvh` on browsers with collapsible chrome, but in the installed PWA both are unreliable, so full-viewport heights leave the viewport-unit family entirely. `dvh` stays the right choice wherever a viewport unit is still appropriate.

**Constraints:**
- Height travels below the ICB-anchored box by `align-items: stretch`, never by percentage heights — `height: 100%` inside a flex-grown box resolves to `auto` and collapses the card (the same trap [ADR 0036](adr/0036-reader-fills-height-band.md) records for the desktop spread; re-measured here, the card fell 812px → 469px).
- Viewport units are still fine where the value is not a full-viewport height *contract* and can be off without breaking a layout guarantee (e.g. `max-h-[70dvh]` on a bottom sheet).
- A viewport unit that feeds a **font size** rather than a box height (the tablet `--fq-tablet-word` cap) cannot inherit a box height and needs its own treatment — a stale launch there yields an oversized font, not a scroll.
- Do not "fix" this by detecting the mismatch in JS and poking a custom property on `:root`. It works (verified live) but can only run after paint, so a losing launch paints the wrong size and then visibly jumps.

---

## Release & Deployment Workflow

**Decision:** Prod deploys go through a required `release/x.y.z` stabilization branch, not directly from `main`. Staging (`stg`) is decoupled from the release flow and tracks `main` directly. See [ADR 0015](adr/0015-release-branch-workflow.md), [ADR 0026](adr/0026-staging-environment.md), and [ADR 0039](adr/0039-stg-tracks-main-directly.md).

```
main → PR → stg   (direct, no release cut required)
main → /cut-release → release/x.y.z → /promote-release → prod → /sync-main-from-prod → main
```

- `/cut-release <major|minor|patch>` — branches `release/x.y.z` off `main`, bumps `package.json` version + tags `vX.Y.Z`, labels every card in **"To Be Released"** with the version and moves them to **Done**, then creates a GitHub Release whose notes are built from those same cards (title + URL) — not `--generate-notes`, since Trello is the curated "what's included" source, not raw commit/PR history. It also diffs the previous release tag against the new release branch for Quran/App DB changes and, if any are found, appends a `## Manual Action Required` section to the release notes and calls it out in its chat report — non-blocking, reminder-only (see below).
- `/promote-to-staging` — opens the PR `main` → `stg`. Hostinger's staging site auto-deploys on any push to `stg`, so merging the PR is sufficient. No longer tied to a release version.
- `/promote-release <version>` — opens the PR `release/x.y.z` → `prod`. Hostinger auto-deploys on any push to `prod`, so merging the PR is sufficient — no manual hPanel redeploy click needed.
- `/sync-main-from-prod` — opens the PR `prod` → `main` afterward, to capture any fixes made on the release branch back into `main`.
- `/release <major|minor|patch>` — orchestrator that runs `/promote-to-staging`, `/promote-release`, and `/sync-main-from-prod` in one continuous flow around `/cut-release`, pausing only at genuine human checkpoints (confirm the `stg` PR merged and staging looks right, confirm the prod PR merged, confirm the `main`-sync PR merged). Verifies PR merges via `gh pr view` rather than trusting the user's word where that's possible.

**Constraints:**
- `protect-prod.yml` only accepts PRs into `prod` whose source branch starts with `release/` — direct `main → prod` PRs are no longer permitted, including for hotfixes (cut a release branch for those too).
- `protect-stg.yml` only accepts PRs into `stg` whose source branch is exactly `main` — `release/*` and any other branch are rejected (ADR 0039). This means a release cut after a `main → stg` staging check can include additional `main` commits merged after that check ran; the exact `release/x.y.z` artifact is never separately staged.
- Staging (`stg`) has its own fresh `furqan_quran`/`furqan_app` databases, independent of prod's — never a snapshot of prod data, to avoid copying real user data into a lower-security environment.
- Cards move into "To Be Released" manually when their PR merges to `main`; `/cut-release` is what stamps the version label and moves them to `Done`, not the merge itself.
- Do not skip `/sync-main-from-prod` after a release — without it, fixes made directly on a release branch during stabilization silently disappear from `main`'s history.
- `/release` must not skip its checkpoints — PR merges must always be verified via `gh`, never assumed; only the "staging looks right" judgment at Checkpoint 1 has no programmatic check and is taken on the user's word.
- `/cut-release`'s DB-change detection is file-path-based only (`prisma/quran/schema.prisma`, `scripts/quran-seed/**`, `prisma/app/migrations/**`) and never blocks the flow — it exists because the Quran DB has no automatic migration path (`prisma/migrations` is explicitly unused for it; re-sync is the destructive `npm run seed:quran -- --force`), so a schema/seed change merged to `main` silently doesn't reach prod without a manual re-seed. It does not attempt to detect generic application-level breaking changes — that's left to PR review.

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

## Reader Navigation — Persistent Client Pager

**Decision:** The reader navigates between pages with a **persistent client-side pager**, not a
route change per swipe. `/[locale]/pages/[id]` stays statically generated as the SSR *entry* (deep
links, SEO, first paint, PWA); once hydrated, the client `ReaderPager` owns navigation. It holds a
persistent `anchor` and moves a small mounted **window** (visible page ±1 on mobile/desktop, spread
±1 on tablet double-view) via `commitTo` (a `flushSync` anchor-swap + re-center), syncing the URL
with `history.replaceState` — no `router.push`, no remount. Swipe, the in-spread arrows, and
recitation-follow all funnel through `commitTo`.
Page content is served as **immutable slim static JSON** (`public/quran/pages/{n}.json`, ~10×
smaller than the old RSC), fetched on demand and cached; marks stay the only dynamic layer, applied
as an overlay. Render model is **windowing first** (reuse existing word components, mount only the
window), with **event-delegated static markup** documented as an escalation if a real-device
re-profile misses the target. See [ADR 0028](adr/0028-reader-persistent-pager.md) and
`docs/plans/reader-persistent-pager.md`.

**Rationale:** Profiling showed each `router.push` swipe deserialized a 2.27 MB RSC payload and
mounted ~1,478 word components across 10 pages, blocking the main thread ~183 ms on a fast desktop
(~0.6–1.1 s on mobile) — the reported freeze. The pager removes the remount; slim JSON removes the
payload; windowing removes the mass mount.

**Constraints:**
- Keep `/pages/[id]` statically generated — only *subsequent* swipes are client-only; never make the
  reader route dynamic.
- Content JSON is a build artifact under `/public`, immutable and Prisma-free at runtime; never bake
  marks into it.
- `commitTo` is the single in-reader navigation primitive — swipe, arrows, **and** recitation-follow
  all use it; do not reintroduce `router.push` for in-reader page changes, and do not read
  `usePathname()` for the current page (`replaceState` never updates it — that is exactly what broke
  recitation-follow before it was moved into the pager).
- Recitation-follow: `RecitationContext` exposes `recitedPage`; a dedicated null-rendering
  `RecitationFollow` leaf watches it and calls the pager's `followTo`. Two invariants: (a) the
  recitation subscription MUST stay in that leaf, never in `ReaderPager` — the context ticks on every
  recited word, so subscribing the pager re-renders the whole reader tree per word (flicker + repeated
  font fetch); (b) `followTo` MUST defer its `commitTo` to a microtask — `commitTo`'s `flushSync`
  flushes passive effects synchronously, so an inline follow runs mid-commit (guarded out, never
  retries → never returns) and nests a flush. See ADR 0028 and the plan.
- The window unit is breakpoint-dependent (page vs spread) — do not hardcode single-page.
- **The same page is mounted more than once at the same time.** `getPagePair(N)` makes `pair(N)` and
  `pair(N±1)` overlap, so in the single-page layout two of the three panels render the same page; and
  `QuranSpread` always mounts *both* members of a pair, hiding the non-current one with
  `.fq-spread .fq-safha-partner { display: none }` because the single-vs-double display gate is CSS,
  not JS (ADR 0013 Addendum 4). A hidden copy is fully mounted, runs its effects, and matches
  selectors. Anything that reaches a word in the DOM must therefore tolerate **multiple live matches
  per `word.location`** and must never cache one element per location — a one-element map picks its
  winner from mount/commit history, not from visibility, and survivors are `memo`'d and *moved* by the
  keyed window so they never re-register after an eviction. This shipped as the recitation word-tracking
  bug (Trello #182): the highlight advanced on a `display:none` copy while a stale one sat frozen on the
  visible page. Do not "fix" it by deduping the mount — the three-panel window and the CSS display gate
  are both load-bearing.
- The commit **slide** belongs to the swipe gesture alone. It exists to continue a drag's live
  transform from where the finger released, so `animateCommit` animates only when its `animate` arg
  is true (swipe); the in-spread arrows and the keyboard pass false and commit instantly via
  `commitTo`. Do not re-unify the three inputs onto the animated path — a click or keypress has no
  transform in flight, so the slide reads as a phantom swipe, and the `ui-motion` skill rules out
  animating keyboard-initiated and high-frequency actions outright. Gate this on **input source,
  never on a breakpoint**: the arrows render from `md`, so an `isLgUp` gate leaves tablet arrow-taps
  sliding and kills swipe motion on a touch laptop. Because an instant commit clears `isCommitting`
  synchronously, the keyboard path also needs its own `e.repeat` guard — the slide's duration used to
  be the only thing rate-limiting a held arrow key. See `docs/plans/arrow-controls-desktop.md`
  Addendum 1.
- **Input arriving during a commit TAKES OVER, never dropped** (Trello #153, [ADR 0028](adr/0028-reader-persistent-pager.md)
  Addendum 2026-08-11). The in-flight turn is **settled** — landed immediately, not aborted, since the
  user already committed to it past the threshold — and the new input is then handled as if nothing
  were in flight. This requires `animateCommit` to store its `EXIT_MS` timer id (`inFlight`); the
  unstored `setTimeout` is precisely why input had to be discarded before. Because `commitTo` uses
  `flushSync`, the re-render completes synchronously, so a caller must **re-enter through its ref**
  (`navRef`/`stepRef`) after settling rather than falling through — its own closure still holds
  pre-settle anchors and would resolve the wrong page. `e.repeat` must stay ahead of this or a held key
  turns a page per repeat. Swipe count equals page count on every path. Do not abort instead of settle
  (loses a turn the user asked for), and do not reintroduce a pending-step queue: it coalesced rapid
  input and needed a latch, a microtask and a drain to avoid dropping gestures of its own.
- Preserve recitation highlight, tajweed re-grouping, grant reader (ADR 0012), and the double-page
  spread (ADR 0013) against the pager/window model.
- **A page turn commits immediately and is never gated on the target's readiness** ([ADR
  0034](adr/0034-page-turn-readiness-on-slow-networks.md)). The two assets a turn needs — the page's
  content JSON and its WOFF2 font — cost real network time (a double-view turn moves ~167 KB of font,
  ~855 ms on Fast 3G), so gating the commit converts a visible blank into dead input of the same
  length. That wait is absorbed two ways instead: **lead time** (prefetch runs in two stages — Stage A
  warms the ±1 window on anchor settle, Stage B warms the second page in the last-committed direction
  and starts only once Stage A settles, so lookahead never competes with the window the user is about
  to see); and **an honest loading state** for whatever wait remains. Stage B is prefetch only — the
  mounted panel window stays at three.
- The loading state is a state of `QuranSafha` itself (nullable `pageMetadata`; the skeleton shows
  when content *or* font is missing), never a separate skeleton component — duplicated card chrome
  drifts from the real layout, which has already shipped as a bug once (see
  `docs/plans/fix-quran-page-font-loading.md` Issue 3).
- **A card rendering without content must reserve what the content would have sized.** On the
  desktop spread the card is content-sized (ADR 0013 Addendum 2), so an `absolute inset-0` skeleton
  contributes no height and the card collapses to header + footer (measured 608px → 110px, bars
  shrinking to 0). The bars therefore render **in flow as direct children of `.fq-quran-safha`**
  whenever there is no content, inheriting its real flex distribution, `--fq-line-gap` and padding;
  they stay an overlay only in the font-only wait, where the real text is mounted and supplying the
  height. This makes `SKELETON_LINE_COUNT` (15) and `SKELETON_LINE_COUNT_SHORT` (8, pages 1–2 —
  their surah banner and bismillah occupy slots too) load-bearing layout values: an undercount grows
  the card when the page lands. Those bars must also carry an **em width** (`QURAN_LINE_WIDTH_RATIO`
  em, the real line's width by construction), never `w-full`: the card is shrink-to-fit, and a
  percentage width contributes nothing to intrinsic sizing, so `w-full` bars let the card resolve
  against available space and then correct a frame later — measured 785px against a real 523px, and
  that over-wide value reached `--fq-spread-width`, which is what made the floating recitation bar
  jump. (The em width is necessary but, as of 2026-07-31, **not sufficient** — a width-settling
  artefact on the loading spread is still observed and is an open follow-up; see
  `docs/plans/fix-page-turn-blank-slow-network.md`.) Separately, the header reserves its cells with a
  non-breaking space
  when metadata is absent — cell heights are `font-size × line-height`, independent of glyph or digit
  count, so the reservation is exact. Card *width* needs no reservation; it is floored by the
  worst-case line-width formula and measures identical loaded and unloaded.
- Do **not** let the `Panel` loading state and the real spread differ in height. Rendering the real
  chrome makes them identical by construction, which is what keeps ADR 0028's geometry and the #157
  scrollbar-reflow fix (`docs/plans/fix-panel-placeholder-reflow.md`) intact — a placeholder taller
  than its content toggles a scrollbar and reflows the whole document on every turn.

---

## Swipe Animation — Core Gesture Only

> **SUPERSEDED by "Reader Navigation — Persistent Client Pager" above / [ADR 0028](adr/0028-reader-persistent-pager.md).**
> The single-slot `router.push`-per-swipe model (and ADR 0027's tablet carousel) is replaced by the
> persistent pager: navigation no longer changes the route, so the "no adjacent fetches", single-slot,
> and accepted-post-navigation-flicker items below no longer apply. Retained for history only.

**Decision:** `QuranSwipeNav` is a single-slot wrapper: one `overflow-hidden` outer div with a `stripRef` inner div that holds only the current page content. On drag it translates `stripRef` live. On commit (≥80px threshold) it animates to `translateX(±100%)` over 220ms then calls `router.push(href)`. On sub-threshold release it snaps back. `prefers-reduced-motion` skips the animation and calls `router.push()` directly. No adjacent page prefetching, no `startTransition`, no `router.prefetch()`. A post-navigation flicker (browser compositor artifact) is accepted as a platform limitation; the View Transitions API would address it but requires Safari 18+ and experimental Next.js support — out of scope. ADR 0019 (the original sessionStorage approach) and the three-page strip approach (Addenda 2–8) are both superseded. See Addendum 9.

**Constraints:**
- Swipe right = next page, swipe left = previous page (Quran RTL convention — constant regardless of UI locale).
- Do not add adjacent page fetches back — investigated in Addenda 2–8, confirmed zero benefit for the flicker, removed in Addendum 9.
- Do not add a positional/transform entry animation on mount — a transform-based entry reads as a second swipe (Addendum 4/5 incident).
- Do not add `startTransition` — Next.js App Router already wraps its router dispatch in `startTransition` internally; double-wrapping is a no-op (confirmed in Addendum 8/9).
- Do not use `sessionStorage` or `document.documentElement` attributes as fade-signal carriers — these mechanisms are superseded.
- **Exception (tablet double-view only):** the tablet spread uses a real 3-panel carousel that *does* render adjacent spreads — see [ADR 0027](adr/0027-tablet-swipe-carousel.md). This is a scoped divergence justified by static generation (adjacent fetch cost is build-time) and the reveal being a wanted feature, not a flicker fix. It does **not** relax the above constraints for mobile/single-view, which stay single-slot. The "no entry animation on mount" rule still holds even for the carousel — the incoming route renders statically centered.

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
- On failure, the Playwright HTML report is published to the `gh-pages` branch at `reports/pr-<PR_NUMBER>/` (additive push, never `actions/deploy-pages` — that replaces the whole Pages site per run and would clobber concurrent PRs) and linked from a sticky PR comment; a separate `pull_request: closed` workflow deletes a PR's report folder when it closes. See ADR 0022 Addendum (2026-07-15).
- **Any screenshotted screen whose content is client-fetched or client-hydrated needs an explicit positive content wait before `toHaveScreenshot` — never a fixed `waitForTimeout`.** Playwright disables CSS animations *before* its two-frames-100ms-apart stability check, so a frozen shimmer skeleton reads as a settled page, and `document.fonts.ready` (the only readiness signal it waits on by default) resolves long before the reader's line content arrives (ADR 0034). The wait must assert content is **present** — every `.fq-quran-safha` has a `.fq-safha-row` for the reader, the results heading for search — never that a loading marker is absent: `no .animate-pulse` is satisfied vacuously the moment that class is renamed, silently restoring the flake with no failing test. Guard against the same vacuity one level up (`every()` over an empty list is true), and pick a locator that cannot match content already on the page underneath — the home surah list renders the same surah names as the search dropdown. Never substitute `waitForLoadState("networkidle")`: the reader keeps fetching neighbour-panel JSON, marks and reciters after the spread has painted.
- **Locators in the search test must be scoped to the searchbar under test.** Mobile opens search in a dialog while the nav's own searchbar stays mounted, so two `SearchQueryResults` render and any page-level locator fails with a Playwright strict-mode violation.
- **`maxDiffPixelRatio` is load-bearing, not a formality — do not loosen it.** A mushaf page is mostly uniform paper, so pixelmatch flags few pixels even for a wholly different layout: measured at the default `threshold: 0.2`, a skeleton-vs-painted frame scores 0.0192 and a *whole design generation apart* scores only 0.037–0.061. At the original 0.02 the suite could neither catch a month-stale baseline nor distinguish one from a real regression; tightened to 0.002 in #175. Leave `threshold` at its 0.2 default when tuning this — raising the per-pixel colour tolerance trades a measurable pixel budget for exposure to font-rendering drift between CI runner images. See ADR 0022 Addendum (2026-08-02).

---

## Documentation & Workflow System

**Decision:** AI-first docs system adopted 2026-06-28. CLAUDE.md is a slim pointer file. Heavy context lives in `docs/`. Skills load context on demand:
- `/plan-fq-task` — Socratic planning → `docs/plans/<slug>.md`; UI-mode tasks also run `/impeccable critique` and may add a `## Design Remediation` section (ADR 0041)
- `/start-fq-task` — load context → implement → run any `## Design Remediation` entries via direct `/impeccable` Skill call (ADR 0041)
- `/retrospect` — end-of-session feedback loop; proposes DECISIONS.md updates, skill edits, memory saves review-before-write; saves `docs/retrospectives/YYYY-MM-DD.md`
- `/review-fq-work` — Opus subagent quality gate on branch diff vs main across 4 dimensions: bugs, quality, plan consistency, and (when the diff touches UI files) design/UX via `/impeccable critique` (ADR 0041)

Decisions are tracked in this file; ADR history is in `docs/architecture/adr/`.

---

## Impeccable Design Workflow Integration

**Decision:** `/impeccable`'s design/UX remediation commands are wired into the Furqan plan → implement → review cycle, invoked via direct Skill call (command + explicit target, never a subprocess or sub-agent) and always plan-driven — `/start-fq-task` never runs a design command the plan didn't name. See [ADR 0041](adr/0041-wire-impeccable-into-fq-workflow.md) for the full mechanism, the eligible command set, and rejected alternatives (CLI shell-out, sub-agent delegation).

**Constraints:**
- `/start-fq-task` only invokes impeccable commands listed in the plan's `## Design Remediation` section — it must not decide mid-implementation to run one that wasn't planned.
- Eligible commands are every Evaluate/Refine/Enhance/Fix command (`critique`, `audit`, `polish`, `bolder`, `quieter`, `distill`, `harden`, `onboard`, `animate`, `colorize`, `typeset`, `layout`, `delight`, `overdrive`, `clarify`, `adapt`, `optimize`) — never Build/Iterate (`craft`, `shape`, `init`, `document`, `extract`, `live`).
- `check-fq-standards` stays unchanged — its checklist doesn't overlap impeccable's (invariants vs. a11y/aesthetic/UX), so no dedup step is needed between them.
- `/review-fq-work`'s Dimension 4 only runs when the diff touches UI-relevant files (components, pages, `.css`/`.scss`) — skip it entirely for backend-only diffs.

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

**Decision:** Full-Quran recitation audio, reciter selection, and word-level ("karaoke") highlighting are powered by QDC's audio API, proxied live through new internal routes (`app/api/quran/recitations/...`) rather than seeded into the DB or called directly from the client. QDC serves one audio file **per chapter** (not per page), so a `RecitationContext` mounted once in `app/[locale]/layout.tsx` owns the `<audio>` element. It no longer navigates directly: it publishes `recitedPage` (the recited verse's `page_number`) and the reader's `RecitationFollow` leaf keeps that page in the visible window via the pager (ADR 0028) — the old `router.push`-from-context path was removed because it read `usePathname()`, which the pager's `replaceState` never updates. See [ADR 0021](adr/0021-recitation-playback.md) and [ADR 0028](adr/0028-reader-persistent-pager.md).

**Rationale:** Keeps the Quran DB/seeder untouched (no new schema, no re-seed) while still delivering continuous, page-following playback — reusing `/pages/[id]`'s existing pair-derivation instead of new routing logic. Mounting the context above the reader's route tree is what lets playback survive page navigation (auto-advance). ~~Leaving the reader entirely kept playback alive as a background mini-player.~~ **Superseded 2026-08-02 (Trello #152):** recitation now hard-stops when the user navigates away from any `/pages/` route — see ADR 0021 Addendum (2026-08-02) and `docs/plans/recitation-playback.md` Addendum 10.

**Constraints:**
- QDC is now a **runtime** dependency, not just a seed-time one (previously only `scripts/quran-seed/` called it at build time) — if QDC is down, playback breaks, not just re-seeding.
- Word-level highlight updates go straight to the DOM, not through React state/re-renders down the `QuranSafha`/`QuranWord` tree — `timeupdate` fires ~4×/second and re-rendering the full word list at that rate is a real perf risk. Do not copy this pattern for lower-frequency UI; the existing URL-param-driven `highlight.ts` approach remains the norm elsewhere. The mechanism is a **`data-fq-word` attribute plus a live `document.querySelectorAll` at highlight time**, toggling the class on *every* match — **not** a ref registry keyed by word location, which was superseded after Trello #182 (ADR 0021's 2026-08-03 addendum, `docs/plans/recitation-playback.md` Addendum 11). A `location` identifies content, not a unique DOM node: the reader mounts the same page in more than one panel at once, so a one-element-per-location map silently highlights a hidden copy and leaks stale classes onto the visible one. Equally, do not add per-word React state on the provider — a `setState` per recited word rebuilds the context object ~4×/second and re-renders every consumer, which is precisely what going to the DOM directly exists to avoid.
- Auto-advance always targets the recited verse's exact page number — never the locale-flipped `next`/`prev` href logic (`ReaderPage.tsx`'s `getNavigationHref`), which encodes *visual* swipe direction, not reading-order page sequence. Under the pager (ADR 0028) this is `RecitationFollow` calling `followTo`/`commitTo`, not `router.push` (removed — see the Decision above).
- Manual navigation (arrows/swipe/sidebar) during playback does **not** pause audio — playback keeps running on its own timeline. Under the pager (ADR 0028), swiping away while playing snaps back to the recited page (the `RecitationFollow` leaf pulls the visible window back), so you effectively cannot browse away mid-playback. Do not add logic that pauses playback on manual nav; this was explicitly decided against. (If free browsing during playback is wanted later, change the follow to trigger only when `recitedPage` *advances*, not on every anchor change — a known, deliberately-deferred trade-off.)
- ~~Chapter-end stops playback (no auto-continue into the next surah) — do not add cross-chapter auto-continue without revisiting this decision.~~ **Superseded 2026-07-16** — cross-chapter chaining was added to support `stopPoint: "hizb" | "juz" | "none"` (and to correctly fix `"page"` when a page spans two chapters). See ADR 0021 Addendum (2026-07-16) and `docs/plans/recitation-playback.md` Addendum 5.
- Recitation is available on both the self reader (`/pages/[id]`) and the shared-access grant reader (`/mushaf/[grant]/pages/[id]`) — any new recitation UI/context must not assume it's only reachable from the self-reader route tree.
- The QDC integration itself sits behind a `RecitationProvider` adapter (`app/lib/recitation/provider.ts` interface, `qdc-provider.ts` implementation) rather than being inlined in the route handlers — `app/lib/recitation/` is the established location for server-only third-party integrations (distinct from `app/providers/`, which is React context providers, and `app/server/actions/`, which is Next.js server actions). The adapter throws `RecitationProviderError` on fetch failure and returns `null` for "valid response, nothing found" (e.g. no audio for a reciter/chapter) — routes map throw → `502`, `null` → `404`. No provider registry/factory exists; add one only when a second provider is real.
- `Verse.verse_key` is **not** a unique/indexed field in `prisma/quran/schema.prisma` — always look it up with `findFirst`, never `findUnique` (which requires a unique field like `id`).
- `handleTimeUpdate` (`RecitationContext.tsx`) must start with `if (audio.paused) return;`. Per the HTML spec, `audio.pause()` always fires one more `"timeupdate"` event afterward as a deferred task, even though `paused` itself flips synchronously before that task runs. Without the guard, that stray tick reads `previousVerseKey` as the `null` `stop()` just set, takes the "verse changed" branch, and resurrects `currentVerseKey`/`recitedPage`/the word highlight right after `stop()` cleared them — visible as the highlighted word staying lit and a later `play()` on a different page snapping the pager back to the old one (`RecitationFollow` acting on the resurrected stale `recitedPage`). See `docs/plans/tablet-nav-overlay.md`'s bug-fix addendum.
- `play(verseKey, overrides?)` accepts an optional `PlaybackOverride` (`{ stopVerseKey, stopChapterId, rangeRepeatCount, id, label }`, `app/types/recitation.ts`) override (used by listening-wird inline playback, see `docs/plans/listening-wird-inline-playback.md`) that bypasses `resolveStopTarget`/`settings.stopPoint` entirely and sets a `rangeRepeatOverrideRef` consulted instead of `settings.rangeRepeatCount`. This lets a caller play an exact, arbitrary verse-to-verse range (e.g. a wird's page span, which aligns to none of the existing stop-point scopes) without persisting anything into the user's stored recitation settings. `id` is a stable identity for whatever launched the session (`plan:{planId}:{trackKey}` for a wird row, via `app/lib/plans/assignment-range.ts`) — surfaced as `activeOverride: { id, label } | null` so a UI row can tell *its own* session apart from an unrelated session that merely happens to be reciting inside the same pages; a page-range overlap is not identity. `label` is the human-readable form the settings sheet shows as a read-only "Playing: …" banner. `decideChapterEnd` (`app/utils/recitation.ts`) takes an `isRepeatableRange: boolean` rather than the raw `stopPoint`, computed at the call site as `rangeRepeatOverrideRef.current != null || settings.stopPoint !== "none"` — an active override is always a bounded, repeatable range regardless of what the user's persisted stop-point says, and this preserves the original "none" gate byte-for-byte for non-override sessions. Two mid-session effects end an override's framing: the "stop-point changed" effect (`settings.stopPoint` / `settings.rangeTo`) re-resolves the stop target from the currently-playing verse *and* clears the override; a separate effect keyed on `settings.rangeRepeatCount` clears the override only, deliberately leaving the stop target where the override put it (a repeat-count edit must not silently move where the range ends). **Superseded 2026-08-01** — `RecitationSettingsSheet` now disables the "Stop at" `RadioGroup` (including `CustomRangePicker`'s own controls when `stopPoint === "custom"`) and the "Repeat whole range" `RepeatStepper` while `activeOverride != null`, as a stronger visual differentiation than the read-only banner alone. Scope is exactly those two — Reciter, "Repeat each ayah", Playback speed, and Pause between repeats stay editable since none of them interact with the override. Stop is now the only way to end an override session (the "fall back to plain settings-driven playback by touching a control" escape hatch this decision originally described no longer exists in the UI, though the two clearing effects above remain as a harmless defensive backstop). See `docs/plans/listening-wird-inline-playback.md`'s "Disable Stop-at/Repeat During an Override" addendum.

---

## Offline Recitation Audio

**Decision:** Users can download a surah's or a whole juz's recitation audio (for a chosen reciter) on the installed PWA, for playback without a connection. Settings gains an "Offline Recitation" row opening a dedicated sheet (reciter picker + by-surah/by-juz lists + a downloaded-items manager), gated the same way as the bulk page cache (`isStandaloneDisplayMode()` + online). Each download is **self-contained**: it caches that chapter's audio MP3 + its verse-timing metadata into a new `recitation-download-v{N}` cache, and its reader pages (JSON + font) plus the shared per-edition verse→page map into the **existing** `PAGES_CACHE_NAME` — the same cache the bulk 604-page download uses, so nothing is duplicated if a user does both. A new service-worker `CacheFirst` + `RangeRequestsPlugin` rule matches the QDC audio CDN host (`download.quranicaudio.com`, confirmed to send `access-control-allow-origin: *` and `accept-ranges: bytes`), so `<audio src>` — unchanged, still the live QDC URL — transparently resolves from cache offline with real seek support; `RecitationContext`'s playback code is untouched. Playing a downloaded item reuses the existing `PlaybackOverride` mechanism (start/stop verse bounds computed once at download time, no live stop-point DB lookup needed at play time) and, for a juz, the existing cross-chapter chaining logic. See [ADR 0046](adr/0046-offline-recitation-audio.md), and [ADR 0014](adr/0014-pwa-offline-architecture.md)/[ADR 0021](adr/0021-recitation-playback.md) for the systems it reuses.

**Constraints:**
- A juz's bounds (first/last verse, chapter list) are resolved from the `Rub` table (`(N-1)*8+1..N*8`), not a new static file — a juz is 8 consecutive rubs, and `RubVerseMapping` already gives each rub's chapters.
- Whole chapters only — a juz download fetches every full chapter it touches, never a sliced/partial audio file. No audio-clipping pipeline exists or is planned.
- A `localStorage` registry (`{reciterId, chapters: {chapterId, audioUrl}[], pages[], sizeBytes, downloadedAt}` per item — each chapter's `audioUrl` travels with it so deletion never needs a network call to know which cache key to remove) tracks what's deliberately downloaded — `cache.keys()` alone can't distinguish an intentional download from page assets merely shared with the bulk cache.
- Deleting a download must reference-count its page assets against every other still-downloaded item, and must never evict a page if the full 604-page bulk cache is already complete (sentinel present) — that guarantee belongs to the bulk-download feature and must not regress because a recitation download was removed.
- Playing a downloaded item first syncs `settings.reciterId` to that item's reciter if it differs (`play()` always reads `settings.reciterId`, it does not take one as an argument) before calling `play()`.
- The download action itself does not go through service-worker message-passing (unlike the 604-page bulk walk) — it's a short enough, foreground-only client `fetch`+`cache.put()` sequence that doesn't need to survive tab backgrounding.

---

## Mushaf Editions & Word Placement

**Decision:** A mushaf is a typeset book, not a rendering of the text — a committee fixes the position of every word for that specific print edition. Each edition therefore owns its **complete** word placement, and page number, line number, glyph field and per-page font file form one inseparable unit per edition. There is no base edition with overrides. `MushafWordLayout(mushaf_id, word_id, page_number, line_number)` holds rows for mushaf 2 (QCF V1, default) and mushaf 19 (QCF V4 Tajweed) as equals; page-level summary data is per-edition too. See [ADR 0033](adr/0033-mushaf-edition-owns-word-placement.md).

**Rationale:** Editions disagree on page boundaries, not just line breaks — 56 verses and 361 words fall on a different page between mushaf 2 and 19. Treating one edition as canonical and another as a line-level override splices two different books together and, because each page's font has its own local codepoint space, silently renders wrong words instead of erroring.

**Constraints:**
- Never select a glyph field, a font file, or a word placement independently of each other. They come from the edition registry as a set; an edition is the only valid unit of choice.
- A bare page number is not an absolute reference to Quran content — it is only meaningful relative to an edition. Deep links, saved reading positions, and rub/hizb navigation must all resolve through an edition. Page 595 of mushaf 2 and page 595 of mushaf 19 are different pages that happen to share a number.
- Switching edition preserves the **verse**, never the page number — a toggle during recitation must keep the playing verse on screen. The footer page number may shift by one on the 36 divergent pages; that is correct for two different books.
- `Word.page_number` / `Word.line_number` survive **only** as a denormalized mirror of the default edition, for mark canonicalization and legacy queries. They are not the canonical layout of anything; never read them as "the" page or line of a word.
- `Mark.page_number` is canonicalized to the default edition on write. Marks are keyed by `marked_id` (verse key or word location), which is edition-independent, so reads fetch the 1–2 default-edition pages a given edition page spans.
- Adding an edition must be a seed run, not a schema or rendering change. If a new edition requires either, the model has regressed.
- **`furqan_quran` has no migrations** — the seeder owns it via `prisma db push --force-reset` (ADR 0009). Any schema change here means a destructive full reseed (`npm run seed:quran -- --force`), refetching every page from QDC. Do not add migration files for this DB; ADR 0017 covers `furqan_app` only.
- The static page JSON is per edition at `public/quran/pages/{mushafId}/{page}.json`, and each word carries a single resolved `glyph` field rather than both `code_v1` and `code_v2`. Resolving the glyph field at generation time is what removes the mismatch risk from the render path — the reader has no glyph column to choose, so it cannot choose wrong.
- `verse_key → page` is shipped per edition at `public/quran/verse-pages/{mushafId}.json`. Anything resolving a page from a verse (rub/hizb navigation, preserving the verse across an edition switch) must go through the active edition's map; 56 verses land on a different page between the two shipped editions.
- **Recitation resolves pages through the active edition.** `recitedPage` (which drives follow-navigation) and the `page` stop-point both read the edition's own layout — never `Verse.page_number`. `rub`/`hizb`/`juz` stop-points are divisions of the TEXT, identical in every edition, and correctly stay on the `Verse` columns; do not "fix" them to use the layout table. Switching edition mid-playback re-resolves both the recited page and the stop target.
- **Any new verse→page lookup must take a `mushafId`.** Three separate bugs shipped from this one omission — rub navigation, deep-link entry, and recitation (follow *and* stop-point) each resolved pages against the default edition while another was displayed. Grepping for `page_number` does not find them all; a runtime lookup behind an API route hides from it. When adding a feature that maps a verse to a page, the edition is a required input, not a default.
- Every fetcher in `scripts/quran-seed/` must retry. `fetchChapters` is the first network call and runs *after* the database has already been dropped, so an unretried blip there leaves the Quran DB empty rather than merely failing — this happened once during implementation.
- Never work around a seeder integrity failure by loosening the check. It failing on real data means the schema is mismodelled — that is exactly how the superseded design shipped.

---

## Tajweed Mushaf Mode

**Decision:** An opt-in reading mode color-codes Quran text by Tajweed rule using per-page COLRv1 (color-glyph) fonts — one font file per Mushaf page (`public/fonts/v4/colrv1/woff2/p{n}.woff2`, ~51MB total, committed to git same as the existing non-colored per-page font). No new schema/seed work: the font pairs with the **already-seeded, previously-unused** `Word.code_v2` column. See [ADR 0023](adr/0023-tajweed-mushaf-mode.md) for why `code_v2` — not a new column — is correct.

**Constraints:**
- Font/glyph/**layout** selection is edition-gated, not a free choice — see the Mushaf Editions & Word Placement decision below. Mushaf 2 → `word.code_v1` + font `quran-p{page}` + mushaf 2's page/line rows; mushaf 19 → `word.code_v2` + font `quran-p{page}-tajweed` + mushaf 19's page/line rows. Never mix a glyph field, a font file, or a word placement from different editions: each page's font has its own codepoint space, so a mismatched pairing silently draws a *different word's* glyph rather than failing.
- The tajweed `@font-face` (and its `@font-palette-values` block) must only be injected when `tajweedMode` is true, for the page pair actually being viewed — never unconditionally. This keeps the tajweed font out of the load path for users who don't enable the mode. (Corrected 2026-08-18: earlier text here claimed the font is "~9-10x heavier, avg 266KB/page vs 28KB/page" — measured directly on disk, it is not: madani avg 77.6KB/page, tajweed avg 83.7KB/page, ~5-8% heavier. The 9-10x figure was stale and had misled a prior investigation into `docs/plans/fix-tajweed-swipe-flicker.md` toward a font-loading/prefetch theory that live testing then disproved. The real per-swipe cost is rendering, not loading — see the hover-cost bullet below.)
- `FontFaceInjector` reads `QuranTajweedContext` itself rather than receiving the mode as a prop — `ReaderPage` (its only caller) is an `async` Server Component and cannot call a context hook, and the self reader is statically generated at build time so it has no per-request client preference to thread through anyway. Any future caller must follow the same pattern (read the context inside the client leaf), not prop-drill from a server component.
- The COLRv1 files embed 3 baked-in color palettes at fixed indices — `0` = light, `1` = dark, `2` = sepia/gold — matching Furqan's three themes 1:1. Theme→palette selection is a global CSS rule (`font-palette: --Light/--Dark/--Gold` scoped to `.theme-light`/`.theme-dark`/`.theme-gold`), not per-component logic.
- Tajweed fonts are **excluded from the automatic/install-time pre-cache** (first-run gate, post-install prompt) — those still offer the default edition only, per the PWA & Offline decision above. **Amended (Issue #256):** they are no longer excluded from the *permanent Settings surface* — a user can explicitly download the Tajweed edition from the "Mushaf Layout" list, same opt-in-per-row model as the default edition, own sentinel/progress state (ADR 0014 Addendum 5, ADR 0023 Addendum 7). Do not add tajweed fonts to any automatic/install-time path; doing so would nearly triple the installed-PWA cache size against an already-fragile iOS quota for users who never asked for it.
- No Firefox COLRv1 dark-mode fallback (the reference project ships a second full OT-SVG font set + UA-sniffing for this) — accepted as a known v1 limitation, not replicated. Revisit only if it becomes a real user complaint.
- Reader state is `mushafId: number` (default 2) in `QuranMushafContext`, persisted in `localStorage` under `quranMushafId`, mirroring the `QuranSafhaViewContext`/`QuranFontScaleContext` pattern — provided globally so both the self reader and the shared-mushaf grant reader, and both single- and double-page view, pick it up with no route-specific wiring. An edition id rather than a `tajweedMode` boolean so a further print edition needs no new flag and no new branch; the superseded `quranTajweedMode` boolean is still read once on first load to migrate an existing reader's choice.
- The COLRv1 font is a different font design, not a recolored clone of the base font — its glyphs extend ~2.56× the CSS em-box visually (vs regular's ~1.92×). Font-size is scaled to `0.85×` on desktop and `0.88×` on mobile (via `.fq-quran-safha.fq-tajweed` overrides in `globals.css`) to match visual glyph density to the regular mushaf. On desktop, the line gap is compensated via `.fq-content:has(.fq-tajweed)` to preserve total page height (single-view: `0.5607×fs`, double-view: `min(0.5607×word-base, 0.5777×dv-word)`). On mobile, `space-between` handles vertical distribution automatically; `padding-block-start: 1em` prevents visual glyph overlap into the header area. Never edit `FONT_V1` or the base font-size formulas directly. See `docs/plans/fix-tajweed-font-size.md` Addendums 4–5.
- COLRv1 glyphs ignore the CSS `color` property outright — they paint their own baked-in palette colors. `QuranWord`'s hover cue (`hover:scale-[1.06] hover:[filter:drop-shadow(...)]`, `app/components/QuranWord.tsx`) works around this by scaling/shadowing the glyph rather than recoloring it, and is (correctly) identical code for every edition — no `tajweedMode` branch. (Corrected 2026-08-18: this bullet previously described an older `hover:bg-primary/25` / `hover:text-yellow-500` per-edition branch; that design was superseded by the current uniform scale+drop-shadow cue and this entry had drifted out of date.) That uniformity is exactly what makes the next bullet non-obvious — same code, very different real cost per edition.
- **A `:hover` `filter`/`transform` is disproportionately expensive on COLRv1 multi-layer glyphs — gate it off during an active swipe drag.** During a page-turn drag, the pointer/finger passes over many words in sequence, transiently triggering each one's `:hover`. `filter: drop-shadow` (plus the `scale` transform's compositing-layer promotion) is cheap to rasterize over a single-layer monochrome glyph (`code_v1`) but measurably more expensive over `code_v2`'s stacked multi-layer colour glyphs — same CSS, same JS, purely a content-complexity cost the profiler cannot see from source. Confirmed via two independent real-Chrome DevTools Performance traces (not reasoning from code alone): `Event: pointerover` total time was ~44x larger for tajweed than madani on an identical swipe gesture, with matching gaps in main-thread work, Layout, and Recalculate-style. This was the root cause of the tajweed swipe flicker (`docs/plans/fix-tajweed-swipe-flicker.md`, [ADR 0023 Addendum 8](adr/0023-tajweed-mushaf-mode.md)) — two earlier theories (font-prefetch lookahead margin, CSS `<style>`-insertion recalc cost) were live-tested and disproven first; do not revisit either without new evidence. Use `--primary`, not `--accent`, for any background tint on top of `--card` surfaces (the Quran page card) — `--accent`'s lightness is nearly identical to `--card`'s in all 3 themes and is effectively invisible there regardless of opacity; `--accent` is calibrated for hover states over `--background`-level chrome (nav/buttons), not over cards.
- **Resolved: `mushaf=19` is final.** `code_v2` is confirmed mushaf-independent; `line_number` is not (diffing `mushaf=19` vs `mushaf=2` on page 343 showed 23% of words on a different line). Two mushaf-ID candidates were evaluated — `mushaf=19` (matches the font asset naming, and the live quran.com web app's own rendering) and `mushaf=11` (matched the original reference screenshot from the Quran Android app more closely on one boundary check). `mushaf=11` was abandoned: the Android app that produced that screenshot has **no Tajweed rendering code at all** (confirmed via a full-history search of its repo — it only downloads pre-rendered page images), so there is no reachable algorithm to replicate its exact layout. `mushaf=19` is used going forward — see [ADR 0023's Addendum 2](adr/0023-tajweed-mushaf-mode.md) and Addendum 6 of `docs/plans/tajweed-mushaf-mode.md`.
- **Alternative approach explored and rejected:** an alternative, non-font-based rendering technique using QDC's `text_uthmani_tajweed` field (CSS-colored `<rule class=X>` spans over the same standard Uthmani text/line-layout as `code_v1`, instead of a second COLRv1 glyph font) was built and visually evaluated. Rejected: plain Unicode Uthmani text has no per-line kashida calibration at all (unlike `code_v1`/`code_v2`, typeset per mushaf page with kashida baked in), so lines fell visibly short of the container edge regardless of line grouping — a structural data limitation, not a fixable bug. The diagnostic code was removed; the COLRv1/`mushaf=19` approach remains the shipped one. See [ADR 0023's Addendum 3](adr/0023-tajweed-mushaf-mode.md) and Addendum 7 of `docs/plans/tajweed-mushaf-mode.md` for the full record (kept for future reference in case this path is revisited with a real justification algorithm).
- **SUPERSEDED by [ADR 0033](adr/0033-mushaf-edition-owns-word-placement.md) — the line-only `WordMushafLayout` design was wrong and caused a correctness bug.** It stored `word_id`, `mushaf_id`, `line_number` and had `QuranSafha` re-group client-side into `activeLines`, treating mushaf 2 as the base layout and mushaf 19 as a line-level override. Mushaf 19 has its own page boundaries too, so 36 pages rendered a splice of two editions: 292 words drew a different word's glyph, 50 drew nothing. See the Mushaf Editions & Word Placement decision below for the replacement. The note that the banner algorithm "runs against that grouping unmodified (verified…)" rested on a single spot check of page 106, which is not among the divergent pages — the conclusion holds, but that check did not establish it.
- **The divergent page boundaries were known and misread — do not repeat this.** The original seeder's page-by-page validation *failed on its first run*, correctly reporting that verse 5:77's words sit on mushaf 2's page 121 but mushaf 19's page 120. The response was to delete the check and aggregate `word_id → line_number` globally so a word "only needs to resolve *somewhere* in mushaf 19's pagination." That suppressed the signal that the schema was mismodelled, and page 121 went on to render blank glyphs. When a seeder integrity check fails on real data, assume the schema is wrong before assuming the check is too strict.
- **`app/api/quran/pages/[pageId]/route.ts` now calls `getPageWords` instead of re-querying independently.** Discovered during the above: this route (used by the vertical/virtualized reader's `usePage` hook) had its own untracked duplicate of `getPageWords`'s query, predating it. Any future change to `getPageWords`'s shape (this one included) must not assume it's the only place building `{ lines, pageMetadata }` — check this route too, or better, keep it delegating like this rather than reintroducing a second copy.
- **CPAL palette-slot → Tajweed rule mapping (empirically derived):** the COLRv1 font's 16 shared palette slots already encode per-rule coloring at the glyph layer (each word-glyph is built from multiple color-layered sub-glyphs) — recoloring Tajweed to match a different reference palette is therefore a CSS-only `@font-palette-values`/`override-color` change, never a font, schema, or `code_v1`/`code_v2`-alignment change (both fields encode a whole word as one glyph — there is no sub-word granularity to align against `text_uthmani_tajweed`'s per-character rule tags, and none is needed). Slot→rule correlation (e.g. slot 8=`qalaqah`/cyan, slot 5=`madda_normal`/gold, slot 9=`madda_obligatory_*`/red, slot 6=`ikhafa`/`ghunnah`/`iqlab`/green, slot 2=`slnt`/`idgham_wo_ghunnah`/grey) was verified across ~600 words on 13 pages, most at 100% confidence. See [ADR 0023's Addendum 4](adr/0023-tajweed-mushaf-mode.md) and Addendum 8 of `docs/plans/tajweed-mushaf-mode.md` for the full table.
- **Tajweed color + always-edge-to-edge lines is not achievable with current font assets.** Root cause (found via direct `fontTools` inspection): `code_v1`'s font has Apple AAT justification tables (`just`/`morx`/`feat`/`prop`, carrying real kashida-stretch data used by the text engine to self-justify) but zero color capability (no `COLR`/`CPAL` — cannot be recolored by any means); `code_v2`'s Tajweed font has `COLR`/`CPAL` but is missing the AAT justification tables entirely, which is the direct explanation for its 7.7%-CV line-width inconsistency (vs `code_v1`'s 2.7%). No current font asset has both. The reference project (quran.com) has the same gap and uses the same centering work-around Furqan already ships (Addendum 3) — this is an ecosystem-wide asset limitation, not fixable from CSS. The only real path to both properties at once would be constructing a merged font (splicing AAT tables onto COLR/CPAL glyphs) — a real font-engineering effort, not attempted, and a legitimate future option if this becomes a priority. See [ADR 0023's Addendum 5](adr/0023-tajweed-mushaf-mode.md) and Addendum 9 of `docs/plans/tajweed-mushaf-mode.md`.
- Furqan's mushaf lines rely on the per-page font's own glyph kerning (kashida baked into the text/glyph data at specific points, chosen by the original typesetter) to "self-justify" — no `text-align: justify` anywhere. This holds for `code_v1` (measured: 13.9–15.1×font-size across all 604 pages, ~2.7% coefficient of variation) but **not** for `code_v2`/the tajweed COLRv1 font (measured: 5.8–22.7×font-size, ~7.7% CV, ~3x the relative spread) — so many tajweed lines don't naturally reach the container edges. **Do not "fix" this with `justify-content: space-between`** — inserting gaps *between* whole words has nothing to do with where the font's kashida actually is, and visibly shifts every word off its authentic mushaf position (confirmed by direct screenshot comparison; tried and reverted, see Addendum 2→3 of `docs/plans/tajweed-mushaf-mode.md`). The correct technique — matching how quran.com itself handles this (hardcoded per-scale line-width lookup table + `text-align: center`, never `space-between`) — is to **center** each tajweed line as a rigid block when it falls short of the container width (`QuranLine.tsx`: `justify-center` for tajweed mode on every page, not just 1–2); centering only shifts the whole line, never the relative gaps between words. The raw per-line width-ratio measurement (worst case `22.73×font-size` at p.123 l.8) is retained in Addendum 3. **Resolved:** mobile tajweed font-size is now scaled to `0.88×` (effective divisor ~16.7), and desktop to `0.85×`, with line gap compensation — see `docs/plans/fix-tajweed-font-size.md` Addendums 4–5. Rare worst-case lines clip invisibly via `overflow-hidden` + `flex-wrap: nowrap`; calibrating to the true worst case (22.73) would leave typical lines filling only ~70% of the container, a worse tradeoff than the rare clip.

---

## Awrad & Learning Plans Engine

**Decision:** Daily awrad and structured programs (الحصون الخمسة) run on one plan engine: plan templates are typed TS constants (like `MARK_CATEGORIES`), each template composed of tracks; a track = unit + quantity + one of five typed scheduling rule kinds (`fixed_cycle`, `cursor_advance`, `trailing_window`, `completed_cycle`, `lookahead`) + a per-track `activity` (`read | listen | memorize | review`). Only enrollments (`UserPlan`) and an append-only `ProgressEntry` log are stored (in `furqan_app`); the daily assignment is derived at read time as a pure function of (template, params, progress, date) — never persisted. See [ADR 0030](adr/0030-plan-engine-derived-assignments.md) and `docs/plans/awrad-learning-plans.md`.

**Constraints:**
- Progress is **page-canonical**: juz/hizb/rub targets resolve to page ranges from seeded `PageMetadata`/`Rub` at read time; progress rows store page numbers. Verse-level granularity is a future widening, not v1.
- All new tables live in `furqan_app` with scalar Quran refs only — no cross-domain FK (ADR 0008 invariant holds).
- Do not materialize schedule rows ("day X → range Y" tables) — pause/skip/level-change safety depends on derivation. History views read the progress log (what was actually done), never recompute assignments with current params.
- `activity` is per-track, orthogonal to scheduling — never encode modality into rule kinds or templates as a whole (a template may mix, e.g. a listen-mode تحضير track).
- Missed-day policy is a per-template flag: cursor-shift (default) or calendar-bound (recompute daily quantity toward a fixed end date). Streaks derive from the log.
- Completion is manual per-track check-off; reader/playback-aware shortcuts may *offer* check-off but must never auto-write it.
- Multiple concurrent enrollments per user are allowed — "today" UI aggregates across active plans.
- Plan check-offs are online-only in v1 (mirrors marks, ADR 0014); offline queueing would need that decision re-opened.
- A rule kind with a `sourceTrack` may only reference a source-free track (`fixed_cycle`/`cursor_advance`) — the engine (`app/lib/plans/engine.ts`) resolves dependencies in two passes, not a general graph. Honor this shape when authoring templates in `app/constants/plans.ts`.
- Unit tests: `vitest` (`npm run test`), introduced with this feature — the repo's first unit-test infra. Tests are colocated `*.test.ts` files with explicit `vitest` imports (no globals config); `vitest.config.ts` carries only the `@/` alias. Scope is pure functions (the engine); API routes/hooks are wiring and stay covered by e2e/integration, not unit mocks.
- UI (hub page + reader widget, Trello #149): `listening-wird` and `husun` templates ship alongside `daily-wird`. Husun's per-track quantities are a documented **best-effort default**, not a sourced book table — this deliberately supersedes the foundation plan's "husun waits for sourced quantities" gate; every quantity is editable at enroll time via `params.quantities`, so a correction needs no deploy. Its hifz (`cursor_advance`) pace is a free numeric pages/day input — no preset levels — since the engine is page-canonical only (no fractional/rub'-granularity units yet); its target range is picked via two juz dropdowns and resolved to page numbers server-side inside `POST /api/plans` (reusing `resolve-units.ts`'s `getJuzPageRange`), never exposed as a separate endpoint and never stored as juz numbers. That same POST is where client-supplied `params` get validated (page bounds, positive-integer quantities) — the engine trusts its inputs. Teacher-assigned levels are explicitly out of scope (no ADR 0012 grant wiring for plans yet). The reader widget determines per-track "in range" state by comparing the assignment's page range against the reader's **visible pages** (`read`/`memorize`/`review`) or `RecitationContext`'s `recitedPage` (`listen`, while a session is live). Visible pages are newly published by `ReaderPager` to a small `ReaderPageContext`, following the publish-up pattern `RecitationPageSync`/`pageFirstVerseKey` established for the voice panel — and as a pair-expanded **array**, not the pager's raw `anchor`, since double-page/tablet view shows two pages (same `getPagePair` expansion `RecitationFollow` already uses). See `docs/plans/daily-awrad-ui.md`.
- **Companion visual redesign (2026-07-28):** the hub/widget UI above was reshaped around a Claude Design reference (`docs/plans/daily-awrad-ui.md`'s "Companion Redesign" section) into a hero "today" card, timeline-style plan history, a consolidated browse-or-edit dialog, and a ring check-off control, adding two new derived capabilities on top of the same engine. **Streak/week-strip** (`app/lib/plans/streak.ts`, `GET /api/plans/streak`): derived at read time like assignments themselves (never persisted) by replaying `deriveAssignments` against past dates for the caller's currently-active plans only — a day with zero assignments due is a pass-through, not a failure, and a plan's pause/resume history isn't reconstructed (no status-change timestamps exist), an accepted limitation. **Plan param editing**: the existing `PATCH /api/plans/:planId` now also accepts optional `params`/`target_juz_start`/`target_juz_end` (full replace, not merge) — the juz-resolution + params-hardening logic that used to live only in `POST /api/plans` was extracted to `app/lib/plans/validate-params.ts` and is shared by both. `GET /api/plans` additionally returns derived `target_juz_start`/`target_juz_end` (via a new `getPageJuzNumber` reverse lookup in `resolve-units.ts`) purely to prefill the edit UI — juz numbers are still never stored (D3 holds).
- **Invariant (bug fix, 2026-07-28):** once a track has a progress entry logged for the queried date, `deriveAssignments` must return that entry's own range verbatim (`app/lib/plans/engine.ts`'s `todayEntryAssignment`) — never recompute a cursor/window position for an already-logged day. Previously the range was derived independently of the date-based `completed` flag, so checking off any *other* track in the same plan (which invalidates the whole `["/plans"]` query) silently advanced an already-checked track's shown range to the next not-yet-done position while it stayed marked completed. Applies uniformly to all five rule kinds; any future rule kind must honor it too.
- **Inline listening playback (2026-07-30):** any `activity: "listen"` row (listening-wird's own track, and husun's `tahdeer` track) plays its assignment's exact page range directly via `RecitationContext.play`'s new override argument, instead of only linking to the reader (which is what the foundation plan's Verified Test Case #3 originally envisioned). Bounds are resolved via the existing `GET /api/quran/pages/[pageId]/bounds` route (ADR 0033's edition-aware page-bounds endpoint, originally built for the "custom" stopPoint's page-type "to" target), extended to also return `firstVerseKey` alongside its existing `lastVerseKey`/`lastChapterId` — a wird's `rangeStart`/`rangeEnd` are always resolved against `DEFAULT_MUSHAF_ID`, since plan assignments are page-canonical from before mushaf editions existed (D3 predates ADR 0033), not the reader's currently-active edition. A track's `repetitions` (e.g. husun tahdeer's `×10`) means whole-range repeat, not per-verse repeat. A page's first/last word can belong to a verse that starts on the previous page or ends on the next — `/bounds` resolves the owning verse regardless, since recitation audio is addressable per verse, never per word, so consecutive wird days can overlap by at most one verse at each seam (accepted: better a repeat than a gap). See `docs/plans/listening-wird-inline-playback.md` and the Recitation Playback decision above for the `play()` override mechanism itself. The completion nudge/check-off prompt is deliberately deferred (Trello #161) — completion is still manual-only per-track check-off, unchanged. **Settings-sheet indicator (2026-07-30, prompted by manual testing):** `RecitationContext` exposes `activeOverride: { id, label } | null`, set/cleared alongside `rangeRepeatOverrideRef` (including on `stop()` and on a failed `play()`, both previously left it stale) — `RecitationSettingsSheet` shows it as a read-only "Playing: {label}" banner when non-null, since the sheet otherwise always renders the user's own persisted settings with no indication a wird override is actually driving playback. Informational only — every control below it stays exactly as interactive as before. `PlanAssignmentRow` keys its own play/pause state off `activeOverride.id === planPlaybackSessionId(planId, trackKey)` (`app/lib/plans/assignment-range.ts`), not a page-range overlap — a page overlap alone doesn't mean the override was launched by that row.

---

## Notification System

**Decision:** Base notification system (push, email, in-app) built as plain-function modules under `app/lib/notifications/`, mirroring `app/lib/plans/`'s no-class style. `dispatch.ts` (`dispatchNotification`) orchestrates: resolves the notification type from a typed registry (`NOTIFICATION_TYPES` in `app/constants/notifications.ts`, same pattern as `PLAN_TEMPLATES`), resolves channels via the pure `resolveChannels` (explicit request → type default → `available`, unavailable channels recorded `skipped` not dropped), persists a `Notification` + per-channel `NotificationDelivery` rows, then calls each channel (`in_app`/`push`/`email`, `app/lib/notifications/channels/`) via `Promise.allSettled` — one failing channel never blocks the others. Reminders (`ScheduledNotification` rows) are polled by a secret-guarded cron Route Handler (`app/api/cron/reminders/route.ts`), not a queue/worker — no Redis exists in this stack. See [ADR 0037](adr/0037-notification-dispatch-and-channels.md).

**Rationale:** Greenfield feature needing extensibility (new channels, new event types) without a class/DI framework. See ADR 0037 for the queue-vs-cron-poll tradeoff.

**Constraints:**
- `NotificationChannel` implementations must never throw — `send()` returns `{status: "failed", error}` instead; `dispatch.ts` depends only on the narrow `NotificationStore`/`ChannelRegistry` interfaces, never on Prisma or a channel SDK directly.
- Adding a notification type is a new `NOTIFICATION_TYPES` entry only; adding a channel is a new file under `channels/` + one `registry.ts` line. Never edit `dispatch.ts` for either.
- No user notification-preference table exists yet (deliberately deferred) — `resolveChannels(typeDef, requested, available)` is the reserved seam: a prefs lookup becomes one more input there, never a change to `dispatch.ts`.
- `Notification`/`NotificationDelivery`/`PushSubscription`/`ScheduledNotification` live in `prisma/app/schema.prisma` (appPrisma) with scalar `user_id` only — no relation to `User` (ADR 0008).
- `PushSubscription.endpoint_hash` (sha256 of the raw endpoint) is the unique key, not the endpoint itself — raw Web Push endpoints can exceed MySQL's practical index length.
- `app/api/cron/reminders/route.ts` is deliberately excluded from the `auth-middleware` protected-routes matcher (machine-called, guarded by `x-cron-secret` timing-safe compare instead — mirrors the Sentry webhook relay, ADR 0018). Do not add session auth to it.
- Reminders have no per-user timezone source (no `User.timezone` column) — `ScheduledNotification.timezone` is captured from the client (`Intl.DateTimeFormat().resolvedOptions().timeZone`) at enqueue time. Rendered notification locale defaults to `ar` (i18n decision) when no per-user locale is available (e.g. cron-triggered sends).
- `app/lib/notifications/render-context.ts` reads `messages/<locale>.json` directly (not next-intl's `getTranslations`) because the cron path has no request-scoped `headers()`/RSC context.

---

## CI: Visual e2e Skip on Config-Only PRs

**Decision:** `.github/workflows/visual-e2e.yml` uses `on.pull_request.paths-ignore` (not an allowlist) to skip the suite when every changed file in a PR matches: `docs/**`, `.claude/**`, `**/*.md`, `.mcp.json`, `.mcp.json.example`, `furqan-workflow.excalidraw`, `.eslintrc.json`, `tsconfig.json`. See `docs/plans/skip-e2e-config-changes.md`.

**Rationale:** An ignore-list defaults safe — any new/unrecognized path still triggers the suite. An allowlist would default unsafe, silently skipping e2e for new UI-affecting paths until someone remembers to add them.

**Constraints:**
- When adding a new top-level directory or root config file, decide explicitly whether it can affect rendered output before adding it to this ignore list — do not add out of convenience.
- `.github/workflows/**` is deliberately not in the ignore list, so changes to the workflow itself (including this list) still get tested.

---

## Dark Theme Color Semantics: Gold vs Emerald

**Decision:** In `.theme-dark`, gold (`--gold`/`--gold-muted`, plus the existing `--mushaf-ornament`/`--surah-frame-gold`) is confined to the reader page itself — ornaments, surah frames, verse markers, page decorations — with **no exceptions in chrome**. Emerald (`--primary`/`--accent`/`--ring`) covers every interactive element and every chrome surface, including ones referencing Mushaf content (the surah-list number badge is emerald). Never both on the same element. Revised from an earlier version of this decision that made the badge a gold exception — reviewing it rendered showed the two accents competing outside the page, which is the opposite of the goal. See [ADR 0031](adr/0031-dark-theme-gold-emerald-semantics.md) and `docs/plans/dark-theme-mushaf-unification.md`.

**Constraints:**
- Before adding gold anywhere, the test is literal: is this element on the reader page itself? If not, it's emerald — no judgment call about how "Mushaf-identity-bearing" something feels.
- `--mushaf-paper` (the reader page background) is deliberately **not** the lightest step of the new 4-step background ramp — it sits one step above `--background` (app shell), not at the top. `--card`/`--popover` (drawers, dialogs, player) and a 4th "elevated" step for raised in-drawer chips sit above it. Do not "fix" the page to be the brightest surface — that was verified against the design reference and inverted on purpose (a real page under dim light is only slightly lighter than its surroundings, not glowing).
- Light and gold themes are unaffected by this pass — this decision and its token values apply to `.theme-dark`/`.theme-dark.dark` only.
- **`.theme-dark`'s `--accent-foreground` is deliberately NOT `--primary`, unlike every other theme** (2026-08-13, `docs/plans/home-page-design-fixes.md`). Same-day brand retint (`docs/plans/brand-mark-icons.md`) moved `--primary` to `169 88% 26%`, kept there specifically so `--primary-foreground`'s white-on-primary button text clears WCAG AA (5.09:1). That same 26% only measures 2.4:1 against `--accent`'s `161 58% 15%` background (the surah-list badge) — below the 4.5:1 floor, and no single `--primary` lightness satisfies both pairings (raising it enough to fix the badge drops the button-text contrast to ~2.7:1; darkening `--accent` toward black still can't clear 4.5:1 against a 26%-lightness foreground, max achievable is 4.12:1). `--accent-foreground` is `169 88% 39%` in dark theme only (measures 5.0:1 against `--accent`) — same hue, independent lightness. Do not "simplify" this back to mirroring `--primary` without re-deriving both contrast pairs; that regresses whichever one you didn't just check.
- **Explicit exception (2026-08-19, user-requested):** the nav's surah-selector pill (`.fq-surah-toggle`, `app/globals.css`, `docs/plans/desktop-navbar-font-bg.md`) references `--mushaf-ornament` directly and keeps gold in dark theme's chrome, contradicting "no exceptions in chrome" above for this one control only. An intermediate `--nav-ornament` token that resolved to emerald on dark was tried and explicitly reverted by the user back to gold — do not reintroduce that token or re-derive an emerald variant for this element without a new request.
