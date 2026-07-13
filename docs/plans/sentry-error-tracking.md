# Sentry Error Tracking

**Type:** feature  
**Date:** 2026-07-07  
**Status:** implemented

## Summary

Add `@sentry/nextjs` for production error capture across client, server, and edge — errors only, no performance tracing, no session replay. Reporting gates on `NEXT_PUBLIC_SENTRY_DSN` presence (no branching code — SDK no-ops without a DSN). See [ADR 0017](../architecture/adr/0017-sentry-error-tracking.md).

## Files Changed

- `package.json` — add `@sentry/nextjs`
- `next.config.mjs` — wrap with `withSentryConfig(...)` (source-map upload); add `experimental.instrumentationHook: true`
- `instrumentation.ts` (new) — `register()` imports server/edge config per `NEXT_RUNTIME`; exports `onRequestError = Sentry.captureRequestError` (auto-captures Route Handler / Server Component / middleware errors)
- `sentry.server.config.ts`, `sentry.edge.config.ts`, `sentry.client.config.ts` (new) — each: `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0 })`
- `app/[locale]/error.tsx` (new, not `app/error.tsx`) — client error boundary nested inside `[locale]/layout.tsx` so `Nav`, `NextIntlClientProvider`, and theme stay mounted. Calls `Sentry.captureException(error)` in `useEffect`, renders themed fallback using `error.*` i18n keys.
- `app/global-error.tsx` (new) — boundary for root layout errors; replaces `app/layout.tsx` entirely so uses plain inline-safe CSS (`prefers-color-scheme` media query), not theme tokens.
- `.env.example` — commented placeholder entries: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

## Environment Variables (Hostinger panel only)

| Var | Scope |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | build + runtime; gates reporting on/off |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | build-time only (source-map upload) |

`.env.local` and `.env.production` (committed) both leave `NEXT_PUBLIC_SENTRY_DSN` unset — keeps local dev and local builds silent.

## Constraints

- No `NODE_ENV` branching around `Sentry.init()` — DSN presence is the only gate (ADR 0017).
- Never put a real DSN in `.env.production` or `.env.example`.
- `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` must be build-side only — never `NEXT_PUBLIC_*`.
- Do not enable `tracesSampleRate > 0` or `replayIntegration()` — deferred; revisit ADR 0017 first.
- `app/global-error.tsx` must use plain inline-safe CSS — it replaces `app/layout.tsx` so theme tokens/flash-prevention script haven't run.
- Do not move locale error boundary to `app/error.tsx` — outside `[locale]/layout.tsx`, it loses Nav + translations.
- No changes to `app/api/**/route.ts` — error capture goes through `instrumentation.ts`'s `onRequestError`.
