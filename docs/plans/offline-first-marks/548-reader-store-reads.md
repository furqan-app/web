---
title: Reader renders marks from the local store
type: feature
date: 2026-09-04
status: implemented
area: marks
issue: 548
adr: [0061]
---

# Reader renders marks from the local store

> Umbrella: [`INDEX.md`](INDEX.md). **Blocked by #546.**
> **This is the highest-risk child of the nine. Instrument before designing the wiring.**

## Summary

`useMarks` reads the store instead of fetching, keeping its contract so `QuranSafha` is untouched.

## Investigate first — do not skip

`QuranSafha` sits inside the persistent pager (ADR 0028), keeps multiple panels mounted, and is
tuned around font readiness (`document.fonts.check`, the `fontReady` lazy initializer). Three
shipped plans in this repo address flicker in this exact path — `fix-safha-swipe-flicker`,
`fix-tajweed-swipe-flicker`, `reader-persistent-pager`. A store subscription firing on every mark
write, across every mounted panel, lands in the middle of that.

Confirm the actual re-render behaviour by browser instrumentation before choosing the wiring, per
the standing rule that flicker/flash causes are established by instrumentation rather than
code-reading. The specific question: when one mark is written, how many panels re-render, and does
any of them re-run the font-readiness path?

If subscription granularity turns out to matter, the fix belongs here — a per-page selector, or a
snapshot keyed by the `markPages` list — not in `QuranSafha`.

## Files to change

- `app/hooks/use-marks.ts` — read via `useSyncExternalStore`; keep the `markPages` list contract
  and the `Record<marked_id, PageMark>` return shape.
- `app/components/MarkModal.tsx` — drop the `reloadMarks()` call (see below).

*(Added during implementation, 2026-09-06 — the author chain the corrected `is_own` constraint
needs, none of which existed: `app/api/marks/route.ts` returns `from_user` + `author_name` via the
existing `withAuthorNames` helper, `app/lib/marks/store.ts` carries them on `LocalMark`, and
`app/lib/marks/sync.ts` maps them through the pull.)*

## Constraints

- The adapter must still populate `PageMark`'s `from_user` / `author_name` / `is_own`.
  **Corrected during implementation (2026-09-06): `is_own` is NOT always `true` on the self mushaf.**
  As first written this constraint said it was, and implementing it that way silently dropped
  "Marked by X" for marks a grant holder wrote into your mushaf — caught by
  `e2e/tests/shared-mushaf.spec.ts`, which signs in as the owner on `/ar/pages/1` and asserts the
  viewer's name. A grant holder writes with `to_user` = owner and `from_user` = viewer (ADR 0012),
  which is exactly why the self marks endpoint always ran `withAuthorNames`. So `is_own` is derived
  per mark by comparing the record's `from_user` to the owner stamp, and the author must be carried
  all the way down the local-first chain: `/api/marks` returns `from_user` + `author_name`,
  `LocalMark` stores them (optional — records written before this, and a guest's own marks, have no
  server author and read as the reader's own), and `applyServerPull` passes them through.
  `QuranSafha` still gates `authorName` on `!is_own`, so nothing renders "Marked by" over your own
  mark.
- **`grantId` set keeps the existing server-fetch path**, untouched.
- **`reloadMarks()` / `invalidateQueries(["/marks"])` is removed from the SELF path only.**
  *(Revised during implementation, 2026-09-06.)* As first written this constraint said to remove it
  outright, which conflicts with "the grant reader is byte-for-byte unchanged" below: React Query is
  still behind the hook when `grantId` is set, and `reload()` is that reader's only
  refresh-after-write. Removing it wholesale silently breaks mark refresh on a shared mushaf.
  `MarkModal` therefore routes both write paths through one helper — `grantId` → `reload()`, self →
  a best-effort `syncMarks()`. On the self path `reload()` really would be the silent no-op this
  constraint warned about, whose symptom is "I saved a mark and it didn't appear".
  `MyMarksList`'s `reload()` follows in #551.
- Marks key to the DEFAULT edition's page number (ADR 0033) — the multi-page `markPages` lookup
  exists because 36 pages disagree between editions. Do not simplify it to a single page.

## Test cases from the umbrella

1 and 8 (the reader half), plus 4 — a tombstoned mark must disappear from the page.

## Done when

- Marks render from the store with no network request.
- Writing a mark updates the reader with no explicit reload call. *(Met via a best-effort
  `syncMarks()` that pulls the server write back into the store — the modal still writes to the
  server in this issue. The true no-round-trip version, where `MarkModal` writes to the store
  directly and the reader updates with no network at all, is #550's scope.)*
- Swiping through pages shows no new flicker: verify against the instrumentation baseline taken
  above, not by eye alone.
- The tajweed edition and the double-page spread still show marks (ADR 0033, ADR 0013).
- The grant reader is byte-for-byte unchanged in behaviour.
