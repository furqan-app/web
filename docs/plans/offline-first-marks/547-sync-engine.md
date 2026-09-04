---
title: Marks sync engine (push-then-pull)
type: feature
date: 2026-09-04
status: ready-to-implement
area: marks
issue: 547
adr: [0061]
---

# Marks sync engine (push-then-pull)

> Umbrella: [`INDEX.md`](INDEX.md) — the sync table, owner-stamp table and session-signal table
> are the specification for this issue; do not restate them here, implement them.
> **Blocked by #544, #545, #546.**

## Summary

The run that reconciles the local store with the server. Push, then pull, so the pull observes
post-push state.

## Files to change

- **New** `app/lib/marks/sync.ts` — module singleton with an in-flight guard, exposed via
  `useSyncExternalStore`, cross-tab coordination on the native `storage` event. Same shape as
  `app/lib/tafsir/download-manager.ts` (ADR 0060) — this is not a new pattern here.
- `app/server/actions/addPageMark.ts` — send the record's client `updated_at`.
- `app/server/actions/getPageMarks.ts`, `deletePageMark.ts` — stay as the transport the engine
  calls; no behavioural change.

## Triggers

`online`; session → authenticated; launch; `visibilitychange`; and best-effort immediately after
each local mutation (which makes the online path behave as it does today, just routed through
the store).

**The launch trigger must be deferred off the critical path** — idle after first paint, gated on
a signed-in owner stamp. ADR 0049's Root-Layout Network Budget forbids an unconditional network
request from a mount `useEffect` in anything the root layout renders: mobile browsers cap ~6
connections per host and the App Router's RSC prefetches compete for the same pool. `online` and
`visibilitychange` are user/OS-driven and unaffected.

## Constraints

- **The owner stamp never follows `useSession()`** — see the umbrella's session-signal table.
  This is the single easiest thing to get wrong here, and getting it wrong discards offline work
  on reconnect (test case 8).
- **A 401 is not a sign-out.** Stop the run, keep records `pending`, raise a "session expired,
  sign in to sync" state for #551 to render. Never move the stamp, never drop records.
- A 422 is dropped and logged — retrying an invalid body forever helps nobody — and surfaces in
  My Marks, never the reader.
- Guest records are all `pending`, so the push loop **is** the guest→account migration. Do not
  write a second path.
- Never touch grant-scoped (`grantId`) marks.

## Test cases from the umbrella

2, 3, 4, 5, 7, 8, 10 — this issue owns most of them.

## Done when

- Every row of the umbrella's sync table behaves as written, including the two pull rows.
- A run started twice concurrently does not double-push.
- No run fires from a mount `useEffect`.
- Signing in as a guest with local marks migrates them with no migration-specific code.
