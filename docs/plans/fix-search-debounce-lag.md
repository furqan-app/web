# Fix Search Debounce Lag

**Type:** bug  
**Date:** 2026-07-02  
**Status:** implemented  
**Trello:** https://trello.com/c/UEquTEG1/35-fix-the-search-debouncing

## Root Cause

The debounce timer (500ms) was correct. The lag came from the verse search query having no result cap — a common search term matches hundreds of verses, each eager-loading its full `Word[]` array. The large payload + synchronous React render landed exactly when the user resumed typing, queuing keystrokes behind the render.

## Fix

1. Minimum query length of 2 characters before any request fires (both client and server — server returns `{ results: [] }` early for shorter queries, mirroring the existing `!query` short-circuit).
2. Cap both endpoints to `take: 10` with `orderBy: { id: 'asc' }`.
3. Constant: `app/constants/search.ts` — `MIN_SEARCH_QUERY_LENGTH = 2` and `isSearchQueryValid(query: string)` shared by both API routes and client (avoids the literal `2` being copy-pasted and drifting between 5 call sites).

## Files Changed

- `app/constants/search.ts` — new: `MIN_SEARCH_QUERY_LENGTH`, `isSearchQueryValid`
- `app/api/search/verses/route.ts` — `take: 10`, `orderBy: { id: 'asc' }`, early-return when `!isSearchQueryValid(query)`
- `app/api/search/chapters/route.ts` — `take: 10`, same early-return
- `app/hooks/use-search.ts` — `enabled: isSearchQueryValid(query)` for both queries
- `app/components/search/SearchBar.tsx` — all four length checks → `isSearchQueryValid(...)`

## Constraints

- Do not change the 500ms debounce delay.
- Deferred: "see all results" button to escape the `take: 10` cap — not implemented; noted in DECISIONS.md so the cap isn't mistaken for a permanent ceiling.
- Do not add AbortController — not required once payload size is bounded.
