---
title: E2E: offline and guest marking coverage
type: chore
date: 2026-09-04
status: implemented
area: marks
issue: 552
adr: [0061]
---

# E2E: offline and guest marking coverage

> Umbrella: [`INDEX.md`](INDEX.md). **Blocked by #550, #551.**

## Summary

Cover the new behaviour without disturbing the coverage that is still correct.

## Add

- Guest marking under the standalone spoof: mark a word signed-out in the installed PWA, reload,
  assert the highlight persists and the mark appears in My Marks.
- Offline marking for a signed-in user: go offline, mark, assert the highlight and the pending
  status; reconnect and assert it syncs.
- A mark made offline survives a reload before ever syncing (the tombstone/`pending` guarantee).
- Offline delete of a mark tombstones locally, survives reload, and deletes on server after reconnect.
- Note: Sign-out with pending marks (test case 9) was split out into #561 and remains in backlog; its E2E test belongs with that implementation.

## Keep unchanged — these are still correct

Because guest marking is gated to the installed PWA and Playwright runs in a normal browser
context, a signed-out user still sees the sign-in wall. These are not stale:

- `test.describe("Unauthenticated Gating")` — both tests.
- `test.describe("Auth Gate Redirect Restoration")` — the `?markWord=` OAuth-return flow; this is
  the guard on the contract #550 must preserve.
- `test.describe("My Marks Deletion Cache Freshness")` — the regression guard for #548's
  `reloadMarks()` removal.

## Codebase pointers

- `e2e/tests/word-marking.spec.ts` — all existing marks coverage.
- `e2e/helpers/reader.ts:57` already spoofs standalone display-mode via `matchMedia` before first
  paint — reuse it, do not write a second spoof. `e2e/tests/overlay-stacks-history.spec.ts:36` is
  a second example of the same helper pattern.
- `e2e/tests/offline-pwa.spec.ts` — the offline patterns.

## Constraints

- Verify locally against a production build (`npm run e2e:serve`), never `next dev`.
- Clearing state between tests must clear the **local store** too, not just cookies — the existing
  `setupReaderSession` helper clears marks server-side and will otherwise leak local records
  between tests.

## Done when

- New tests pass on desktop and mobile projects.
- Every kept test above still passes unmodified.
