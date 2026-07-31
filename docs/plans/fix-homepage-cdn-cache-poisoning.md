# Fix Homepage CDN Cache Poisoning (Hostinger Edge)

**Type:** bug
**Date:** 2026-07-31
**Status:** implemented
**Trello:** #164 https://trello.com/c/RqQZGpJx

## Summary

Homepage (and, by the same mechanism, any statically generated document route) intermittently
renders as raw RSC flight-payload text or unstyled HTML for a random subset of visitors — reproduced
in a fresh incognito session with zero prior visits to the affected stg deploy, which rules out
per-browser cache/service-worker corruption as the primary cause and points to Hostinger's shared
edge CDN cache serving a bad response to everyone who happens to hit the same poisoned URL.

## Root Cause

Next.js's default `Cache-Control` for a statically generated route with no `revalidate` export is
`s-maxage=31536000, stale-while-revalidate` — a one-year edge-cache lifetime. This assumes the hosting
platform purges its CDN cache on every deploy (Vercel's model). Hostinger's CDN (`hcdn`) does not
reliably do this. Confirmed via live `curl` against stg:

```
GET /ar            → cache-control: s-maxage=31536000, stale-while-revalidate   (x-nextjs-cache: HIT)
GET /ar/pages/1     → cache-control: s-maxage=31536000, stale-while-revalidate   (x-nextjs-cache: HIT)
GET /ar/mushaf      → cache-control: private, no-cache, no-store, must-revalidate (getServerSession → auto-dynamic)
GET /ar?_rsc=...    → cache-control: no-store   (existing fix, confirmed working)
```

Once any bad response is ever cached under a plain document URL (`/ar`, `/ar/pages/{n}`, etc.) —
whatever the trigger (a deploy race overwriting `_next/static` chunks a cached HTML still references,
a leaked RSC payload not covered by the existing `_rsc`-scoped `no-store` rule, a transient origin
hiccup returned as 200) — it can persist at Hostinger's edge for up to a year, served to every visitor
who hits that URL, with no invalidation path available to us.

`/ar` is the single highest-traffic URL (every fresh visitor lands there before navigating anywhere
else), so it's simply the most likely one to get caught mid-poisoning-window and noticed — reader
pages are equally exposed but traffic is split across 604 distinct URLs, making any one of them far
less likely to be hit twice during a bad window.

Routes reading `getServerSession` (marks, plans, mushaf hub) are unaffected — cookie access makes
Next mark them dynamic automatically (`private, no-cache, no-store`), confirmed above.

The exact trigger for the *first* bad response was not reproduced live (current `curl` checks all
returned clean, correctly-cached, correctly-`no-store`'d responses) — this plan bounds the damage of
whatever it is, rather than chasing the trigger further.

## Decision Tree

| Route | Current caching | Fix |
|---|---|---|
| `app/[locale]/page.tsx` | Static, `s-maxage=31536000` | Add `export const revalidate = 300` |
| `app/[locale]/pages/[id]/page.tsx` | Static, `s-maxage=31536000` | Add `export const revalidate = 300` |
| `app/[locale]/pages/vertical/page.tsx` | Static, `s-maxage=31536000` | Add `export const revalidate = 300` |
| `app/[locale]/marks/page.tsx`, `plans/page.tsx`, `mushaf/page.tsx` | Already dynamic (`getServerSession`) | No change |
| `app/[locale]/mushaf/[grant]/pages/[id]/page.tsx` | Already deliberately dynamic (comment confirms, DB-backed) | No change |
| `_rsc`-flagged requests (any route) | Already `no-store` (existing fix) | No change |

## Verified Test Cases

- `curl https://furqan-stg.taha7.com/ar` → currently `s-maxage=31536000` → after fix, `s-maxage=300`.
- `curl https://furqan-stg.taha7.com/ar/pages/1` → currently `s-maxage=31536000` → after fix, `s-maxage=300`.
- `curl https://furqan-stg.taha7.com/ar/mushaf` → unaffected, stays `private, no-cache, no-store`.
- `curl "https://furqan-stg.taha7.com/ar?_rsc=x" -H "RSC: 1"` → unaffected, stays `no-store`.

## Files to Change

- `app/[locale]/page.tsx` — add `export const revalidate = 300;`
- `app/[locale]/pages/[id]/page.tsx` — add `export const revalidate = 300;`
- `app/[locale]/pages/vertical/page.tsx` — add `export const revalidate = 300;`
- `docs/architecture/adr/0035-bounded-revalidate-on-static-document-routes.md` — new ADR (already written)
- `docs/architecture/DECISIONS.md` — new constraint under "Static Generation Strategy" (already written)

## Constraints

- Content itself stays statically generated at build time — this only bounds the CDN cache lifetime,
  it does not reintroduce per-request DB queries on the common path (Static Generation Strategy
  decision is unchanged).
- Do not apply `revalidate` to routes already excluded via `getServerSession` — they're already
  correctly dynamic and don't need it.
- Keep the existing `_rsc`-scoped `no-store` header rule in `next.config.mjs` — it guards a different
  response shape (RSC fetches) than this fix (the plain document response).

## What NOT to Do

- Do not rely solely on the existing `_rsc` `no-store` rule as sufficient — confirmed via live curl
  that it works correctly for RSC-flagged requests today, but it does nothing to bound the one-year
  cache lifetime on the plain document response itself.
- Do not chase down the exact original poisoning trigger as a blocker for this fix — it could not be
  reproduced live; this fix bounds the blast radius regardless of cause. If a reproducible trigger
  surfaces later, it's a separate follow-up.
- Do not set `revalidate` on `app/[locale]/mushaf/[grant]/pages/[id]/page.tsx` — it's deliberately
  dynamic already (per its own code comment), adding `revalidate` there would be a no-op at best and
  confusing at worst.

## Decisions Made

- Revalidate window: 300 seconds (5 minutes) — balances CDN cache-hit performance against a tight
  self-heal window, per user confirmation.
- Fix direction: harden origin headers (bound `revalidate`), not purge-and-monitor — durable fix over
  reactive mitigation, per user confirmation.
- See [ADR 0035](../architecture/adr/0035-bounded-revalidate-on-static-document-routes.md) for the
  full options-considered writeup.
