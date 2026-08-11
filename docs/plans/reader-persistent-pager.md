# Reader Swipe Performance: Persistent Client Pager

**Type:** feature (performance re-architecture)
**Date:** 2026-07-23
**Status:** implemented (rapid-swipe drop, Trello #153, 2026-08-11 — see the final addendum for what is and is not verified; earlier scopes implemented, and the sixth session's live browser check is still recorded as pending below)
**Trello:** #137 https://trello.com/c/sEA3hgtz
**ADR:** [0028](../architecture/adr/0028-reader-persistent-pager.md)

## Summary

Swiping between Quran pages freezes (input blocked, then frees after a delay). Root cause: each
swipe ends in `router.push`, a full route navigation that remounts the whole reader and mounts
~1,478 word components across 10 pages while deserializing a 2.27 MB RSC payload that is mostly
data the page never renders. This plan re-architects the reader into a **persistent client pager
over slim static content** so a swipe moves a small mounted window instead of navigating — turning
the swipe into a native, ebook-like page turn. The Quran text stays static; marks stay the only
dynamic layer.

## Root Cause (measured, production build, localhost, warm cache, fast desktop)

| Metric | Measured | Note |
|---|---|---|
| RSC payload / client navigation | **2.27 MB** | downloaded + deserialized every swipe |
| Prerendered HTML / page | 2.59 MB | |
| Main-thread block / navigation | **183 ms** (117 + 66) | the freeze — on a *fast desktop*; ~0.6–1.1 s on mobile |
| Word components / view | **1,478** | across 10 pages; 1–2 visible |
| Pages mounted / view | 10 (5 panels × 2) | |
| Fonts / view | 6 × ~90 KB gzip TTF | secondary; parallel + cached |
| Marks fetches / navigation | 2+ | one per neighbor |

Payload autopsy: `text_imlaei_simple` (unused full verse text) serialized 1,478×; chapter fields
~1,500×; five text encodings per word when only `code_v1`/`code_v2` render. Hypothesis "fonts" is
real but secondary (blank text on cold pages, not the input freeze); hypothesis "hydration/render"
is the primary cause, specifically the route-remount + mass mount.

## Approach — four pillars (see ADR 0028)

1. **Hybrid navigation.** Keep `/[locale]/pages/[id]` as the static SSR entry. After hydration, a
   persistent pager owns navigation: `goToPage(n)` moves the window, updates the URL via `history`,
   and never calls `router.push`. Both swipe and recitation auto-advance call `goToPage`.
2. **Windowing render model.** Mount only the visible page ±1 (mobile) / spread ±1 (tablet double
   view), reusing existing `QuranWord`/marks/recitation/tajweed components. Event-delegated static
   markup is the documented escalation if windowing under-performs on device (see below).
3. **Slim static content.** Build emits `public/quran/pages/{n}.json` (immutable, ~10× smaller);
   pager fetches neighbors on demand; SW caches Cache-First; PWA precache shrinks from ~1.5 GB to
   a few MB.
4. **Marks overlay.** Content JSON is static; marks stay fetched per page and applied as the only
   dynamic layer, with neighbor marks prefetched.

Plus: fonts TTF→WOFF2 + rolling preload of the next page's font.

## Windowing unit — decision table

| Breakpoint / view | Visible unit | Window mounted | goToPage step |
|---|---|---|---|
| Mobile (single page) | 1 page | current ±1 page | ±1 page |
| Tablet double-view (`data-safha-view="double"`, lg-range) | spread (odd/even pair) | current spread ±1 spread | ±1 pair |
| Desktop single-view | 1 page | current ±1 page | ±1 page |

The window unit is breakpoint-dependent; the pager reads the same `safhaView` + breakpoint signals
that `QuranSwipeNav`/`QuranSpread` already use. Wrap at ends (page 1 ↔ 604) exactly as today.

## Staged implementation (each stage ships value and is independently verifiable)

**Stage 1 — Slim content pipeline.**
- Add a slim projection of `getPageWords` (drop nested `verse.text_uthmani`/`text_imlaei_simple`
  and unused `chapter` fields; drop word `text`, `text_uthmani`, `audio_url`; keep `code_v1`,
  `code_v2`, `location`, `verse_key`, `line_number`, `char_type_name`, `layouts`, and the per-verse
  `verse_key`/`chapter_number`/`verses_count` needed for mark snippets + banners). Keep per-page
  metadata (juz/hizb/chapter glyph) once.
- Build step emits `public/quran/pages/{n}.json` for all 604 pages (reuse the seeder/e2e fixture
  pattern; runs in the build, not per request).
- Point the SSR entry render at the slim shape too, so server and client render identical markup.
- **Verify:** the prerendered `/pages/300.rsc` drops from ~2.27 MB toward ~200–350 KB.

**Stage 2 — Persistent pager + windowing.**
- Introduce a client `ReaderPager` that mounts once, holds `currentPage` state, renders the
  windowed set (current ±1 unit per the table), and animates transitions using the existing strip
  geometry from `QuranSwipeNav` (reuse `EASE_OUT`, thresholds, drag-gain; keep the tablet 380 ms /
  mobile 220 ms feel). On commit it **shifts the window and fetches the newly-needed neighbor's
  JSON** instead of `router.push`.
- URL sync via `history.replaceState`/`pushState` (see "Decisions"). Deep-link entry hydrates with
  `currentPage = [id]`.
- Recitation "follow the recited page" moves into the pager, which now owns navigation:
  `RecitationContext` exposes `recitedPage` (derived from `currentVerseKey` via its
  `versePagesRef`); the pager watches it and calls its own `commitTo(target)` when the recited
  page leaves the visible window. The old `followPage` `router.push` + `usePathname()` path is
  removed — `replaceState` navigation never updated `usePathname()`, so that path was dead under
  the pager (see "Recitation follow" under Decisions Made). The `pageFirstVerseKey` /
  `RecitationPageSync` bridge is unrelated and stays (mobile play-button start point).
- **Verify (on a real device):** re-profile a swipe. Longest main-thread task and total blocking
  should collapse (target: no perceptible freeze, <~50 ms blocking on mid-range mobile). If it
  does **not** hit target, proceed to Stage 2b.

**Stage 2b — Escalation (only if Stage 2 misses target): event-delegated text.**
- Replace per-word `QuranWord` components in the reader with static glyph line markup carrying
  `data-location`/`data-verse-key` attributes.
- One delegated `click`/`touch` handler per page resolves the target word by hit-testing
  `data-location`; long-press logic moves to the delegated handler.
- Recitation highlighting switches from `registerWordRef` (per-word ref registry) to
  `querySelector([data-location=...])` / a class-toggle on the delegated container.
- Marks render as a separate highlight layer keyed by location, decoupled from the text nodes.
- Keep this behind the same `ReaderPager` so mobile/tablet/desktop paths are shared.

**Stage 3 — Fonts + caching polish.**
- Convert `public/fonts/v1/ttf/*.ttf` → WOFF2 (add a generation step; keep TTF fallback if needed);
  update `@font-face`/preload/SW regex accordingly.
- Rolling preload: when settling on page N, preload N+1 (and N−1) fonts.
- Update `sw.ts` runtime caching + precache to target slim JSON + WOFF2 instead of full HTML.

## Files to change (indicative)

- `app/hooks/get-page-words.ts` — add slim projection; stop including full-text verse fields.
- New build script (e.g. `scripts/quran-json/generate.js`) — emit `public/quran/pages/{n}.json`;
  wire into `package.json` build.
- `app/components/reader/ReaderPage.tsx` — SSR entry renders only the landing page (+ hand-off to
  pager), not five panels.
- New `app/components/reader/ReaderPager.tsx` (client) — persistent pager, windowing, `goToPage`,
  URL sync; absorbs `QuranSwipeNav` gesture logic.
- `app/components/QuranSwipeNav.tsx` — folded into / driven by `ReaderPager` (no more `router.push`).
- `app/contexts/RecitationContext.tsx` — auto-advance calls `goToPage` instead of `router.push`.
- `app/components/reader/FontFaceInjector.tsx` — window-scoped font-face + rolling preload; WOFF2.
- `app/sw.ts` — cache slim JSON + WOFF2; shrink precache.
- Stage 2b (if triggered): `QuranSafha.tsx`, `QuranLine.tsx`, `QuranWord.tsx` — delegated markup.

## Constraints

- Deep links, SEO, and first paint must be preserved — `/pages/[id]` stays statically generated as
  the entry; only subsequent swipes are client-only.
- The window unit is breakpoint-dependent (single page vs spread) — do not hardcode single-page.
- Content JSON is immutable and static (Static Generation Strategy) — never fetch it through a
  Prisma-backed request at runtime; it is a build artifact under `/public`.
- Marks stay dynamic and separate — never bake marks into the static content JSON.
- Do not regress the recitation auto-advance, tajweed re-grouping (mushaf 19 / `code_v2`), grant
  reader (ADR 0012), or double-page spread (ADR 0013) — all must be driven by `goToPage`/the window.
- Keep `font-display: block` + skeleton (per fix-quran-page-font-loading) — do not switch to `swap`.
- The slim JSON generator must stay in sync with the Quran schema (ADR 0009), like the e2e fixture.

## What NOT to Do

- Do not keep `router.push` for swipe as the primary path — it is the root cause; the "keep routing,
  just slim" variant was considered and rejected as primary (folded in as sub-wins only).
- Do not build event-delegated markup (Stage 2b) up front — windowing (Stage 2) is the first move;
  delegation is a measured escalation, not a default.
- Do not adopt the single-route SPA (`/read?page=N`) model — rejected; it loses per-page SSR/SEO.
- Do not bundle all 604 pages' data as the initial approach — on-demand per-page JSON is the choice.
- Do not treat this as an addendum to `fix-safha-swipe-flicker` / `mobile-swipe-animation` — those
  targeted the animation flicker; this supersedes their navigation model (see ADR 0028).

## Decisions Made

- **Nav model:** hybrid — static SSR entry + persistent client pager (user-confirmed).
- **Render model:** windowing first; event delegation documented as an escalation to switch to if
  windowing doesn't hit the performance target (user-confirmed).
- **Content source:** build-time slim static JSON per page in `/public` (user-confirmed).
- **URL sync (proposed, confirm at implementation):** `pushState` per page so browser Back returns
  to the previous page (native feel), collapsing to a single history entry on reader exit. Revisit
  if it makes Back feel heavy.
- **Marks:** remain the dynamic overlay; neighbor marks prefetched.
- **Fonts:** TTF→WOFF2 + rolling preload (Stage 3).
- **Recitation follow (pager-owns-follow):** Because the pager navigates via `history.replaceState`,
  Next's `usePathname()` never updates, so `RecitationContext.followPage` (which read `pathname`
  and called `router.push`) silently stopped following once the pager landed — the recited page no
  longer snapped back when the user swiped away. Fix: the context exposes `recitedPage` (the Mushaf
  page of the recited verse, from its existing `versePagesRef`), and a dedicated `RecitationFollow`
  leaf watches it and calls the pager's guarded `commitTo` to keep that page in the visible window
  (single page or double-view pair). The subscription MUST live in that null-rendering leaf, not in
  `ReaderPager` — the context updates on every recited word (word highlight), so subscribing the
  pager directly re-renders the whole reader tree per word (flicker + repeated font fetch).
  The follow navigation MUST be deferred to a microtask, not called inline from the leaf effect:
  `commitTo` uses `flushSync`, which flushes passive effects synchronously, so the leaf's effect can
  run *inside* a swipe/arrow commit's `flushSync` while `isCommitting` is still true — an inline
  `commitTo` there is both guarded-out (so it never retries and never returns) and a nested flush.
  Follow is gated on `status === "playing"` and skipped mid-drag/commit so it never fights the
  finger; `commitTo` converges (no-ops once the page is visible). Only the dead `followPage`
  navigation is removed — the separate `pageFirstVerseKey` / `RecitationPageSync` bridge stays, as
  the mobile `RecitationPlayButton` reads it for its "listen from here" start point. Navigation
  ownership stays in one place (the pager).

