# Page Turn Blanks the Reader on Slow Networks

**Type:** bug
**Date:** 2026-07-30
**Status:** implemented
**Trello:** #159 https://trello.com/c/iVramC8c
**ADR:** [0034](../architecture/adr/0034-page-turn-readiness-on-slow-networks.md)
**Related:** ADR 0028 (persistent pager), ADR 0029 (immutable font registry),
`docs/plans/reader-persistent-pager.md`, `docs/plans/fix-panel-placeholder-reflow.md` (#157),
`docs/plans/fix-quran-page-font-loading.md` (the skeleton this reuses)

## Summary

On a 3G connection every page turn blanks the whole reader area for up to ~1.3 s before the new page
paints. The commit is instant and correct; what is missing is anything to look at while the target
page's content JSON and font are still arriving. Two consecutive empty states chain: the `Panel`
placeholder renders literally nothing while the JSON is in flight, then `QuranSafha` hides its text
under `visibility: hidden` while the font downloads. The fix keeps the commit instant and attacks the
wait from both ends — it shortens the wait with a second, serialized prefetch stage that buys two
turns of lead instead of one, and it fills whatever wait remains with the card's existing calibrated
shimmer instead of an empty area. No commit gating; see ADR 0034 for why that direction is rejected.

## Root Cause

Measured on Fast 3G (~195 KB/s, 562 ms latency), per page:

| Asset | Size on the wire | Cost |
|---|---|---|
| `public/quran/pages/{mushafId}/{n}.json` | 37.7 KB raw → **3.5 KB** gzipped | latency-bound, ≈600 ms |
| `public/fonts/v1/woff2/p{n}.woff2` | **83.5 KB** (already compressed) | ≈430 ms transfer + latency |

A forward turn in double view needs two new fonts — **167 KB ≈ 855 ms of pure transfer**. At the
reported ~800 ms turn cadence the reader is requesting more bytes per second than the link delivers,
so the assets for the page being committed to are still in flight when it lands.

Prefetch is not late — it is too shallow. `warm()` (`ReaderPager.tsx:208`) starts the neighbour's JSON
on anchor settle and `ensurePageFonts` starts its font at the same instant, which is exactly **one**
turn of lead. One turn of lead is less than one turn of transfer, so the deficit compounds.

With nothing ready, two code paths each render an empty area:

1. `Panel` gates on `rightData && leftData` and otherwise renders `<div className="w-full" />`
   (`ReaderPager.tsx:113-135`) — no card, no page number, nothing.
2. `QuranSafha` sets `visibility: hidden` on `.fq-quran-safha` until `fontReady`
   (`QuranSafha.tsx:143-158`, `:396-400`), and its skeleton overlay is keyed to `!fontReady` alone —
   so when the font happens to be ready but the content is not, there is no skeleton either.

Neither is wired to the commit, which is correct and stays that way.

## Decision Tree / Algorithm

### 1. Loading state

| Panel / safha state | Today | After |
|---|---|---|
| No JSON yet | `<div className="w-full" />` — empty | Real card chrome, ` `-reserved header, real page number in footer, shimmer lines |
| JSON in, font pending | Card renders, text `visibility: hidden`; skeleton only if `!fontReady` | Same card, header fills in, **same shimmer continues** |
| Font in, JSON pending | Empty (case 1) | Shimmer (overlay condition now covers it) |
| Both ready | Content | Content — unchanged |

Overlay condition changes from `!fontReady` to `!fontReady || !hasData`. The two blank states collapse
into one uninterrupted shimmer.

### 2. Dimensional stability (why this cannot reintroduce a flicker)

| Dimension | Driven by | Content-dependent? |
|---|---|---|
| Card height | `h-[calc(100dvh-5.5rem)] md:h-full` on the wrapper | No |
| Card width | `minWidth: min(100vw, calc(<font-scale> * 14.7 + 3.5rem))`; `14.7` is the worst-case line-width ratio and the double-view font cap uses the same constant | No — content can never exceed the floor |
| Text area height | `.fq-quran-safha { flex: 1 1 0%; min-height: 0 }` (`globals.css:419-430` mobile, `:623-637` spread) | No — absorbs whatever the card leaves |
| Footer | Page number, known from `getPagePair(anchor)` without any fetch | No |
| **Header** | Grid row height = `py-3` + tallest cell; cells are empty without metadata | **Yes — the only one** |

So the header is the single thing that must be handled: render ` ` in the juz, hizb, and surah
glyph spans when `pageMetadata` is null. Every cell's height is `font-size × line-height` (the glyph
span sets `lineHeight: 1` with a CSS-driven `font-size`, e.g. `0.95rem !important` at
`globals.css:1180`; the meta spans are `text-[10px]`), so the reserved height equals the filled height
**exactly**, independent of which glyph or how many digits. The middle grid column widens when the
glyph arrives, but the header's total width is the card's, so nothing outside it moves.

