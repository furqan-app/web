# ADR 0076: Awrad Reminders on Capacitor Android Ship as Server-Dispatched FCM Push (APNs Deferred)

**Date:** 2026-10-20
**Status:** Accepted

## Context

Wird (awrad) reminders are scheduled server-side in `ScheduledNotification` rows and dispatched by a 5-minute Hostinger cron ([ADR 0037]). The only delivery channel implemented for them is Web Push (`push`), which works in browsers and installed PWAs. Inside the Capacitor hosted shell ([ADR 0072]) Android WebView there is no service worker and no `PushManager`, so shell users have no reminders at all: the settings toggle hides itself on `supported === false`, and the plans reminders tab shows dead prompts. ADR 0072 already ruled Web Push for native a hard platform rejection and sketched native push as mandatory server-side work; the scaffolding (stub `native_push` channel, `DeviceToken` model, register/unregister routes) landed without a sender.

## Options Considered

**Option A — Server-scheduled FCM push through the existing cron**
The cron dispatches through the already-stubbed `native_push` channel; the shell registers an FCM token via `@capacitor/push-notifications` and posts it to the existing device-tokens routes.

**Option B — Client-scheduled local notifications (`@capacitor/local-notifications`)**
The shell arms device-local exact alarms per user-set reminder time, worked offline without the server.

**Option C — Hybrid: FCM primary + local fallback**
Two delivery paths for the same reminder with suppression logic on both sides.

## Decision

Option A. Wird reminder dispatch targets `["push", "native_push"]` (fan-out — a user with both a web-push subscription and an Android token receives both deliveries, an owner decision 2026-10-20). The `native_push` sender is FCM HTTP v1 called with the already-installed `google-auth-library` service-account JWT (`firebase.messaging` scope, dynamic import — the same pattern as native sign-in's `google-auth-library` use, ADR 0075), credentials from Hostinger's env panel only. Android only: APNs rows are accepted but, until Apple credentials exist, a practical sender absence for `apns` stays a `no_sender`-style skip, never a failure; the table records provider-level parity per token.

FCM `UNREGISTERED` responses delete that `DeviceToken` row (stale-token cleanup), mirroring Web Push 404/410 semantics; other failures are recorded as channel errors and never retried by the cron (the row still advances to its next occurrence — same semantics as web push today: an offline fire-time is a missed day, not a catch-up queue).

Client-side, the single settings toggle and the plans reminders prompts gain a native branch (`isNativePlatform()`) in `usePushSubscription`-level code; on mount with granted permission the shell re-registers the FCM token (idempotent upsert — covers FCM's rotating tokens without a change-of-UI model); tap deep-links route through `app-links.ts` `isSafeLocalePath` with the D4 target-URL rules.

## Consequences

- **+** No reminder-engine duplication: dispatch, dedupe keys, leases, recurrence, completion-skip guard, locale rendering stay untouched.
- **+** No schedule drift: pumps the same 5-minute cron granularity as web push.
- **+** Delivery works with the app killed from Recents (tray is displayed natively since the sender uses a `notification` + `data` hybrid payload).
- **+** No new dependency: `google-auth-library` already ships for ADR 0075.
- **-** Fire-time connectivity is required — offline at fire = missed that day (accepted; matches web semantics; revisit only when an offline guarantee is a real requirement).
- **-** Delivery precision stays cron-granularity (≤ ~5 min after the chosen time), never exact-to-the-minute.
- **-** More service-account secret surface (Hostinger panel only, never committed).
- **-** Android-only: iOS parity is a later slice gated on Apple developer credentials; `apns` rows skip until then, never fail.

**Deferred (owner direction 2026-10-20, revisit later):** Option B's local-scheduled notifications as an offline fallback is explicitly future work. When it lands, it must be a separate delivery path with suppression/cleanup of both sides, not a crowbar into `dispatch.ts`.

> **Rules for a valid ADR:**
> - Name the alternatives — if there were no alternatives, this is a reference doc, not an ADR.
> - Record trade-offs — if there are no downsides, you haven't thought hard enough.
> - Don't describe the bug that triggered the work — that context rots; put it in the PR.
> - After writing an ADR, update `DECISIONS.md` in the same commit.
