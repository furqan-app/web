# Base Notification System

**Status:** implemented, review findings fixed (2026-08-03)

## Post-Review Fix Plan (2026-08-03)

`/review-fq-work` (Opus) found 32 issues across the diff. Branch is still open (not shipped), so this section is edited in place rather than added as an addendum. Grouped by fix batch, in the order to apply them.

### Batch A — Critical correctness (must fix)

1. **#1/#28 — cron claim race.** `repository.ts` `claimDueReminders`'s `updateMany` must repeat the exact guard `findMany` used (`status: "pending"`, `OR: [{claim_id: null}, {locked_at: {lt: staleBefore}}]`) — currently it's `where: { id: { in } }` only, so two overlapping cron runs can both claim and dispatch the same row. Fix: add the same `where` clause to the `updateMany`.
2. **#2 — render-context locale fallback is dead code.** `loadMessages(locale) ?? loadMessages(DEFAULT_LOCALE)` never runs the fallback because `fs.readFileSync` throws (doesn't return `undefined`) on a missing file. Fix: wrap the read in try/catch and fall back to `ar` on any read/parse failure.
3. **#3 — unvalidated locale path.** Validate the incoming `locale` (query param and `Recipient.locale`) against the app's known locale list (`ar`/`en`) before it reaches `path.join` in `render-context.ts`; reject/default anything else to `ar` before the filesystem read.

### Batch B — Ownership & input validation (security-relevant)

4. **#4 — push subscription hijack via upsert.** `savePushSubscription`'s upsert-on-`endpoint_hash` overwrites `user_id` unconditionally. Fix: if the hash already belongs to a different `user_id`, delete that row first (explicit ownership transfer, logged as a warning) rather than a silent blind overwrite — same end state, but intentional and observable.
5. **#5 — unregister isn't ownership-scoped.** `deletePushSubscriptionByHash` takes no `userId`; the DELETE route must pass the caller's `user.id` and the repository method must scope the delete `WHERE user_id = ? AND endpoint_hash = ?` (matches the plan's stated invariant).
6. **#6 — SSRF via arbitrary push endpoint.** Validate `endpoint` in `POST /api/notifications/push-subscription` is `https://` and its hostname is one of the known push-service hosts (FCM `fcm.googleapis.com`, Mozilla `updates.push.services.mozilla.com`, Apple `web.push.apple.com`) before storing it — reject anything else with 422.

### Batch C — Dispatch/reminder correctness

7. **#7 — reminder catch-up storm.** `nextOccurrence` must roll forward to the first occurrence **strictly after `now`** (loop or compute the day-count offset), not just `+1 day` from the stored value — otherwise a cron outage >24h re-fires the same reminder every poll until it catches up.
8. **#8 — bad timezone crashes the reminder.** Wrap `Intl.DateTimeFormat` construction in `reminders.ts` in try/catch; an invalid `timezone` should degrade to `"UTC"`, not permanently fail the reminder via the cron's catch-all.
9. **#9 — dispatch's "never throws" contract is violated.** Wrap `deps.store.createNotification` (and the two `renderContext`/`render` calls before it) in try/catch inside `dispatchNotification`; on failure, log and return `{ notificationId: null, results: {} }` like the unknown-type path, instead of letting it propagate into `POST /api/notifications/test`.
10. **#10 — a throwing channel leaves its delivery row stuck `pending`.** Wrap each `sender.send(...)` call in the `Promise.allSettled` callback in try/catch; on a caught throw, record `{status: "failed", error}` same as a channel-returned failure, and log it — enforces the "channels never throw" contract at the boundary instead of trusting each implementation.
11. **#26 — `?unread=1` from the plan was never implemented.** Add an `unread` boolean param to `NotificationStore.listNotifications` (or a separate `unread` filter arg) and read `?unread=1` in the GET route.
12. **#27 — cron route imports `appPrisma` directly.** Add `getRecipient(userId)` to `NotificationStore`/`repository.ts` (returns `{email, name} | null`) and use it in `app/api/cron/reminders/route.ts` instead of importing `appPrisma` — keeps the "only repository.ts touches Prisma" invariant.

