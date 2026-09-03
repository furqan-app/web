---
title: Fix Tajweed Mushaf Swipe Flicker
type: bug
date: 2026-08-18
status: implemented
area: reader
---

# Fix Tajweed Mushaf Swipe Flicker

## Summary

The tajweed mushaf flickers on every swipe — online and offline, every page including revisits — while
the madani mushaf never does, under any of the same conditions. Root cause confirmed via two
independent real-Chrome DevTools Performance traces (staging site + local dev, CPU-throttled to
approximate mobile): `QuranWord`'s hover cue (`filter: drop-shadow` + `scale` transform) is identical
code for both editions, but disproportionately expensive to rasterize over tajweed's multi-layer COLRv1
glyphs versus madani's single-layer glyphs. A swipe drags the pointer across many words, transiently
triggering `:hover` on each — cheap for madani, expensive for tajweed, with no code difference to
explain it, only glyph complexity.

Two earlier theories were investigated this session and disproven by live testing, not just
reasoning — see "What NOT to Do."

## Root Cause

`app/components/QuranWord.tsx` — the word wrapper's className includes, unconditionally for every
edition:

```
hover:scale-[1.06] hover:[filter:drop-shadow(1px_1px_0px_hsl(var(--foreground)/0.4))] transition-[filter,transform] duration-150
```

No `tajweedMode`/`edition.usesColorGlyphs` branch exists here. During a page-turn drag (`ReaderPager`'s
strip-transform swipe), the pointer or finger moves across many `QuranWord` elements in sequence, each
briefly entering `:hover`. `filter: drop-shadow` computes a shadow from the element's alpha channel;
`code_v1` (madani) is a single-layer glyph, cheap to rasterize this way. `code_v2` (tajweed, COLRv1) is
built from multiple stacked colour sub-glyphs per word (DECISIONS.md, Tajweed Mushaf Mode — CPAL
palette-slot mapping) — computing the same filter over a multi-layer composite is measurably more
expensive. Same CSS, same JS, purely a rendering-cost asymmetry invisible from source.

**Quantified** (two Chrome DevTools Performance traces, identical swipe gesture, CPU-throttled,
Bottom-Up self-time comparison):

| Metric | Tajweed | Madani | Ratio |
|---|---|---|---|
| `Event: pointerover` total time | 2,719.6ms (17.4% of trace) | 61.7ms (0.6%) | ~44x |
| Main React work-loop total time | 5,238.2ms (33.5%) | 1,407.5ms (13.6%) | ~2.5x |
| Layout | 756.1ms | 277.8ms | ~2.7x |
| Recalculate style | 71.9ms | 22.7ms | ~3x |

All four independently point the same direction: real, sustained per-swipe work, concentrated under
pointer-triggered hover handling, specific to tajweed.

## Decision Tree / Algorithm

