---
title: Wire the marks store + sync engine into the app lifecycle
type: fix
date: 2026-09-06
status: implemented
area: marks
issue: 560
adr: [0061]
---

# Wire the marks store + sync engine into the app lifecycle

> Umbrella: [`INDEX.md`](INDEX.md). **Unblocks #548.**

## Summary

`#546` and `#547` shipped as modules nothing imports. This connects them to the app so the store
is actually populated and the sync triggers actually attach.

## Root cause

Three separate breaks, each sufficient on its own to make the feature inert:

- **Nothing imports `app/lib/marks/sync.ts`.** The only non-test importer of anything under
  `app/lib/marks/` is a type-only import in `app/utils/storage.ts`. The module never evaluates, so
  its deferred launch trigger never runs.
- **Nothing calls `subscribe()` on the sync engine.** The `online`, `visibilitychange`, `storage`
  and store-mutation triggers are all attached inside `subscribe()`, on the first listener. With no
  listener there are no triggers.
- **Nothing calls `setOwnerStamp()`** outside `store.test.ts`. The stamp is permanently `"guest"`,
  and `executeSync()` returns early for `"guest"`, so even a fired trigger would do nothing.

`#547`'s plan listed **launch** and **session → authenticated** among the triggers it owned, but its
*Files to change* named no component and the implementation shipped without one. `#549`–`#552` do
not claim it either.

## Files to change

- **New** `app/components/marks/MarksSync.tsx` — null-rendering effect leaf, same shape as
  `LastReadPageSync` / `TafsirReaderSync` / `KeepScreenAwakeSync`. Subscribes to the sync engine
  (which attaches the triggers) and stamps the owner from an observed authenticated session.
- **New** `app/hooks/use-marks-sync.ts` — `useSyncExternalStore` over `app/lib/marks/sync.ts`, the
  intended public surface of that module. `#551` renders its status.
- `app/[locale]/layout.tsx` — mount `<MarksSync />` beside the existing sync leaves.

## Constraints

- **The stamp moves only on positive evidence.** `status === "authenticated"` plus a user id is the
  only signal that writes it. An `unauthenticated` reading is never acted on: offline, every launch
  reads unauthenticated because `app/sw.ts` aborts `/api/auth/session` at 3s (ADR 0049), and
  re-stamping `"guest"` there would trip the different-owner reset on reconnect and discard exactly
  the offline work this design exists to protect (umbrella test case 8).
- **Sign-out does not touch the stamp.** Stamping `"guest"` on sign-out would let a later sign-in as
  a different account treat the previous owner's leftovers as migratable.
- **No new launch-time network.** `SessionProvider` is already in the root layout, so `useSession()`
  adds no request. The sync run itself stays on `sync.ts`'s existing idle-after-first-paint trigger,
  gated on a signed-in stamp (ADR 0049 Root-Layout Network Budget).
- **The engine subscription must be established before the owner effect runs**, or the
  guest→account transition that `onStoreChange` watches for is missed. `useSyncExternalStore` is
  called first in the component body, so React registers its subscription effect ahead of the
  stamping effect.
- `setOwnerStamp` throws on `QuotaExceededError` by design — the call site must not let that
  escape into a render loop.
- Grant-scoped marks are untouched.

## Known window, closed by #549

Enabling the pull before `#549` means `/api/marks?all=true` can resolve from `defaultCache`'s 24h
`"apis"` cache. Bounded today: nothing reads the store yet (`#548`) and no record can be `pending`
yet (`#550`), so a stale pull writes stale data into a store no UI consults and cannot discard
unpushed work. `#549` closes it and is already sequenced right behind `#548`.

## Out of scope

The sign-out flush-and-confirm required by `decisions/marks.md` also has no owner, but it cannot be
exercised until `#550` creates pending records. Filed separately and sequenced with `#550`.

## Test cases from the umbrella

7 (account switch resets and pulls fresh) and 8 (offline launch leaves the stamp alone).

## Done when

- A signed-in user's marks land in the store on launch, with no mount `useEffect` firing the run.
- Signing in stamps the store with that user id; signing out leaves the stamp untouched.
- Signing in as a different user resets the store and pulls fresh.
- An offline launch leaves the stamp unchanged despite `useSession()` reading unauthenticated.