### 3. Prefetch — one new stage, not a reshuffle

| Stage | Trigger | Warms | Rationale |
|---|---|---|---|
| A | anchor settles (unchanged behaviour) | JSON + font for `nextAnchor` and `prevAnchor` | feeds the ±1 window a drag reveals |
| B | **after Stage A's promises resolve** | JSON + font for the second page in the last-committed direction | builds a second turn of lead without competing with Stage A for the same bandwidth |

- Direction defaults **forward**; a reversal simply re-targets the next Stage B. No cancellation —
  `FontFace.load()` cannot be aborted and the waste is bounded at one page (~87 KB).
- Stage B pair-expands **only when `isDouble`**, the same rule `baseFontIds` already follows
  (`ReaderPager.tsx:444-447`) — otherwise it re-creates the ADR 0029 Addendum over-fetch.
- Stage B is **prefetch only**. No fourth `Panel`. ADR 0028's three-panel window is untouched, and so
  is #157's constraint that panel count is load-bearing for the strip's `translateX(-100%)` geometry.
- Stage B must not run while a drag or commit is in flight.

## Verified Test Cases

**1 — The card's own measured trace** (arrow commits, double view, Fast 3G, `/ar`):

```
4246ms  PLACEHOLDER  413      →  card + shimmer, page number 413 already visible
4670ms  HIDDEN(font) 413      →  same shimmer, header fills in
5579ms  content      413      →  content
```

Today that stretch is 1333 ms of blank. After: zero blank frames; the visual is one continuous
shimmer. With Stage B, page 413's assets were requested two commits (~1.6 s) earlier rather than one
(~800 ms), which exceeds the ~855 ms a double-view turn costs — so at ordinary reading pace the
shimmer is not reached at all.

**2 — Font ready, JSON not** (revisiting a page whose font is still in the LRU after a cache eviction
or a cold JSON fetch): today `fontReady` is true and `Panel` renders nothing → blank with no
skeleton. After: `!hasData` alone shows the shimmer.

**3 — Reader outruns the link** (holding the arrow key on 3G): every commit lands on an unready page.
Today: back-to-back blanks. After: continuous shimmer with the correct page number ticking up. The
input never blocks — that is the property ADR 0034 refuses to trade away.

**4 — Non-sequential jump** (sidebar/surah list to a distant page): Stage B's lead is useless by
definition. After: shimmer, then content. This is the case the loading state exists for.

**5 — Localhost / fast connection**: JSON and font resolve in ~10 ms, so the shimmer is at most a
frame — the same behaviour the font skeleton already has today.

**6 — #157 regression check**: rendering the real chrome makes the loading panel and the loaded panel
identical in height *by construction*, so `documentElement.clientWidth` must stay constant and the
scrollbar must stay at 0px across a commit — strictly safer than a placeholder whose height was
hand-matched. Must be re-measured, not assumed.

**7 — Pages 1–2**: skeleton line count already branches on `page <= 2`
(`SKELETON_LINE_COUNT_SHORT`), which needs no data. Unchanged.

**8 — Tajweed mode**: the overlay's `pt-[1em] md:pt-[0.5em]` branch keys off
`edition.usesColorGlyphs` (context, not data). Unchanged.

## Files to Change

- `app/components/reader/ReaderPager.tsx`
  - `Panel`: stop gating on `rightData && leftData`. Always render `QuranSpread`, passing the page ids
    (always known from `getPagePair`) and `null` where data is absent. Drop the placeholder `<div>`.
  - Add last-direction tracking (set in `animateCommit`, defaults forward).
  - Split the warm effect into Stage A and Stage B per the table above; Stage B awaits Stage A's
    JSON prefetches **and** its font promise, and skips while `isDragging`/`isCommitting`.
