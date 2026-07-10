# ADR 0019: fq-logger Wraps Pino and Forwards Error-Level Logs to Sentry

**Date:** 2026-07-09
**Status:** Accepted

## Context

The app has no structured logging today — 12 scattered `console.log/error/warn` calls and no way to trace what happened in a request outside of a crash. [ADR 0017](0017-sentry-error-tracking.md) deliberately scoped Sentry to exceptions only (`tracesSampleRate: 0`, no replay), so it cannot serve as a general observability layer. We want structured, leveled, request-correlated logs across server actions, API routes, auth flows, and the Sentry-Slack relay, while keeping the cost-conscious posture behind ADR 0017/0018 (free Sentry tier, no paid log vendor). Next.js's Edge runtime (used by `middleware.ts`) cannot run Node-only logging libraries, so whatever is chosen needs an Edge-safe path for auth-middleware logging.

## Options Considered

**Option A — pino, fully separate from Sentry**
Keep `fq-logger` purely for structured info/debug/warn/error logs; Sentry continues to own exceptions exclusively as ADR 0017 describes. Simplest, no ADR conflict, but every error-level log site would need a second, separate `Sentry.captureException` call to also alert on it — easy to forget at new call sites.

**Option B — pino, with `logger.error()` also reporting to Sentry**
`fq-logger`'s `error()` method both writes the structured log line and calls `Sentry.captureException` (with the same redacted context as `extra`), making `logger.error()` the single call site for both tracing and alerting. Removes duplicate call sites at the cost of amending ADR 0017's "Sentry = exceptions only" boundary — Sentry now also receives events sourced from application-level error logs, not just uncaught exceptions.

**Option C — winston instead of pino**
Winston is also Node-only (stream/fs-based transports) and needs the same Edge-runtime shim as pino; no relevant advantage here, and pino is faster (lower per-call serialization overhead), so this option was ruled out without a deeper trade-off analysis.

## Decision

Option B, using pino. `fq-logger` (`lib/fq-logger/`) wraps `pino` under the Node.js runtime and falls back to a plain `console`-based shim (same 5-method API: `trace/debug/info/warn/error/fatal`, plus `.child()`) under the Edge runtime, selected via `process.env.NEXT_RUNTIME === "edge"`. `logger.error(msg, ctx)` calls `Sentry.captureException(ctx.err ?? new Error(msg), { extra: redactedCtx })` in addition to emitting the structured log line, using the same redaction pass (see `lib/fq-logger/redact.ts`) so Sentry never receives an unredacted field that the log line itself scrubbed.

This amends ADR 0017: Sentry's event stream is no longer sourced solely from uncaught exceptions captured via `instrumentation.ts`/`error.tsx`/`global-error.tsx` — it now also receives events from explicit `logger.error()` calls at application call sites.

## Consequences

- **+** One call site (`logger.error()`) covers both structured tracing and Sentry alerting — no risk of a new error path logging but forgetting to alert, or vice versa.
- **+** Sentry and stdout logs share one redaction pass, so a field added to the redact list is scrubbed everywhere at once.
- **-** Sentry's free-tier event quota (ADR 0018's context) is now consumed by application-level `logger.error()` calls, not just uncaught exceptions — noisy or over-used `logger.error()` call sites will burn quota faster than before. Call sites should reserve `.error()` for genuine failures, using `.warn()` for recoverable/expected error paths (e.g. a failed cache read).
- **-** A `logger.error()` call with no real exception (e.g. logging a validation failure) still creates a synthetic `Error` object for Sentry, which will show a stack trace rooted at the logger call rather than the original fault — acceptable, but worth knowing when reading Sentry issues sourced this way.
