---
title: Safha Ribbon Indicator
type: feature
date: 2026-08-18
status: implemented
area: rendering
---

# Safha Ribbon Indicator

## Summary

Add a purely decorative bookmark-ribbon shape to the mushaf reader, unrelated to the existing `◆ {page} ◆` footer already printed under each `QuranSafha` card. In tablet/desktop **double** view it sits centered on the gutter seam between the two facing pages (echoing where a real book's ribbon bookmark drapes). In mobile and desktop **single** view it hangs off the page's outer edge — right for an odd page, left for an even page — which doubles as a functional cue: since a single page shows no facing partner, the ribbon's side tells the reader whether this page would sit on the right or left half of a spread.

Confirmed with the user via an SVG mockup (three placements: double-view gutter, single-view odd/right, single-view even/left) — approved as-is.

## Approach

The codebase already carries everything needed to place this with pure CSS, no new JS state:

- `QuranSpread.tsx` already passes `stackPeekSide="right"` to the physically-right `QuranSafha` (always the **odd**, lower-numbered half of the pair — confirmed via `getPagePair`: `rightPage = pairIndex*2-1`, `leftPage = pairIndex*2`) and `stackPeekSide="left"` to the even one. This is exactly the odd/even signal the ribbon needs — no new prop.
- `compensateStackGap` (already `true` only for spread-rendered cards, `false` for standalone `QuranSafha` elsewhere) gates the ribbon so it never appears outside the reader.
- Single-vs-double **display** is already CSS-gated, not JS-gated (ADR 0013 Addendum 4 / ADR 0043): tablet (1024–1366px) forces double unconditionally; desktop (≥1367px) shows double only when `:root[data-safha-view="double"]`. The ribbon's placement switch reuses these exact same media queries, so it is correct at first paint with no flash.
- In single view only one of the two `QuranSafha` cards is ever visible (`.fq-spread .fq-safha-partner { display: none }`, already existing) — so rendering one ribbon per card and letting existing partner-visibility rules hide the other's ribbon automatically avoids any new "which page is current" branching.

## Decision Tree

| Condition | Ribbon behavior |
|---|---|
| Viewport < 1024px (mobile, small laptop) | Only the current card renders (partner hidden). Its ribbon sits at its own `stackPeekSide` edge: right if that card is the odd/right one, left if even/left. |
| 1024–1366px (tablet, always double) | Both cards render. The right/odd card's ribbon relocates to its **left** edge (the gutter); the left/even card's ribbon is hidden — one ribbon, centered on the seam. |
| ≥1367px, `data-safha-view` ≠ "double" (desktop single, default) | Same as the <1024px row — only the current card shows, ribbon at its own outer edge. |
| ≥1367px, `data-safha-view="double"` (desktop double) | Same as the 1024–1366px row — right card's ribbon moves to the gutter, left card's ribbon hidden. |

## Verified Test Cases

- Page 403 (odd) in mobile single view → ribbon on the right edge of the visible card.
- Page 404 (even) in mobile single view → ribbon on the left edge.
- Pages 403/404 in tablet double view → one ribbon centered on the seam between them (from the 403 card's div, repositioned to its left edge via the tablet media query; the 404 card's ribbon is hidden).
- Pages 403/404 in desktop double view (`data-safha-view="double"`, ≥1367px) → same as tablet.
- Page 404 alone in desktop single view (default `data-safha-view`, ≥1367px) → ribbon on the left edge, same as mobile.
- Standalone `QuranSafha` usage (`compensateStackGap` false — e.g. any non-pager render) → no ribbon at all.

## Visual Design (confirmed via mockup)

- Bookmark-tail shape: a vertical strip ending in a pointed/forked (swallow-tail) notch at the bottom, like a real ribbon bookmark — not a plain rectangle.
- Single accent color only, per `docs/design/design-principles.md`: main body `fill: hsl(var(--primary))`; the top ~15% (the "fold" where the ribbon wraps the page's top edge) is the same hue darkened via `filter: brightness(0.7)` — no second hue introduced.
- No text/number on the ribbon — purely a shape, unlike the print-style `◆ {page} ◆` footer.
- No interaction — not a link, not clickable, `pointer-events-none`.
- Drapes from slightly above the card's top edge down past its bottom edge (echoes a real ribbon's excess hanging past the closed pages).
- Implemented as inline JSX SVG in `QuranSafha.tsx` (consistent with the existing `◆` diamond ornaments, which are also inline rather than an imported asset file) — the shape is simple enough not to need a separate `.svg` import like `BismillahSVG`/`SurahFrameSVG`.

## Files to Change

- `app/components/QuranSafha.tsx` — add the ribbon SVG, rendered only when `compensateStackGap` is true, positioned by `stackPeekSide` via a new `fq-safha-ribbon` class + inline right/left edge placement (mirrors how the existing stack-layer decorations use `stackPeekSide`).
- `app/globals.css` — two new rules reusing the existing double-view media queries (tablet `1024–1366px` block near the `.fq-safha-partner { display: block }` rule, and the `≥1367px` + `:root[data-safha-view="double"]` block) to: (a) flip `.fq-compensate-r .fq-safha-ribbon` from its right edge to its left edge, and (b) hide `.fq-compensate-l .fq-safha-ribbon` entirely.

## Constraints

- No JS breakpoint hooks (`useIsTablet`, `useIsLgUp`) may gate the ribbon's position/visibility — CSS media queries only, matching ADR 0043 (first-paint correctness).
- Do not touch the existing `◆ {page} ◆` footer — confirmed unrelated, stays as-is.
- Do not add any click handler, link, or state to the ribbon — purely decorative.
- Do not introduce a second accent hue — the fold shading must be a `brightness()`/opacity variation of `var(--primary)`, not a new color.
- Ribbon must not render for standalone `QuranSafha` usage (`compensateStackGap` false).

## What NOT to Do

- Do not make the ribbon show the page number — considered and explicitly rejected by the user; that information already lives in the separate footer.
- Do not make the ribbon interactive (bookmark/jump-on-tap) — considered and explicitly rejected; purely visual.
- Do not render two ribbons in double view (one per card meeting at the seam) — rejected in favor of one ribbon (from the odd/right card) repositioned onto the gutter, matching the single-ribbon look of a real book.
- Do not introduce a new prop for odd/even or left/right — `stackPeekSide` already carries this.

## Decisions Made

- Reuse `stackPeekSide` (already odd=right/even=left per pair) instead of adding a new prop — noted here since it's a non-obvious reuse a future reader might not expect from the prop's original name/purpose (stack-layer peek direction).
- No new ADR: this only applies the existing CSS-gated-breakpoint decision (ADR 0043) to a new consumer; it does not introduce a new invariant.
