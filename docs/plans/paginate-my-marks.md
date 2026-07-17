# Paginate My Marks

**Type:** feature
**Date:** 2026-07-17
**Status:** implemented

Trello: [#107 Paginate my marks](https://trello.com/c/gK0IIgfk/107-paginate-my-marks)

## Summary

`/marks` (`MyMarksList.tsx` + `GET /api/marks`) currently fetches every mark a user has, enriches all of them with Quran word/verse data, and renders the full list client-side with category tabs filtering an in-memory array. This doesn't scale: a heavy user's mark count grows unbounded, and every mark's DB enrichment cost is paid on every page load regardless of what's actually shown. This adds cursor-based, per-category server pagination with infinite scroll (auto-load on scroll), replacing the full-list fetch with `useInfiniteQuery`.

## Approach

**Server (`GET /api/marks`)** takes `category` (optional; omitted/`"all"` = no category filter) and `cursor` (optional, `"marked_type:marked_id"` of the last item already seen) query params, plus a fixed `limit = 20`:

1. `appPrisma.mark.findMany({ where: { to_user, ...(category ? { category } : {}) } })` — all matching raw rows. Cheap: own-user scoped, no Quran joins.
2. Sort in-memory by the existing `getSortKey` `(surah, verse, wordPos)` — this only needs `marked_id`, no enrichment.
3. Locate the cursor's position in the sorted array (`-1`/start if no cursor or not found), slice the next `limit` items after it.
4. Enrich **only that slice** with the existing `quranPrisma.word`/`verse` batch lookups (unchanged logic, just scoped to the page instead of everything).
5. Respond `{ data: MarkListItem[], nextCursor: string | null }` — `nextCursor` is `${marked_type}:${marked_id}` of the slice's last item, or `null` if the slice reached the end of the sorted array.

**Why cursor over offset:** deleting a mark (existing in-place remove feature) shifts every later offset-based page by one, causing duplicate/skipped rows on the next fetch after invalidation. A cursor keyed to an item's own identity doesn't shift. `react-query`'s `useInfiniteQuery` also natively re-walks every already-loaded page in order on invalidation (recomputing each page's `pageParam` from the freshly-fetched previous page), so a delete elsewhere self-heals the already-loaded pages with no extra client code.

**Client (`use-all-marks.ts`)** becomes `useInfiniteQuery`:
- `queryKey: ["/marks", "all", category]` — category is part of the key, so switching tabs is a distinct cached query (flipping back to a previously-viewed tab reads from cache, no refetch).
- `initialPageParam: undefined`, `getNextPageParam: (lastPage) => lastPage.nextCursor`.
- Same `staleTime: Infinity` + default `refetchOnMount` as today (Addendum 2 in `my-marks-page.md`) — `reload()` still does `invalidateQueries({ queryKey: ["/marks"] })`, which now re-walks all loaded pages of every mounted category query.

**`MyMarksList.tsx`**:
- `useAllMarks(active)` — hook takes the active category key so it can build the right query key. `data.pages` flatMapped gives the flat, already-sorted item list for the current tab; `groupBySurah` runs on that unchanged (pages arrive in sorted order, so surah runs stay contiguous across page boundaries).
- An `IntersectionObserver` sentinel `<div>` after the last rendered item calls `fetchNextPage()` when it enters the viewport, gated on `hasNextPage && !isFetchingNextPage`.
- Loading-more state renders the existing `MarkRowSkeleton` appended below the list (not a full-list replace).

## Decision Tree / Algorithm

**Server pagination per request:**

| Input | Behavior |
|---|---|
| `category` omitted or `"all"` | No `category` filter on the Prisma query — sort/paginate across every mark |
| `category = "<key>"` | `where: { category: "<key>" }` added — sort/paginate within that category only |
| `cursor` omitted | Start slice at index 0 of the sorted array |
| `cursor = "type:id"` present but not found in the sorted array (e.g. that mark was deleted) | Treat as index 0 — restart from the beginning rather than erroring. (Only reachable if a concurrent delete races an in-flight `fetchNextPage`; safe fallback, not expected in normal use.) |
| slice reaches end of sorted array | `nextCursor: null` |
| slice does not reach end | `nextCursor` = last slice item's `type:id` |

**Client tab switch:** new `category` → new `queryKey` → fresh `useInfiniteQuery` (own cache; instant if previously loaded, one fetch if not). Does not affect other tabs' already-loaded pages.