- `app/components/reader/QuranSpread.tsx` — accept nullable `rightPage`/`leftPage` payloads and pass
  the page id through so a safha can render without data.
- `app/components/QuranSafha.tsx`
  - `pageMetadata: PageMetadataWithChapter | null`; `lines` may be empty.
  - Header: render ` ` in the juz, hizb, and surah-glyph spans when metadata is absent.
  - Skeleton overlay condition `!fontReady` → `!fontReady || !hasData`.
- `app/utils/page-font-registry.ts` — `ensurePageFonts` returns a `Promise<void>` that settles when
  the requested faces settle, so Stage B can await Stage A. No change to registration, LRU, or
  eviction semantics.
- `app/components/reader/FontFaceInjector.tsx` — surface the registry promise (or accept the Stage B
  ids) so the pager can sequence the two stages while `FontFaceInjector` stays the single base-font
  registration path (ADR 0029 Addendum).
- `docs/architecture/adr/0034-page-turn-readiness-on-slow-networks.md` — created (done).
- `docs/architecture/DECISIONS.md` — Reader Navigation + Font System amended (done).

## Constraints

- Do not touch `commitTo`, `animateCommit`'s transform/timing, `flushSync`, or the gesture handlers.
  This is a rendering + prefetch change; every ADR 0028 navigation invariant stays as-is.
- Keep the mounted panel window at **three**. #157 established that panel count is load-bearing for
  the strip geometry.
