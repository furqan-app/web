# ADR 0037: Notification dispatch via a channel registry, no queue/worker infra

**Date:** 2026-08-03
**Status:** Accepted

## Context

Furqan needed a base notification system supporting push, email, and in-app delivery, plus scheduled reminders for specific events, with new channels and event types addable later without touching core dispatch logic. The codebase has no class/DI framework (plain-function modules only, `app/lib/plans/` precedent) and no existing queue, cron, or background-worker infrastructure. Hosting is shared MySQL with `connection_limit=1` (ADR 0010) and no Redis.

## Options Considered

**Option A — Class-based strategy pattern (one `NotificationChannel` abstract class per channel, DI container)**
Familiar OOP shape, but introduces a class hierarchy and DI container the rest of the codebase doesn't use anywhere.

**Option B — Function-based channel registry (typed object-literal factories, `Record<key, sender>` map)**
Same Open/Closed extensibility as A, expressed as plain functions and TypeScript interfaces — matches `app/constants/plans.ts`'s existing registry pattern exactly.

**Option C — BullMQ/Redis-backed job queue for reminders**
Proper queue semantics (delayed jobs, retries, backoff) but adds a new infra dependency (Redis) for a base feature whose initial volume is a handful of daily reminders, and fights `connection_limit=1`'s single-connection-per-worker model.

**Option D — DB-polled cron endpoint for reminders (Route Handler + claim-token lease)**
No new infra dependency; correctness under concurrent cron invocations comes from a claim-token lease (`claim_id`/`locked_at`) rather than DB-level `UPDATE...RETURNING` (unavailable in MySQL).

## Decision

Channels are realized as Option B: a `NotificationChannel` type (`{ key, send() }`) implemented by plain factory functions (`createPushChannel`, `createEmailChannel`, `createInAppChannel`), assembled into a `ChannelRegistry` map. `dispatch.ts` depends only on this narrow interface and a narrow `NotificationStore` interface — never on Prisma or a specific channel's SDK directly (DIP). Reminders use Option D: `app/api/cron/reminders/route.ts`, secret-guarded (`x-cron-secret`, timing-safe compare — mirrors the Sentry webhook relay's signature check, ADR 0018), polled by an external cron trigger (Hostinger hPanel Cron Jobs) on a 5-minute interval.

## Consequences

- **+** Adding a channel (SMS, Slack) is one new file under `app/lib/notifications/channels/` plus one registry entry — `dispatch.ts` is never touched.
- **+** Adding a notification type is one entry in `NOTIFICATION_TYPES` (`app/constants/notifications.ts`) — no dispatch changes.
- **+** No new infra dependency (Redis, worker process) for the base feature.
- **+** User notification preferences (deferred) have a single, already-isolated seam: `resolveChannels(typeDef, requested, available)` gains one more input; nothing else in the dispatch path changes.
- **-** The cron-polled reminder scheduler has coarser timing granularity (bounded by the cron interval, e.g. 5 minutes) than a real delayed-job queue.
- **-** Claim-based locking (rather than `UPDATE...RETURNING`) requires careful handling of stale leases (a crashed cron run mid-batch) — implemented as a 10-minute lease timeout in `claimDueReminders`.
- **-** If reminder volume grows substantially, this will need revisiting — the DB-poll approach does not scale to high-frequency or high-volume scheduling.
