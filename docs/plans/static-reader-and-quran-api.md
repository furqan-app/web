---
title: Reader and sidebar SSR + Quran API routes from static files
type: feature
date: 2026-11-24
status: implemented
area: api
issue: 749
adr: [0078]
---

# Reader and sidebar SSR + Quran API routes from static files

## Summary

Cut over the reader/sidebar SSR data loaders (`getPageWords`, `getRubs`) and the four Quran API routes (`/api/quran/verses/[verseKey]`, `/api/quran/verses/[verseKey]/stop-point`, `/api/quran/pages/[pageId]/bounds`, `/api/quran/juz/[juzNumber]/bounds`) from `quranPrisma` MySQL queries to the build-generated static JSON indexes shipped in #748 (`public/quran/{pages,rubs,verses,page-bounds,verse-pages}`), keeping every response shape and status code byte-compatible so client hooks and UI require zero changes.

## Approach

Introduce a shared server-only static index reader (`app/lib/quran/static-data.ts`) that caches the shared aggregate indexes at module scope (`rubs.json`, `verses.json`, `page-bounds/{mushafId}.json`, `verse-pages/{mushafId}.json`) while reading individual per-page JSON files (`pages/{mushafId}/{page}.json`) directly from disk via `fs/promises` without an in-memory page cache:

1. **Shared server index reader (`app/lib/quran/static-data.ts`):** Expose typed async loaders (`getStaticRubs`, `getStaticVerses`, `getStaticPageBounds(mushafId)`, `getStaticVersePages(mushafId)`, `getStaticPageWords(page, mushafId)`) with runtime shape validation and clear regeneration error messages matching `app/hooks/get-surahs.ts`. Cache the aggregate indexes once per process (and per edition for `page-bounds` / `verse-pages`); read per-page JSON directly from disk with zero in-memory retention.
2. **SSR loaders (`get-page-words.ts`, `get-rubs.ts`):** Delegate `getPageWords` directly to `getStaticPageWords` (removing the duplicate `GLYPH_FIELD` map since static page JSON already carries the resolved `glyph` field) and delegate `getRubs` to `getStaticRubs`.
3. **Quran API routes:** Replace every `quranPrisma` query in `verses/[verseKey]`, `verses/[verseKey]/stop-point`, `pages/[pageId]/bounds`, and `juz/[juzNumber]/bounds` with O(1) lookups against `static-data.ts`, preserving `jsonResponse()` envelopes, validation codes (`422` / `404`), and ADR 0033 per-edition resolution.

## Decision Tree / Algorithm

| Consumer | Input / Branch | Static source | Output / Error contract |
|---|---|---|---|
| `getPageWords(page, mushafId = DEFAULT_MUSHAF_ID)` | `mushafId` not in `MUSHAF_EDITIONS` | — | Throw error naming unknown edition and registered `MUSHAF_EDITION_IDS` |
| `getPageWords(page, mushafId)` | Valid edition, `page` in `1..604` | `public/quran/pages/{mushafId}/{page}.json` (direct disk read, no cache) | `{ lines, pageMetadata }` (`PageWords`) |
| `getRubs()` | — | `public/quran/rubs.json` (module-cached) | 240 `RubWithVerses` rows sorted by `rub_number asc` |
| `GET /api/quran/verses/[verseKey]` | Bad format (not `^\d{1,3}\s*[:_]\s*\d{1,3}$`) | — | `jsonResponse({ code: 422, message: "Invalid verse key format" })` |
| `GET /api/quran/verses/[verseKey]` | `normalizeVerseKey(rawKey)` is null or absent in `verses.json` | `public/quran/verses.json` (module-cached) | `jsonResponse({ code: 404, message: "Verse not found" })` |
| `GET /api/quran/verses/[verseKey]` | Verse found | `verses[normalizedKey]` | `jsonResponse({ data: { verse_key, text_uthmani: words_uthmani_hafs, text_plain: toVersePlainText(text_uthmani) } })` |
| `GET /api/quran/pages/[pageId]/bounds` | `parseInt(pageId)` is `NaN` | — | `jsonResponse({ code: 422, message: "Invalid page id" })` |
| `GET /api/quran/pages/[pageId]/bounds` | Valid integer `pageId`, `mushaf` resolved via `MUSHAF_EDITIONS[requested] ? requested : DEFAULT_MUSHAF_ID` | `public/quran/page-bounds/{mushafId}.json` (per-edition cache) | Missing key → `404 Page not found`; hit → `jsonResponse({ data: { firstVerseKey, lastVerseKey, lastChapterId } })` |
| `GET /api/quran/juz/[juzNumber]/bounds` | Not `/^[0-9]+$/` or outside `1..30` | — | `jsonResponse({ code: 422, message: "Invalid juz number" })` |
| `GET /api/quran/juz/[juzNumber]/bounds` | Valid `juzNumber` `1..30` | `public/quran/rubs.json` slice `[(juz-1)*8 .. juz*8 - 1]` | `jsonResponse({ data: { firstVerseKey: firstRub.startVerse.verse_key, lastVerseKey: lastRub.endVerse.verse_key, lastChapterId: lastRub.endVerse.chapter_id, chapterIds } })` with sorted unique `chapterIds` |
| `GET /api/quran/verses/[verseKey]/stop-point` | `scope === "rub-first"` | `verses.json` + `rubs.json` | Missing verse → `404 Verse not found`; hit → `rub = rubs[v.rub_el_hizb_number - 1]`, `firstVerse = verses[rub.startVerse.verse_key]`, return `{ verseKey, chapterId }` |
| `GET /api/quran/verses/[verseKey]/stop-point` | `scope === "page"` | `verse-pages/{mushafId}.json` + `page-bounds/{mushafId}.json` | Resolve `mushafId` (`MUSHAF_EDITIONS[req] ?? DEFAULT_MUSHAF_ID`); `page = versePages[verseKey]`, `bounds = pageBounds[String(page)]`; missing → `404 Stop verse not found`; hit → `{ verseKey: bounds.lastVerseKey, chapterId: bounds.lastChapterId }` |
| `GET /api/quran/verses/[verseKey]/stop-point` | `scope` in `"rub" \| "hizb" \| "juz"` | `verses.json` + `rubs.json` | Missing verse → `404 Verse not found`; `lastRubNum` = `v.rub_el_hizb_number` (`rub`), `v.hizb_number * 4` (`hizb`), `v.juz_number * 8` (`juz`); `lastRub = rubs[lastRubNum - 1]`; return `{ verseKey: lastRub.endVerse.verse_key, chapterId: lastRub.endVerse.chapter_id }` |
| `GET /api/quran/verses/[verseKey]/stop-point` | Any other or missing `scope` | — | `jsonResponse({ code: 422, message: "Missing or invalid scope" })` |

