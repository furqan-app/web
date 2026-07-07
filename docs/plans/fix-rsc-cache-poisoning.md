# Fix RSC Cache Poisoning on Hostinger

**Type:** bug
**Date:** 2026-07-06
**Status:** implemented

## Summary

Multiple users see raw RSC wire format (Next.js flight data) instead of an HTML page when navigating to `furqan.taha7.com/ar` and other routes. No service worker is involved — production is built from the `prod` branch which predates the PWA feature. The server-side HTTP cache on Hostinger is storing RSC responses under bare page URLs and serving them back for plain navigation requests.

## Root Cause

When Next.js App Router performs client-side navigation it fetches the RSC payload with `?_rsc=<hash>` appended and an `RSC: 1` request header. The server returns the RSC wire format with `Content-Type: text/x-component` and `Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch`.

Hostinger's reverse proxy cache (LiteSpeed or Nginx) is doing at least one of the following:
- Stripping the `?_rsc=<hash>` query parameter before computing the cache key (so `GET /ar?_rsc=abc123` is stored under `/ar`)
- Ignoring the `Vary` header (which uses non-standard tokens the cache doesn't recognise as differentiators)

Either way, the RSC wire format response ends up cached under the plain URL `/ar`. The next user who navigates directly to `/ar` receives the cached RSC payload, which the browser renders as plain text (because `Content-Type: text/x-component` is not `text/html`).

Multiple users are affected simultaneously, confirming this is a shared server cache rather than a browser-local issue.

## Fix

Add `Cache-Control: no-store` to every response whose request URL contains the `_rsc` query parameter. `no-store` is the correct directive: it prohibits any intermediate proxy or CDN from storing the response at all, which is the right semantics for flight data that is tied to a specific router-state snapshot and meaningless outside the client-side navigation context.

This is done via the `headers()` config in `next.config.mjs` using Next.js's `has` conditional matcher — no middleware changes, no runtime overhead.

**Also add to DECISIONS.md** a standing constraint under the Middleware / caching section so future developers know this header is load-bearing.

## Files to Change

- `next.config.mjs` — add an `async headers()` export with one rule: for any URL where `?_rsc` is present, return `Cache-Control: no-store`. Chain it alongside the existing `withNextIntl` wrap.

## Constraints

- Do not use `Cache-Control: private` instead of `no-store` — private prevents shared caches but still allows the browser's own cache to store flight data, which can cause stale RSC responses on back-navigation. `no-store` is the correct directive here.
- Do not set `no-store` for ALL routes — only RSC requests. HTML navigation responses benefit from normal caching semantics.
- This fix is server-side only (config, not runtime). Do not add middleware logic for this — middleware runs per-request and this belongs in static config.

## Decisions Made

- `Cache-Control: no-store` on `?_rsc=*` responses is the minimal, correct fix. Configuring Hostinger's cache panel (e.g. excluding `?_rsc=*` from cache keys) would also work as a complementary measure, but is not a code change we can ship and Hostinger's cache panel may reset on redeploy.

## Trello

Card to be created in Todo list, labeled Bug.
