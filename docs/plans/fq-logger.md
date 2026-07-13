# fq-logger: Structured Logging & Observability

**Type:** feature
**Date:** 2026-07-09
**Status:** implemented

Trello: [#84 Create a logging lib wrapper](https://trello.com/c/5eDRKAl6/84-create-a-logging-lib-wrapper)

## Summary

`pino`-based structured logging wrapper. Instruments server-side code: existing `console.*` call sites plus new log points in auth flows, API routes, server actions, and the Sentry-Slack webhook relay. `logger.error()` also reports to Sentry — bridging the two (ADR 0019). See [ADR 0019](../architecture/adr/0019-fq-logger-sentry-integration.md).

## Library & Runtime Split

- **Node runtime:** `pino` (all API routes, server actions, NextAuth callbacks — none set `export const runtime = "edge"`).
- **Edge runtime:** plain `console`-based shim — `middleware.ts`/`auth-middleware.ts` run on Edge where pino's worker-thread transports don't work.

Both paths expose the same 6-level API (`trace/debug/info/warn/error/fatal`) plus `.child(context)`.

**Critical:** two separate leaf modules (`@/lib/fq-logger` and `@/lib/fq-logger/edge`) — NOT one entry point importing both. A shared entry point with a static top-level `import` of `node.ts` (which imports `pino`) would pull pino into the Edge bundle. Edge-runtime files import `@/lib/fq-logger/edge` directly; everything else imports `@/lib/fq-logger`.

## File Layout

```
lib/fq-logger/
  index.ts         — Node API: `logger`, `getLogger()` (request-scoped child via next/headers)
  node.ts          — pino instance/config
  edge.ts          — console-based Edge shim
  types.ts         — shared `FqLogger`/`LogContext` types
  redact.ts        — sensitive key list + manual `redact()` used by both paths
  sentry-bridge.ts — shared `reportToSentry()` used by both paths
```

## Levels, Transport, Request Correlation

- Default level: `debug` in dev, `info` in prod. Overridable via `LOG_LEVEL`.
- Dev transport: `PinoPretty(...)` stream as pino's **second constructor argument** (not `transport: { target: "pino-pretty" }` — the worker-thread form throws inside Next.js webpack-bundled Route Handlers).
- Prod: raw JSON to stdout, no file, no hosted vendor.
- `withRequestId` middleware: first in `middleware.ts`'s `pipeMiddlewares([...])` list; generates `crypto.randomUUID()` if no `x-request-id` inbound; forwards via `NextResponse.next({ request: { headers } })`. `getLogger()` reads it via `headers().get("x-request-id")` and returns `logger.child({ requestId })`.

## Redaction

Fixed key list in `redact.ts`: `email`, `password`, `token`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `secret`. Node: pino's `redact.paths`. Edge: manual recursive walk before `JSON.stringify`. The same redacted object is passed to `Sentry.captureException({ extra: redacted })` — Sentry never receives fields that the log line scrubbed.

## `logger.error()` → Sentry Bridge

```ts
error(msg: string, ctx: Record<string, unknown> & { err?: unknown } = {}) {
  const redacted = redact(ctx);
  base.error(redacted, msg);   // pino or edge shim
  Sentry.captureException(ctx.err instanceof Error ? ctx.err : new Error(msg), {
    extra: redacted,
  });
}
```

Reserve `.error()` for genuine failures — it consumes Sentry quota (ADR 0018). Use `.warn()` for expected/recoverable paths (422 validation, auth redirects). For routes that catch-and-rethrow, use `.warn()` not `.error()` to avoid double-reporting to Sentry (the rethrown error is already captured by `instrumentation.ts`'s `onRequestError`).

## Call-Site API

```ts
import { getLogger } from "@/lib/fq-logger";
const log = getLogger();
log.info("mark.created", { userId, pageId });
log.warn("mark.create.slow", { durationMs });
log.error("mark.create.failed", { err: e, userId });
```

## Files to Change

**New:** `lib/fq-logger/index.ts`, `node.ts`, `edge.ts`, `types.ts`, `redact.ts`, `sentry-bridge.ts`; `app/middlewares/request-id-middleware.ts`; `docs/architecture/adr/0019-fq-logger-sentry-integration.md`.

**Modified:** `middleware.ts` (add `withRequestId`); `app/middlewares/auth-middleware.ts` (`.warn()` on auth denials, Edge shim); `app/api/auth/options.ts` (`.warn()` on callback failures); API routes (`.warn()` on 401/422); `app/api/webhooks/sentry/route.ts` (`.warn()` on sig failures, `.info()` on dropped resource types); `package.json` (`pino`, `pino-pretty` dev); `.env.example`/`.env.local` (document `LOG_LEVEL`).

**Out of scope:** `app/server/actions/addPageMark.ts`, `deletePageMark.ts`, `getPageMarks.ts`, `mushaf/accessGrants.ts` — despite living under `app/server/actions/`, these have no `"use server"`, call `fetch()` with relative paths, and are invoked from client `useQuery` hooks — they run in the browser.

## Constraints

- fq-logger is server-only. Do not import from client components.
- `getLogger()` must only be called within a request context — never from scripts, seeders, or build-time code.
- Every new sensitive field logged must be added to `redact.ts`'s key list, not hand-redacted at the call site.
- Do not use Winston — same Node-only Edge limitation, no offsetting benefit over pino.
- Do not skip redaction on the Sentry `captureException` call — both destinations need the same redacted object.
