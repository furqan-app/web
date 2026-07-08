# ADR 0017: Sentry Error Tracking via DSN-Presence Gating

**Date:** 2026-07-07
**Status:** Accepted

## Context

The app has no error-tracking or centralized logging today — unhandled exceptions in Server Components, Route Handlers, middleware, or client render just surface as Next.js's default (or blank) error UI, with no record anywhere once the request ends. We want production errors to be captured and reported to Sentry, without adding overhead or noise to local development, and without requiring a code change to switch an environment's reporting on or off. Hostinger's build pipeline clones the repo fresh per deploy and does not read `.env.local`, so any build-time secret (e.g. a source-map upload token) must come from Hostinger's own build-env-var panel, confirmed available.

## Options Considered

**Option A — `NODE_ENV` check**
Gate `Sentry.init()` behind `process.env.NODE_ENV === "production"`. Simple, but ties error reporting to the build mode rather than to whether reporting is actually configured — a `next build` run locally would start reporting to prod's Sentry project.

**Option B — DSN-presence gating**
Read the DSN from an env var (`NEXT_PUBLIC_SENTRY_DSN`) and always call `Sentry.init({ dsn })`. The Sentry SDK already no-ops (does not send events) when `dsn` is `undefined`. Leaving the var unset in `.env.local` and setting it only in Hostinger's build/runtime env makes "on in prod, off in dev" fall out of environment configuration, with no branching code to maintain or forget.

## Decision

Option B. Sentry is initialized unconditionally in `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`, reading `dsn: process.env.NEXT_PUBLIC_SENTRY_DSN`. The var is left empty in `.env.local`/`.env.example` and set only in Hostinger's panel, so dev and any local `next build` stay silent by default.

Scope is errors only: `tracesSampleRate: 0`, no `replayIntegration()`. Server/edge/Server-Component errors are captured via the standard `instrumentation.ts` `onRequestError = Sentry.captureRequestError` hook — no per-route try/catch needed. Client render errors are captured via two boundaries: `app/[locale]/error.tsx` (nested inside `[locale]/layout.tsx`, so `Nav`, `NextIntlClientProvider`, and theme classes stay mounted — deliberately not bare `app/error.tsx`, which sits outside that layout and would lose all three) and `app/global-error.tsx` (root-layout-crashing last resort; replaces `app/layout.tsx` entirely, so it renders its own `<html>`/`<body>` with plain inline-safe CSS rather than theme tokens, since the theme flash-prevention script never runs when it activates).

Since this repo is on Next.js 14.2.15 (pre-15), `experimental.instrumentationHook: true` must remain in `next.config.mjs` for `instrumentation.ts` to run — Next 15 makes this the default and the flag becomes a no-op, but it cannot be removed before upgrading.

Source-map upload (`withSentryConfig`'s `authToken`/`org`/`project`) is a separate, build-time-only concern: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` are read only inside `next.config.mjs` at build time and are never bundled into client code.

## Consequences

- **+** No environment-branching code (`if (NODE_ENV === ...)`) to keep in sync across three init files — one env var, unset by default, controls everything.
- **+** A developer can opt into local testing of error reporting just by setting `NEXT_PUBLIC_SENTRY_DSN` in their own `.env.local`, with no code change.
- **+** Server/Route Handler errors need no per-route instrumentation — `onRequestError` covers them automatically, keeping `app/api/**/route.ts` and `jsonResponse()` untouched.
- **-** Because gating relies on the var being genuinely absent in every non-prod environment, a stray `NEXT_PUBLIC_SENTRY_DSN` committed to a shared env file (rather than set only in Hostinger's panel) would silently start reporting dev/test errors into the prod Sentry project. Keep it out of `.env.production` (committed) and `.env.example` (placeholder only).
- **-** `experimental.instrumentationHook: true` is a reminder that this integration is version-coupled to Next 14; do not delete it as "probably unnecessary" without checking the installed Next.js major version first.
- **-** `sentry.client.config.ts` triggers a `@sentry/nextjs` deprecation warning at build time recommending a move to the `instrumentation-client.ts` convention. **Do not act on it yet:** that convention was introduced in Next.js **v15.3** (confirmed against Next's own docs) — this repo is pinned to 14.2.15, which does not load that filename at all, so renaming today would silently disable all client-side error capture. Revisit this only when the app upgrades to Next 15.3+ (or adopts Turbopack, which the warning also references).