## Open verification

- **Stage 2b decision — not formally re-profiled.** Stage 2b (event-delegated markup) was
  never triggered or built. No reports of the original `router.push` mass-remount freeze
  (the ~183ms main-thread block this plan set out to fix) have recurred since Stage 2
  shipped; the several follow-on sessions since have all been about a separate,
  later-introduced flicker (a font-stylesheet mutation bug, ADR 0029), not the original
  freeze. No formal real-device profiling session was separately recorded confirming the
  freeze is gone, so this is an inferred-resolved, not a verified-resolved, status. Revisit
  Stage 2b only if the original freeze symptom specifically (input lag on swipe commit, not
  a visual flash) resurfaces.
- **Resolved:** the slim JSON field set covers surah-banner gap detection and mark
  snippets — `qpc_uthmani_hafs`, `verse.chapter.verses_count`, and `location` are all present
  in the current `select` (`app/hooks/get-page-words.ts`, `scripts/quran-json/generate.js`).

## Residual Bug Scope (2026-07-25) — Swipe-Commit Flicker

After the persistent pager shipped, a residual one-frame flicker still appears on some committed
swipes (tablet/double-view path). The bug is not the old route-remount freeze; it happens inside
the pager commit path itself.

### Root Cause Hypothesis — SUPERSEDED

> **Superseded 2026-07-25 (second session)** by "Confirmed Root Cause & Fix — Font-Face
> Stylesheet Mutation" below. Commit timing and font warm-up were secondary at best; the
> "Files to Change (this residual bug)" list under this hypothesis is dead — do not
> implement it.

- `ReaderPager` completes commit on a fixed timer (`setTimeout(EXIT_MS)`) rather than the actual
  transition completion event, so content swap + recenter can drift by a frame under real paint
  timing.
- On slow networks, destination spread fonts are not guaranteed to be paint-ready by commit time;
  `QuranSafha` keeps Quran text hidden (`font-display:block` + `fontReady=false`) until readiness,
  producing a visible blank/flash state right after swipe commit.
- Existing `@font-face` injection alone does not reliably warm neighbor fonts early enough under
  throttled conditions.

### Decision Tree / Algorithm (verified)

| Condition | Action |
|---|---|
| Swipe distance < threshold | Snap back only; never enter commit path |
| Swipe distance >= threshold | Start exit slide toward revealed neighbor |
| Exit slide active | Wait for strip `transitionend` on `transform` (not wall-clock timeout) |
| Transition completes | In one atomic step: swap `anchor`, recenter strip to `translateX(-100%)`, clear commit guard |
| Transition event missing/cancelled | Fallback timer commits once (guarded id/token), never double-commits |
| Neighbor/current spread font not ready | Start explicit `document.fonts.load` warm-up for window pages and preload their WOFF2 assets ahead of commit |
| `fontReady=false` on visible page | Show a clearly visible loading skeleton (not near-invisible bars on dark backgrounds) until glyphs are paint-ready |

### Verified Test Cases

1. Tablet double-view at `localhost:7002`, repeated right-swipe commits:
   - Center panel remained the previously revealed neighbor after commit.
   - Far-neighbor could enter `visibility:hidden` after commit in some frames.
2. Rapid chained commits:
   - Panel DOM move semantics are correct (`left -> center`, `center -> right`) but completion is
     still time-coupled to `EXIT_MS`, not the transition completion event.
3. Overlay/nav toggle confounder check:
   - No overlay visibility flip observed during synthetic swipe commits; flicker is not explained by
     overlay toggling.
4. Slow-network reproduction (font requests artificially delayed):
  - Center panel stayed in `visibility:hidden` during and after commit for ~1.5s+.
  - This reproduces the user-reported "one swipe clear flash/blank" symptom.

### Files to Change (this residual bug)

- `app/components/reader/ReaderPager.tsx`
  - Replace timer-driven commit completion with `transitionend`-driven completion on strip
    `transform`, with a guarded fallback timer.
  - Ensure commit path is single-fire per swipe (token/id guard), preventing double commit.
  - Proactively warm font readiness for current/neighbor window pages via `document.fonts.load`.
  - Add preload hints for window page fonts, not only the current page font.
- `app/components/QuranSafha.tsx`
  - Keep current font-loading behavior (`font-display:block` + skeleton), but ensure commit-critical
    center paint does not regress due to transient readiness flips.
  - Increase loading-skeleton contrast so slow-network loading reads as intentional loading state,
    not a blank page.

### Constraints (residual bug)

