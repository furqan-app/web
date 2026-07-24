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
   with `history.replaceState` so deep-linking and back/forward still work. As shipped there is no
   separate `goToPage(n)` abstraction: the pager's `commitTo` primitive (a `flushSync` `anchor`-swap +
   re-center) is the single in-reader navigation call, and swipe, the in-spread arrows, and
   recitation-follow all funnel through it instead of `router.push`.

2. **Windowing render model (with a documented escalation).** Only the visible page ±1 is mounted
   (single page on mobile, spread/pair on tablet double-view), reusing the existing
   `QuranWord`/marks/recitation/tajweed components. This cuts the mount from ~1,478 to ~150–300
   words. If a real-device re-profile still misses the target, escalate the text layer to
   **event-delegated static markup** (one delegated tap/long-press handler per page + a separate
   highlight layer, no per-word components) — specified in the plan, not built up front.

3. **Slim static content.** A build step (`scripts/quran-json/generate.js`, run manually) emits one
   immutable slim JSON per page under `public/quran/pages/{n}.json`. As shipped, each word keeps only
   `code_v1`/`code_v2`, `location`, `verse_key`, `line_number`, `char_type_name`, `qpc_uthmani_hafs`
   (mark snippet), `audio_url` (word audio in MarkModal), `page_number`, tajweed `layouts`, and the
   slim nested `verse` (verse_key/page_number/chapter.verses_count); the heavy `text_uthmani`/`text`
   and the query-only `id`/`position`/`verse_id` are dropped. The word query MUST stay in sync
   between `app/hooks/get-page-words.ts` and the generator (~55 KB → ~43 KB/page). The pager fetches
   neighbors on demand; Serwist caches them Cache-First, and the PWA precache drops from ~1.5 GB
   (full HTML ×604) to the slim JSON + base WOFF2 set.

4. **Marks stay the dynamic overlay.** Content JSON is static and immutable; marks remain fetched
   per page via the existing API and applied as the only dynamic layer. Neighbor marks are
   prefetched ahead of the swipe.

Fonts convert TTF→WOFF2 (the old TTFs are removed, −253 MB from the repo). No separate rolling
preload was needed: the mounted 3-panel window already injects `@font-face` for the current page
±1 (`FontFaceInjector`, with an LRU so back-swipes don't re-download), so a neighbor's font is
warming before the swipe. `<link rel="preload">` covers the current page.

## Consequences

- The "no adjacent fetches on mobile" and single-slot constraints of "Core Gesture Only" no longer
  apply — that decision and ADR 0027's tablet carousel are **superseded** by the unified pager.
- Content is fully decoupled from Prisma at runtime; a new build-time generation step (and its
  fixture/e2e implications) is introduced and must stay in sync with the Quran schema (ADR 0009).
- The reader shell mounts once; recitation auto-advance, tajweed toggle, grants (ADR 0012), and the
  double-page spread (ADR 0013) are all re-expressed against `commitTo`/the window rather than route
  changes. Recitation-follow in particular moved out of `RecitationContext` (see Implementation
  notes).
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

## Implementation notes (2026-07-24/25)

**Recitation-follow.** The context no longer navigates. `RecitationContext` exposes `recitedPage`
(the recited verse's page, from its existing `versePagesRef`); a dedicated null-rendering
`RecitationFollow` leaf watches it and, when the recited page leaves the visible window, calls the
pager's `followTo` (→ `commitTo`). Two non-obvious invariants — both were real regressions during
implementation, so do not undo them:

1. **The recitation subscription must live in the `RecitationFollow` leaf, never in `ReaderPager`.**
   The context updates on every recited word (word-highlight state), so subscribing the pager
   directly re-renders the whole reader tree many times per second → visible flicker + the same
   page's font re-downloading repeatedly. The leaf renders `null`, so its per-word re-render is free.
2. **`followTo` must defer its `commitTo` to a microtask.** `commitTo` uses `flushSync`, which
   flushes passive effects synchronously — so the leaf's follow effect can run *inside* a
   swipe/arrow commit's `flushSync` while `isCommitting` is still true. An inline `commitTo` there is
   both guarded-out (and never retries, so it never returns to the recited page) and a nested flush.
   The microtask runs after the outer flush unwinds, so guards read final state and the commit is a
   clean top-level flush. It converges — once the recited page is visible the leaf stops calling it.

Known trade-off: follow triggers on every anchor change while `status === "playing"`, so swiping
away snaps back immediately (you cannot browse mid-playback). To allow free browsing, gate follow on
`recitedPage` *advancing* rather than on anchor changes — deliberately deferred.

**Removed code.** `app/components/QuranSwipeNav.tsx` (superseded by `ReaderPager`) was deleted in
this branch, and its stale comment references in `QuranSafha.tsx`/`QuranWord.tsx` updated. Its dead
`.fq-carousel-*` CSS in `globals.css` is left in place (marked dead) for a later CSS-only cleanup.
