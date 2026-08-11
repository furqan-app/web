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

## Addendum (2026-08-11): input arriving during a commit is queued, not dropped

**Incident (Trello #153).** On tablet, roughly every other swipe in a rapid sequence did nothing.
Reported as lag; it was not a frame-rate problem. `animateCommit` sets `isCommitting` and completes
the swap on a 300 ms wall-clock timer, and `onTouchStart` returned on that flag *before recording
`touchStartX`* — so `onTouchMove`/`onTouchEnd` bailed on their own null checks and the whole gesture
was discarded. Reported measurements were 10/10 commits at 500 ms gaps and 5/10 at both 250 ms and
120 ms. **Treat those gap-based figures as indicative only** — a background browser tab clamps
`setTimeout` (a requested 120 ms measured 494–1000 ms) and stretches the pager's own `EXIT_MS` timer
with it, so nominal gap numbers are not reproducible without a foreground browser. The fix was
verified instead with swipes fired in a single task, which lands them inside the window by
construction; see the plan's Verified Test Cases.

> **Superseded 2026-08-11 (same day, user decision) by "Addendum 2: takeover, not a queue" at the end
> of this file.** The queue described below shipped and worked, but coalesced rapid input so swipe count
> did not equal page count. It was replaced by settling the in-flight turn and handling the new input
> immediately. Everything from here to the end of this addendum — the one-deep queue, the
> direction-not-page rule, the microtask drain, the transform-free latch — is **dead**; do not
> reimplement it. The problem statement and measurements above remain accurate.

**Decision.** Input arriving while a commit is in flight is **captured as intent**, never dropped.
The pager holds a **one-deep** pending step that is applied the moment the commit lands. Four rules
make this work, and each exists for a reason that is not obvious from the code:

1. **The pending step stores a direction, not a resolved page.** The in-flight commit moves the
   anchor, so a `nextAnchor` read at queue time names the wrong page by the time the queue drains.
   The target is resolved after the anchor settles, through the reassigned-each-render ref that
   already exists for the arrows.
2. **It is applied via `queueMicrotask`, never inline.** `commitTo` uses `flushSync`, which flushes
   passive effects synchronously, so an inline follow-up runs while `isCommitting` is still true, is
   guarded out, and never retries — the same trap `RecitationFollow` hit, documented above.
3. **The queue is exactly one deep and latest-intent-wins.** A counter or array would convert rapid
   swiping into page overshoot, which is harder to recover from than coalescing. The accepted
   consequence is that swipe count ≠ page count above roughly 3 swipes/sec.
4. **Queued turns commit instantly (`animate=false`).** An animated catch-up turn would reopen a
   fresh 300 ms window and cap throughput at ~3 pages/sec. Only the first swipe of a burst gets the
   book-like reveal.

Three further rules came out of review, each fixing a way the queue could still lose or corrupt a
gesture:

5. **A gesture that began mid-commit stays transform-free for its whole life.** The commit can land
   while the finger is still down; without a latch, the next move event writes the finger's full
   accumulated travel as a transform in one jump — a visible teleport of at least the commit
   threshold.
6. **The drain leaves a step queued when it declines it.** If a newer drag is in flight the drain must
   not clear first: a sub-threshold release by that newer drag is not a supersede, so clearing
   destroyed the earlier gesture and yielded zero turns — the exact bug class this addendum exists to
   fix. `onTouchEnd`/`onTouchCancel` re-schedule the drain instead.
7. **`touchcancel` must reset the drag state.** A browser-cancelled touch (system back-gesture,
   scroll takeover, multi-touch) never reaches `onTouchEnd`, and a stuck `isDragging` wedges three
   separate guards — the drain, `followTo`, and the Stage B lookahead. Pre-existing, but letting a
   drag begin mid-commit widens the window in which it can be entered.

`drainRef` is assigned in the render body, the same ref-mutation-during-render shape the sixth-session
`FontFaceInjector` follow-up removed. It follows the pre-existing `navRef` precedent and the value
never feeds JSX, so an abandoned render cannot leave stale output on screen — only a drain closing over
anchors that were never committed. Accepted as consistent with the file, but worth knowing the tension
exists.

All three input paths — swipe, physical arrow keys, and in-spread arrow clicks — share the one queue,
so behaviour does not depend on which source happened to arrive during the window. The keyboard's
`e.repeat` guard must stay **ahead** of the queue: otherwise a held key enqueues at the OS repeat
rate, the exact runaway that guard was added to prevent.

**This does not reopen the commit-timing question.** The `transitionend`-based completion in the
plan's superseded root-cause hypothesis stays unimplemented and out of scope; that section's own
supersede note records commit timing as "secondary at best", and ADR 0029 (immutable font
registration) is what actually fixed the flicker it targeted. Its absence from git history is a
deliberate drop, not an oversight — do not revive it as part of a latency fix.

**Consequences**

- **+** No gesture is silently ignored; a swipe either turns a page or is explicitly superseded by a
  later one.
- **+** The stabilised commit/recenter sequence is untouched, so no flicker-regression risk.
- **−** Above ~3 swipes/sec gestures coalesce, so a spam burst turns fewer pages than it has swipes.
- **−** There is no drag feedback during the 300 ms window: the gesture is recorded but the strip does
  not follow the finger, because the in-flight transition owns the transform.

See `docs/plans/reader-persistent-pager.md`, final addendum.

## Addendum 2 (2026-08-11): takeover, not a queue

**Supersedes the queue in the addendum above**, on the same day and after it had shipped in PR #201.
The queue honoured every gesture but **coalesced** them: three rapid swipes produced two turns, because
only one step could be held. Swipe count not equalling page count was the one thing the original report
actually asked for.

**Decision.** Input arriving during a commit **takes over**: the in-flight turn is *settled* — landed
immediately, never aborted, because the user already carried it past the commit threshold — and the new
input is then handled as if nothing were in flight. Measured 1:1 afterwards: 1/2/3/5 swipes produce
1/2/3/5 page turns.

What makes it work, and what is easy to get wrong:

1. **`animateCommit` must store its `EXIT_MS` timer id.** The unstored `setTimeout` was the actual
   reason input had to be discarded — nothing could cancel the pending turn. Storing `{ timer, target }`
   makes it settleable, and incidentally fixes two pre-existing bugs: an edition switch landing
   mid-commit no longer gets overwritten 300 ms later, and the timer no longer fires post-unmount to
   rewrite the URL of whatever route the user moved to.
2. **Settle, then RE-ENTER through the ref — do not fall through.** `commitTo` uses `flushSync`, so the
   re-render and every ref reassignment complete synchronously before `settleInFlight` returns. The
   calling closure still holds **pre-settle** `nextAnchor`/`prevAnchor` and a stale `animateCommit`, so
   falling through resolves the page just landed on (a silent no-op turn). `navRef`/`stepRef` re-enter
   themselves; the fresh closure sees `inFlight` cleared, so it cannot recurse.
3. **Touch needs no commit-awareness at all.** Settling at `touchstart` leaves the strip at
   `translateX(-100%)` with `isCommitting` false, so `onTouchMove`/`onTouchEnd` are back to their
   original pre-#153 shape. This is what removed the queue's transform-free latch: the drag now starts
   from a settled page and tracks the finger truthfully, instead of having to be suppressed to avoid
   teleporting by the finger's accumulated travel.
4. **Recitation follow deliberately does NOT take over.** It is automatic, not user input; truncating a
   turn the reader started would have playback fighting the finger. It keeps its guard and converges.
5. **`e.repeat` stays ahead of the takeover.** Otherwise a held arrow key turns a page per OS repeat
   (~30/s), the runaway that guard exists for.

**Consequences**

- **+** Swipe count equals page count on every input path; no coalescing, no accepted throughput limit.
- **+** Net 38 lines smaller than the queue, and the touch handlers return to their original shape —
  no queue object, no microtask drain, no latch.
- **+** Two pre-existing timer bugs fixed as a by-product (see 1).
- **−** Rapid input truncates each reveal mid-flight, so fast swiping reads as a series of snaps rather
  than smooth page turns. This is the trade the queue avoided, and the thing to judge on a device.
- **−** The settle runs `commitTo` from an arbitrary mid-transition transform rather than from the
  animation's end state. ADR 0029's flicker cause (font-face resets) is untouched, and the
  `flushSync`-then-recenter swap is unchanged, but this is the path that took 24 attempts to stabilise —
  a returning flash under fast swiping is the specific regression to watch for.