- Keep ADR 0028 pager invariants: persistent client pager, no `router.push` for swipe.
- Do not regress recitation follow microtask/flushSync safety.
- Keep `font-display:block` + skeleton contract from prior font-loading decisions.
- Preserve current panel move/recenter invariant (revealed neighbor becomes resting center panel).

### What NOT to Do (residual bug)

- Do not revert to route navigation (`router.push`) for swipe.
- Do not mask the bug with longer fixed timeouts.
- Do not remove font guards/skeleton globally to hide flicker.
- Do not introduce broader architectural changes (event-delegated text, new route model) for this
  residual fix.

## Session Log (2026-07-25) — Attempts Rolled Back

User-reported status after each attempt: residual flash still reproducible (including prod-like
testing under slow-network conditions). Because the issue remained unresolved, all code changes
from this session were rolled back.

### Attempts made in this session

1. Commit finalization timing hardening in `ReaderPager`
  - Switched to `transitionend`-driven finalize with guarded fallback timer.
  - Added token-based single-fire protection against stale/missed events.
  - Outcome: did not eliminate visible flash for the user.

2. Font warm-up and preload expansion
  - Warmed window page fonts via `document.fonts.load` and widened font preloads.
  - Outcome: reduced some cold-path blanking risk but did not remove flash in user repro.

3. `QuranSafha` readiness/skeleton tuning
  - Tried monotonic/session-cached `fontReady` behavior and stronger skeleton visibility.
  - Outcome: flash still reproduced; this did not fully address commit-time visual artifact.

4. Breakpoint/render stability adjustments
  - Removed tablet render-branch dependencies and moved some layout stability logic to CSS/hook
    timing.
  - Outcome: no decisive fix for the reported swipe flash.

5. Highlight-path rerender reduction
  - Removed per-word URL search-param subscription path by lifting highlight parsing and passing
    plain props.
  - Outcome: user still reproduced flash.

6. Local suspense fallback removal in Quran text subtree
  - Removed local `Suspense fallback={null}` around line rendering in `QuranSafha`.
  - Outcome: did not resolve user-visible flash.

7. Deferred URL `replaceState` after commit recenter
  - Moved history update after content swap/recenter paint.
  - Outcome: no confirmed resolution; rolled back with the rest.

8. QuranSafha diagnostic state strip (current branch test)
  - Temporarily disabled non-essential QuranSafha paths to isolate render churn:
    marks fetching/modal interaction, tajweed regrouping/font mode, tablet-only
    card branch, and nav-overlay mode wiring.
  - Kept baseline mushaf text/header/footer rendering only.
  - Outcome: pending user verification (this attempt is intentionally not rolled
    back yet so reproduction can be retested).

9. ReaderPager diagnostic: no commit animation (current branch test)
  - Disabled commit-slide animation path in `animateCommit`; committed directly
    to the target anchor to isolate transition/recenter timing from content swap.
  - Outcome: pending user verification.

10. QuranSafha diagnostic: remove fontReady visibility/skeleton gating (current branch test)
  - Forced always-visible Quran text rendering in `QuranSafha` by removing the
    `fontReady` state/effect, `visibility:hidden` gate, and skeleton overlay.
  - Outcome: pending user verification.

11. ReaderPager diagnostic: remove FontFaceInjector (current branch test)
  - Removed `FontFaceInjector` import/usage from `ReaderPager` and stopped
    computing window `allPageIds` for dynamic `@font-face` injection.
  - Outcome: pending user verification.

12. ReaderPager diagnostic: mobile-only FontFaceInjector disablement (current branch test)
  - Re-enabled `FontFaceInjector` generally, but gated it off on mobile
    (`isLgUp ? <FontFaceInjector .../> : null`) to isolate mobile rerender churn
    caused by dynamic font-face injection.
  - Outcome: pending user verification.

13. ReaderPager diagnostic: mobile incremental font-face injection + swipe-start transform stabilization (current branch test)
  - Added a mobile-only incremental font loader in `ReaderPager` that appends
    `@font-face` rules once per page id into a singleton `<style>` and warms each
    face via `document.fonts.load`, avoiding React-driven style text rewrites.
  - Stabilized strip transforms to `translate3d(calc(-100% + roundedPx), 0, 0)`
    for drag/start/snap/recenter and enabled `will-change: transform`.
  - Outcome: pending user verification.

14. ReaderPager diagnostic: mobile single-page warm set (current branch test)
  - Changed mobile incremental font warm-up from pair-expanded ids to single-page
    ids only: current + immediate next + immediate previous (`pageNumber`,
    `nextAnchor`, `prevAnchor`).
  - Goal: keep neighbor preview visible during swipe while reducing first-swipe
    multi-font bursts and blank-frame risk.
  - Outcome: pending user verification.

15. ReaderPager/QuranSpread diagnostic: keep current page visible when hidden partner is late (current branch test)
  - Updated `Panel` readiness gating in `ReaderPager`: in single-view, render as
    soon as current-page data exists (no longer waits for both pair pages).
  - Updated `QuranSpread` to accept missing `rightPage`/`leftPage` payloads and
    render whichever side exists, so a slow hidden-partner fetch cannot blank the
    visible page after commit on slow networks.
  - Outcome: pending user verification.

16. ReaderPager diagnostic: no-blank commit gate on slow networks (current branch test)
  - In `animateCommit`, keep the revealed neighbor panel fully visible after
    release and delay final `anchor` commit until target readiness converges
    (target data in cache + target page font loaded), with a timeout fallback.
  - Added target-readiness helpers and a commit token guard to avoid stale
    async commits.
  - Goal: eliminate post-swipe blank frames on slow 4G by never swapping to an
    unready center panel.
  - Outcome: pending user verification.

17. QuranSafha diagnostic: fallback-visible text while page font is loading (current branch test)
  - Added page-font readiness tracking in `QuranSafha` via `document.fonts`.
  - While page font is not ready, render with `var(--uthmanic)` and show
    `word.qpc_uthmani_hafs` text (wired through `QuranLine` -> `QuranWord`).
  - Once ready, swap back to page-glyph rendering (`code_v1`/`code_v2`).
  - Goal: avoid blank text on slow-network commits by preferring visible fallback
    text over hidden block-display glyphs.
  - Outcome: pending user verification.

18. QuranSafha diagnostic: calibrate Uthmanic fallback size + line centering (current branch test)
  - Measured V1 vs Uthmanic glyph-height ratio on live page data and set
    `UTHMANIC_FALLBACK_FONT_SCALE = 1.09` in `app/constants/font.ts`.
  - Applied fallback-only font-size lift in `QuranSafha` via
    `fontSize: calc(1em * UTHMANIC_FALLBACK_FONT_SCALE)` while fallback is active.
  - Applied fallback-only line centering in `QuranLine` (`justify-center`) so
    Uthmanic lines stay visually centered like V1 during font-loading windows.
  - Outcome: pending user verification.

19. QuranSafha diagnostic: fallback `space-between` + size parity retune (current branch test)
  - Updated fallback row layout in `QuranLine` to `w-full justify-between`
    (instead of center), per mobile mushaf line distribution requirement.
  - Forced-fallback A/B measurements on mobile (same page before and after delayed
    V1 load) showed fallback text was too large (`~30px` vs V1 `~27px`).
  - Retuned `UTHMANIC_FALLBACK_FONT_SCALE` from `1.09` to `0.98`.
  - Verification on page 300 (mobile, delayed font): fallback median glyph
    height `27px`, V1 median glyph height `27px`, ratio `1.00`.
  - Outcome: pending user visual verification.

20. ReaderPager diagnostic: no timeout-forced commit to unready target (current branch test)
  - Removed the `Promise.race(..., 1200ms timeout)` path in swipe commit.
  - Commit now waits for `ensureTargetReady(target)` (data + target page font).
  - If readiness fails, swipe snaps back to current instead of committing to a
    potentially blank center panel.
  - Goal: avoid post-release blank screens caused by committing before resources
    are ready.
  - Outcome: pending user verification.

21. QuranSafha diagnostic: active fallback-to-V1 swap retries (current branch test)
  - Kept fallback text visible while loading, but changed readiness polling from
    passive `check` only to active `check + load` retries (`document.fonts.load`).
  - Added a module-level loaded-font cache so remounts can start as V1-ready once
    a page font has resolved in-session.
  - Goal: prevent cases where fallback remains visible and never switches to V1.
  - Outcome: local delayed-font repro now shows fallback first, then V1 swap.