### Batch D — UI correctness

13. **#11 — stale-closure bug in unregister.** `use-push-subscription.ts`'s `unsubscribe()` sets `setSubscribed(!ok ? subscribed : false)` reading a stale closure value; fix to always reflect the actual post-`unsubscribe()` browser state — `subscription.unsubscribe()` succeeding means `setSubscribed(false)` regardless of whether the server call also succeeded (log the server failure separately, don't let it desync the toggle).
14. **#12 — `subscribe()` has no catch.** Wrap the body in try/catch; return `false` and let the caller (the Switch's `onCheckedChange`) treat a thrown permission-denial/bad-key error as "stayed off" instead of an unhandled rejection.
15. **#13 — negative `?limit=`.** Clamp `limit` to `Math.max(1, Math.min(..., MAX_LIMIT))` in the GET route.
16. **#14 — dead `notificationclick` postMessage.** Either add a `message` listener in the app (e.g. a small client component that navigates on `NOTIFICATION_CLICKED`) or simplify `sw.ts` to just `client.navigate(url)` directly instead of postMessage — the latter is simpler and needs no new listener; use it.
17. **#15 — re-clicking a read item 404s.** Make `markRead` idempotent: return `true` (no-op) when the row is already read instead of only matching `read_at: null`, so `NotificationItem`'s per-click `onOpen` never surfaces a spurious 404.
18. **#32 — bell polls for signed-out users.** Gate `useNotifications`'s query on `useSession().status === "authenticated"` (`enabled` option) so signed-out visitors don't poll `/api/notifications` every 60s and see an empty popover.

### Batch E — Code quality / cleanup

19. **#19 — per-request nodemailer transporter.** Memoize the SMTP transporter at module level in `deps.ts` (construct once, reuse), mirroring the `webpush.setVapidDetails` call already at module scope.
20. **#20 — unescaped email HTML shells.** Add one shared `escapeHtml()` helper (in `email.ts` or a small `html.ts`) and use it in both the `channels/email.ts` fallback shell and `constants/notifications.ts`'s `system.test` `renderEmail`.
21. **#21 — bare `logger` instead of `getLogger()`.** Since `deps.ts`'s `getNotificationDeps()` is only ever called from within a Route Handler, switch it to call `getLogger()` for request-id correlation, matching every other route's convention.
22. **#16 — dead `isDue` re-check in cron route.** Remove it — `claimDueReminders` already filters by due time, so the `continue` branch is unreachable.
23. **#17 — post-dispatch write failure mislabels a delivered reminder as failed.** Split the try/catch: if `dispatchNotification` succeeds but `completeReminder`/`rescheduleReminder` throws, log it distinctly (e.g. `notifications.cron.reschedule_failed`) without calling `failReminder` — the notification was actually delivered.
24. **#18 — `curl -fsS` won't flag a 401 cron auth failure.** Update `hostinger.md`'s documented command to `curl -fsS -w '%{http_code}' ... | grep -q 200` (or check the JSON `success` field) so a bad `CRON_SECRET` actually fails the hPanel cron job visibly.
25. **#22 — the `satisfies ... as NotificationTypeDef` cast erases the payload generic.** Accepted as-is — a heterogeneous `Record<string, NotificationTypeDef<P>>` for varying `P` needs either the existential-erasure cast (current approach) or a discriminated-union registry, which is more machinery than this base needs. No change; noted as a known simplification.
26. **#23 — `NOTIFICATION_CHANNELS` unused/second source of truth.** Either wire it in as the single source for `available` channels (constrain the registry's keys to it via a mapped type) or delete the unused export. Delete it — the registry's `Object.keys` is already the actual source of truth and duplicating it invites drift.
27. **#24 — `dispatchToUsers`/`scheduleReminder` have no callers.** Accepted as-is for this base — they're the intended entry points for future feature code (e.g. plans triggering a daily reminder) that don't exist yet; removing them would just mean re-adding them on the next caller. No change.
28. **#25 — awkward self-referential fake logger in `dispatch.test.ts`.** Replace with a flat `const fakeLogger: FqLogger = { ...noop fns, child: () => fakeLogger }` (self-referencing constant, not a function call that rebuilds all of `baseDeps`).
29. **#30 — plan doc says `createEmailChannel` takes a `from` param; code doesn't.** Doc-only fix: update this plan's Channels section to drop the stray `from` from the `createEmailChannel(deps)` signature description — the SMTP transport is where `from` actually lives, matching the code.

