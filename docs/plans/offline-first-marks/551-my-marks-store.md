---
title: My Marks reads the local store; ungate the page in the PWA
type: feature
date: 2026-09-04
status: implemented
area: marks
issue: 551
adr: [0061]
---

# My Marks reads the local store; ungate the page in the PWA

> Umbrella: [`INDEX.md`](INDEX.md). **Blocked by #546, #550.**

## Summary

Make My Marks work offline, and for signed-out users in the installed PWA, by reading the store.

## Files to change

- `app/[locale]/marks/page.tsx` — stop gating the list on `getServerSession` for the installed
  PWA. `MarksSignedOutPrompt` stays for signed-out users in a plain browser tab, matching #550's
  gate.
- `app/hooks/use-all-marks.ts` — a local-store read with client-side sort (the shared
  `getSortKey` from #545) and windowing; the `useInfiniteQuery` cursor path goes.
- `app/components/marks/MyMarksList.tsx` — render from the store; replace the
  `IntersectionObserver` / `fetchNextPage` plumbing with windowing; drop `reload()`.
- `app/api/marks/route.ts` — retire `cursor`/`nextCursor` now that its last consumer is gone.
- `messages/ar.json`, `messages/en.json` — the two failure states below.

## Constraints

- Offline and guest rendering is only possible because the record denormalizes the snippet and
  location (#550) — `/api/marks` builds those from `quranPrisma`, and a guest has no session while
  an offline user has no server. If a record is missing them, render the row without the snippet
  rather than dropping the mark.
- Ordering uses the shared `getSortKey`, never a reimplementation.
- **This page is where the two failure states surface, and nowhere else**: permanently-failed
  (`422`) marks, and "session expired, sign in to sync" after a 401 (#547). Neither belongs in the
  reader.
- The comment preview keeps the `dir="auto"` rules from `decisions/marks.md` — including that only
  **one** element in the chain carries `dir="auto"`, or the container's scan skips the only
  text-bearing child and always resolves LTR.
- The page is a server component today; ungating it must not make the reader routes dynamic —
  it is outside the 604 static pages, but check the boundary (`decisions/rendering.md`).

## Test cases from the umbrella

1 (the My Marks half), 4, 9.

## Done when

- Offline, My Marks lists the user's marks with snippets and categories.
- In the installed PWA a signed-out user sees their own marks; in a plain tab they still see the
  prompt.
- Deleting in My Marks still clears the reader highlight on return — the regression guard for
  #548's `reloadMarks()` removal.
- Scrolling a large list still windows correctly with no cursor.
