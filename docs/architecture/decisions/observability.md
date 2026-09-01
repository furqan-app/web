# Observability — Decisions

Active decisions for observability — Sentry, Slack relay, fq-logger, notifications. Part of `docs/architecture/decisions/`; always-loaded index is [`../DECISIONS.md`](../DECISIONS.md).

---

## Error Tracking

**Status:** active

**Decision:** Sentry (`@sentry/nextjs`) captures production errors only — no performance tracing (`tracesSampleRate: 0`), no session replay. Gating is by DSN presence, not `NODE_ENV`: `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN })` runs unconditionally in `sentry.client.config.ts`/`sentry.server.config.ts`/`sentry.edge.config.ts`, and the SDK no-ops when the DSN is unset. The var is left empty in `.env.local`/`.env.example` and set only in Hostinger's build/runtime env panel, so dev and local builds stay silent by default. Server/Route Handler/Server Component errors are captured automatically via `instrumentation.ts`'s `onRequestError = Sentry.captureRequestError` hook — no per-route code changes. Client render errors are captured via `app/[locale]/error.tsx` (nested inside the locale layout, so `Nav`/`NextIntlClientProvider`/theme stay mounted — not bare `app/error.tsx`, which would sit outside them) and `app/global-error.tsx` (root-layout-crashing last resort; replaces `app/layout.tsx` entirely, so it uses plain inline-safe CSS instead of theme tokens, since the theme flash-prevention script never runs there). Both call `Sentry.captureException` before rendering their fallback. See [ADR 0017](../adr/0017-sentry-error-tracking.md).

**Constraints:**
- Do not add `NODE_ENV` branching around `Sentry.init()` — DSN presence is the only gate; keeping it that way means dev/prod behavior is controlled entirely by which env file sets the var, with no code to keep in sync.
- Never commit a real `NEXT_PUBLIC_SENTRY_DSN` to `.env.production` or `.env.example` — both are checked in; only Hostinger's panel should hold the real value.
- `experimental.instrumentationHook: true` in `next.config.mjs` is required for `instrumentation.ts` to run on Next.js 14.2.15 (pre-15). Do not remove it without first confirming the installed Next major version makes it a no-op.
- `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` are build-time-only, read inside `next.config.mjs`'s `withSentryConfig` call for source-map upload — never expose them as `NEXT_PUBLIC_*` or reference them from client code.
- If performance tracing or session replay is added later, revisit ADR 0017 rather than silently bumping `tracesSampleRate` or adding `replayIntegration()` — both were deliberately scoped out (cost, and replay's privacy surface against the sign-in/marks flows).

---

## Sentry-to-Slack Alerting

**Status:** active

**Decision:** Sentry's native Slack alert-rule action requires a paid (Team+) plan; the app is on the free Developer plan. Instead, a self-hosted relay endpoint (`app/api/webhooks/sentry/route.ts`) receives Sentry's Internal Integration webhook for triggered alert-rule events, verifies its signature, and forwards a formatted message to a Slack Incoming Webhook. See [ADR 0018](../adr/0018-sentry-slack-relay-webhook.md).

**Constraints:**
- Only the `event_alert` resource is relayed to Slack; other `sentry-hook-resource` values (e.g. `installation`) are acknowledged with `200` and dropped, not forwarded or rejected.
- The route must verify `sentry-hook-signature` (HMAC-SHA256 of the raw body using `SENTRY_WEBHOOK_SECRET`) before doing anything else — this is a public, unauthenticated-by-user endpoint.
- A failed Slack post must `throw`, not be swallowed — it needs to propagate to `instrumentation.ts`'s `onRequestError` (ADR 0017) so it's captured by Sentry itself and shows as a failed delivery in Sentry's own integration dashboard.
- `SENTRY_WEBHOOK_SECRET` and `SLACK_WEBHOOK_URL` are Hostinger-panel-only env vars, never committed with real values, mirroring the pattern from the Error Tracking decision above.
- If the org ever upgrades to Sentry Team+, this relay can be retired in favor of Sentry's native Slack action — revisit ADR 0018 rather than running both in parallel.

---

## Structured Logging (fq-logger)

**Status:** active

**Decision:** `lib/fq-logger/` wraps `pino` for structured, leveled, request-correlated server-side logs (stdout only — JSON in prod, `pino-pretty` in dev; no hosted log vendor). It has two separate entry points rather than one runtime-branching module: `@/lib/fq-logger` (Node — API routes, Server Actions, NextAuth callbacks) and `@/lib/fq-logger/edge` (Edge — `middleware.ts`/`auth-middleware.ts`), both exposing the identical 6-level API (`trace/debug/info/warn/error/fatal` + `.child()`). `logger.error()` both emits the structured log line and calls `Sentry.captureException`, amending [ADR 0017](../adr/0017-sentry-error-tracking.md)'s "Sentry = exceptions only" scope — see [ADR 0052](../adr/0052-fq-logger-sentry-integration.md). A generated `x-request-id` is set by a `withRequestId` middleware wrapper (first in `middleware.ts`'s pipe) and forwarded on request headers the same way `auth-middleware.ts` already forwards the `user` header; Node call sites obtain a request-scoped child logger via `getLogger()` (reads the header via `next/headers`). A fixed key list (`email`, `password`, `token`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `secret`) is redacted before either the log line or the Sentry `extra` payload is emitted.