## Verified Test Cases

| Case | Expected output |
|---|---|
| `stop-point?scope=page&mushaf=2` for `5:77` vs `mushaf=19` for `5:77` | `mushaf=2` resolves `5:77` to page `121` → `{ verseKey: "5:82", chapterId: 5 }`; `mushaf=19` resolves `5:77` to page `120` → `{ verseKey: "5:77", chapterId: 5 }` |
| `pages/120/bounds?mushaf=2` vs `mushaf=19` | `mushaf=2` → `{ firstVerseKey: "5:71", lastVerseKey: "5:76", lastChapterId: 5 }`; `mushaf=19` → `{ firstVerseKey: "5:71", lastVerseKey: "5:77", lastChapterId: 5 }` |
| `juz/1/bounds` | `{ firstVerseKey: "1:1", lastVerseKey: "2:141", lastChapterId: 2, chapterIds: [1, 2] }` |
| `verses/2:142` | `text_uthmani` preserves `۞` from `words_uthmani_hafs`; `text_plain` strips `۞` via `toVersePlainText(text_uthmani)` |
| `stop-point` for `2:142` (`rub-first`, `rub`, `hizb`, `juz`) | `rub-first` → `{ verseKey: "2:142", chapterId: 2 }`; `rub` → `{ verseKey: "2:157", chapterId: 2 }`; `hizb` → last verse of rub 12; `juz` → last verse of rub 16 |
| Invalid inputs (`verses/bad`, `verses/999:1`, `pages/abc/bounds`, `pages/605/bounds`, `juz/0/bounds`, `juz/1foo/bounds`, `stop-point?scope=unknown`) | Return exact `422` / `404` `jsonResponse()` envelopes matching current DB-backed handlers |
| `getPageWords(1, 2)` and `getPageWords(120, 19)` | Return `{ lines, pageMetadata }` matching `PageWords` directly from disk; unknown edition (e.g. `999`) throws |

## Files to Change

