# Fix Desktop Search Dropdown Hidden by Reader Stacking Context

**Type:** bug  
**Date:** 2026-08-02  
**Status:** implemented  
**Trello:** https://trello.com/c/3qDeICxN/180-the-searchbar-doesnt-work-on-desktop

## Summary

On reader pages (`/[locale]/pages/[id]`), typing in the desktop search bar produces no visible results — the dropdown renders but is painted behind the reader pager strip. The root cause is a CSS stacking-context ordering problem: the nav's `backdrop-blur-md` creates a `z-index: auto` stacking context, and the pager strip's `transform: translateX(-100%)` creates another `z-index: auto` stacking context later in the DOM. At the same z-level, DOM order determines paint order, so the strip covers the dropdown. The fix is one line: give the nav `relative z-10` so its stacking context has an explicit z-index that beats the reader content.

## Root Cause

CSS stacking-context paint order at z:auto:

```
Root stacking context
├── <nav>  backdrop-blur-md → stacking context, z:auto (DOM position: first)
│   └── SearchQueryResults  z-50  (only meaningful within nav's context)
└── Reader children
    └── .fq-reader-pager-strip  transform: translateX(-100%) → stacking context, z:auto (DOM position: later)
        └── covers the entire viewport from y=56px down
```

Two z:auto stacking contexts in the same parent: later DOM sibling wins. The strip (later) paints over the nav (earlier), hiding the search dropdown.

On the homepage there is no pager strip, so the dropdown is not occluded — confirmed by E2E visual test (`search-${locale}-${theme}.png`) which goes to `/${locale}`, not a reader route.

## Fix

Add `relative z-10` to the nav's base `className` in `Nav.tsx`.

- `relative` makes the nav a positioned element so `z-index` applies (z-index is a no-op on `position: static`).
- `z-10` gives the nav's stacking context an explicit rank of 10 in the root context — above all z:auto reader content (effective 0) but below RecitationPlayerBar / PlansWidget (z-40) and Radix portals.
- In overlay mode (mobile/tablet reader), the existing `fixed top-0 inset-x-0 z-50` still applies and overrides both (`fixed` overrides `relative`, `z-50` overrides `z-10`). No change to overlay behavior.

## Files to Change

- `app/components/nav/Nav.tsx` — add `relative z-10` to the nav's base className string (the first class block inside `cn()`).

## Verified Test Cases

| Route | Before fix | After fix |
|---|---|---|
| `/en` (homepage) | Works (no pager strip in DOM) | Works (unchanged) |
| `/en/pages/1` (reader) | Dropdown hidden behind strip | Dropdown visible above strip |
| `/ar/pages/2` (RTL reader) | Dropdown hidden | Dropdown visible |

## Z-index Hierarchy (post-fix)

| Element | z-index (root context) |
|---|---|
| `.fq-spread::after` binding crease | 5 |
| Nav (non-overlay) | **10** (new) |
| `.fq-nav-arrow` reader arrows | 20 |
| RecitationPlayerBar | 40 |
| PlansWidget | 40 |
| Nav (overlay mode) | 50 (unchanged) |
| Radix Sheet/Dialog portals | >50 |

## Constraints

- Nav arrows (`fq-nav-arrow`, z-20) are within the reader content area and don't visually overlap the nav — no conflict.
- RecitationPlayerBar (z-40) is at the right rail / bottom; no visual overlap with the top nav — no conflict.
- `relative` adds no layout offset (no top/left/right/bottom set), so the nav stays in its natural flow position.
- Do not raise the nav above z-20 (the arrow level) unless a concrete conflict requires it.

## What NOT to Do

- Do not use a React Portal for the search dropdown — it would require manual absolute positioning and is disproportionate to the problem.
- Do not remove `backdrop-blur-md` from the nav — that would break the glass-chrome style shared with RecitationPlayerBar (see DECISIONS.md Correction Round entry).
- Do not add `z-index` to individual child elements inside the nav (e.g. the search container) — child z-indexes are scoped to the nav's stacking context and have no effect on the root context ordering.
- Do not set the nav to `z-50` in non-overlay mode — that would needlessly compete with RecitationPlayerBar and Radix portals.

## Decisions Made

- `z-10` chosen as the nav's non-overlay z-index: enough to beat all z:auto reader stacking contexts, low enough to stay below arrows (z-20), bar (z-40), and portals (50+).
- DECISIONS.md gets a one-line note explaining the `relative z-10` invariant so the constraint survives future refactors.
