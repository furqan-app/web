---
title: Marks API: full-sync mode + share getSortKey
type: chore
date: 2026-09-04
status: implemented
area: marks
issue: 545
adr: [0061]
---

# Marks API: full-sync mode + share `getSortKey`

> Umbrella: [`INDEX.md`](INDEX.md). No dependencies.

## Summary

Give `/api/marks` a mode returning every enriched mark in one response, so #547's pull can mirror
the server without walking the cursor.

## Approach

`MARKS_PAGE_LIMIT` is 20, so mirroring 500 marks through the cursor is 25 round-trips per sync.
At roughly 200 bytes per enriched mark, 2,000 marks is about 400KB in one response — and it is
the same data the local store has to hold anyway.

`getSortKey` moves to `app/constants/marks.ts` (where `markKey` already lives) so that #551's
client-side ordering reuses the same function rather than a copy that drifts.

## Files to change

- `app/api/marks/route.ts` — full-sync mode; import `getSortKey` from its new home.
- `app/constants/marks.ts` — receives `getSortKey`.

## Out of scope

Retiring `cursor`/`nextCursor` — that happens in #551 when its last consumer goes. Both paths
coexist until then.

## Constraints

- The route is already covered by `auth-middleware`'s `protectedRoutes` (`^/api/marks$`); a new
  query param does not change that, and no matcher edit is needed.
- The enrichment (chapter names, verse number, snippet) must stay identical between the two
  modes — #546's record shape denormalizes exactly these fields, and a divergence would show up
  as wrong text in offline My Marks rather than as an error.

## Done when

- One request returns every mark for the user, enriched, with no cursor.
- The existing paginated path still works unchanged.
- `getSortKey` has one definition, imported by the route.
