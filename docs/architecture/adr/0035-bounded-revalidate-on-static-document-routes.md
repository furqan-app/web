# ADR 0035: Bounded `revalidate` on Statically Generated Document Routes

**Date:** 2026-07-31
**Status:** Accepted

## Context

Next.js's default full-route cache for statically generated pages (no `revalidate` export) emits
`Cache-Control: s-maxage=31536000, stale-while-revalidate` — a one-year edge cache lifetime, on the
assumption that the hosting platform purges its edge cache on every deploy (Vercel's model). Hostinger's
CDN (`hcdn`) does not reliably do this. Any response ever served for one of these routes — correct or
not — can be locked into the edge cache for up to a year, with no deploy-triggered invalidation path
available to us. `getServerSession`-backed routes (marks, plans, mushaf hub) are unaffected — reading
cookies makes Next mark them dynamic (`private, no-cache, no-store`) automatically — but the fully
static routes (`app/[locale]/page.tsx`, `app/[locale]/pages/[id]/page.tsx`,
`app/[locale]/pages/vertical/page.tsx`) have no such backstop.

## Options Considered

**Option A — Rely on origin `no-store` headers only**
Keep the existing `_rsc`-scoped `no-store` rule (`docs/plans/fix-rsc-cache-poisoning.md`) as the sole
defense. Confirmed via live `curl` against stg that it correctly suppresses caching for RSC-flagged
requests today — but it only bounds *that* request shape. It does nothing to shorten the one-year
window on the plain document response itself, so any other bad-response path (a deploy race, a
transient origin error cached as 200) still persists indefinitely once caught.

**Option B — Manual/reactive cache purge**
Purge Hostinger's edge cache by hand when a report comes in. No code change, but the blast radius
stays a year by default between purges, and detection depends on someone noticing and reporting.

**Option C — Bound `revalidate` on the static document routes**
Add `export const revalidate = 300` to the three fully static document routes. Content itself is
still statically generated and served from cache on the common path — this only caps how long any
single cached response, good or bad, can survive before Next revalidates it against the origin in the
background.

## Decision

**Option C.** `export const revalidate = 300` on `app/[locale]/page.tsx`,
`app/[locale]/pages/[id]/page.tsx`, and `app/[locale]/pages/vertical/page.tsx`. Kept alongside, not
instead of, the existing `_rsc` `no-store` header rule — the two guard different response shapes.

## Consequences

- **+** Any bad response cached at Hostinger's edge for these routes self-heals within 5 minutes
  instead of persisting for up to a year.
- **+** No dependency on Hostinger's deploy pipeline purging its CDN, which we don't control and
  can't verify.
- **-** More background origin re-renders than pure infinite-cache would produce (bounded — content
  is immutable, so re-renders are cheap DB reads, not expensive computation).
- **-** Does not fix the underlying trigger, whatever briefly produces a bad response in the first
  place — it bounds the damage, not the cause. If a reproducible trigger is later found, that's a
  separate fix.
