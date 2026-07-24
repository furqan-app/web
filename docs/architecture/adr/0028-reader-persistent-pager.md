# ADR 0028: Reader Uses a Persistent Client Pager Over Slim Static Content

**Date:** 2026-07-23
**Status:** Accepted (supersedes the swipe-navigation half of ADR 0019 and ADR 0027, and the "Swipe Animation — Core Gesture Only" decision)

## Context

The horizontal swipe reader navigated between pages with `router.push` — a full Next.js
client route change per swipe. Empirical profiling of a production build (localhost, warm
cache, fast desktop) measured, for a single navigation:

- **2.27 MB** RSC payload downloaded and deserialized (the prerendered page HTML is 2.59 MB).
- **~183 ms** of main-thread blocking (a 117 ms + 66 ms long task) — the input-blocking freeze.
- **1,478** word client components mounted across **10 pages** (5 carousel panels × 2), of
  which only 1 (mobile) or 2 (tablet) are ever visible.

Scaled by a 4–6× mid-range-mobile CPU factor, the 183 ms freeze becomes ~0.6–1.1 s of dropped
input per swipe — the reported symptom. The payload is dominated by data the page never renders:
`text_imlaei_simple` (a full verse text) is serialized 1,478 times via the nested `verse`
relation; chapter fields repeat ~1,500×; every word ships five text encodings when rendering
needs only `code_v1`/`code_v2`.

The root cause is structural: **a swipe is a route navigation that rebuilds five panels from a
fat payload.** The prior swipe work (ADR 0019, ADR 0027, "Core Gesture Only") optimized the
*animation* (real neighbor panels sliding in) but never removed the *post-commit remount*, because
those investigations targeted a visual flicker, not the main-thread freeze.

## Decision

The reader becomes a **persistent client-side pager over slim static content**, with four pillars:

1. **Hybrid navigation.** `/[locale]/pages/[id]` remains statically generated as the SSR *entry*
   (deep links, SEO, first paint, PWA). Once hydrated, swipe/next/prev move a **window within a
   persistent pager** — no `router.push`, no remount of the reader shell. The URL is kept in sync
   with `history` so deep-linking and back/forward still work. A programmatic `goToPage(n)` drives
   the pager; both swipe and recitation auto-advance call it instead of `router.push`.

2. **Windowing render model (with a documented escalation).** Only the visible page ±1 is mounted
   (single page on mobile, spread/pair on tablet double-view), reusing the existing
   `QuranWord`/marks/recitation/tajweed components. This cuts the mount from ~1,478 to ~150–300
   words. If a real-device re-profile still misses the target, escalate the text layer to
   **event-delegated static markup** (one delegated tap/long-press handler per page + a separate
   highlight layer, no per-word components) — specified in the plan, not built up front.

3. **Slim static content.** A build step emits one immutable slim JSON per page under `/public`
   (only the fields the page renders: per word `code_v1`/`code_v2`, `location`, `verse_key`,
   `line_number`, `char_type_name`, tajweed `layouts`; per page the metadata + `chapter` info once).
   ~10× smaller than the current payload. The pager fetches neighbors on demand; Serwist caches them
   Cache-First and the PWA precache drops from ~1.5 GB (full HTML ×604) to a few MB.

4. **Marks stay the dynamic overlay.** Content JSON is static and immutable; marks remain fetched
   per page via the existing API and applied as the only dynamic layer. Neighbor marks are
   prefetched ahead of the swipe.

Fonts convert TTF→WOFF2 (~half the bytes) with a rolling preload of the next page's font.

## Consequences

- The "no adjacent fetches on mobile" and single-slot constraints of "Core Gesture Only" no longer
  apply — that decision and ADR 0027's tablet carousel are **superseded** by the unified pager.
- Content is fully decoupled from Prisma at runtime; a new build-time generation step (and its
  fixture/e2e implications) is introduced and must stay in sync with the Quran schema (ADR 0009).
- The reader shell mounts once; recitation auto-advance, tajweed toggle, grants (ADR 0012), and the
  double-page spread (ADR 0013) must all be re-expressed against `goToPage`/the window rather than
  route changes.
- Deep-link entry still pays one SSR render of the landing page; only *subsequent* swipes are
  client-only.

## Alternatives considered

- **Keep routing, just slim the payload + drop 5 panels → 3 + WOFF2.** Lower risk, but the
  remount-on-navigate remains, so the freeze is reduced, not eliminated. Rejected as the primary
  path; its individual wins (slim payload, WOFF2, fewer panels) are folded into this decision.
- **Single-route SPA reader (`/read?page=N`).** Simplest shell but loses per-page SSR/SEO and
  changes deep-link/PWA behavior more than wanted. Rejected in favor of the hybrid entry.
- **Bundle all 604 pages' slim data.** Best offline/instant, but a larger one-time download and
  memory footprint than on-demand per-page JSON. Deferred as a possible future option.
