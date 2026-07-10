# Sentry Error Tracking

**Type:** feature
**Date:** 2026-07-07
**Status:** implemented

## Summary

Add Sentry (`@sentry/nextjs`) to capture production errors across client, server, and edge — no performance tracing, no session replay. Reporting is on/off purely by whether `NEXT_PUBLIC_SENTRY_DSN` is set: the SDK no-ops without a DSN, so leaving it unset locally keeps dev silent with no branching code. Server/Route Handler/Server Component errors are captured automatically via Next's `instrumentation.ts` hook; client render errors get new themed error boundaries. Source-map upload for readable prod stack traces is included, using Hostinger's build-env-var support (confirmed available) to supply `SENTRY_AUTH_TOKEN` at build time.

## Approach

See [ADR 0017](../architecture/adr/0017-sentry-error-tracking.md) for the full rationale (DSN-presence gating vs `NODE_ENV`, errors-only scope, why source maps are safe to include given Hostinger's build-env support).

## Files to Change

- **`package.json`** — add `@sentry/nextjs` dependency.
- **`next.config.mjs`** — wrap the existing export with `withSentryConfig(...)` (org/project/authToken from env, for source-map upload); add `experimental.instrumentationHook: true` (required pre-Next 15).
- **`instrumentation.ts`** (new, project root) — `register()` imports `sentry.server.config`/`sentry.edge.config` based on `NEXT_RUNTIME`; exports `onRequestError = Sentry.captureRequestError` so Route Handlers, Server Components, and middleware report automatically with no per-file changes.
- **`sentry.server.config.ts`**, **`sentry.edge.config.ts`**, **`sentry.client.config.ts`** (new, project root) — each just `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0 })`. `sentry.client.config.ts` needs no manual import anywhere — `withSentryConfig`'s webpack plugin auto-injects it into the client bundle.
- **`app/[locale]/error.tsx`** (new, not `app/error.tsx` — see Decisions Made) — client component boundary for errors within the locale-nested tree. Nested inside `[locale]/layout.tsx`, so `Nav`, `NextIntlClientProvider`, and theme all stay mounted. Calls `Sentry.captureException(error)` in a `useEffect`, renders a themed fallback (theme tokens, real translations via `error.*` keys in `messages/{ar,en}.json`, "try again" (`reset()`)/home links) matching `app/not-found.tsx`'s style.
- **`app/global-error.tsx`** (new) — client component boundary for errors in the root layout itself; replaces `app/layout.tsx` entirely (own `<html>`/`<body>`, no theme tokens/fonts/i18n available — see Decisions Made). Same capture pattern, plain inline-safe CSS fallback.
- **`.env.example`** — add commented placeholder entries: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (documentation only, no real values).

## Environment Variables (set in Hostinger's build-env panel, not in any committed file)

| Var | Used by | Scope |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | all three `sentry.*.config.ts` | build + runtime; gates reporting on/off |
| `SENTRY_ORG` | `next.config.mjs` (`withSentryConfig`) | build-time only |
| `SENTRY_PROJECT` | `next.config.mjs` (`withSentryConfig`) | build-time only |
| `SENTRY_AUTH_TOKEN` | `next.config.mjs` (`withSentryConfig`) | build-time only, source-map upload |

`.env.local` (dev) and `.env.production` (committed, baked into static output) both leave `NEXT_PUBLIC_SENTRY_DSN` unset — this is what keeps local dev and local `next build` silent by default (ADR 0017).

## Verified Decisions

- **Dev vs prod:** No `NODE_ENV` branching. DSN presence is the only gate (confirmed with user).
- **Scope:** Errors only — `tracesSampleRate: 0`, no `replayIntegration()` (confirmed with user; deferred due to bundle/cost and replay's privacy surface against sign-in/marks).
- **Source maps:** Included, since Hostinger supports build-time env vars for `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` (confirmed with user).
- **Error boundary UI:** New themed `app/error.tsx`/`app/global-error.tsx`, styled like `not-found.tsx`, not left as Next's default unstyled fallback (confirmed with user).

## Constraints

- Do not add `NODE_ENV` checks around `Sentry.init()` anywhere — see ADR 0017.
- Never put a real `NEXT_PUBLIC_SENTRY_DSN` value in `.env.production` or `.env.example` (both committed).
- Do not remove `experimental.instrumentationHook: true` without confirming the Next.js major version no longer needs it (irrelevant once upgraded to Next 15+).
- `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` must stay server/build-side only — never `NEXT_PUBLIC_*`, never referenced from client code.
- No changes to `app/api/**/route.ts` or `jsonResponse()` — error capture for those goes through `instrumentation.ts`'s `onRequestError`, not per-route try/catch.

## What NOT to Do

- Do not enable performance tracing (`tracesSampleRate` above `0`) or `replayIntegration()` as part of this task — explicitly deferred; revisit ADR 0017 first if picked up later.
- Do not gate Sentry init on `NODE_ENV` — superseded by DSN-presence gating before any code was written (see ADR 0017 Option A vs B).
- Do not leave `app/[locale]/error.tsx`/`app/global-error.tsx` unstyled/default — themed fallback UI is in scope for this task, not deferred.
- Do not move the locale-tree error boundary to `app/error.tsx` (outside `[locale]/layout.tsx`) — that was the plan's original file path but was revised during implementation once it became clear it would sit outside `NextIntlClientProvider`/`Nav`. See Decisions Made.
- Do not give `app/global-error.tsx` theme tokens (`bg-background` etc.) or reuse `not-found.tsx`'s styling approach — it replaces `app/layout.tsx` entirely, so no flash-prevention script/theme class has run and those tokens resolve to nothing. Use plain inline-safe CSS instead.

## Decisions Made

- **Error boundary location:** `app/[locale]/error.tsx`, not `app/error.tsx` as originally named in the plan. `NextIntlClientProvider`, `Nav`, and all context providers live in `app/[locale]/layout.tsx`; a boundary at bare `app/error.tsx` would sit outside that layout and lose Nav + translations when it activates. Nesting it under `[locale]` keeps the parent layout mounted (Next.js only swaps the erroring segment's `{children}`), so the fallback gets Nav, theme, and real `error.*` translation keys. Confirmed with user before implementing.
- **`app/global-error.tsx` styling:** plain inline-safe CSS (system font stack, `prefers-color-scheme` media query in an inline `<style>` tag), not the app's theme-token system. This boundary replaces `app/layout.tsx` entirely, so the theme flash-prevention `<script>` never runs and `bg-background`/etc. would resolve to nothing. Confirmed with user before implementing.
