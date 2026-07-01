# Fix Search Debounce Lag

**Type:** bug
**Date:** 2026-07-02
**Status:** implemented
**Trello:** https://trello.com/c/UEquTEG1/35-fix-the-search-debouncing

## Summary

User-reported symptom: typing in search, pausing briefly, then resuming typing causes a noticeable lag. The debounce timer itself (`SearchBar.tsx`) is implemented correctly — 500ms `setTimeout` reset on every keystroke, cleared on unmount/change. The lag is not a debounce bug.

## Root Cause

The debounce timer fires exactly on schedule (after ~500ms pause), triggering a fetch. The verse search query (`app/api/search/verses/route.ts`) has no result cap and eager-loads the full `Word[]` array for every matching verse via `prisma.verse.findMany({ where: { text_imlaei_simple: { contains: query } } })`. A common search term (even a single letter) can match hundreds of verses, each pulling dozens of joined word rows — a large payload that takes a while to fetch, then blocks the main thread while React renders it all into `SearchQueryResults`. Because this render lands right as the user resumes typing (the pause was long enough to trigger the debounce), the keystrokes queue up behind the synchronous render, which is felt as "lag."

The chapter search (`app/api/search/chapters/route.ts`) has the same missing-cap issue but is lower risk (114 chapters total, no joined collection).

## Fix

1. Add a minimum query length of 2 characters before firing any search request, gating out the worst case (single-character queries matching huge portions of the table).
2. Cap both verse and chapter search results to 10 rows (`take: 10`), with a deterministic `orderBy` so the same top-10 are returned on every request.

This directly bounds the payload size and render cost, so the debounce-triggered render can no longer block the main thread long enough to be felt as lag.

## Files to Change

- `app/hooks/use-search.ts` — change `enabled: query.length > 0` to `enabled: query.trim().length >= 2` for both `verses` and `chapters` queries, so requests aren't fired for 0-1 character input.
- `app/api/search/verses/route.ts` — add `take: 10` and `orderBy: { id: 'asc' }` to `prisma.verse.findMany`.
- `app/api/search/chapters/route.ts` — add `take: 10` to `prisma.chapter.findMany` (already has `orderBy: { id: 'asc' }`).
- `app/components/search/SearchBar.tsx` — update `handleQueryChange`'s `setIsOpen(value.length > 0)` and the mobile results-visibility check (`query.length > 0 && hasResults`) to use the same 2-character threshold, so the dropdown-open logic matches when a search can actually return results. Also update `handleSearchFocus`'s `query.length > 0` check to `query.trim().length >= 2` (trimmed, matching the other three gates — not the bare `query.length >= 2` originally written here, which would have let whitespace-only input reopen the dropdown).

## Edge Cases

- Query of exactly 1 character: no request fires, dropdown does not open (consistent — previously it would open with a spinner, then close once the empty-cap response arrived).
- Clearing the input back below 2 characters: existing debounce/enabled logic already handles this the same way it handles the empty-string case today (query disabled, stale cached data simply isn't rendered because dropdown open-state also gates on length).
- Whitespace-only queries (e.g. `"  "`): `query.trim().length >= 2` correctly treats these as below threshold, consistent with the existing `searchVerses`/`searchChapters` trim-check in `use-search.ts`.

## Constraints

- Do not change the 500ms debounce delay — it was not the cause of the reported lag and there's no evidence it needs tuning.
- Do not touch `app/utils/db.ts`'s `connection_limit: 5` or add DB indexes — out of scope for this fix; the result cap addresses the reported symptom directly without needing schema changes.
- Do not add request cancellation/AbortController — not required once payload size is bounded; would be premature scope expansion for this bug fix.

## Decisions Made

- Result cap: 10 rows per search type (verses, chapters).
- Minimum query length: 2 characters, applied consistently across the fetch-enabled gate and the UI's open/visibility gates.

## Addendum — /review-fq-work follow-ups (2026-07-02)

`/review-fq-work --staged` surfaced two real gaps in the original implementation, plus a deferred feature ask:

1. **Server-side gate was missing.** The 2-char minimum was only enforced client-side (`use-search.ts`'s `enabled`, `SearchBar.tsx`'s open/focus checks). A direct request to `/api/search/verses?q=a` still ran the full `contains` scan. Both API routes now return `{ results: [] }` early for queries below the same 2-char trimmed threshold, mirroring the existing `if (!query)` short-circuit.
2. **Threshold constant deduplicated.** The literal `2` (and the `query.trim().length >= 2` check) was copy-pasted across 5 call sites in 2 files. Extracted to `app/constants/search.ts`: `MIN_SEARCH_QUERY_LENGTH = 2` and `isSearchQueryValid(query: string)`. Used by both API routes and the client, so the contract can't drift between them again.
3. **Deferred:** a "see all results" button (to escape the `take: 10` cap) was requested but explicitly deferred by the user — not implemented in this pass. Noted here so the `take: 10` cap in `DECISIONS.md`'s Search section isn't mistaken for a permanent ceiling.

### Files Changed (addendum)
- `app/constants/search.ts` — new file, `MIN_SEARCH_QUERY_LENGTH` + `isSearchQueryValid`.
- `app/api/search/verses/route.ts` — early-return `{ results: [] }` when `!isSearchQueryValid(query)`.
- `app/api/search/chapters/route.ts` — same early-return.
- `app/hooks/use-search.ts` — `enabled: isSearchQueryValid(query)` for both queries.
- `app/components/search/SearchBar.tsx` — all four length checks replaced with `isSearchQueryValid(...)`.
- `docs/architecture/DECISIONS.md` — Search section updated to mention the server-side enforcement and the deferred "see all results" button.