22. QuranSafha/ReaderPager diagnostic: no early V1 glyphs + no unready reveal (current branch test)
  - `QuranSafha` readiness now requires the specific page `FontFace` status to be
    `loaded` (not just a generic `document.fonts.check` signal), preventing
    premature switches that can expose V1 private glyph codes as garbled text.
  - `ReaderPager` commit no longer reveals the neighbor panel before target
    readiness; it waits for `ensureTargetReady(target)` first and only then swaps,
    keeping the current page visible instead of showing a blank target.
  - Reduced-motion path now also waits for readiness before `commitTo`.
  - Outcome: pending user verification on real slow-network swipe flow.

23. ReaderPager diagnostic (video-backed): wait for real page-font loaded status before commit (current branch test)
  - User recording shows blank state can occur *after* commit while target
    page font request is still pending in Network panel.
  - Strengthened `ensureTargetReady` font gate from a single `document.fonts.load`
    await to a bounded retry loop that requires the specific `FontFace` status
    for `quran-p{target}` to be `loaded` before commit proceeds.
  - On timeout/failure, commit aborts and existing snap-back path remains.
  - Goal: prevent post-swipe blank/garbled frames caused by committing on weak
    font-readiness signals.
  - Outcome: pending user verification.

24. Shared page-font readiness registry (current branch test)
  - Added `app/utils/page-font-ready.ts` as a shared in-memory source of truth
    for resolved page fonts.
  - `QuranSafha` now stays on Uthmanic fallback until that registry marks the
    page ready (set only after successful `document.fonts.load(..., "ا")`).
  - `ReaderPager` now marks warmed/committed page fonts into that registry and
    short-circuits redundant waits for already-ready pages.
  - Goal: eliminate premature fallback->V1 switches that can produce blank or
    garbled text during slow-network swipe commits.
  - Outcome: pending user verification.

### Rollback performed

- Reverted session code changes in:
  - `app/components/reader/ReaderPager.tsx`
  - `app/components/QuranSafha.tsx`
  - `app/components/QuranLine.tsx`
  - `app/components/QuranWord.tsx`
  - `app/globals.css`
  - `app/hooks/use-is-lg-up.ts`
- Preserved this documentation update in the plan for traceability.

### Current state after rollback

- Code is back to pre-session behavior for the above files.
- Residual flash remains an open issue.

### Decisions Made (residual bug)

- ~~Fix ordering: first make commit completion event-driven; then re-check whether any font/style
  churn still leaks into commit frames.~~ Superseded — see the confirmed root cause below.
- Scope is surgical to pager commit continuity; this is not a redesign phase.

## Confirmed Root Cause & Fix (2026-07-25, second session) — Font-Face Stylesheet Mutation

**This section is the current source of truth for the residual flicker.** User-confirmed
diagnosis and approach; see [ADR 0029](../architecture/adr/0029-immutable-page-font-registration.md).

### Root Cause (confirmed by code reading; instrumentation step below re-verifies live)

Mutating the text of a live `<style>` element makes the browser discard and re-parse its
entire stylesheet. Every `@font-face` in the re-parsed sheet becomes a **new `FontFace`
object starting `unloaded`** — including the font of the page currently on screen. With
`font-display: block`, text in an unloaded face paints invisible. Both injection paths
mutate on every commit:

- **Desktop/tablet:** `FontFaceInjector` regenerates its single `<style>`'s full text
  whenever the LRU window changes — i.e. on every commit.
- **Mobile:** `ReaderPager`'s incremental injector `appendChild`s a text node into the same
  shared `<style>` when a new page enters the window — appending mutates the sheet, which
  re-parses it wholesale, resetting the already-loaded faces too.

Symptom mapping:

- *Fine during drag* — dragging only changes `transform`; no re-render, no sheet touch.
- *Blank exactly at commit* — the anchor change triggers the injector, which resets the
  visible page's face.
- *One-frame flicker unthrottled* — the recreated face re-resolves from cache immediately.
- *Seconds-long blank on slow 4G* — Next serves `public/` with `max-age=0, must-revalidate`;
  a recreated face triggers a network revalidation round-trip before reusing cached bytes.
- *No skeleton during the blank* — `QuranSafha`'s `fontReady` is stale-true (its effect deps
  didn't change), so raw invisible text shows instead of the skeleton.

**Why attempts 1–24 all failed:** they treated font readiness as monotonic (warm early,
verify loaded before commit, cache readiness). It isn't — the commit itself re-runs the
injector and resets the faces *after* every pre-commit check passes. The blank always lands
after the commit regardless of what is gated before it.

### Fix — immutable font registration

New client-only module `app/utils/page-font-registry.ts`:

- `ensurePageFonts(ids: number[])` — for each id without a registered face:
  `new FontFace('quran-p{id}', "url(/fonts/v1/woff2/p{id}.woff2)", { display: "block" })`,
  `document.fonts.add(face)`, `face.load()` (fire-and-forget, errors swallowed).
- Maintains one LRU (cap 24, matching today's `MAX_KEPT`): each `ensurePageFonts` call
  moves its ids to the front; eviction calls `document.fonts.delete(face)` on the evicted
  face **only**. The current window is always freshest, so it can never be evicted.
- A face, once created, is never modified. Registration adds units; eviction removes units.

Consumers:

- `ReaderPager` (mobile path): the `MOBILE_FONT_STYLE_ID` effect body is replaced by
  `ensurePageFonts([pageNumber, nextAnchor, prevAnchor])`. The singleton `<style>` and
  `mobileInjectedFontIdsRef` go away.
- `FontFaceInjector` (desktop/tablet): base-font `<style>` generation is replaced by an
  effect calling `ensurePageFonts(injectedIds)` (pair-expanded ids as today). Tajweed
  stays CSS (`@font-palette-values` has no FontFace-API equivalent) but restructured as
  **one keyed `<style>` element per page id**, content static after mount — React
  mounts/unmounts whole elements on LRU change and never rewrites a live sheet. Tajweed
  rules still render only when `tajweedMode` is true (ADR 0023 gating unchanged).
- `next.config.mjs`: add a `headers()` rule for `/fonts/:path*` →
  `Cache-Control: public, max-age=31536000, immutable` (paths are versioned `/v1/`, `/v4/`).

### Decision Tree (user-verified)

| Situation | Today | After fix |
|---|---|---|
| Commit: new page enters window (desktop/tablet) | whole `<style>` regenerated → every face resets → visible text blanks | registry adds one new face; existing faces untouched |
| Commit: new page enters window (mobile) | append to shared `<style>` → full re-parse → same reset | same registry call; no sheet mutation |
| LRU eviction (>24 fonts) | text rewrite (resets everything) | `document.fonts.delete` on the evicted face only |
| Swipe to page whose font was already loaded | face reset → invisible text; slow 4G adds revalidation round-trip | face stays `loaded` → paints immediately, zero network |
| Swipe to page whose font never loaded | blank (stale-true `fontReady`, no skeleton) | `fontReady` genuinely false → skeleton shows until loaded (designed behavior) |
| Tajweed mode commit | tajweed rules inside the same rewritten `<style>` | new page's keyed `<style>` mounts; sibling sheets untouched |
| Arrow nav / recitation-follow / reduced-motion | all funnel through `commitTo` → same reset | same fix — shared registry path |

### Verified Test Cases (from user repro at `/ar/pages/321`)

1. **Unthrottled swipe commit, font cached:** today a one-frame blank flash (face resets,
   re-resolves from cache next frame). After fix: no reset → no flash.
2. **Slow-4G swipe commit, font previously loaded:** today seconds of blank (reset +
   `max-age=0` revalidation). After fix: no reset, no network → instant paint.
3. **Neighbor visible during drag, blank after commit:** drag never touches the stylesheet;
   commit does. After fix commit doesn't either → what you saw mid-drag is what rests.
4. **Slow-4G swipe to a truly cold page:** skeleton (correctly) shows until the font
   resolves — unchanged contract, now actually reachable instead of a stale-true blank.

### Verification Protocol (instrumentation-first — do this before changing logic)

1. Reproduce on `http://localhost:7002/ar/pages/321` (mobile viewport + slow-4G throttle).
2. Log `[...document.fonts].map(f => f.family + ":" + f.status)` immediately before and
   after a swipe commit; watch Network for re-requests/revalidations of an
   already-downloaded `p{n}.woff2` at commit time.
3. Expected confirmation: the current page's face flips `loaded → unloaded` at commit.
4. Implement the fix, re-run the same instrumentation: statuses must stay `loaded` across
   commits and Network must show no font re-requests. Then verify visually: unthrottled
   (no flicker), slow 4G (no post-commit blank), tajweed mode on, tablet double-view,
   arrow nav, and recitation-follow.
5. Test BOTH `/ar` and `/en` (per project triage guidance) and lint before handoff.

### Files to Change (confirmed fix)

- `app/utils/page-font-registry.ts` — **new**; immutable FontFace registry + LRU as above.
- `app/components/reader/ReaderPager.tsx` — replace the mobile `MOBILE_FONT_STYLE_ID`
  effect with `ensurePageFonts`; drop the singleton-style machinery. Keep the `<link
  rel="preload">`, gesture logic, `commitTo`, and everything else untouched.
- `app/components/reader/FontFaceInjector.tsx` — base fonts via registry effect; tajweed
  as per-id keyed immutable `<style>` elements; keep LRU semantics and tajweed-mode gating.
- `next.config.mjs` — immutable cache headers for `/fonts/:path*`.
- `docs/architecture/adr/0029-immutable-page-font-registration.md` — created (done).
- `docs/architecture/DECISIONS.md` — Font System section amended (done).

### Constraints (confirmed fix)

- `QuranSafha` is **not** touched: `font-display: block` + skeleton + `fontReady` via
  `document.fonts.check()` all work unchanged against registry-added faces (JS-added faces
  participate in `document.fonts.check`/`loadingdone`).
- `commitTo`/`flushSync`/recitation-follow microtask safety: untouched (ADR 0028).
- Keep the restored mobile CSS wins (full-width Safha, border removal) in `globals.css`.
- Tajweed fonts still load only when `tajweedMode` is true, only for LRU pages (ADR 0023).
- ADR 0020 still governs any rendered `<style>`: client component only.
- The registry replaces the "mobile incremental font-face strategy" restored win — user
  approved this supersession explicitly (same goal, one step further: no live-sheet
  mutation at all).

### What NOT to Do (confirmed fix)

- Never rewrite or append into a live `<style>` containing `@font-face` — the root cause.
- Do not re-implement the superseded hypothesis list (transitionend-driven commit, commit
  readiness gates, font warm-up expansion) — attempts 1–24 prove gating cannot work while
  the injectors mutate; and with immutable registration they are unnecessary.
  **Re-examined and upheld for Trello #159** ([ADR
  0034](../architecture/adr/0034-page-turn-readiness-on-slow-networks.md),
  `docs/plans/fix-page-turn-blank-slow-network.md`). #159 is a genuinely different problem —
  genuinely-not-yet-downloaded JSON and font on 3G, not a font-face reset — but it was fixed by
  shortening the wait (lookahead prefetch) and rendering an honest loading state through it, not
  by gating the commit. This bullet was not superseded.
