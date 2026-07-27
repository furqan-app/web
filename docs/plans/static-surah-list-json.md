# Replace Dynamic Surah List with Static JSON at Build Time

**Type:** feature
**Date:** 2026-07-26
**Status:** implemented
**Trello:** [#31](https://trello.com/c/ht99Qt53/31-replace-dynamic-surah-list-with-static-json-at-build-time)

## Summary

`getSurahs()` (`app/hooks/get-surahs.ts`) queries `quranPrisma.chapter.findMany()` for all 114 surahs on every call. Two of its three call sites (`app/[locale]/page.tsx`, `app/[locale]/pages/layout.tsx`) are statically generated, so the query only runs at build time there — but the third, `app/[locale]/mushaf/[grant]/layout.tsx`, is a genuinely dynamic route (session/grant-gated), so it hits the DB on every real request. Since the 114 surahs never change without a full Quran reseed, this data is pre-computed into a committed static JSON file, and `getSurahs()` reads that file instead of querying Prisma at all — eliminating the runtime DB dependency everywhere, consistent with the "Static Generation Strategy" decision in `docs/architecture/DECISIONS.md` ("Static data (surah list, juz/hizb info) must be pre-computed, not calculated at runtime").

## Approach

Mirror the existing `scripts/quran-json/generate.js` / `public/quran/pages/{n}.json` convention (ADR 0028), which already establishes: a manual build-time generator script, output committed to git as immutable content, re-run only when underlying Quran data changes.

1. **New generator script** `scripts/quran-chapters/generate.js` — connects via the same `db-connection` helper used by `scripts/quran-json/generate.js`, runs the identical query `getSurahs()` runs today (`quranPrisma.chapter.findMany({ select: { id, name_arabic, name_simple, translated_name, verses_count, revelation_place, pages }, orderBy: { id: 'asc' } })`), and writes the result as a single JSON array to `public/quran/chapters.json`.
2. **New npm script** `generate:quran-chapters` in `package.json`, mirroring `generate:quran-json`'s `dotenv -e .env.local -- node scripts/quran-chapters/generate.js`.
3. **Rewrite `app/hooks/get-surahs.ts`** to read `public/quran/chapters.json` from disk (`fs.readFileSync` + `JSON.parse`, cached at module scope so repeated calls across requests/build workers don't re-read/re-parse) instead of calling `quranPrisma`. Return type stays `SurahResult[]` — identical shape, so no caller changes.
4. **Commit `public/quran/chapters.json`** to git now (generated once against current dev data), same as the page JSON files.
5. **No changes** to the 3 callers (`page.tsx`, `pages/layout.tsx`, `mushaf/[grant]/layout.tsx`) or to `Sidebar`/`SurahList`/`SurahListItem`/`RubList` — they all consume `SurahResult[]` unchanged.
6. **`app/api/search/chapters/route.ts` stays on Prisma** — out of scope. It's a different query shape (`WHERE name_arabic/name_simple contains query`, `take: 10`) serving the search box, not the surah list; migrating it was explicitly deferred in scoping.

No new ADR: this implements the existing Static Generation Strategy decision, it doesn't introduce a new architectural trade-off.

## Files to Change

- `scripts/quran-chapters/generate.js` — new. Generator script, modeled on `scripts/quran-json/generate.js`.
- `package.json` — add `generate:quran-chapters` script.
- `app/hooks/get-surahs.ts` — replace Prisma query with static file read.
- `public/quran/chapters.json` — new, committed. Generated output.

## Constraints

- `getSurahs()`'s exported signature and return shape (`Promise<SurahResult[]>`) must not change — 3 call sites and 4 downstream components depend on it as-is.
- The generator query must stay byte-for-byte in sync with the `select`/`orderBy` `getSurahs()` used before this change (mirrors the existing comment in `scripts/quran-json/generate.js` about staying in sync with `get-page-words.ts`).
- `public/quran/chapters.json` is committed, immutable content — regenerate manually via `npm run generate:quran-chapters` only when Quran chapter data actually changes (i.e. after a `seed:quran` reseed), not automatically on every build.
- Do not touch `app/api/search/chapters/route.ts` — confirmed out of scope for this task.

## What NOT to Do

- Do not wire chapter-JSON generation into `build`/`postinstall` — the established convention (`generate:quran-json`) is a manual, explicitly-triggered script, not an automatic build step.
- Do not migrate `api/search/chapters/route.ts` to the static file — explicitly scoped out; it keeps querying `quranPrisma.chapter` directly.
- Do not change `SurahResult` or any caller/component prop shape — this is a data-source swap only, not a shape change.

## Decisions Made

- Static JSON covers only `getSurahs()` (the surah *list*); chapter search stays DB-backed.
- Follows the existing manual-script + committed-JSON convention (ADR 0028) rather than adding automatic build-time regeneration.