**Constraints:**
- Client-side code (e.g. `app/utils/storage.ts`'s `console.warn` calls) is out of scope — fq-logger is server-only; do not import it from client components. This also covers `app/server/actions/**` — despite the directory name, those files have no `"use server"` directive, call `fetch()` with relative paths, and are invoked from `useQuery` hooks in client components, so they run in the browser, not on the server.
- Never import `@/lib/fq-logger` (the Node/pino entry) from an Edge-runtime file (`middleware.ts`, `auth-middleware.ts`, anything reachable from them) — it statically imports `pino`, which needs `worker_threads`/`fs` and isn't available in the Edge bundle. Edge files import `@/lib/fq-logger/edge` instead.
- Do not pass `pino-pretty` via pino's `transport` option — that spawns a worker thread that resolves the target module from disk, which fails inside Next's webpack-bundled Route Handlers (`unable to determine transport target for "pino-pretty"`). `lib/fq-logger/node.ts` instead passes a `PinoPretty(...)` stream directly as pino's second constructor argument, which works bundled.
- Reserve `.error()` for true dead-ends — an error caught and NOT rethrown. Anywhere an error is caught only to rethrow, or is left to propagate to `instrumentation.ts`'s `onRequestError` (which already reports it to Sentry per ADR 0017), do not also call `.error()` on it — that double-reports the same failure to Sentry. Use `.warn()` there instead (log line only, no Sentry call). This also means every `.error()` call consumes Sentry's free-tier event quota (ADR 0018's context) beyond just uncaught exceptions, so it should stay reserved for genuine, non-propagating failures.
- Any new sensitive field logged anywhere (auth, sessions, mushaf codes) must be added to `lib/fq-logger/redact.ts`'s key list, not redacted ad hoc at the call site. `redact()` special-cases `Error` instances (extracting `name`/`message`/`stack`) since `Object.entries()` on an `Error` returns nothing — its properties are non-enumerable.
- Do not call `getLogger()` outside a request context (e.g. build-time scripts) — it depends on `headers()`, which throws outside Server Components/Actions/Route Handlers.

---

## Notification System

**Status:** active

**Decision:** Base notification system (push, email, in-app) built as plain-function modules under `app/lib/notifications/`, mirroring `app/lib/plans/`'s no-class style. `dispatch.ts` (`dispatchNotification`) orchestrates: resolves the notification type from a typed registry (`NOTIFICATION_TYPES` in `app/constants/notifications.ts`, same pattern as `PLAN_TEMPLATES`), resolves channels via the pure `resolveChannels` (explicit request → type default → `available`, unavailable channels recorded `skipped` not dropped), persists a `Notification` + per-channel `NotificationDelivery` rows, then calls each channel (`in_app`/`push`/`email`, `app/lib/notifications/channels/`) via `Promise.allSettled` — one failing channel never blocks the others. Reminders (`ScheduledNotification` rows) are polled by a secret-guarded cron Route Handler (`app/api/cron/reminders/route.ts`), not a queue/worker — no Redis exists in this stack. See [ADR 0037](../adr/0037-notification-dispatch-and-channels.md).

**Rationale:** Greenfield feature needing extensibility (new channels, new event types) without a class/DI framework. See ADR 0037 for the queue-vs-cron-poll tradeoff.

**Constraints:**
- `NotificationChannel` implementations must never throw — `send()` returns `{status: "failed", error}` instead; `dispatch.ts` depends only on the narrow `NotificationStore`/`ChannelRegistry` interfaces, never on Prisma or a channel SDK directly.
- Adding a notification type is a new `NOTIFICATION_TYPES` entry only; adding a channel is a new file under `channels/` + one `registry.ts` line. Never edit `dispatch.ts` for either.
- No user notification-preference table exists yet (deliberately deferred) — `resolveChannels(typeDef, requested, available)` is the reserved seam: a prefs lookup becomes one more input there, never a change to `dispatch.ts`.
- `Notification`/`NotificationDelivery`/`PushSubscription`/`ScheduledNotification` live in `prisma/app/schema.prisma` (appPrisma) with scalar `user_id` only — no relation to `User` (ADR 0008).
- `PushSubscription.endpoint_hash` (sha256 of the raw endpoint) is the unique key, not the endpoint itself — raw Web Push endpoints can exceed MySQL's practical index length.
- `app/api/cron/reminders/route.ts` is deliberately excluded from the `auth-middleware` protected-routes matcher (machine-called, guarded by `x-cron-secret` timing-safe compare instead — mirrors the Sentry webhook relay, ADR 0018). Do not add session auth to it.
- Reminders have no per-user timezone source (no `User.timezone` column) — `ScheduledNotification.timezone` is captured from the client (`Intl.DateTimeFormat().resolvedOptions().timeZone`) at enqueue time. Rendered notification locale defaults to `ar` (i18n decision) when no per-user locale is available (e.g. cron-triggered sends).
- `app/lib/notifications/render-context.ts` reads `messages/<locale>.json` directly (not next-intl's `getTranslations`) because the cron path has no request-scoped `headers()`/RSC context.