- Do not change `font-display` to `swap`/`optional`, remove the skeleton, or alter
  `QuranSafha`'s readiness logic. **Narrowed by #159:** the overlay's *trigger* widens from
  `!fontReady` to `!fontReady || !hasData`, and `pageMetadata` becomes nullable — but how
  `fontReady` itself is computed is still untouched.
- Do not reintroduce `router.push`, timeout-masking, or any commit-path redesign.
- Do not preload all 604 fonts or lift the LRU cap — DECISIONS.md forbids global font load.

### Implementation Notes (2026-07-25, third session)

Implemented as specified: `app/utils/page-font-registry.ts` added; `ReaderPager`'s mobile
effect now calls `ensurePageFonts([pageNumber, nextAnchor, prevAnchor])` (the
`MOBILE_FONT_STYLE_ID` `<style>` + `mobileInjectedFontIdsRef` are gone); `FontFaceInjector`
registers base fonts via `ensurePageFonts(injectedIds)` and renders tajweed as one keyed
`<style key={id}>` per page id; `next.config.mjs` serves `/fonts/:path*` with
`Cache-Control: public, max-age=31536000, immutable`.

One deviation from the in-flight (uncommitted) diagnostic state found at session start:
`{isLgUp ? <FontFaceInjector pageIds={allPageIds} /> : null}` — a gate added during the
attempts-1–24 session, not present in the last committed baseline (`FontFaceInjector` always
rendered) — was removed, restoring unconditional rendering. With the gate in place, tajweed
mode rendered garbled glyphs on mobile (tajweed's keyed `<style>` elements never mounted
below `lg`), a real regression verified visually before this fix and confirmed absent after.
The gate was bundled with the now-explicitly-superseded mobile incremental font-face
strategy; removing it is safe because base-font registration for both callers now goes
through the same idempotent registry (no duplicate-mutation risk it was guarding against).

Verified via the Verification Protocol: instrumented `document.fonts` + a `MutationObserver`
on `<head>` confirmed the pre-fix mechanism (an unrelated page's face flipping
`loaded → unloaded` at commit, with a logged style mutation) and its absence post-fix (zero
style mutations, all in-window faces stay `loaded`) across mobile swipe, tablet double-view
swipe, and desktop arrow-nav commits, with tajweed mode on and off, and on both `/ar` and
`/en`. `/fonts/:path*` responses confirmed serving `Cache-Control: public,
max-age=31536000, immutable`. `npm run lint` passes.

## Follow-up: base-font over-fetch on single-page views (2026-07-25, fourth session)

**Found by:** a second review agent, reading the third-session diff. Not a flicker risk (the
registry can never reset an already-loaded face) — a bandwidth regression only, worse on
slow 4G.

### Root Cause

`ReaderPager`'s `allPageIds` (fed to `FontFaceInjector`) is always pair-expanded via
`getPagePair`, per ADR 0013's "always fetch both pair members" design — that design relies
on `@font-face` being a *lazy* CSS declaration (browsers don't fetch a font for
`display:none` content). `ensurePageFonts` breaks that assumption: `face.load()` is eager
and downloads regardless of render state. Once `FontFaceInjector` started rendering
unconditionally (the third-session fix for tajweed-on-mobile), its base-font effect also
started eagerly downloading the invisible spread-partner page's font on every single-page
session — up to 3 extra ~28 KB fonts per swipe. See ADR 0029's Addendum for the full
before/after and why `isDouble` (not `isLgUp` alone) is the correct scoping condition — the
partner is CSS-hidden whenever `view !== "double"`, which includes desktop/tablet at
`≥1024px` with the toggle manually set to `"single"`, a case `isLgUp` alone would miss.

### Decision Tree (verified)

| Signal | `baseFontIds` → registry (eager) | `pageIds` → tajweed keyed `<style>` (CSS-lazy, unchanged) |
|---|---|---|
| `isDouble` (`view==="double" && isLgUp`) | `allPageIds` (pair-expanded — both facing pages visible) | `allPageIds` |
| not `isDouble` (mobile, forced-single below `lg`, or desktop/tablet with single manually toggled) | `[pageNumber, nextAnchor, prevAnchor]` (single ids only) | `allPageIds` (safe to over-list — CSS declaration costs nothing unrendered) |

### Verified Test Cases

1. Mobile, page 100 (`isDouble` always false): `baseFontIds = [100, 101, 99]` — matches the
   plan's original "mobile single-page warm set" policy (attempt 14). Tajweed ids stay
   `{99,100,101,102}`, harmless.
2. Desktop `≥1024px`, view manually toggled to `"single"`, page 100: same as mobile —
   `baseFontIds = [100,101,99]`. Not covered by an `isLgUp`-only fix.
3. Desktop/tablet double-view, page 100: `isDouble=true`, `baseFontIds = allPageIds` —
   unchanged from today, both facing pages still warm correctly.
4. Toggle single→double mid-session: `baseFontIds` recomputes to include the newly-visible
   partner; `FontFaceInjector`'s effect re-fires and loads it on the toggle, not before —
   matches the original lazy-until-visible intent, done explicitly since the registry can't
   rely on implicit browser laziness.

### Files to Change

