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

> Umbrella: [`INDEX.md`](INDEX.md). **Blocked by #546, #550** (both landed).
> Follow-up for epic #590 / issue #592 folded in 2026-09-08 (see Revision History).

## Summary

Make My Marks work offline, and for signed-out users in the installed PWA, by reading the store.

The `/marks` route is a static precached shell (no `getServerSession` — #591, `ADR 0014`
Addendum 10): `MyMarksList` resolves the live session client-side with an online-only
`sessionPending` skeleton, and `app/sw.ts` serves `/{ar,en}/marks` navigations offline.
The store read path (`useAllMarks`), tombstone delete path (`tombstoneLocalMark` +
background `syncMarks`), stamp-based gating (`evaluateMarkModalGates`), and the two
page-only banners (401 / 422) are the offline behavior; page-level E2E
(`e2e/tests/marks-offline-page.spec.ts`) pins it — no new app architecture.

## Decision Tree / Algorithm

- Offline + stamp `!== "guest"` → show the store list; `useSession()` ignored.
- Offline + stamp `=== "guest"` + standalone → show the guest's local marks.
- Offline + stamp `=== "guest"` + browser tab → `MarksSignedOutPrompt`.
- Offline delete → `tombstoneLocalMark` (`deleted: true`, `sync: "pending"`) + background
  `syncMarks()` that fails safe and stays pending; the filter drops tombstones so the
  row stays gone; reconnect pushes then pulls.
- Banners → local snapshot only; 401 never moves the stamp, 422 drops stay page-only.

## Files to Change

- `app/[locale]/marks/page.tsx` — stop gating the list on `getServerSession` for the installed
  PWA. `MarksSignedOutPrompt` stays for signed-out users in a plain browser tab, matching #550's
  gate. (Done in #591: route is now a static shell with no server session seed.)
- `app/hooks/use-all-marks.ts` — a local-store read with client-side sort (the shared
  `getSortKey` from #545) and windowing; the `useInfiniteQuery` cursor path goes.
- `app/components/marks/MyMarksList.tsx` — render from the store; replace the
  `IntersectionObserver` / `fetchNextPage` plumbing with windowing; drop `reload()`.
  (Later: client-side session resolution with the online-only `sessionPending`
  skeleton — #591.)
- `app/api/marks/route.ts` — retire `cursor`/`nextCursor` now that its last consumer is gone.
- `messages/ar.json`, `messages/en.json` — the two failure states below.
- `e2e/tests/marks-offline-page.spec.ts` (new, #592) — offline `/marks` read +
  delete-reconnect + guest specs; standalone spoof and offline event patterns from
  `552-e2e-coverage.md`; dedicated per-project users (ids 11/12) so parallel workers
  never share server rows.
- `e2e/helpers/*` — unchanged: the existing `clearLocalMarksStore` +
  `clearUserMarks(userId)` cover isolation.

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
- `GET /api/marks` stays `NetworkOnly` — an offline pull must fail, never serve a stale
  cached snapshot (`decisions/pwa.md`, `decisions/marks.md`).
- Owner stamp stays sticky and evidence-based; never derive it from `useSession()`
  (`ADR 0061`).
- Grant mushaf stays online-only; `MarkModal` and reader highlights unchanged; no SW
  route changes in this task.
- `sessionPending` is online-only (`status === "loading" && !isOffline`) — offline cold
  launches must never sit on skeleton waiting for the ~3s session abort.
- `word-marking.spec.ts` Unauthenticated Gating + Auth Gate Redirect Restoration +
  My Marks Deletion Cache Freshness suites stay green unmodified (per #552).

## What NOT to Do

- Do not reintroduce `getServerSession` (or any per-request personalization) into the
  `/marks` route — it would un-static the precached shell #591 built.
- Do not gate any offline decision on live `useSession()` — the stamp decides offline.
- Do not surface sync banners in the reader; do not add per-mark sync badges.
- Do not build an operation log, a guest→account migration, or IndexedDB (umbrella
  `What NOT to do` still active).
- Do not add an offline variant of the sign-out confirm — sign-out is unreachable
  offline (#561).

## Decisions Made

- No new ADR for the offline page: the static-shell contract is recorded in `ADR 0014`
  Addendum 10 (#591); sync semantics stay under `ADR 0061`.
- E2E isolation: dedicated per-project users (ids 11/12) because desktop and mobile
  workers run in parallel against one e2e database; auth is JWT-cookie based and marks
  reference users by scalar id, so no DB seeding is needed.
- Windowing gets no offline-specific E2E case: it is pure client-side slicing with no
  network path, so an offline scroll test would prove nothing beyond the store-render
  case already covered.
- Sweep: `use-all-marks.test.ts` covers the pure `filterAndSortMarks` and is unaffected;
  the signed-out prompt suites are preserved by the `sessionPending` + `isMounted` guard;
  no same-origin `GET /api/*` in the read path falls through to `defaultCache`
  (marks GETs are `NetworkOnly`); the dropped `initialSessionUser` prop was data, not a
  UI trigger — the skeleton covers the flash.

## Verified Test Cases

- Umbrella cases 1 (the My Marks half) and 4 still hold; case 9 belongs to #561.
- Page-level E2E (#592): offline `/marks` renders seeded marks with filters and grouping
  with the network off; delete-while-offline on `/marks` then reconnect syncs the delete
  to the server (no resurrection on a fresh pull); installed-PWA guest sees own marks
  offline with no sign-in wall.
- Deleting in My Marks still clears the reader highlight on return — the regression guard for
  #548's `reloadMarks()` removal.
- Scrolling a large list still windows correctly with no cursor.

## Done when

- Offline, My Marks lists the user's marks with snippets and categories.
- In the installed PWA a signed-out user sees their own marks; in a plain tab they still see the
  prompt.
- Deleting in My Marks still clears the reader highlight on return — the regression guard for
  #548's `reloadMarks()` removal.
- Scrolling a large list still windows correctly with no cursor.
- Page-level offline E2E green on desktop + mobile (CI).

## Revision History

- 2026-09-08 — folded Addendum (#592 page-level offline verification + E2E: static-shell
  confirmation, decision tree, page-level cases, spec isolation). **Superseded: the original
  "page is a server component today" constraint — the route is now a static precached shell
  with client-side session resolution (#591).**
- 2026-09-08 — review follow-up (Sonnet): narrowed the windowing claim to what the spec
  proves; removed a no-op `clearUserMarks` from the guest test.
