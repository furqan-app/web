---
title: Local marks store module
type: feature
date: 2026-09-04
status: ready-to-implement
area: marks
issue: 546
adr: [0061]
---

# Local marks store module

> Umbrella: [`INDEX.md`](INDEX.md) — the record shape and the `synced`/`pending` rule live there.
> No dependencies. Lands as unused code; #547, #548, #550 and #551 are its consumers.

## Summary

The single module that owns local mark state. Everything else reads and writes marks through it.

## Files to change

- **New** `app/lib/marks/store.ts` — the record map (keyed with `markKey`), the owner stamp,
  read/write/subscribe, and the `navigator.storage.persist()` request.
- `app/utils/storage.ts` — add the key to `StorageKey` and `StorageValueType`, with a comment
  matching the style of the `recitationDownloads` / `tafsirDownloads` entries.

## Constraints

- **`getSnapshot` must return a stable object reference** until a mutation. Re-parsing
  `localStorage` on every call returns a fresh object each time, which sends
  `useSyncExternalStore` into an infinite re-render loop. Hold the parsed map in memory;
  `getServerSnapshot` returns an empty map.
- **Handle `QuotaExceededError` explicitly.** `storage.set` swallows failures with a
  `console.warn`; here that means a mark the user believes is saved silently isn't. Surface it
  rather than logging it.
- Serialize once per mutation, never per render — `localStorage` writes block.
- **`localStorage`, not IndexedDB.** Marks can never be in the SSR HTML (user state on a
  statically-generated page; `useSyncExternalStore` uses `getServerSnapshot` through hydration),
  so highlights land on the first client commit after hydration. A synchronous store makes that
  one commit; IndexedDB adds an async hop that pushes them a frame further out — the flash class
  ADRs 0028/0034 exist to prevent. The store is bounded (~150 bytes/mark; 5,000 ≈ 750KB), there
  is no `idb` dependency, and the `storage` event gives cross-tab coordination for free.
- All access goes through this module, so its internals can move to IndexedDB later without
  touching consumers.
- **Request `navigator.storage.persist()`** once, and record `persisted()` for #550 to read.
  Guest marks are single-copy — no server replica to heal from, unlike every other offline
  feature here — so this is a prerequisite of guest marking, not an optimisation. See the
  umbrella's iOS section.

## Test cases from the umbrella

None end-to-end (no consumers yet). Unit-test the record transitions directly: `pending` survives
a simulated pull, a tombstone survives a reload, an owner-stamp change to a different id clears
the map, and a `QuotaExceededError` surfaces rather than silently dropping a write.

## Done when

- Records round-trip through `localStorage` and survive a reload, tombstones included.
- `getSnapshot` returns an identical reference across calls with no mutation between them.
- The owner stamp reads and writes, and a different-id write clears the map.
- `persist()` is requested once and `persisted()` is readable.