- `app/components/reader/ReaderPager.tsx` — compute `baseFontIds` (`allPageIds` when
  `isDouble`, else `[pageNumber, nextAnchor, prevAnchor]`); pass it to `FontFaceInjector`
  alongside the unchanged `pageIds`. Remove the now-redundant standalone mobile
  `ensurePageFonts` effect (and its now-unused `ensurePageFonts` import) — `FontFaceInjector`
  becomes the single registration path for both mobile and desktop.
- `app/components/reader/FontFaceInjector.tsx` — accept a new `baseFontIds` prop; track its
  own separate LRU (`baseKeptRef`, same `MAX_KEPT` cap) independent from the existing
  `pageIds`-derived LRU that still keys the tajweed `<style>` elements; call
  `ensurePageFonts` on the `baseFontIds` LRU instead of the `pageIds` one.
- `docs/architecture/adr/0029-immutable-page-font-registration.md` — Addendum added (done).
- `docs/architecture/DECISIONS.md` — Font System constraint added (done).

### Constraints

- Do not change tajweed's `pageIds`/keyed-`<style>` behavior — still pair-expanded, still
  CSS-only, still safe to over-list.
- Do not touch `commitTo`/`flushSync`/gesture code, or the immutable-registry invariant
  itself (ADR 0029) — this is a scoping fix for *which ids* get passed in, not a change to
  how the registry works.
- Keep the shared registry's LRU cap (24) and per-face `document.fonts.delete` eviction
  unchanged.

### What NOT to Do

- Do not scope on `isLgUp` alone — it misses the desktop/tablet single-view-toggled case.
- Do not remove the pair-expansion for tajweed ids — that's still correct and harmless
  under the CSS-lazy path.
- Do not add an explicit eviction call when toggling double→single — the LRU already
  handles aging out an unused face; no extra logic needed.

### Implementation Notes

