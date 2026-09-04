---
title: Reader renders marks from the local store
type: feature
date: 2026-09-04
status: ready-to-implement
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

## Constraints

- The adapter must still populate `PageMark`'s `from_user` / `author_name` / `is_own`. On the self
  mushaf `is_own` is always `true` and `author_name` `null` — `QuranSafha` passes `authorName` to
  `MarkModal` and it must not start rendering "Marked by" for the user's own marks.
- **`grantId` set keeps the existing server-fetch path**, untouched.
- **Remove `reloadMarks()` / `invalidateQueries(["/marks"])`.** React Query is no longer behind
  this hook, so the call becomes a silent no-op whose symptom is "I saved a mark and it didn't
  appear". `MyMarksList`'s `reload()` follows in #551.
- Marks key to the DEFAULT edition's page number (ADR 0033) — the multi-page `markPages` lookup
  exists because 36 pages disagree between editions. Do not simplify it to a single page.

## Test cases from the umbrella

1 and 8 (the reader half), plus 4 — a tombstoned mark must disappear from the page.

## Done when

- Marks render from the store with no network request.
- Writing a mark updates the reader with no explicit reload call.
- Swiping through pages shows no new flicker: verify against the instrumentation baseline taken
  above, not by eye alone.
- The tajweed edition and the double-page spread still show marks (ADR 0033, ADR 0013).
- The grant reader is byte-for-byte unchanged in behaviour.