### Batch F — Missing tests

30. **#29 — write the two missing test files from Verification.** `app/lib/notifications/channels/push.test.ts` (fake `webpush`: 410 prunes the subscription, zero subscriptions → skipped, partial success → sent) and `app/lib/notifications/channels/email.test.ts` (missing recipient email → skipped, `renderEmail` preferred over the fallback shell) — both with fakes, no real network/SMTP, matching the existing `dispatch.test.ts` style.

### Not fixing (rationale)

- **#22 (payload-generic erasure)** — accepted, see Batch E #25 above.
- **#24 (no callers yet)** — accepted, see Batch E #27 above.

## Context

Furqan has no notification infrastructure today — greenfield. We need a base that sends push and email notifications, supports scheduled reminders for specific events (e.g. daily plan reminders), and persists an in-app feed (bell icon). Critically, this is a *base*: new channels (SMS, Slack, etc.) and new notification types (event kinds) must be addable later without touching the core dispatch logic. The user asked for SOLID principles — the repo has no class/DI framework, so SOLID is realized through plain-function modules, typed registries, and narrow interfaces (matching the existing `app/lib/plans/` precedent), not classes.

Confirmed scope:
- Channels now: push (Web Push) + email + in-app. Channel abstraction must make adding a channel = one new file + one registry line.
- Reminders get a real minimal scheduler now (not just a stub) — repo has zero cron/queue infra, so this is new: a DB-polled cron-triggered Route Handler, no Redis/BullMQ (unjustified for this volume, and hostile to `connection_limit=1` shared MySQL hosting).
- In-app notifications are persisted, with a bell + feed UI.
- Notifications and their per-channel delivery status are persisted for history/read-state/audit.

## Architecture (SOLID via functions, not classes)

| Principle | Realization |
|---|---|
| SRP | `repository.ts` (Prisma) / `dispatch.ts` (orchestration) / `channels/*.ts` (transport) / type registry (rendering) are separate modules. |
| OCP | Two registries: `NOTIFICATION_TYPES` (new event type = new map entry) and the channel registry (new channel = new file + one line). `dispatch.ts` never changes for either. |
| LSP | Every channel implements the same `NotificationChannel` shape; dispatch never branches on which channel it is. |
| ISP | `dispatch.ts` depends on a narrow `NotificationStore` type, not `PrismaClient`. Email depends on a one-method `EmailTransport`. |
| DIP | Channels are `createXChannel(deps)` factories; a single composition root (`deps.ts`) is the only place wiring `appPrisma` + `web-push` + SMTP together. |

## Prisma schema — `prisma/app/schema.prisma`

Scalar `user_id Int` only (no FK to `User`, per ADR 0008 — same pattern as `Mark`/`UserPlan`).