Implemented as specified. `ReaderPager` now computes `baseFontIds` inline (no `useMemo` —
matches `allPageIds`'s existing pattern) and passes it alongside `allPageIds` to
`FontFaceInjector`; its standalone mobile `ensurePageFonts` effect and the now-unused import
are removed. `FontFaceInjector` gained a shared `updateLru` helper so the two independent
LRUs (`keptRef` for tajweed, `baseKeptRef` for the registry) don't duplicate the loop.
`npm run lint` and `tsc --noEmit` both pass.

Verified all 4 test cases directly against `document.fonts`:
1. Mobile, page 100: `{99, 100, 101}` only.
2. Desktop `≥1024px`, single manually toggled, page 100: `{99, 100, 101}` only — the case
   an `isLgUp`-only fix would have missed.
3. Desktop double-view (default), page 100: `{97, 98, 99, 100, 101, 102}` — unchanged.
4. Live single→double toggle (via the actual Settings UI control, not a reload): started at
   `{99, 100, 101}`, and immediately after the toggle click, `{97, 98, 99, 100, 101, 102}` —
   the partner loads on toggle, not before.

Also re-ran the third-session flicker regression check (swipe on mobile with a
`MutationObserver` on `<head>` + a `document.fonts` snapshot): zero style mutations, all
in-window faces stayed `loaded` — this change doesn't touch the registry's core invariant,
only which ids get passed to it.

## Review Follow-up (fifth session)

A comprehensive review of the full branch diff (all 12 commits vs `main`) surfaced two
low-risk findings, both fixed: `ReaderPager`'s `baseFontIds` is now `useMemo`'d for
consistency with the neighboring `allPageIds` (no behavior change — it was already reduced
to a joined-string key immediately, never a correctness bug); the "Open verification"
section above was stale and is now corrected (see that section). A third finding —
`scripts/quran-json/generate.js` hand-mirroring `getPageWords()`'s Prisma `select` +
`groupBy()` from the TS source, since the plain-Node build script can't import TS — was
deliberately left as-is: currently in sync, and fixing the duplication would require a
bigger build-tooling change (e.g. a shared JS module both sides can import) than this
follow-up's scope justifies.

## Review Follow-up (sixth session) — FontFaceInjector ref-mutation-during-render

A code review of PR #141 (the full branch diff, external to this session) flagged that
`FontFaceInjector`'s `updateLru` helper mutates a ref (`keptRef.current` / `baseKeptRef.current`)
directly inside the component's render body, and the return value is used immediately to compute
that same render's JSX (`injectedIds`, `baseInjectedIds`).

### Root Cause

React's contract is that render must be pure — reading or writing `ref.current` during render
(as opposed to inside an effect or event handler) is explicitly disallowed, because a render that
starts but does not commit (a Suspense retry, an interrupted transition) still leaves the ref
mutated. The mutation is not undone if React discards that render pass, so the tracked "kept" page
ids can drift from what was actually committed to the DOM. `reactStrictMode: false` in
`next.config.mjs` and the absence of `startTransition`/Suspense on this component's render path
mean this isn't currently observable in production, but it's the wrong pattern for a component
whose entire purpose (ADR 0029) is eliminating font-state bugs caused by state changing outside
React's render contract — the same category of risk this component exists to prevent.

### Fix — render-phase state instead of ref mutation

Replace the two ref-mutating call sites with a small `useLruIds(ids)` hook that stores the "kept"
list in `useState` instead of a ref, using React's own "adjust state during render" pattern
(see react.dev's `useState` reference, "Storing information from previous renders"): compare the
incoming `ids` (via a joined-string signature) against the previously-stored signature, and when it
differs, compute the next LRU list and call `setState` synchronously in the render body — not in an
effect. React re-renders immediately with the fresh state before committing to the DOM, so there is
no extra render pass and no flash of the stale list (which a `useEffect`-based fix would introduce,
since effects run after the first commit).

The underlying LRU algorithm (filter existing id out, unshift to front, cap at `MAX_KEPT`) is
unchanged — only how the "kept" list persists across renders changes, from a mutated ref to
React-managed state.

### Decisions Made

- Use the render-phase `setState` pattern (React-sanctioned for derived state), not
  `useEffect` + ref — an effect-based fix would add a second render pass and reintroduce a
  visible flash of the pre-update font/style set, which is exactly what this component exists to
  avoid.
- Keep `MAX_KEPT` and the eviction algorithm unchanged — this is a mechanical relocation of where
  the LRU state lives, not a change to eviction behavior. (The `MAX_KEPT` constant is still
  duplicated between this file and `page-font-registry.ts`; that's a separate, lower-priority nit
  from the same review and is out of scope here.)

### Files to Change

- `app/components/reader/FontFaceInjector.tsx` — replace `useRef` + `updateLru(ref, ids)` with a
  `useLruIds(ids)` hook backed by `useState`; drop the now-unused `useRef`/`MutableRefObject`
  imports; both `injectedIds` and `baseInjectedIds` call sites switch to the new hook. No other
  file changes — `ensurePageFonts`, the tajweed `<style>` rendering, and the `baseInjectedIdsKey`
  effect dependency all stay as-is.

### Constraints

- Must not change the LRU eviction algorithm or `MAX_KEPT` cap.
- Must not introduce an extra render/commit pass or any visible delay before the correct font
  `<style>` set / registry ids are used — this is the same swipe-commit-flicker-adjacent
  component from ADR 0029, so any fix that trades ref-mutation-during-render for a
  flash-during-effect would be a regression, not a fix.
- Must preserve hook-call order relative to the `if (!tajweedMode) return null;` early return —
  both `useLruIds` calls (and the `useEffect`) stay before it, as today.

### What NOT to Do

- Do not move the LRU update into a `useEffect` — effects run after commit, so the render that
  triggered the id change would first paint with the stale list, then a second render (post-effect
  `setState`) would correct it. That reintroduces a visible flash this component's whole design
  exists to prevent.
- Do not change `updateLru`'s eviction logic while relocating it — this fix is scoped to *where*
  the LRU state lives, not *how* eviction decides what to keep.
- Do not consolidate the two independent LRUs (tajweed ids vs. base-font-registry ids) into one —
  ADR 0029's Addendum already established they must stay independent because they can legitimately
  diverge (visible spread partner vs. not).

### Implementation Notes

Implemented as specified: `updateLru(ref, ids)` replaced with `nextKept(prevKept, ids)` (pure,
unchanged algorithm) plus a `useLruIds(ids)` hook that stores `{ key, kept, sorted }` in `useState`
and, on a signature mismatch, computes and returns the fresh sorted list while also committing it to
state in the same render pass — no ref, no extra render/commit cycle. `injectedIds` and
`baseInjectedIds` both switched to `useLruIds`; hook-call order relative to the
`if (!tajweedMode) return null` early return is unchanged. Dropped the now-unused `useRef` /
`MutableRefObject` imports. `docs/architecture/COMPONENTS.md`'s `FontFaceInjector` entry updated to
name `useLruIds` instead of the old `updateLru` ref helper.

`npm run lint` and `npx tsc --noEmit` both pass clean. Live browser verification (tajweed toggle +
swipe, confirming no flash/regression) not yet run — pending.

---

## Rapid Swipes Silently Dropped (2026-08-11) — Trello #153

**Type:** bug
**Status:** implemented
**Trello:** #153 https://trello.com/c/qkKb5UFn

### Summary

On tablet, swiping several pages in a row drops roughly every other swipe. Reported as "lag", but it
is not a frame-rate problem: the gesture is discarded outright. Any swipe that *begins* inside the
300 ms commit window is swallowed — not queued, not deferred, no feedback. Fix: capture the gesture's
intent while a commit is in flight and apply one queued page step the moment that commit lands.

### Root Cause (confirmed by code reading, 2026-08-11)

`app/components/reader/ReaderPager.tsx`:

- `animateCommit` sets `isCommitting.current = true` and schedules the anchor swap on a wall-clock
  `window.setTimeout(() => commitTo(target), EXIT_MS)` — 300 ms.
- `commitTo` is the only thing that clears the flag.
- `onTouchStart` opens with `if (isCommitting.current) return;` and returns **before recording
  `touchStartX`**. With `touchStartX` left null, `onTouchMove` and `onTouchEnd` both bail on their
  own null checks, so the entire following gesture is dead.

Measured previously (headless Chrome, 1280x800, `/ar/pages/51`, synthetic +180px drags past the 80px
`COMMIT_THRESHOLD`): 500 ms gaps → 10/10 committed; 250 ms gaps → 5/10; 120 ms gaps → 5/10.

The same early-return swallow exists on two other paths — the keyboard handler and `navRef` (arrow
clicks). Neither opens a window of its own, because both pass `animate=false`, which reaches
`commitTo` synchronously and clears the flag in the same task. But input from *any* source that
arrives during a swipe's 300 ms window is dropped, so all three paths feed the same queue.

### The `transitionend` row is a superseded approach — do not implement it

Trello #153 notes that this plan contains a "Decision Tree / Algorithm (**verified**)" row requiring
commit completion on the strip's `transitionend` with a guarded fallback timer, and that
`git log -S transitionend` returns zero commits — concluding it was "labelled verified but never
implemented."

That row sits inside the section headed **"Root Cause Hypothesis — SUPERSEDED"**, whose own note
reads: *"Commit timing and font warm-up were secondary at best; the 'Files to Change (this residual
bug)' list under this hypothesis is dead — do not implement it."* The flicker it was aimed at was
actually fixed by ADR 0029 (immutable font registration), after 24 attempts that all wrongly treated
font readiness as the lever. Its absence from git history is therefore a deliberate drop, not an
oversight. Re-introducing `transitionend` now would re-propose a superseded approach and add
regression risk to the one path in this component that took 24 attempts to stabilise — and by the
card's own admission it does not fix the reported symptom anyway. **Scope here is the queue only.**

### Decision Tree / Algorithm (verified with user)

| # | Condition | Action |
|---|---|---|
| 1 | Touch starts, not committing | Record `touchStartX/Y`, drag normally (unchanged) |
| 2 | Touch starts **while committing** | Record `touchStartX/Y`; do **not** touch the strip's transition |
| 3 | Touch moves while committing | Set `isDragging`, but do **not** transform the strip — never fight the in-flight slide |
| 4 | Touch ends while committing, `<` `COMMIT_THRESHOLD` | Discard; no queue and no snap-back (nothing was dragged) |
| 5 | Touch ends while committing, `>=` threshold | Queue **one** pending step `{ goNext }` |
| 6 | Queue already holds a step | Latest intent wins — overwrite, never stack |
| 7 | Queued step is the opposite direction | Honour it; a net-zero page change is what the user asked for |
| 8 | Commit lands with a step queued | Clear the queue, then apply it **instantly** (`animate=false`), deferred via `queueMicrotask` |
| 9 | Keyboard / arrow click arrives mid-commit | Same queue (currently dropped) |
| 10 | Non-neighbour jump queued | Queue the absolute target page, not a direction |
| 11 | Pager unmounts, edition switch, or recitation follow fires | Discard the queue — never replay a stale turn |

Two invariants this depends on:

- **A queued step must hold a direction, not a resolved page.** The in-flight commit moves the
  anchor, so a `nextAnchor` captured at queue time points at the wrong page by the time the queue is
  applied. Resolve the target after the anchor settles, via the existing reassigned-each-render ref
  pattern (`navRef`) so the applying code reads fresh `nextAnchor`/`prevAnchor`.
- **The queued step must be applied via `queueMicrotask`, never inline.** `commitTo` uses
  `flushSync`, which flushes passive effects synchronously; an inline follow-up commit runs while
  `isCommitting` is still true, is guarded out, and never retries. This is exactly the trap
  `RecitationFollow` hit (see Decisions Made → "Recitation follow"), and the same mitigation applies.

Queued turns commit **instantly** rather than replaying the 300 ms reveal: `animate=false` reaches
`commitTo` synchronously, so the window closes immediately and the next gesture is free. The first
swipe of a burst still gets its full book-like reveal; only catch-up turns are instant, which reads
as the app keeping up rather than animating at the user.

### Verified Test Cases (measured 2026-08-11, dev server, tablet double-view at `/ar/pages/51`)

**Wall-clock gap testing was not achievable in the available browser pane.** The pane runs as a
background tab (`document.hidden === true`, and fronting it via the MCP tab API does not change
that), so `setTimeout` is clamped: a requested 120 ms gap measured 494–1000 ms, and the pager's own
`setTimeout(commitTo, 300)` is stretched by the same clamp. Runs at nominal 250 ms / 120 ms therefore
executed at ~1000 ms spacing and never opened an overlapping window at all — they returned a
meaningless 10/10 on both the fixed and unfixed code. **Do not cite gap-based numbers from this
environment.**

Verified instead with a timing-independent harness: fire N swipes as synthetic `TouchEvent`s in a
**single task**, so every swipe after the first lands inside the commit window by construction. Turn
count is derived from the page delta (double view steps 2 pages per turn). Before/after measured on
the same harness by stashing only `ReaderPager.tsx`.

| Burst, all in one task | Before | After | Rule |
|---|---|---|---|
| 1 swipe (control) | 1 turn | 1 turn | — |
| 2 swipes | **1 turn** — 2nd swallowed | **2 turns** | the bug / rule 5 |
| 3 swipes | **1 turn** — 2nd and 3rd swallowed | **2 turns** — coalesced | rule 6 |
| next then prev | prev swallowed → 1 turn | **0 net turns** | rule 7 |
| swipe + sub-threshold release | 1 turn | 1 turn — nothing queued | rule 4 |
| swipe + one `ArrowLeft` | ArrowLeft dropped → 1 turn | **2 turns** | rule 9 |
| swipe + 5 `repeat` ArrowLefts | 1 turn | **1 turn** — repeats never enqueue | `e.repeat` constraint |

Tap-with-no-movement during a commit remains a no-op: `onTouchEnd` requires `isDragging`, which only
a horizontal move sets, so the strip's tap-to-toggle nav overlay is untouched.

Three further cases were added after review found the first implementation still lost or corrupted a
gesture in each of them (measured the same way):

| Case | First implementation | After review fixes |
|---|---|---|
| Drag begins mid-commit, commit lands mid-drag, finger keeps moving | strip **teleports** to `translateX(-100% + 140px)` | stays `translateX(-100%)` — the gesture is latched transform-free for its whole life |
| Step queued, a drag is held across the commit landing, then released **sub-threshold** | queued step **destroyed** by the declining drain → 1 turn | **2 turns** — the drain leaves it queued and the release re-schedules it |
| Swipe, then a `touchcancel` (no `touchend`), then another swipe | `isDragging` stuck true → drain, `followTo` and Stage B lookahead all wedged | later swipe still turns (1 turn) — `onTouchCancel` resets the drag state |

**Accepted limit:** with a 1-deep queue, swipe count ≠ page count when swiping faster than the commit
window allows — gestures coalesce into the latest intent (3 swipes → 2 turns, measured). The card's
original "10/10 at 120 ms" framing is therefore **not** a target this fix meets, by design. Nothing is
silently dead any more: every gesture either commits or is explicitly superseded by a later one, and a
human swiping 8 times in a second does not plausibly intend 8 distinct pages. A deeper queue was
rejected — it turns spam into overshoot, which is harder to recover from than coalescing.

**Still unverified:** real-device behaviour at true sub-300 ms gaps, and the *feel* of an instant
catch-up turn following an animated one. Both need a foreground browser or a tablet; neither is
reachable from this pane.

### Files to Change

- `app/components/reader/ReaderPager.tsx`
  - `onTouchStart` — drop the `isCommitting` early return; always record `touchStartX/Y`. Guard only
    the strip-transition reset and the snap-timer clear behind `!isCommitting.current`.
  - `onTouchMove` — skip the `style.transform` write while committing (keep the `isDragging`
    bookkeeping) so a new drag never fights the in-flight slide.
  - `onTouchEnd` — when committing and past threshold, queue `{ goNext: deltaX > 0 }` instead of
    calling `animateCommit`; skip the snap-back branch entirely (nothing was transformed).
  - New `pendingNav` ref holding `{ kind: "step"; goNext: boolean } | { kind: "page"; target: number } | null`,
    written only through the `enqueueStep`/`enqueuePage` choke point.
  - `commitTo` — after clearing `isCommitting`, `queueMicrotask` the drain through `drainRef` (which is
    reassigned each render so it reads fresh anchors). The drain clears the queue **at dispatch**, not
    before its guards: clearing first destroyed a step it merely declined to run.
  - Keyboard handler and `navRef` — replace their `isCommitting` early returns with the same queue.
  - Clear `pendingStepRef` on unmount, on edition switch (`jumpTo`), and when recitation follow
    commits, so a stale turn is never replayed.
- `docs/architecture/adr/0028-reader-persistent-pager.md` — addendum recording the input-during-commit
  contract (queue one, coalesce, direction-not-page, microtask-deferred).
- `docs/architecture/DECISIONS.md` — constraint under the reader/pager entry.
- `docs/architecture/COMPONENTS.md` — `ReaderPager` entry gains the queue behaviour.

### Constraints

- Do not transform the strip while a commit is in flight — the in-flight `transition` owns the
  transform until `commitTo` resets it.
- Keep the queue exactly one deep. A counter or array turns rapid input into page overshoot.
- Resolve the queued target only after the anchor settles; never store a pre-commit `nextAnchor`.
- Apply the queued step via `queueMicrotask`, never inline inside `commitTo`'s `flushSync`.
- Preserve the `e.repeat` guard in the keyboard handler. It must return **before** the queue, or a
  held key would enqueue at the OS repeat rate (~30/s) — the exact runaway that guard exists for.
- Do not regress the tap-to-toggle nav overlay on the strip, recitation follow, edition switching, or
  the double-page window unit.

### What NOT to Do

- Do not implement the `transitionend` commit completion from the superseded hypothesis section — see
  the dedicated note above. It is a dropped approach, not an outstanding requirement.
- Do not change `EXIT_MS`. Shortening the window narrows the symptom without fixing it and is a
  deliberate change to the page-turn feel; out of scope here.
- Do not let a new drag cancel or take over the in-flight commit. Considered and rejected: it rewrites
  the commit/recenter sequence that ADR 0029 and the flicker work stabilised, for a gain the queue
  already delivers.
- Do not make queued turns animate. Considered and rejected: each animated turn reopens a 300 ms
  window, capping throughput at ~3 pages/sec and putting the 250 ms target out of reach.
- Do not deepen the queue to guarantee one turn per swipe (see Accepted limit).

### Decisions Made

- Queue one pending step, latest-intent-wins, applied instantly on commit completion (user-confirmed).
- Coalescing at very high swipe rates is accepted behaviour, not a shortfall (user-confirmed).
- Scope is the queue only — no `transitionend`, no `EXIT_MS` change (user-confirmed).
- All three input paths (swipe, keyboard, arrows) share one queue, so behaviour does not depend on
  which input happened to arrive during the window.
- No new ADR: this is a behavioural refinement inside ADR 0028's existing "navigation ownership lives
  in the pager" decision, recorded as an addendum there.

### Implementation Notes (2026-08-11)

Implemented as specified, in `app/components/reader/ReaderPager.tsx` only:

- `pendingNav` ref holds `{ kind: "step"; goNext } | { kind: "page"; target } | null`.
  `drainPendingRef` is reassigned every render so the drain closes over post-commit anchors.
- `drainPending` (stable `useCallback`) is called at both `commitTo` exits and defers to
  `queueMicrotask`; the drain clears the queue first, then bails if a newer drag or commit has taken
  over — same guard shape as `followTo`.
- `onTouchStart` records `touchStartX/Y` before its `isCommitting` return; everything below that
  return touches the strip, which the in-flight transition owns.
- `onTouchMove` keeps its `isDragging` bookkeeping but skips the transform write while committing.
- `onTouchEnd` queues instead of committing while `isCommitting`, and skips the snap-back branch
  entirely (nothing was transformed, so there is nothing to snap).
- The keyboard handler and `navRef` queue instead of returning. `e.repeat` still returns **before**
  the queue — verified: 5 repeat events during a commit produce one turn, not five.
- `jumpTo` (edition switch) and `followTo` (recitation) both clear the queue, and an unmount effect
  nulls it so an already-scheduled microtask cannot commit on a torn-down pager.

`npx tsc --noEmit` clean, `npm run lint` clean, `npm test` 75 passed / 7 files.

**No unit test added.** `vitest.config.ts` is deliberately scoped to pure-function tests
(`app/**/*.test.ts`, node environment, no jsdom or React Testing Library), so covering a touch-gesture
state machine would mean adding DOM test infrastructure — a larger change than this fix and outside
its scope. The synthetic-`TouchEvent` harness above is what actually exercised it; if DOM tests are
introduced later, the seven bursts in the table are the cases to encode.

#### Review fixes (2026-08-11, Opus pass before shipping)

The first implementation passed all seven original bursts but review found three ways it could still
lose or corrupt a gesture, all now fixed and re-measured (table above):

- **Teleport after a mid-drag hand-off.** `onTouchMove` skipped the transform only while
  `isCommitting`; once the commit landed the same still-active gesture fell through and wrote the
  finger's whole accumulated travel in one jump. A `gestureIsQueueOnly` latch, set at `touchstart`,
  keeps that gesture transform-free until it ends.
- **Declined drain destroyed the step.** The drain cleared `pendingNav` before its
  `isDragging`/`isCommitting` guards, so a step it merely declined was gone — and a sub-threshold
  release by the newer drag then produced zero turns. It now clears at dispatch, and
  `onTouchEnd`/`onTouchCancel` re-schedule a declined drain.
- **No `touchcancel` handler.** A cancelled touch left `isDragging` stuck true, wedging the drain,
  `followTo` and the Stage B lookahead. Added `onTouchCancel`; pre-existing, but this change widened
  the window for entering it.

Also from review: queueing moved behind one `enqueueStep`/`enqueuePage` choke point (three call sites
each writing the literal is what let the original bug diverge per input); `drainPending` collapsed into
`scheduleDrain`, removing a dependency edge from `commitTo` — whose identity Panel memo stability
depends on; `drainPendingRef` renamed `drainRef`.

Deliberately **not** fixed here, as pre-existing and outside this scope: `animateCommit`'s `EXIT_MS`
timer is never cancelled, so an edition switch mid-commit can be overwritten 300 ms later, and the
timer can fire post-unmount and rewrite the URL of whatever route the user moved to. Both want a
cancellable commit handle, which touches the timing path this change deliberately leaves alone.

One environment note worth carrying: a `useRef` added to this component makes HMR blow up the reader
into its error boundary (hook order changed under preserved state). A full reload clears it — do not
chase it as a runtime defect.
