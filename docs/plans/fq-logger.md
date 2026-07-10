# fq-logger: Structured Logging & Observability

**Type:** feature
**Date:** 2026-07-09
**Status:** implemented

## Summary

The app has no structured logging today — 12 scattered `console.log/error/warn` calls and no way to trace what happened in a request outside of a Sentry crash report. This adds `fq-logger`, a `pino`-based structured logging wrapper, and instruments the server-side app with it: existing `console.*` call sites, plus new log points in auth flows, API routes, server actions, and the Sentry-Slack webhook relay. Sentry continues to exist but its role narrows to "what broke" while fq-logger covers "what happened" — with `logger.error()` bridging the two by also reporting to Sentry. See [ADR 0019](../architecture/adr/0019-fq-logger-sentry-integration.md) for why that bridge exists and what it amends from [ADR 0017](../architecture/adr/0017-sentry-error-tracking.md).

Trello: [#84 Create a logging lib wrapper](https://trello.com/c/5eDRKAl6/84-create-a-logging-lib-wrapper).

## Approach

### Library & runtime split

- `pino` under the Node.js runtime (all API routes, server actions, NextAuth callbacks — none of these set `export const runtime = "edge"` today).
- A plain `console`-based shim under the Edge runtime, needed because `middleware.ts` (and `auth-middleware.ts`, which lives in that pipeline) runs on Edge, where pino's Node worker-thread transports don't work. Winston was considered and ruled out — it has the identical Node-only constraint, with no offsetting benefit over pino's lower overhead (see ADR 0019, Option C).
- Both paths expose the identical 6-level API (`trace/debug/info/warn/error/fatal`) plus `.child(context)`, so call sites never need to know which runtime they're on.

**Correction (found during implementation):** rather than one entry point runtime-branching via `process.env.NEXT_RUNTIME`, the Node and Edge implementations are two separate leaf modules (`@/lib/fq-logger` and `@/lib/fq-logger/edge`). A single shared entry point with a static top-level `import` of both `node.ts` (which imports `pino`) and `edge.ts` would pull `pino` into whichever bundle imports that entry point — including the Edge bundle for `middleware.ts` — since webpack/Next's Edge bundler follows static imports regardless of a runtime `if` guard around their use. Keeping them as separate files that are never both reachable from one import graph avoids ever bundling `pino` (which needs Node's `worker_threads`/`fs`) into the Edge build. Edge-runtime files (`middleware.ts`, `auth-middleware.ts`) import `@/lib/fq-logger/edge` directly; everything else imports `@/lib/fq-logger`.

### File layout

```
lib/fq-logger/
  index.ts       — Node entry point: `logger`, `getLogger()` (request-scoped child via next/headers)
  edge.ts        — Edge entry point: `edgeLogger` shim, same API, console-based
  node.ts        — the real pino instance/config, used only by index.ts
  types.ts       — shared `FqLogger`/`LogContext` types
  redact.ts      — shared redact key list + a manual redact() used by both node.ts and edge.ts
  sentry-bridge.ts — shared `reportToSentry()` used by both node.ts and edge.ts
```

### Levels & transport

