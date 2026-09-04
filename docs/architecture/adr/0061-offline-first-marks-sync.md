# ADR 0061: Marks are local-first, synced by state rather than by operation

**Date:** 2026-09-04
**Status:** Accepted (supersedes the marks clause of [ADR 0014](./0014-pwa-offline-architecture.md) for the self mushaf only)

## Context

ADR 0014 kept marks online-only because the shared-mushaf model is last-author-wins
across concurrent viewers (ADR 0012), so a queued offline write could silently clobber
another viewer's newer edit. That reasoning is specific to the **grant** mushaf: a user's
own mushaf has exactly one writer, and the only divergence possible there is the same
person on two devices. Meanwhile the mark UI is gated twice — disabled when offline and
replaced by a sign-in wall when unauthenticated — so the installed PWA, which can read all
604 pages offline, cannot annotate any of them, and a visitor cannot try the core feature
at all without an account.

## Options Considered

**Option A — Operation log**
Queue each `add`/`remove` as an event and replay the queue in order on reconnect.

**Option B — State-based sync**
Keep one local record per marked spot holding its desired current state, and push that
state; the server's upsert/delete are already idempotent and keyed by the spot.

**Option C — Network-first with a local overlay**
Keep `useMarks` fetching the server, merge pending local mutations on top, fall back to a
cached snapshot only when the fetch fails.

## Decision

Option B, applied local-first: **the local store is the read source of truth for the UI,
the server is the durable source of truth for the data.** Every local record is either
`synced` (a disposable mirror of a server row, freely overwritten by a pull) or `pending`
(an unacknowledged intent, never overwritten by a pull and never dropped without an ack).
A sync run pushes before it pulls. Writes to a **grant** mushaf stay online-only, so ADR
0014's actual concern is untouched.

Option A was rejected because ordering is a liability: `red → blue → delete → green` made
offline replays as four ordered writes, and a partial failure mid-replay leaves the server
in a state that never existed on the client. Since `upsertMark` and `deleteMark` are
already keyed by `[marked_type, marked_id, to_user]`, the desired state per spot is
sufficient — which makes replay idempotent and order-independent. Option C was rejected
because it leaves two read paths to keep in agreement and makes a guest's marks
unrepresentable.

## Consequences

- **+** One code path serves guest, offline and online marking — the guest→account
  migration *is* the ordinary push loop, not separate migration code.
- **+** Replay cannot regress state, so retries, double triggers and two open tabs are all
  safe without a lock protocol.
- **-** Guarding a stale device's push requires a new nullable `Mark.client_updated_at`
  column and a migration (ADR 0051). `Mark.updated_at` cannot serve: `@updatedAt` writes it
  from the server's clock, and comparing it to a device-supplied timestamp would leave any
  device with a slow clock permanently unable to sync.
- **-** Deletes need tombstones. Removing the row locally lets the next pull resurrect it
  from the server.
- **-** Local records must denormalize the display snippet and surah/verse location, which
  `/api/marks` builds server-side from `quranPrisma` — a guest has no server to build it.
- **-** The intermediate states of an offline editing session are not reconstructable
  server-side; only the final state per spot is ever transmitted.
- **-** The `cursor`/`nextCursor` pagination in `/api/marks` is retired in favour of
  client-side windowing over the local store, and the route gains a full-sync mode.
- **-** Ownership cannot be read from live session state. ADR 0049's bounded
  `/api/auth/session` fetch makes next-auth report unauthenticated on every offline launch, so
  the store's owner stamp must be sticky and moved only by an observed sign-in or an explicit
  sign-out — otherwise reconnecting discards the offline work.
