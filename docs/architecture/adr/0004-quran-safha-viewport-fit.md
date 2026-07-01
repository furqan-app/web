# ADR 0004: Viewport-fit sizing for the mushaf page

**Date:** 2026-07-01
**Status:** Accepted

## Context

`QuranSafha` renders a mushaf page (up to 15 line-slots: a normal text line is 1 slot, a surah heading + Bismillah block is 2 slots). The word font-size already scales with `vh` via `FONT_V1`, but every other vertical measurement — per-line gap, surah-heading block, card padding, header/footer bands — was fixed `px`/`rem`. On pages whose 15 slots include a heading, the fixed overhead pushed total height past the viewport, forcing a scroll the mushaf-page metaphor shouldn't have.

## Options Considered

**Option A — Shrink the default reading font size**
Reduce `FONT_V1.baseScaleViewHeight` until 15 slots fit. Simplest lever, but degrades the actual reading experience (the one thing users came for) to compensate for chrome/spacing that has nothing to do with legibility.

**Option B — Tie all vertical rhythm to the same `vh` budget as the font size, leave the font size untouched**
Convert per-line gaps, the heading block, card padding, and wrapper padding to `vh`-derived values (via CSS custom properties computed from `FONT_V1`), calibrated so exactly 15 slots fit within `100vh` minus the fixed nav bar, at the default font scale. Font size itself never changes.

**Option C — Cap card height and let content overflow-scroll inside it**
Keep all current fixed spacing, just clip the card to viewport height with internal scroll. Technically "fits the screen" but reintroduces scrolling (inside a smaller box), which is what the request was against.

## Decision

Option B. All vertical rhythm below the page nav (wrapper padding, card padding, header/footer band gaps, per-line gap, surah-heading block) is computed from the same `FONT_V1` scale that already drives word font-size, exposed as CSS custom properties on the `QuranSafha` root and consumed by `QuranLine`. Reading font size is never touched by this fix.

## Consequences

- **+** The "no scroll at default scale" guarantee holds by construction (verified at multiple viewport heights) without shrinking the text.
- **+** Because gap and heading-block sizing are ratios of `fontSizeVh`, raising the user's font-scale slider keeps proportions consistent — it just re-introduces scroll at higher scales, which is expected and out of scope for this fix.
- **-** The site nav bar (`h-14`, 56px fixed) is the one remaining fixed-px term in the budget, so the fit guarantee has a small margin that shrinks on very short viewports (calibrated safe down to ~700px viewport height; below that, a few px of scroll may reappear). Fully eliminating this would require making the global nav height `vh`-based, which is out of scope (shared site chrome, not part of the mushaf page).
- **-** Per-line spacing is visually tighter than before (~1.5vh vs the old fixed 16px) to make the budget work — a deliberate trade of a bit of whitespace for guaranteed fit.
