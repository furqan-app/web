# ADR 0034: Page Turns Commit Immediately and Absorb Network Latency With Lead Time, Not Gating

**Date:** 2026-07-30
**Status:** Accepted

## Context

A reader page turn needs two assets the pager cannot render without: the page's content JSON
(~3.5 KB gzipped, latency-bound) and its WOFF2 page font (~83.5 KB, bandwidth-bound). On a Fast 3G
link (~195 KB/s, 562 ms latency) a double-view turn needs roughly 855 ms of font transfer alone, so a
reader turning pages faster than about one per second is asking for more bytes per second than the
connection delivers. The pager's prefetch (ADR 0028) warms only the ±1 window, giving exactly one
turn of lead — less than the transfer costs. This wait is real network time: no scheduling change
removes it, so the only open question is where it is spent and what the reader sees while it passes.

## Options Considered

**Option A — Readiness-gated commit**
Hold the anchor swap until the target page's JSON and font have both arrived, with a timeout
fallback. Trades a visible blank for dead input of the same duration.

**Option B — Instant commit with a duplicate skeleton component**
Commit unconditionally and render a purpose-built skeleton spread while data is in flight.

**Option C — Instant commit, loading state rendered by the real component, plus lookahead prefetch**
Commit unconditionally; render `QuranSafha` itself with absent data so the loading state *is* the
real card chrome; and extend prefetch to a second, serialized stage so the lead time covers the
transfer and the loading state is rarely reached.

**Option D — Fallback typeface while the page font loads**
Commit unconditionally and render the page in the global Uthmanic font, swapping to the page's own
glyphs when its font resolves.

## Decision

**Option C.** The commit stays unconditional; the wait is absorbed by lead time, and whatever
remains is shown as the card's existing calibrated skeleton rather than as an empty area.

Three rules follow from it:

1. **The loading state is a state of `QuranSafha`, never a separate component.** `pageMetadata` is
   nullable and the skeleton overlay shows whenever the font *or* the content is missing. Duplicated
   chrome drifts from the real layout — this codebase has already shipped that bug once, when a
   duplicated skeleton fell out of sync with the card's padding and flex distribution.
2. **A card with no content must reserve every dimension the content would have supplied.** Two of
   them:
   - **The text block's height.** On the desktop spread the card is *content-sized* (ADR 0013
     Addendum 2) — `.fq-quran-safha`'s `flex: 1 1 0%` distributes a height that the lines themselves
     establish. An `absolute inset-0` skeleton contributes none, so with the lines gone the card
     collapses to its header and footer (measured: 608px → 110px, bars shrinking to 0 inside a 10px
     flex column). The skeleton bars must therefore render **in flow, as direct children of
     `.fq-quran-safha`**, whenever there is no content — inheriting its real flex distribution,
     `--fq-line-gap` and padding instead of an overlay's hand-copied approximations. They stay an
     overlay in the font-only wait, where the real content is mounted and supplying the height.
     Consequently `SKELETON_LINE_COUNT`/`_SHORT` are load-bearing layout values, not decoration:
     they must equal the page's *slot* count (15, and 8 for pages 1–2, which render their surah
     banner and bismillah as slots of their own).
   - **The header's height.** Its cells are the card's only content-dependent dimension that
     survives the above, so juz and the surah glyph reserve their line box with a non-breaking space
     when metadata is absent. Every cell's height is `font-size × line-height`, independent of glyph
     or digit count, so the reservation is exact rather than approximate.

   The card's *width* needs nothing: it is floored by a font-scale formula built from the worst-case
   line-width ratio, and measured identical loaded and unloaded.
3. **Prefetch runs in two stages, the second gated on the first.** Stage A warms the ±1 window as
   before; Stage B warms the second page in the last-committed direction, started only once Stage A
   settles, so lookahead never competes with the window the user is about to see for the same
   bandwidth. Stage B is prefetch only — the mounted panel window stays at three (ADR 0028).

Option A is rejected and the existing prohibition on readiness-gated commits (ADR 0028's plan)
**stands** — this decision does not supersede it. Option D stays available if the font half of the
wait ever needs to be eliminated rather than covered; it was measured and calibrated once
(`UTHMANIC_FALLBACK_FONT_SCALE`) but costs a visible typeface swap in a mushaf, which is a higher
price than a shimmer.

## Consequences

- **+** A page turn never shows an empty reader: the card, its page number, and a shimmer calibrated
  to the real line positions are present from the first frame after commit.
- **+** Input stays instantly responsive at any connection speed — the property Option A gives up.
- **+** Two turns of lead (~1.6 s) exceeds a double-view turn's ~855 ms of transfer, so at ordinary
  reading pace the loading state is not reached at all.
- **+** The loading state cannot drift from the real layout, because it is the real layout.
- **-** `QuranSafha` gains a nullable-data path, so every future change to its chrome has to hold for
  a card with no page metadata.
- **-** Stage B amends ADR 0029's rule that `ensurePageFonts` only ever receives genuinely-visible
  ids. Lookahead deliberately loads a font for a page that is not on screen. The rule's purpose —
  never eagerly downloading a font for content the layout is hiding — is unchanged: Stage B must
  pair-expand only when `isDouble`, exactly as `baseFontIds` does.
- **-** Reversing direction wastes one page's assets. Accepted: cancellation for an in-flight
  `FontFace.load()` does not exist, and the waste is bounded at roughly 87 KB.
- **-** The header's surah glyph appears mid-shimmer when the JSON lands, a little ahead of the text.
  Accepted as a progress signal; it moves nothing, since the height is already reserved.
