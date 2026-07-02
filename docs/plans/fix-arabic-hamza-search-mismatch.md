# Fix: hamza-alif mismatch in verse search

**Type:** bug
**Date:** 2026-07-02
**Status:** implemented

## Summary

Searching for a word with a hamza-alif character (e.g. `أحمد`) returns no results even when the exact word exists in the index, while searching without hamza (`احمد`) correctly matches. This fix covers verse search; chapter search has the same asymmetric-matching characteristic but it's accepted, not treated as a bug (see below).

## Root Cause

`app/api/search/verses/route.ts` matches the raw, unnormalized query string against `Verse.text_imlaei_simple` via Prisma's `contains`. That column is populated verbatim from the upstream `qdc` API and is confirmed (checked directly against the DB) to be hamza-free across the entire table — it only ever contains bare `ا`, never `أ`/`إ`/`آ`. So a query typed with a hamza-alif character can never match, while a bare-alif query does. See [ADR 0007](../architecture/adr/0007-arabic-search-query-normalization.md) for the full analysis and why chapter search (`name_arabic`, which does contain real hamza forms) is out of scope for this fix.

## Files to Change

- `app/utils/arabic-search.ts` (new) — export `normalizeArabicQuery(query: string): string` that replaces `أ`/`إ`/`آ` with `ا`. No other transformations (no diacritic/tatweel stripping — not needed, `text_imlaei_simple` has none).
- `app/api/search/verses/route.ts` — normalize `query` with `normalizeArabicQuery` before passing it into the Prisma `contains` filter (`text_imlaei_simple: { contains: normalizeArabicQuery(query) }`).

## Constraints

- Do not touch `app/api/search/chapters/route.ts` — `name_arabic` genuinely contains hamza forms, so query-only normalization doesn't apply there. Accepted as-is per ADR 0007, not a bug to fix.
- Do not normalize standalone `ء` (e.g. in `شيء`) — the reported bug and the verified DB data are specifically about hamza-on-alif forms (`أ`/`إ`/`آ`), not standalone hamza. Out of scope.
- Keep the normalization in a shared util (not inlined in the route) so a future chapter-search fix can reuse it.
- Preserve the existing `take: 10` / `orderBy: { id: 'asc' }` / `isSearchQueryValid` gate — normalization happens before those, not instead of them.

## Decisions Made

- Verified via direct DB query that `Verse.text_imlaei_simple` has zero occurrences of `أ`/`إ`/`آ` across the table — normalizing only the query side is sufficient and correct for this column.
- Chapter search has the identical asymmetric-matching characteristic in the opposite direction (bare-alif query failing to match a hamza-containing `name_arabic`), confirmed during investigation. It would need column-side normalization (raw SQL `REPLACE` chain or a precomputed column) to fix, but this was explicitly accepted as out of scope rather than deferred as a bug — chapter names are a small (114), low-cardinality list users select visually rather than type from memory. See [ADR 0007](../architecture/adr/0007-arabic-search-query-normalization.md).