- **`Notification`** (`notifications`): `id`, `user_id`, `type` (registry key, e.g. `"plans.daily_reminder"`), `payload Json`, `channels Json` (resolved list, for audit), `read_at DateTime?` (read state lives directly on the row — one notification has exactly one recipient), `created_at`. Indexes on `(user_id, created_at)` and `(user_id, read_at)`.
- **`NotificationDelivery`** (`notification_deliveries`): `notification_id` + relation, `channel`, `status` (`pending|sent|failed|skipped`), `attempts`, `error String? @db.Text`, `delivered_at`, timestamps. `@@unique([notification_id, channel])` for idempotent retries.
- **`PushSubscription`** (`push_subscriptions`): `user_id`, `endpoint @db.Text`, `endpoint_hash @unique @db.Char(64)` (sha256 — endpoints can exceed MySQL's practical index length), `p256dh`, `auth`, `user_agent?`, `last_used_at?`, `failed_at?`.
- **`ScheduledNotification`** (`scheduled_notifications`) — the reminder row: `user_id`, `type`, `payload Json`, `channels Json?` (null = registry default), `scheduled_for DateTime` (UTC), `recurrence String?` (`null` one-shot, `"daily"` for base), `timezone String?` (IANA, captured from the client at enqueue time — no `User.timezone` column exists), `status` (`pending|dispatched|cancelled|failed`), `dedupe_key? @unique`, `claim_id?`, `locked_at?`, `dispatched_at?`, `last_error? @db.Text`. Index `(status, scheduled_for)`.

Migration: `npm run app-migrate-dev -- --name add_notification_tables`, commit schema + generated migration together.

## Types + registries

`app/constants/notifications.ts` (mirrors `app/constants/plans.ts` — typed constants, never DB rows):
- `NOTIFICATION_CHANNELS = ["in_app", "push", "email"] as const`
- `NotificationTypeDef<P> = { key, defaultChannels, render(payload, ctx): { title, body, url? }, renderEmail?(payload, ctx): { subject, html, text } }`
- `NOTIFICATION_TYPES` map + `getNotificationType(key)`. Seed with `"plans.daily_reminder"` (`["in_app","push"]`) and `"system.test"` (`["in_app","push","email"]`) — enough to prove extensibility without over-building.

`app/lib/notifications/types.ts` — transport contract: `Recipient`, `DeliveryResult`, `ChannelSendInput`, `NotificationChannel = { key, send(input): Promise<DeliveryResult> }` (never throws — failures become `{status:"failed"}`), `ChannelRegistry`, `NotificationStore`, `Clock`.

`app/lib/notifications/render-context.ts` — builds `{ locale, t }` outside request scope (cron has no `headers()`), loading `messages/<locale>.json` directly. Default locale `ar` (no per-user locale column).

## Channels — `app/lib/notifications/channels/`

- `in-app.ts` — `createInAppChannel()`: the `Notification` row *is* the item, `send` is trivially `{status:"sent"}`. Kept as a real registry entry (LSP — no special-casing in dispatch).
- `push.ts` — `createPushChannel({store, webpush, logger})`: loads `PushSubscription`s, none → `skipped`; sends via `web-push`/VAPID; `404/410` prunes the subscription; any success → `sent`.
- `email.ts` — `createEmailChannel({transport, logger})`: no recipient email → `skipped`; uses `renderEmail` or a fallback text/HTML shell. `from` lives on the SMTP transport config, not here.
- `email/transport.ts` (`EmailTransport` interface), `email/smtp-transport.ts` (nodemailer SMTP), `email/log-transport.ts` (logs instead of sending — used when SMTP env absent, e.g. local/CI).
- `registry.ts` — `createChannelRegistry(deps)`. **Adding SMS/Slack later = one file + one line here.**

## Persistence — `app/lib/notifications/repository.ts`

Only module importing `appPrisma`. `createNotificationStore(prisma): NotificationStore` with: `createNotification` (notification + nested pending deliveries in one write), `recordDelivery` (upsert on the unique composite), `listNotifications({userId, cursor, limit})`, `countUnread`, `markRead`/`markAllRead` (ownership enforced via WHERE, not post-fetch check), push-subscription CRUD, `claimDueReminders/completeReminder/rescheduleReminder`. Tests use a hand-written fake — no Prisma mocking, matching `app/lib/plans/` test style.

## Core dispatch — `app/lib/notifications/dispatch.ts`

```
dispatchNotification(input: {recipient, type, payload, channels?}, deps): Promise<{notificationId, results}>
dispatchToUsers(recipients, input, deps): Promise<DispatchOutcome[]>
```
Orchestration only (~40 lines, no DB/clock imports of its own — everything via `deps`): resolve type def (unknown type → log + return null, never throw) → resolve channels → render once → persist notification + pending deliveries → `Promise.allSettled` across channels → record each result. One failing channel never blocks others or the caller.

`resolve-channels.ts` — pure, directly testable: `resolveChannels(typeDef, requested?, available)`. Precedence: explicit request → type default; anything unavailable becomes a recorded `skipped` delivery, not a silent drop. **This is the seam for user preferences later** — adding a prefs table means passing one more argument here, never touching `dispatch.ts`.

`deps.ts` — composition root: `getNotificationDeps()` wires `appPrisma`, the channel registry, `() => new Date()`, `fq-logger`, SMTP-vs-log transport by env.

## Reminders

`app/lib/notifications/reminders.ts` — pure: `nextOccurrence(scheduledFor, recurrence, timezone)`, `isDue(scheduledFor, now)`, `scheduleReminder(store, input)` using a `dedupe_key` (e.g. `plans.daily_reminder:<userId>:<date>`) for idempotent enqueue.

`app/api/cron/reminders/route.ts` — machine-called, **not** session-protected:
1. Verify `x-cron-secret` (timing-safe compare, same shape as `app/api/webhooks/sentry/route.ts`) → 401 on mismatch.
2. Claim due rows without MySQL `UPDATE...RETURNING`: `findMany` due ids (limit 50) → `updateMany({where: {id: {in}, status:"pending", claim_id: null}, data: {claim_id: runId, locked_at: now}})` → `findMany({where: {claim_id: runId}})`. Stale leases (`locked_at` > 10min ago) are re-claimable.
3. Per row: `dispatchNotification`, then mark `dispatched`, or `rescheduleReminder` to `nextOccurrence` if recurring.
4. Trigger: Hostinger cron job (hPanel) curling this endpoint every 5 minutes with the secret header — no Redis/BullMQ needed at this volume.

## API routes

| Route | Method | Notes |
|---|---|---|
| `app/api/notifications/route.ts` | GET | Cursor pagination, `?unread=1`; returns `{items, next_cursor, unread_count}` |
| `app/api/notifications/[id]/read/route.ts` | POST | 0 rows updated → 404 |
| `app/api/notifications/read-all/route.ts` | POST | |
| `app/api/notifications/push-subscription/route.ts` | POST/DELETE | Upsert on `endpoint_hash` (idempotent re-registration) |
| `app/api/notifications/test/route.ts` | POST | Manual verification trigger; blocked in prod except allow-listed test emails |
| `app/api/cron/reminders/route.ts` | POST/GET | Secret-guarded, unauthenticated |

All handlers: `extractUser` → validate → call `app/lib/notifications/*` → `jsonResponse`. Add `^/api/notifications` to `protectedRoutes` in `app/middlewares/auth-middleware.ts` (not `^/api/cron`).

No preferences table in the base — defaults live in the type registry; push is implicitly opt-in (no subscription = skipped). This is deliberate: `resolveChannels(typeDef, requested?, available)` is already the single seam where "which channels for this user+type" gets decided. Adding per-user, per-type opt-out later means: a `NotificationPreference` table (`user_id`, `type`, `channel`, `enabled`), one extra lookup passed into `resolveChannels` as a third input (alongside type defaults and per-call `requested`), and nothing else changes — not `dispatch.ts`, not the channels, not the registries. Keeping this seam narrow now is what makes that addition purely additive instead of a refactor.

## Service worker — `app/sw.ts`

Append (don't touch existing Serwist/cache logic):
- `push`: parse `event.data.json()` defensively, `showNotification(title, {body, icon, badge, tag: notificationId, data: {url}})`.
- `notificationclick`: close notification, focus an existing same-origin client or `clients.openWindow(url)`.
- `pushsubscriptionchange`: re-subscribe and re-POST to the API.

## Client / UI

- `app/server/actions/notifications.ts` — browser `fetch` wrappers, mirroring `app/server/actions/plans.ts`.
- `app/hooks/use-notifications.ts` — React Query, `refetchInterval: 60_000` (polling only, no websockets in base).
- `app/hooks/use-push-subscription.ts` — permission + subscribe flow, posts to the API.
- `app/components/notifications/NotificationBell.tsx` (`"use client"`, unread badge, popover) — mounted in `app/components/nav/Nav.tsx`.
- `app/components/notifications/NotificationFeed.tsx` + `NotificationItem.tsx` — list, unread emphasis, mark-all-read.
- `app/components/notifications/EnablePushToggle.tsx` — in settings.
- `messages/en.json` + `messages/ar.json` — `notifications.*` keys in both.

## Dependencies & env

Add `web-push`, `@types/web-push`, `nodemailer`, `@types/nodemailer`. New env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM`, `CRON_SECRET`. Generate VAPID keys once (`npx web-push generate-vapid-keys`) — rotating invalidates all stored subscriptions.

## Out of scope (deferred)

SMS/Slack/webhook channels · notification-preference center UI + `NotificationPreference` table (seam already reserved in `resolve-channels.ts` — see above) · real-time in-app delivery (websockets/SSE) · retry/backoff beyond `attempts`+`error` · digest/quiet hours · per-user locale/timezone columns · rich email templating · feed grouping/threading · admin/broadcast notifications · Playwright e2e (manual checklist only).

## Implementation order

1. Schema + migration + generate client.
2. `constants/notifications.ts`, `lib/notifications/types.ts`, `resolve-channels.ts` (+ test).
3. `repository.ts`, `render-context.ts`.
4. Channels (in-app → email → push) + `registry.ts` + `deps.ts`.
5. `dispatch.ts` (+ test) — usable server-side at this point.
6. API routes + middleware matcher + test route.
7. UI: server actions, hooks, bell/feed, i18n.
8. `app/sw.ts` push handlers + subscription toggle.
9. Reminders: `reminders.ts` (+ test), cron route, Hostinger cron doc.
10. New ADR (`docs/architecture/adr/0037-notification-dispatch-and-channels.md`) + `DECISIONS.md` entry.

## Verification

**Unit (vitest, colocated, mirrors `app/lib/plans/*.test.ts`):**
- `resolve-channels.test.ts` — defaults, explicit override, unavailable channel → skipped not dropped, unknown type.
- `dispatch.test.ts` — fake store + fake channels: single persist with pending deliveries, all channels invoked, one failing channel doesn't block others, unknown type returns null without throwing.
- `reminders.test.ts` — `nextOccurrence` across DST/timezones, `isDue` boundary.
- `channels/push.test.ts` — 410 prunes subscription, zero subscriptions → skipped, partial success → sent.
- `channels/email.test.ts` — missing email → skipped, `renderEmail` preferred over fallback.

**Manual end-to-end:**
1. Migrate, set VAPID/SMTP/CRON_SECRET, `npm run build:local && npm start` (Serwist disabled in dev).
2. Enable push in Settings → confirm `push_subscriptions` row (`npm run app-studio`).
3. `POST /api/notifications/test` → OS push appears, click focuses/opens app at `payload.url`.
4. Bell shows unread badge → popover lists item → click clears badge, sets `read_at`.
5. Email arrives (or log-transport prints it) — `notification_deliveries` shows `sent` per channel.
6. Insert a past-due `scheduled_notifications` row, curl the cron route with the secret → dispatched, row flips status; re-run immediately → no double-send; for `recurrence:"daily"`, `scheduled_for` advances ~24h.
7. Wrong/missing cron secret → 401; unauthenticated `GET /api/notifications` → 401.
8. `npm test`, `npm run lint`, `npm run build:local` clean.

### Critical files to mirror
- `app/lib/plans/engine.ts` — pure-function/DI style for `dispatch.ts`
- `app/constants/plans.ts` — registry pattern for `constants/notifications.ts`
- `app/api/webhooks/sentry/route.ts` — secret-verification pattern for the cron route
- `app/middlewares/auth-middleware.ts` — where to add the new protected prefix
- `app/sw.ts` — where to add push/notificationclick listeners
