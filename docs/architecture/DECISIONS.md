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

**Decision:** Each Quran page inlines a single `@font-face` for `quran-p{pageId}` pointing to `/fonts/v1/ttf/p{pageId}.ttf`, with a `<link rel="preload">` for immediate download. Three global fonts are loaded in `app/layout.tsx`: `--uthmanic` and `--surah-names` via `next/font/local`, and `--tajawal` (Tajawal, Arabic/Latin UI font) via `next/font/google`.

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
- Font scaling (1–10) is persisted in `localStorage` via `QuranFontScaleContext`.
- `QuranSafha`'s word font-size Tailwind class is built at runtime from `FONT_V1` and requires a matching literal-string safelist (`tailwindFontUtility` in `QuranSafha.tsx`) for Tailwind's JIT to generate the CSS. Any change to `FONT_V1.baseScaleViewHeight` or the per-scale multiplier must regenerate that safelist for the new `quranFontScale` 1–10 range in the same commit, or the font size silently fails to apply. See [ADR 0005](adr/0005-quran-font-size-safelist.md).
- `UthmanicHafs1Ver18` supports both `qpc_uthmani_hafs` (preferred for words) and `text_uthmani` (for verse-level display). Never pair it with `code_v1`.
- When displaying a word outside the page (search, modal), use `word.qpc_uthmani_hafs`.
- `Verse` has no `qpc_uthmani_hafs` column — when displaying verse text, prefer reconstructing from `word.qpc_uthmani_hafs` filtered to `char_type_name === 'word'` if words are in scope; fall back to `verse.text_uthmani` only when words are unavailable.
- Never use `verse.text_uthmani` for verse display in search — always join `word.qpc_uthmani_hafs` across all words. Do **not** filter by `char_type_name` for full verse display: `UthmanicHafs1Ver18` renders markers (۞ rub el hizb, etc.) correctly and they should be visible. Filter to `char_type_name === 'word'` only in truncated/title contexts (e.g. MarkModal) where markers in a short string are unwanted.

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

## Sidebar Trigger Architecture

**Decision:** `Nav` (global, `app/[locale]/layout.tsx`) and `Sidebar` (pages-only, `app/[locale]/pages/layout.tsx`) live at different layout levels and cannot share state via props. `SidebarContext` (`app/contexts/SidebarContext.tsx`), provided in the locale layout, bridges them: `Nav` owns the trigger button and calls `setOpen(true)`; `Sidebar`'s `Sheet` is a controlled component reading `open`/`setOpen` from the same context. The trigger is visible at all breakpoints, gated only by `pathname.includes("/pages/")` (trailing slash required — a bare `"/pages"` substring match false-positives on any route containing that string, e.g. a hypothetical `/pages-list`).

**Rationale:** Replaces an earlier design where `Sidebar` rendered its own always-visible floating-pill `SheetTrigger`.

**Constraints:**
- Do not add a second/duplicate trigger — one trigger, in `Nav`, on pages routes only.
- If relocating or removing this trigger in future work, verify every breakpoint retains equivalent access before assuming "unchanged" — an earlier revision of this pattern silently removed desktop's only way to open the sidebar by adding `md:hidden` to the replacement trigger without noticing the original floating pill had no such guard. See `docs/plans/mobile-nav-ux.md` (Addendum 3) for the incident.

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