- `app/lib/quran/static-data.ts` — new shared server-only static JSON reader with module-scope caching for aggregate indexes (`rubs`, `verses`, `page-bounds/{id}`, `verse-pages/{id}`) and direct disk reads for `pages/{id}/{page}.json`
- `app/lib/quran/static-data.test.ts` — Vitest unit tests covering `static-data.ts`, `getPageWords`, `getRubs`, and all 4 API route handlers (`verses/[verseKey]`, `stop-point`, `pages/[pageId]/bounds`, `juz/[juzNumber]/bounds`), including parity checks across all 60 hizbs and 30 juzs
- `app/hooks/get-page-words.ts` — read from `getStaticPageWords` instead of `quranPrisma` and drop the duplicate `GLYPH_FIELD` map
- `app/hooks/get-rubs.ts` — read from `getStaticRubs` instead of `quranPrisma`
- `app/api/quran/verses/[verseKey]/route.ts` — read from `getStaticVerses` instead of `quranPrisma`
- `app/api/quran/verses/[verseKey]/stop-point/route.ts` — read from `getStaticVerses`, `getStaticRubs`, `getStaticVersePages`, and `getStaticPageBounds` instead of `quranPrisma`
- `app/api/quran/pages/[pageId]/bounds/route.ts` — read from `getStaticPageBounds` instead of `quranPrisma`
- `app/api/quran/juz/[juzNumber]/bounds/route.ts` — read from `getStaticRubs` instead of `quranPrisma`
- `docs/architecture/decisions/rendering.md` — update the stale bullet noting `GLYPH_FIELD` in `app/hooks/get-page-words.ts` as a third hand-synced copy (now removed since `getPageWords` reads pre-resolved `glyph` from static page JSON)

## Constraints

- **Response compatibility:** Every route must keep its exact `jsonResponse()` envelope, HTTP 200 status with envelope `code`, and property names so client hooks (`use-verse-text.ts`, `recitation-api.ts`, `MarkModal.tsx`) need zero edits.
- **Edition awareness (ADR 0033):** Every page-scoped lookup (`getPageWords`, `pages/[pageId]/bounds`, `stop-point?scope=page`) must resolve through the requested `mushafId` (falling back to `DEFAULT_MUSHAF_ID` only when absent/unregistered in `MUSHAF_EDITIONS`) — never `Verse.page_number`.
- **Zero mobile precache impact (ADR 0078):** Do not touch `next.config.mjs` (`globPublicPatterns`) or `app/sw.ts`; all new indexes remain server-only.
- **Zero per-page RAM retention:** `getPageWords` reads `public/quran/pages/{mushafId}/{page}.json` directly from disk without an in-memory cache so SSR builds and shared-mushaf views never accumulate 23 MB+ per edition in Node RAM.
- **Zero `quranPrisma` imports** in all 6 converted files.

## What NOT to Do

- Do not touch search routes (`app/api/search/*`, `use-search*.ts`), plans (`app/lib/plans/resolve-units.ts`), share (`app/[locale]/share/verse/.../verse-data.ts`), or marks enrichment (`app/api/marks/route.ts`) — those belong to #750.
- Do not delete `quranPrisma`, `prisma/quran/`, `compose.yml` `quran-db`, or `scripts/quran-seed/` — those belong to #751.
- Do not add an unbounded in-memory cache for individual page JSON files in `getPageWords`.
- Do not change client-side `usePage` / `useVersePages` / service worker caching behavior.

## Decisions Made

- **Direct disk reads for `getPageWords`, module cache for aggregate indexes:** Confirmed with the user. `getPageWords` only runs during static build generation and dynamic `/mushaf/[grant]/pages/[id]` SSR; OS page cache already accelerates 30–40 KB page reads to sub-millisecond latency without holding 23 MB/edition in Node RAM. Aggregate indexes (`rubs.json`, `verses.json`, `page-bounds/{id}.json`, `verse-pages/{id}.json`) are read across API requests and future #750 consumers, so caching them once in `app/lib/quran/static-data.ts` avoids repeated multi-MB `JSON.parse`.
- **Sweep check (step 3b):**
  - Existing tests: `e2e/tests/{tafsir-sheet,locale-switching,recitation-lifecycle}.spec.ts` intercept `**/stop-point**` in Playwright; no unit tests mock `quranPrisma` for any #749 file (`resolve-units.test.ts` and `validate-custom-definition.test.ts` belong to #750).
  - Service worker: all 4 routes are immutable read-only `GET /api/quran/*` endpoints whose response shapes do not change; no `app/sw.ts` or `next.config.mjs` edits needed.
  - Stale doc caught: `docs/architecture/decisions/rendering.md` line 90 still lists `GLYPH_FIELD` in `app/hooks/get-page-words.ts` as a third hand-synced copy; removing `GLYPH_FIELD` from `get-page-words.ts` eliminates that runtime 500 drift hazard, so we update that bullet as part of #749.
  - `RubWithVerses` compatibility confirmed: `public/quran/rubs.json` emits `endVerse: { verse_key, chapter_id, page_number }`, which is a structural superset of `RubWithVerses["endVerse"]` (`{ page_number: number }`).
- **Defer `riwayah` tagging on `MUSHAF_EDITIONS`:** Defer adding a `riwayah` field on `MUSHAF_EDITIONS` (noted in ADR 0078 decision 4) until `#750` or a consumer actually reads it, avoiding unused configuration fields per YAGNI.