- The loading panel must be exactly the height of a loaded panel. Verify `clientWidth` and scrollbar
  width across a commit (#157's measurement) — a height mismatch reflows the whole document.
- Keep `font-display: block` + the existing skeleton contract. Do not switch to `swap`/`optional`, and
  do not change how `fontReady` is computed — only widen what the overlay responds to.
- Stage B pair-expands only when `isDouble` (ADR 0029 Addendum). Never pass "everything in the window"
  to `ensurePageFonts`.
- `useMarks` is `enabled: pageKey.length > 0` (`use-marks.ts:32`), so a data-less safha must not fire a
  marks request — keep it that way; do not add a fallback page number into `markPages`.
- Verify on both `/ar` and `/en`, and at mobile, tablet double-view, and desktop widths.

## What NOT to Do

- **Do not gate the commit on target readiness.** `reader-persistent-pager.md`'s prohibition stands
  and is *not* superseded by this plan — attempts 16, 20, 22 and 23 in that plan all took this
  direction and were all rolled back. ADR 0034 rejects it on its own merits too: the wait is real
  network time, so gating converts a visible blank into dead input of identical length.
- Do not build a separate skeleton spread component. Duplicated card chrome drifts from the real
  layout — `fix-quran-page-font-loading.md` Issue 3 is that exact bug, already shipped once.
- Do not reintroduce a `min-h` on the loading panel (#157), or any height that differs from a loaded
  panel's.
- Do not mount a fourth panel for the Stage B lookahead — it is cache warming only.
- Do not run Stage A and Stage B in parallel. Concurrency is the thing that makes the immediate
  neighbour late on a saturated link; the serialization is the point, not an implementation detail.
- Do not add the Uthmanic fallback typeface path (rolled-back attempts 17–19). It remains a live
  option in ADR 0034 if the font wait ever needs eliminating rather than covering, but it is out of
  scope here and costs a visible typeface swap inside a mushaf.
- Do not derive the header's surah glyph from `public/quran/chapters.json` to fill it before the JSON
  lands — page↔surah mapping is edition-specific (36 pages disagree, ADR 0033), so it would render a
  silently wrong glyph on those pages.
- Do not add `Cache-Control: immutable` to `/quran/pages/*` as part of this. The SW already
  `CacheFirst`es both page JSON and fonts (`app/sw.ts:59-64`), so the gain is limited to the pre-SW
  first session, and the JSON path carries no content version the way `/fonts/v1/` does — an immutable
  header there would pin stale content for a year after a seeder change.
- Do not widen prefetch beyond depth 2 or lift the font LRU cap (24).

## Implementation Notes

Implemented as planned, with one correction found in browser verification and one measured
constant change.

### The plan's dimensional analysis was half right — and the missing half shipped as a bug

The plan asserted the card's only content-dependent dimension is its header, because
`.fq-quran-safha` is `flex: 1 1 0%`. That reasoning holds only while something in the card
establishes a height for the flex to distribute. On the desktop spread the card is **content-sized**
(ADR 0013 Addendum 2), and the skeleton was `absolute inset-0` — contributing nothing. With the real
lines absent (a state that could not exist before this change, since the skeleton previously only
ran while the content was mounted and merely hidden), the card collapsed:

| At 1389x781, double view | loaded | first implementation |
|---|---|---|
| card box | 412x608 | **412x110** |
| `.fq-quran-safha` | 356x508.3 | **356x10** |
| skeleton bar height | — | **0** (15 bars shrinking inside a 10px flex column) |

This is the same lesson `fix-quran-page-font-loading.md`'s "Skeleton Width Collapse Fix" recorded for
*width* — content must stay in the DOM because the card is sized by it. It is equally true of height;
only the width half was carried across.

User-visible as two symptoms, one cause: a collapsed or partner-stretched skeleton ("the left page
skeleton very big and overflows the safha" — the mixed case, where `items-stretch` pulls the empty
card to the loaded partner's height), and the floating recitation bar starting wide then snapping
(`--fq-spread-width` is published from the same collapsing `.fq-spread`).

**Fix:** when there is no content the bars render **in flow, as direct children of
`.fq-quran-safha`**, inheriting its real flex distribution, `--fq-line-gap` and padding rather than
an overlay's hand-copied `justify-*`/`pt-*` approximations. They remain an `absolute inset-0` overlay
for the font-only wait, where the real text is mounted and supplying the height. Measured: a real
line is exactly `1em` (24.2px at 24.211px font) with `--fq-line-gap` between, so 15 bars reproduce
the loaded height to the pixel.

`SKELETON_LINE_COUNT_SHORT` also changed **7 -> 8**. It was an eyeballed count of *word lines*;
pages 1-2 render their surah banner and bismillah as slots of their own. At 7 the card grew 38px when
the page landed (359 -> 397); at 8 the arithmetic matches the real layout exactly
(8 x 24.211 + 7 x 13.32 gap + 9.68 padding = 296.6, the measured loaded height).

### Second correction: `w-full` bars don't size a shrink-to-fit card

The in-flow bars first shipped as `h-[1em] w-full`. A percentage width contributes nothing to
intrinsic sizing, and the card is shrink-to-fit (`md:w-auto`) — so with the bars as its only content
the card resolved against available space instead, then corrected a frame later. From the user's
own instrumentation at 1399x993 (font-size 30.783px):

    card 523, text 453   skel:false   <- settled
    card 785, text 715   skel:true    <- skeleton overshoots by 262px
    card 523, text 453   skel:true    <- corrects, still skeleton

453 / 30.783 = 14.72em — the real line width, i.e. `QURAN_LINE_WIDTH_RATIO`. The skeleton's 715
(23.2em) corresponds to nothing in the layout. The same log shows `--fq-spread-width` chasing
1045 -> 1164.6 -> 1091.3 -> 1200 while the cards were already stable, because `useSpreadMetrics`
publishes from whichever panel measured last and the skeleton panels were measuring over-wide —
which is the "recitation bar sometimes bigger, sometimes smaller" symptom. One cause, both.

**Change made:** the in-flow bars take `width: ${QURAN_LINE_WIDTH_RATIO}em; max-width: 100%` instead
of `w-full`. A real mushaf line IS 14.7em wide by construction, so this reproduces it exactly and
contributes properly to intrinsic sizing. `max-width` covers mobile, where `--fq-mobile-font` can hit
its 28px cap before the line fills the viewport. Inline style rather than a Tailwind arbitrary value:
the ratio is a JS constant, and a dynamic class would need a literal safelist entry to exist (ADR
0005).

> **NOT RESOLVED.** After this change the user still observes the skeleton starting wider than the
> rendered page and the recitation bar resizing. Every measurement taken (below) shows parity, so the
> reproduction conditions were never actually matched — the remaining case is something the synthetic
> fetch-delay repro does not create. Shipped anyway by explicit decision (2026-07-31); the blank-page
> fix this card is about does work. Treat the width/bar jump as an open follow-up, and do NOT treat
> the measurements below as evidence it is fixed — they are evidence the harness was wrong.
>
> Next session: instrument on the user's real session across a genuine slow-network page turn rather
> than a `fetch` delay (the delay resolves in one task, so it never produces the multi-frame settling
> the user's own log captured), and start from the frame where `--fq-spread-width` is still the
> pre-commit value.

### Verified in the browser (dev server, JSON fetch delayed to force the loading state)

Every figure below is loading-state vs loaded-state on the same page.

| Case | Result |
|---|---|
| Desktop 1399x993 (the reported viewport, font-size 30.783px) | settled / skeleton-sync / +120ms all identical: text 453, card 509, spread 1017, `--fq-spread-width` 1017 — the 715 overshoot and the width correction are gone, so the recitation bar has nothing to chase |
| Desktop 1389x781 double, both pages loading | card 412x608 both; text 508.1 vs 508.3; `.fq-spread` + `--fq-spread-width` identical (823.8 / 823.78); header 40 both; scrollbar 0 |
| Pages 1-2 at 1399x993 | card 508.5x477, text 452.5x377, spread 1017, `--fq-spread-width` 1017, scrollbar 0 — identical in both states |
| Tablet 1120x710 (double-view font cap active) | card 544x710, text 544x642.8, spread 1088 — identical in both states |
| Mobile bar width | 366 = 14.7em = `(100vw - 24px)`, against real lines of 346-360; card width is fixed at that breakpoint so this is cosmetic |
| Mixed (odd loaded, even loading) — the reported case | both cards 412x608; both text blocks 508.3; zero overflow on the loading page |
| Mobile 390x844 single | card 390x844 and text 776 in both states; 15 bars at 1em under `space-between` with symmetric 12px padding; no document scroll |
| Pages 1-2 (`fq-safha-center`) | 396 vs 397 card, 296.5 vs 296.6 text — sub-pixel |
| #157 regression (scrollbar/reflow) | scrollbar 0px and `clientWidth` unchanged in every state above |
| Locales | measured on both `/ar` and `/en` |

`npx tsc --noEmit` and `npm run lint` both clean.

### Known gaps

- **OPEN: skeleton renders wider than the rendered page, and the recitation bar resizes.** Still
  reported by the user after both width and height corrections. Shipped unresolved by explicit
  decision. The page-turn blank — the actual subject of this card — is fixed and verified; this is a
  cosmetic settling artefact on the same surface. See the NOT RESOLVED note above for where to
  restart.

- **Colour-glyph (tajweed) editions get no font lookahead.** Their fonts load through
  `FontFaceInjector`'s keyed `<style>` elements, which only cover the live window, so Stage B warms
  their JSON but not their font. Not a regression; the tajweed path is exactly as it was.
- **Stage B's mid-gesture guard may be self-defeating** — see the note under Decisions Made.
- The 3G end-to-end timing improvement was not re-measured under real throttling; verification used a
  deterministic fetch delay, which proves the loading state and the dimensional stability but not the
  latency win.

## Decisions Made

- **Instant commit + honest loading state + lookahead prefetch** (ADR 0034 Option C), user-confirmed
  over readiness gating (A), a duplicate skeleton component (B), and the Uthmanic fallback (D).
- **Scope includes the prefetch work.** User-confirmed: the loading state alone fixes the literal bug
  report but leaves a shimmer on every 3G turn, which fixes the blank without fixing the reading
  experience behind it.
- **The loading state reuses `QuranSafha`.** Chosen specifically because this repo has already shipped
  a drifting duplicate skeleton once.
- **Header height reserved with ` `.** Raised by the user — an empty header would grow when the
  JSON lands, shrinking the flex text area and shifting every skeleton line, which is the very
  flicker class this work exists to remove. Width needed no equivalent handling: the card's width
  floor already makes it content-independent (to be confirmed by measurement, not by reading).
- **No cancellation on direction reversal.** `FontFace.load()` is not abortable and the waste is one
  page.
- **Stage B's "skip while dragging/committing" guard was implemented as planned, but is suspect.**
  On 3G Stage A takes ~1s while the reader turns every ~800ms, so they will often be mid-gesture
  exactly when Stage A resolves, and the lookahead is skipped precisely when it matters. The guard's
  rationale does not survive scrutiny either: once Stage A has resolved, nothing the user is waiting
  on is in flight, so Stage B is not competing with anything. Kept as planned rather than deviating
  silently — revisit by either dropping it or narrowing it to `isCommitting`.