- Default level: `debug` in dev, `info` in prod. Overridable via `LOG_LEVEL` env var.
- Dev transport: `pino-pretty` (new devDependency).
- Prod transport: none — raw JSON lines to stdout (pino's default), no file, no hosted vendor (matches the cost-conscious posture behind ADR 0017/0018).

**Correction (found during implementation, via manual testing):** pino's `transport: { target: "pino-pretty" }` option spawns a worker thread that resolves the target module from disk at runtime — this throws `unable to determine transport target for "pino-pretty"` inside Next's webpack-bundled Route Handlers (confirmed by hitting `/api/webhooks/sentry` locally and getting a 500). Fixed by passing a `PinoPretty(...)` stream directly as pino's second constructor argument (`pino({ level }, PinoPretty({...}))`) instead of the `transport` option — this is a synchronous stream, not a worker-thread transport, and works fine bundled. Re-tested the same route afterward and got the correct `401`/pretty-printed log line.

### Request correlation

- New `withRequestId` middleware wrapper, added first in `middleware.ts`'s `pipeMiddlewares([...])` list (before `withIntl`/`withAuth`).
- Generates `crypto.randomUUID()` (Web Crypto, available in Edge) if the inbound request has no `x-request-id` header; forwards it on the request headers using the exact pattern `auth-middleware.ts` already uses for the `user` header (`NextResponse.next({ request: { headers } })`).
- `getLogger()` reads it via `headers().get("x-request-id")` (`next/headers`) and returns `logger.child({ requestId })`. Only valid inside a request context (Server Components/Actions/Route Handlers) — never called from build-time scripts.

### Redaction

- Fixed key list in `lib/fq-logger/redact.ts`: `email`, `password`, `token`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `secret`.
- Node path: pino's `redact.paths` option (matches these keys at any nesting depth).
- Edge path: a manual recursive `redact()` walk over the logged context object, applied before `JSON.stringify`.
- The same redaction pass runs before the `Sentry.captureException(..., { extra })` call in `logger.error()`, so Sentry never receives a field the log line itself scrubbed.

### `logger.error()` → Sentry bridge

```ts
error(msg: string, ctx: Record<string, unknown> & { err?: unknown } = {}) {
  const redacted = redact(ctx);
  base.error(redacted, msg);           // pino or edge shim
  Sentry.captureException(ctx.err instanceof Error ? ctx.err : new Error(msg), {
    extra: redacted,
  });
}
```

This is the ADR 0019 amendment: Sentry's event stream now includes application-level `logger.error()` calls, not just uncaught exceptions.

## Call-Site API

```ts
import { getLogger } from "@/lib/fq-logger";

const log = getLogger();
log.info("mark.created", { userId, pageId });
log.warn("mark.create.slow", { durationMs });
log.error("mark.create.failed", { err: e, userId });
```

## Verified Example

`app/api/auth/options.ts`'s `signIn` callback, currently:
```ts
} catch (e) {
  console.error(e);
  return false;
}
```
becomes:
```ts
} catch (e) {
  log.error("auth.signIn.failed", { err: e, email: user.email });
  return false;
}
```
Prod stdout: `{"level":50,"time":...,"requestId":"<uuid>","msg":"auth.signIn.failed","err":{"type":"Error","message":"...","stack":"..."},"email":"[Redacted]"}`. Sentry receives the same `err` as the captured exception, with `email` absent from `extra` (redacted before the call, not after).

## Files to Change

**New:**
- `lib/fq-logger/index.ts` — public API (`logger`, `getLogger`)
- `lib/fq-logger/node.ts` — pino instance/config (level, pino-pretty transport in dev, redact.paths)
- `lib/fq-logger/edge.ts` — console-based Edge shim with matching API + manual redact
- `lib/fq-logger/redact.ts` — shared sensitive-key list + `redact()` used by both paths
- `app/middlewares/request-id-middleware.ts` — `withRequestId` wrapper
- `docs/architecture/adr/0019-fq-logger-sentry-integration.md` — already written this session

**Modified — convert existing `console.*` (server-side only):**
- `app/api/auth/options.ts`

**Correction (found during implementation):** despite living under `app/server/actions/`, `addPageMark.ts`/`deletePageMark.ts`/`getPageMarks.ts`/`mushaf/accessGrants.ts` have no `"use server"` directive, call `fetch()` with relative paths, and are invoked from `useQuery` hooks in client components (`use-marks.ts`, `use-access-grants.ts`) — they run in the browser, not on the server. Their 7 `console.error` calls are out of scope for fq-logger (server-only, per Constraints) and are left unchanged.

**Modified — new instrumentation at previously-untraced points:**
- `middleware.ts` — add `withRequestId` to the pipe
- `app/middlewares/auth-middleware.ts` — log auth denials (401 redirects/JSON) at `.warn()`, using the Edge shim
- `app/api/auth/options.ts` — log `session`/`jwt` callback failures (currently silently swallowed) at `.warn()`
- All 11 routes under `app/api/**/route.ts` — log validation failures (`401`/`422`) at `.warn()`. **Correction (found during implementation):** almost none of these routes actually catch-and-swallow errors — they follow `docs/standards/api-conventions.md`'s convention of letting unhandled errors propagate to `instrumentation.ts`'s `onRequestError`, which already reports to Sentry. Calling `logger.error()` (which also calls `Sentry.captureException` per ADR 0019) right before a rethrow would double-report the same failure to Sentry. So: `.error()` is reserved for true dead-ends (an error caught and NOT rethrown); anywhere an error is caught only to be rethrown or is left to propagate, use `.warn()` (log line only, no Sentry call) or no explicit log at all. Concretely: `app/api/mushaf/codes/route.ts`'s unique-violation retry logs at `.warn()` (expected, recoverable) and its final rethrow gets no additional log; `app/api/webhooks/sentry/route.ts`'s deliberate throw-on-failed-Slack-POST (ADR 0018) gets no additional log, since `onRequestError` already reports it once.
- `app/api/webhooks/sentry/route.ts` — log signature-verification failures at `.warn()`, relayed/dropped resource types at `.info()` (the deliberate throw stays unlogged, per the correction above)

**Config:**
- `package.json` — add `pino`, `pino-pretty` (dev)
- `.env.example` / `.env.local` — document optional `LOG_LEVEL`

## Constraints

- fq-logger is server-only. Do not import it from client components — `app/utils/storage.ts`'s `console.warn` calls are client-side (localStorage) and stay as-is, out of scope.
- Do not add file-based or hosted-vendor log transports — stdout only, per the cost-conscious decision already made.
- `getLogger()` must only be called within a request context (reads `headers()`); do not call it from scripts, seeders, or build-time code.
- Every new sensitive field logged anywhere must be added to `lib/fq-logger/redact.ts`'s key list, not hand-redacted at the call site.
- Reserve `.error()` for genuine failures — it now also creates a Sentry event and consumes Sentry's free-tier quota (ADR 0018's context); use `.warn()` for expected/recoverable error paths (e.g. a 422 validation failure, an auth redirect).

## What NOT to Do

- Do not use Winston instead of pino — same Node-only Edge limitation, no offsetting benefit (ADR 0019, Option C).
- Do not gate fq-logger's behavior on `NODE_ENV` the way ADR 0017 explicitly avoided for Sentry's DSN — level/transport selection here is fine to key off `NODE_ENV`/`LOG_LEVEL` since it's a logging-verbosity concern, not an on/off reporting gate; don't conflate the two patterns when reviewing.
- Do not skip redaction on the Sentry `captureException` call just because pino's `redact.paths` already scrubs the log line — both destinations need the same redacted object (see the ADR 0019 consequence about synthetic Sentry errors).
- Do not add request-ID propagation into background/cron contexts — none exist in this app today; `getLogger()`'s `headers()` dependency is a deliberate scope limit, not an oversight.
