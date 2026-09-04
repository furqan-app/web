---
title: Offline-First Marks — umbrella
type: feature
date: 2026-09-04
status: ready-to-implement
area: marks
issue: 236
adr: [0061]
---

# Offline-First Marks — umbrella

Marking works offline and, in the installed PWA, without an account. This is an **umbrella
plan**: nine independently implementable issues, each with its own file here, its own branch
and its own PR.

Read this file plus the one child file for the issue you are implementing. Do not read the
other eight.

## Working model

- **One issue, one branch, one PR** — unlike `design-migration`, these are not batched.
- Order is governed by the dependency column below, not by file order.
- A child is finished when its own `Done when` list passes and no cross-cutting invariant
  below is violated.
- The app is expected to be mid-migration between children. `#549` in particular must not land
  early — see its file.

## Issue map

| Issue | File | Depends on |
|---|---|---|
| [#544](https://github.com/furqan-app/web/issues/544) Stale-write guard | [`544-stale-write-guard.md`](544-stale-write-guard.md) | — |
| [#545](https://github.com/furqan-app/web/issues/545) Marks API full-sync mode | [`545-api-full-sync.md`](545-api-full-sync.md) | — |
| [#546](https://github.com/furqan-app/web/issues/546) Local store module | [`546-local-store.md`](546-local-store.md) | — |
| [#547](https://github.com/furqan-app/web/issues/547) Sync engine | [`547-sync-engine.md`](547-sync-engine.md) | 544, 545, 546 |
| [#548](https://github.com/furqan-app/web/issues/548) Reader reads the store | [`548-reader-store-reads.md`](548-reader-store-reads.md) | 546 |
| [#549](https://github.com/furqan-app/web/issues/549) SW: marks GET NetworkOnly | [`549-sw-networkonly.md`](549-sw-networkonly.md) | 548 |
| [#550](https://github.com/furqan-app/web/issues/550) MarkModal gates | [`550-markmodal-gates.md`](550-markmodal-gates.md) | 546 |
| [#551](https://github.com/furqan-app/web/issues/551) My Marks from the store | [`551-my-marks-store.md`](551-my-marks-store.md) | 546, 550 |
| [#552](https://github.com/furqan-app/web/issues/552) E2E coverage | [`552-e2e-coverage.md`](552-e2e-coverage.md) | 550, 551 |

#544, #545 and #546 have no dependencies and can run in parallel.

## Architecture

**The local store is the read source of truth for the UI; the server is the durable source of
truth for the data.** See [ADR 0061](../../architecture/adr/0061-offline-first-marks-sync.md)
and the "Marks Are Local-First" section of
[`decisions/marks.md`](../../architecture/decisions/marks.md).

Sync is **state-based, not operation-based**. One local record per marked spot holds its
desired current state, and that state is pushed. `upsertMark`/`deleteMark` are already
idempotent and keyed by `[marked_type, marked_id, to_user]`, so replay is order-independent and
retries cannot regress state. An operation log was rejected: `red → blue → delete → green`
offline would replay as four ordered writes, and a partial failure mid-replay leaves the server
in a state that never existed on the client.

Every record is exactly one of:

- **`synced`** — a mirror of a server row. Disposable, freely overwritten by a pull.
- **`pending`** — an unacknowledged intent. Never overwritten by a pull, never dropped without an ack.

### The record

```ts
type LocalMark = {
  marked_type: "word" | "verse";
  marked_id: string;            // location "s:v:w" | verse_key "s:v"
  page_number: number;
  category: string;
  comment: string | null;
  // Denormalized for offline / guest My Marks — /api/marks builds these from quranPrisma.
  snippet: string;
  chapter_name_simple: string;
  chapter_name_arabic: string;
  verse_number: number;
  deleted: boolean;             // tombstone
  updated_at: number;           // client ms
  sync: "synced" | "pending";
};
```

Map keyed `${marked_type}:${marked_id}` (reuse `markKey` from `app/constants/marks.ts`), plus an
owner stamp (`"guest"` | user id).

### Sync run — push, then pull

| Situation | Local record | Result |
|---|---|---|
| Push upsert 2xx | `pending` → `synced` | — |
| Push delete 2xx | tombstone dropped | — |
| Server row's `client_updated_at` newer | stays; corrected by the pull | stale device self-heals |
| Push → 401 | stays `pending` | run stops; raise "session expired, sign in to sync" |
| Push → 422 | dropped + logged | surfaced in My Marks, never the reader |
| Push → network error | stays `pending` | retried next trigger |
| Pull returns a spot held `synced` | overwritten | server is durable truth |
| Pull returns a spot held `pending` | **ignored** | unpushed intent is never lost |

Push runs before pull so the pull observes post-push state.

### Owner stamp

| Transition | Behaviour |
|---|---|
| Guest → sign in as U | Re-stamp to U. Guest records are all `pending`, so the ordinary push loop **is** the migration — do not write a separate one. |
| Signed in as U → sign out | Flush `pending` while online. Keep the store **and the stamp**. |
| Sign in as V, stamp says U | Reset the store, pull fresh for V. |

### Session state is not a reliable signal offline

`useSession()` reports **unauthenticated** whenever `/api/auth/session` fails or is aborted —
next-auth's failure path never calls `setSession`, and `app/sw.ts` aborts it at 3s (ADR 0049,
already recorded as an accepted trade-off in `decisions/api.md`). Offline that is the normal
case, so:

| Signal | Meaning for the stamp |
|---|---|
| Successful sign-in (id U) | Stamp becomes U |
| Explicit user sign-out | Flush pending; stamp unchanged |
| Unauthenticated, session fetch **succeeded** | Evidence of no session — trust it |
| Unauthenticated, session fetch **failed / offline** | **Unknown.** Last stamp stands. |
| Push returns 401 | Session gone — stop the run; do **not** move the stamp |

The reset-on-different-owner rule therefore fires only on a successful sign-in, which needs the
network, so it can never fire offline and can never discard offline work.

Sign-out must **not** stamp `"guest"`: a later sign-in as a different account would then treat
the previous owner's leftovers as migratable and push them into the wrong account.

## Cross-cutting invariants

These apply to every child. Violating one is a bug even if that child's own list passes.

- A pull never overwrites a `pending` record; `synced` records are freely overwritten.
- Deletes are tombstones until acked — removing the local row lets the next pull resurrect it.
- Push before pull within a run.
- The owner stamp never follows `useSession()`, and guest-facing UI gates on the **stamp**.
- **`grantId` is the cut-off.** Grant-scoped marks are never stored locally or queued; that
  reader keeps today's offline-disabled UI. ADR 0014's concurrent-viewer hazard under ADR 0012
  last-author-wins is *not* superseded.
- The stale-write guard compares client clock to client clock, never to the server-written
  `updated_at`.
- No sync run from an unconditional mount `useEffect` (ADR 0049 Root-Layout Network Budget).
- Marks key to the DEFAULT edition's page number (ADR 0033); the `markPages` multi-page lookup
  contract is unchanged.
- Sync state is shown only when a mark is *not* synced. No per-mark badges in the reader.
- New strings land in **both** `messages/ar.json` and `messages/en.json`.

## Local durability on iOS

Two independent WebKit mechanisms delete local data, and only one exempts installed PWAs.

**ITP's 7-day cap** on script-writable storage exempts home-screen web apps — they "have their
own counter of days of use", and WebKit does "not expect the first-party in such a web
application to have its website data deleted". A plain Safari tab is **not** exempt.

**Quota / storage-pressure eviction** is separate and not covered by that exemption: eviction
happens "when exceeding the overall quota, when the system is under storage pressure, or when
the site has not been interacted with by the user for some time", LRU. Same mechanism behind
ADR 0060's `verifyAndHeal`.

**Mitigation:** `navigator.storage.persist()`. A persistent-mode origin is excluded from
eviction, and WebKit grants it on heuristics "like whether the website is opened as a Home
Screen Web App" (Safari 17+). Requested in #546. It is a request, not a guarantee, so ADR
0060's `verifyAndHeal` stays.

**Scope decision (2026-09-04):** guest marking is gated to `isStandaloneDisplayMode()`, matching
offline recitation (ADR 0046) and offline tafsir (ADR 0060). Guest marks are single-copy with no
server replica to heal from. Signed-out users in a plain browser tab keep today's sign-in wall.
**Offline marking for signed-in users is not gated this way** — their marks have a server replica.

## Verified test cases

Walked through and agreed during planning. Each child file names the ones it must satisfy.

1. **Guest marks 2:255, closes the app, reopens offline (installed PWA).** Record is `pending`; the reader reads local; the highlight is there. No network at any point.
2. **That guest signs in; the account already has 2:255 as `similar` from the web, marked yesterday.** The guest record is newer → the guard passes → the server takes the guest's category. Had the web mark been newer, the guard skips the push and the pull overwrites local with `similar`. Newest wins, read from either direction.
3. **Offline: red → blue → delete → green.** One record, final state green, one POST on reconnect.
4. **Offline delete of an already-synced mark.** Tombstone, `pending`; survives reload; the reader hides it. Reconnect → DELETE → tombstone dropped.
5. **Phone offline a week holds `forgetting` (T0); laptop set `linking` (T1 > T0).** The phone pushes T0 → the server's client stamp is newer → skipped. The pull returns `linking` → the phone converges.
6. **Shared mushaf, offline.** No local write path; `MarkModal` keeps its disabled state and offline notice.
7. **Account switch.** Store stamped U; signing in as V resets the store and pulls fresh.
8. **Signed-in user opens the installed PWA offline.** Session fetch fails, `useSession()` reports unauthenticated — the stamp is unchanged, the reader still shows their marks, no guest prompt. On reconnect nothing is reset.
9. **Sign-out with 3 marks still pending, online.** Flush attempted; failures leave them pending; dialog offers Sign out anyway / Stay and retry.
10. **Two tabs syncing at once.** Singleton in-flight guard plus the `storage` event; state-based sync makes a double push idempotent regardless.

## What NOT to do

- Do not build an operation log / event queue (ADR 0061 Option A, rejected).
- Do not add a network-first path with a local overlay (Option C, rejected).
- Do not enable offline or guest writes on the grant mushaf.
- Do not write a separate guest→account migration — the push loop is it.
- Do not delete local rows on an offline remove — tombstone them.
- Do not reach for IndexedDB.
- Do not wipe the store on sign-out, and do not stamp it `"guest"` there.
- Do not derive the owner stamp, or guest-vs-signed-in UI, from `useSession()`.
- Do not compare the pushed `updated_at` against `Mark.updated_at`.
- Do not let the marks GET endpoints fall through to `defaultCache`.
- Do not delete the `?markWord=` sign-in callback when removing the sign-in wall.
- Do not treat a 401 as a sign-out.
- Do not build an offline variant of the sign-out confirmation — sign-out is unreachable offline.