| Condition | Hover filter/transform |
|---|---|
| Pointer genuinely hovering/tapping a word, not dragging | Runs as today (both editions) — no change to the resting hover cue |
| Active swipe/drag in progress (`ReaderPager`'s `isDragging`) | **Suppressed** — no `filter`/`transform` computed for any word the pointer passes over mid-drag |
| Drag ends (commit or snap-back) | Hover cue resumes normal behavior on the next genuine hover |

`isDragging` is already tracked as a ref in `ReaderPager` for the strip-transform mechanism (referenced
throughout `ReaderPager.tsx`, e.g. the Stage A/B prefetch gating) — this reuses that existing signal
rather than introducing a new one.

## Verified Test Cases

The quantified trace comparison above (tajweed vs madani, identical gesture) is the verification —
walked through with the user across two live capture-and-compare rounds before this was accepted as
root cause. Two competing theories were tested and explicitly ruled out in the same session:

1. **Font-prefetch lookahead margin (ADR 0034's Stage B).** Real gap exists (madani warms 2 spreads
   ahead via the FontFace-API registry, tajweed only 1, via its CSS `@font-palette-values` path) — but
   traced through `ReaderPager.tsx` and found to not exist at all in single/mobile view (both editions
   warm an identical page set there), and structurally cannot explain a revisited page flickering again
   (the persistent pager moves panels rather than remounting them, so `fontReady` cannot revert once
   true without an actual remount). Ruled out.
2. **CSS `<style>`-insertion recalc cost.** Live-instrumented via `PerformanceObserver('longtask')` +
   `MutationObserver`: tajweed showed ~75-79ms longtasks correlated with new `@font-palette-values`
   insertions per swipe; madani showed equal-magnitude ~75-105ms longtasks with zero style insertions.
   Equal cost with or without the CSSOM mutation rules out the mutation as the driver. Ruled out.
3. **Font decode/parse time.** Raw `FontFace.load()` timing (isolated from the app) on 5 fresh pages
   per edition: tajweed avg 272.7ms, madani avg 265.3ms, overlapping ranges. No meaningful difference.
   Ruled out. (Also corrected in the same pass: the "~9-10x heavier font" figure DECISIONS.md previously
   stated was stale — measured on disk, tajweed is ~5-8% heavier, not ~10x.)

## Files to Change

- `app/components/QuranWord.tsx` — thread an `isDragging`-derived flag down (or read a shared
  drag-state context/ref) and conditionally suppress the `hover:scale-[1.06] hover:[filter:drop-shadow(...)]`
  classes while a drag is active. Exact mechanism (prop from `ReaderPager`/`QuranLine`, or a lightweight
  shared ref/context read directly) to be decided during implementation — `QuranWord` is `memo`'d, so
  whatever signal is used must not defeat that memoization for the common (non-dragging) case.
- `ReaderPager.tsx` — expose `isDragging`'s current state in a form `QuranWord` (several levels down,
  through `QuranLine`/`QuranSafha`) can read without forcing every word to re-render on every drag-frame
  update. A ref-based read (not React state) is likely required to avoid a per-drag-tick re-render
  cascade across every visible word — evaluate during implementation.
- `docs/architecture/adr/0023-tajweed-mushaf-mode.md` — Addendum 8 already added (this session)
  documenting the confirmed root cause and the two disproven theories.
- `docs/architecture/DECISIONS.md` — Tajweed Mushaf Mode section already updated (this session):
  corrected the stale "~9-10x heavier font" figure, corrected a stale bullet describing a superseded
  `hover:bg-primary/25`/`hover:text-yellow-500` per-edition hover branch (current code has no such
  branch), and added the hover-cost constraint with the fix requirement.

## Constraints

- The suppression must be scoped to the drag window only — the resting `:hover` cue (tap-and-hold or
  desktop mouse-hover with no active drag) must be unchanged for both editions.
- Must not defeat `QuranWord`'s `React.memo` for the common case (not dragging) — whatever signal
  triggers the suppression should not cause every word to re-render on every drag-frame tick. Prefer a
  ref/CSS-driven approach (e.g., toggling a class on a shared ancestor during drag, so the browser's own
  selector matching — not React re-renders — decides which words skip the hover rule) over threading
  live drag state through React props/state on every word.
- Do not make this tajweed-specific in a way that requires `QuranWord` to know its own edition — the
  suppression should apply uniformly (harmless for madani, where the cost was never measurable) rather
  than adding an edition branch to a component that currently has none.

## What NOT to Do

- Do not re-investigate the font-prefetch lookahead gap (ADR 0034 Stage B) as the fix target — real,
  but tested and shown insufficient to explain the reported symptoms (see Verified Test Cases #1).
- Do not "fix" this by changing font-loading, prefetch, or CSS `<style>`-injection timing/mechanics —
  tested and shown not to be the cost driver (see Verified Test Cases #2, #3).
- Do not add a `tajweedMode`/`edition.usesColorGlyphs` branch to `QuranWord`'s hover styling — the fix
  is drag-state-gating, uniform across editions, not an edition-specific CSS path.
- Do not restore the stale "~9-10x heavier font" or "`hover:bg-primary/25`" claims if seen elsewhere in
  docs/plans — both were corrected this session as drift from the current code.

## Decisions Made

- Root cause is the `:hover` `filter`/`transform` cost on `QuranWord`, disproportionate on COLRv1
  multi-layer glyphs during a drag-triggered hover cascade — confirmed via comparative live profiling,
  not code-reading alone.
- Fix is to gate the hover filter/transform off during an active swipe drag (reusing `ReaderPager`'s
  existing `isDragging` signal), not an edition-specific styling branch.
- Two earlier hypotheses (prefetch lookahead margin, CSS-insertion recalc) are recorded as ruled out so
  neither is re-attempted without new evidence.
