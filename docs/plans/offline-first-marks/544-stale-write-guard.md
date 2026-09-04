---
title: Marks: stale-write guard via client_updated_at
type: chore
date: 2026-09-04
status: ready-to-implement
area: marks
issue: 544
adr: [0061]
---

# Marks: stale-write guard via `client_updated_at`

> Umbrella: [`INDEX.md`](INDEX.md) — read its Architecture and Cross-cutting invariants first.
> No dependencies. Lands as a no-op until #547 starts sending `updated_at`.

## Summary

Stop a device that has been offline for a long time from clobbering a newer edit made meanwhile
on another device.

## Approach

Add a nullable `client_updated_at DateTime?` to `Mark`, written from the value the client
pushes. `upsertMark` compares the incoming `updated_at` against **that column** and skips the
write when the stored one is newer.

`null` counts as older than anything, so a first push always beats a legacy row rather than
being rejected by a comparison against nothing.

### Why not `Mark.updated_at`

It is written by `@updatedAt` from the **server's** clock; the pushed value comes from the
**device's**. Comparing them means a phone whose clock runs ten minutes slow has every
legitimately-newer write rejected — permanently unable to sync. That is a silent, total failure,
worse than the clobber the guard prevents. Client clock vs client clock only.

Cross-device clock skew still makes this last-write-wins-by-device-clock rather than a true
ordering. That is inherent to LWW and accepted; the point here is not comparing across two
different clocks, which is a systematic bias rather than a symmetric one.

## Files to change

- `prisma/app/schema.prisma` — add `client_updated_at DateTime?` to `Mark`.
- `prisma/app/migrations/<timestamp>_add_mark_client_updated_at/` — a real migration (ADR 0051),
  **not** `prisma db push`. The repo adopted Prisma migrations; existing rows must survive.
- `app/api/mushaf/access.ts` — `upsertMark` accepts the pushed `updated_at`, writes
  `client_updated_at`, and returns without writing when the stored value is newer.

## Constraints

- The skip must be indistinguishable from success to the caller — the losing device is corrected
  by the pull that follows its own push (test case 5), so no error path is needed or wanted.
- Both marks write routes share `upsertMark` (`/api/quran/pages/[pageId]/marks` and
  `/api/mushaf/[grantId]/...`). The guard applies to both; grant-scoped writes never come from
  the offline queue, so they simply always carry a fresh timestamp.

## Test cases from the umbrella

2 and 5.

## Done when

- A push carrying an older `updated_at` than the stored `client_updated_at` leaves the row untouched.
- A push carrying a newer one wins.
- A push against a row with `client_updated_at = null` wins.
- `npx prisma migrate dev` applies cleanly and existing rows keep their marks.
