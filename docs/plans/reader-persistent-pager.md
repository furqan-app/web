# Reader Swipe Performance: Persistent Client Pager

**Type:** feature (performance re-architecture)
**Date:** 2026-07-23
**Status:** ready-to-implement
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
- Expose `goToPage(n)`; replace the recitation `router.push` in `RecitationContext` with it, and
  unify the "current reader location" state the recitation code already reads
  (`readerLocation`/`computeVisiblePageSet`).
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

## Open verification (do at implementation, not now)

- Re-profile Stage 2 on a real mid-range device to decide whether Stage 2b is needed.
- Confirm the slim JSON field set covers surah-banner gap detection (`QuranSafha` uses
  `line_number` gaps + `verse.chapter.verses_count` + `location`) and mark snippets
  (`qpc_uthmani_hafs` for the verse snippet) — include `qpc_uthmani_hafs` in the slim word shape if
  the snippet is kept, or derive snippets lazily.
