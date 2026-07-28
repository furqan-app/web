# ADR 0032: Depth on near-black surfaces comes from light, not shadow

**Date:** 2026-07-27
**Status:** Accepted

## Context

The dark theme's `--background` is `212 52% 6%` — RGB `(7,15,23)`. Any drop shadow drawn on it
has roughly 7 points of headroom before it clips to black, so a shadow that would read clearly
on a light surface is imperceptible here. The same applies to inset "dip" shadows on
`--mushaf-paper` (`#0C131A`), only ~5 points above the shell. Depth effects on these surfaces
must therefore be designed against a measured brightness ladder rather than by transplanting
light-theme shadow recipes, and any ambient gradient must be sized relative to the element it
sits behind — a radial pool whose radius matches the occluding element's half-width is
entirely hidden by it and only its dead tail is ever visible.

## Options Considered

**Option A — Tune shadow opacity/blur until it reads**
Keep the conventional drop-shadow/inset-vignette approach and increase strength until the
effect becomes visible.

**Option B — Carry depth with light, verify against sampled pixels**
Express depth as a monotonic brightness ladder — lit face above its surround, surround above
the far background, creases below both — and confirm each step by sampling rendered RGB
rather than by reading the CSS.

## Decision

Option B. On dark-theme surfaces at or below roughly 10% lightness, depth is carried by
graded light; drop shadows are omitted rather than tuned. Any depth or ambient-light change to
these surfaces is verified by sampling the rendered pixels, not by inspecting the declaration.

## Consequences

- **+** Effects are visible on first implementation instead of converging over many rounds; the
  earlier gutter work needed ten correction passes and two delegated investigations, twice
  because a shadow was mathematically present but produced no visible pixels.
- **+** Gives a falsifiable acceptance test — a depth treatment either produces a monotonic
  ladder or it does not.
- **+** Ambient pools get sized against the element they sit behind, so they cannot be silently
  occluded.
- **-** Dark-theme depth no longer shares a recipe with light/gold, which still use ordinary
  shadows; the two must be tuned separately.
- **-** Verification needs a running dev server and pixel sampling, so it cannot be done by
  code review alone.
- **-** Carrying depth with light raises average surface brightness slightly, which trades
  against the calm, low-luminance intent of the dark theme; the ladder's steps are kept small
  for that reason.

## Addendum (2026-07-27) — the ladder is per-design, and where to sample

The first desktop pass recorded a fixed acceptance ladder including "page outer edge 25" and
"surround − far background in 5–9". Both were wrong, for two different reasons, and the review
that followed replaced them.

The edge figure was **sampled at the wrong coordinate**. Verification used viewport fraction
0.955, which lands on the desk, not the paper — the reader's current panel spans roughly
0.215–0.774 of the viewport, because the pager mounts three panels side by side and the visible
one is the middle. That sample was reading the ambient pool and reporting it as the page edge.
Sample points must be derived from the measured card rectangles of the **middle** panel, never
from viewport fractions assumed by eye.

The surround figure encoded one design as if it were a law. On review the ambient desk pool was
removed outright, making surround equal to the far background by intent; a ladder step demanding
they differ would have failed a design the user had chosen. The invariant is the **ordering**
(lit face > surround ≥ far background, creases below both) plus verification by sampled pixels.
Specific step values belong to a specific design and live in that design's plan, not here.