**Empty states (unchanged in spirit from current code):**
- `"all"` tab's first page (`pages[0].data.length === 0`) → global empty state (`marks.empty`), tabs hidden — matches today's `allMarks.length === 0` check.
- Any other tab's first page empty → `marks.emptyCategory` (tabs still shown, since reaching another tab implies `"all"` had data).

## Verified Test Cases

1. **User has 45 marks, all category `"forgetting"`, on "all" tab, `limit = 20`.** Page 1: cursor omitted → items 0–19, `nextCursor` = item 19's key. Sentinel scrolls into view → page 2: cursor = item 19's key → items 20–39, `nextCursor` = item 39's key. Sentinel again → page 3: items 40–44 (5 items), `nextCursor: null` — sentinel now inert (`hasNextPage: false`).
2. **User switches from "all" (2 pages loaded, 40 items) to "similar" tab (12 items total).** New query key `["/marks","all","similar"]` — fresh `useInfiniteQuery`, fetches page 1 with `category=similar`, cursor omitted → all 12 items, `nextCursor: null`. The "all" tab's 2 already-loaded pages stay cached untouched.
3. **User switches back to "all" tab.** Same `queryKey` as step 1 (`["/marks","all","all"]`) → cache hit, both pages render immediately, no fetch (per `staleTime: Infinity`).
4. **User deletes item 19 (last item of "all" page 1) while on "all" tab with 2 pages loaded (40 items).** `deletePageMark` succeeds → `reload()` → `invalidateQueries({queryKey:["/marks"]})` → active `["/marks","all","all"]` query refetches page 1 fresh (cursor omitted, now returns what were items 0–19 shifted, i.e. old items 0–18 + old item 20, 20 items) → recomputes `nextCursor` from the new page 1's last item → refetches page 2 with that cursor → returns old items 21–39 (19 items, since total is now 39). Net: no duplicate, no gap, one fewer item overall — self-healed automatically by `useInfiniteQuery`'s invalidation walk.
5. **User has 0 marks total.** "all" tab, page 1: `data: []`, `nextCursor: null` → global `marks.empty`, no tabs rendered.
6. **User has marks in "forgetting" only; switches to "similar" tab.** Page 1: `data: []`, `nextCursor: null` → `marks.emptyCategory` shown within the tab (tabs still visible, since "all" had data).

## Files to Change

- `app/api/marks/route.ts` — add `category`/`cursor` query param handling, cap query to `limit = 20`, only enrich the sliced page, return `{ data, nextCursor }` instead of `{ data }`.
- `app/server/actions/getAllMarks.ts` — accept `{ category?, cursor? }`, pass through as query params, return `{ data, nextCursor }`.
- `app/hooks/use-all-marks.ts` — `useQuery` → `useInfiniteQuery`; `queryKey: ["/marks", "all", category]`; `initialPageParam`/`getNextPageParam` per the algorithm above; `reload()` unchanged (`invalidateQueries({ queryKey: ["/marks"] })`).
- `app/components/marks/MyMarksList.tsx` — `useAllMarks(active)`; flatMap `data.pages` before `groupBySurah`; add `IntersectionObserver` sentinel + `fetchNextPage`/`hasNextPage`/`isFetchingNextPage` wiring; append a `MarkRowSkeleton` while `isFetchingNextPage`.

## Constraints

- Keep `limit = 20` fixed server-side (not client-configurable) — matches the confirmed page size.
- Do not switch to offset-based pagination — cursor identity is required for the delete-invalidation self-heal in Verified Test Case 4.
- Do not fetch/enrich more than one page's worth of Quran data per request — the whole point is bounding the expensive join per request.
- Keep `staleTime: Infinity` (not `refetchOnMount: false`) — required for cross-hook invalidation to actually refetch, per the existing Addendum 2 in `my-marks-page.md`.
- Auto-load via `IntersectionObserver`, not a manual "Load more" button (per confirmed UI pattern).

## What NOT to Do

- Do not add a total/count query for badge numbers on filter tabs — out of scope, tabs don't show counts today.
- Do not paginate the raw `appPrisma.mark.findMany` query itself (e.g. Prisma `skip`/`take` on step 1) — the raw fetch is cheap and sorting requires the full set; only the expensive enrichment step is scoped to the page.
- Do not thread grant/shared-mushaf awareness into any changed file — `/marks` stays self-marks-only per the original plan's constraint.
