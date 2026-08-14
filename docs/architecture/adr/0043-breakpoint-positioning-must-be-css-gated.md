# ADR 0043: Breakpoint-Dependent Positioning Must Be CSS-Gated, Not JS-Hook-Gated

**Date:** 2026-08-15
**Status:** Accepted
**Related:** [ADR 0027](0027-tablet-swipe-carousel.md) (same technique, scoped to the tablet carousel offset), [ADR 0042](0042-pwa-launch-resolves-before-first-paint.md) (adjacent principle for launch-time navigation)

## Context

`useIsMobile`/`useIsTablet`/`useIsDesktopUp` are `matchMedia`-backed hooks that default to `false`
and resolve the real value inside `useIsomorphicLayoutEffect`. That hook runs `useLayoutEffect` on
the client — synchronous, before the *next* browser paint — which is sufficient to avoid a flash on
remounts and re-renders that happen after the app has already hydrated. It is not sufficient for
JSX that decides `position`/layout on the very **first** paint: the server has no `window`, so SSR
always emits the `false` branch, and the browser paints that raw SSR HTML *before* React hydrates
and the layout effect ever runs. A layout effect can only pre-empt the paint that follows its own
commit — it cannot retroactively fix a paint that already happened.

This surfaced concretely in `Nav.tsx`: `isOverlayMode` (mobile/tablet + reader route) decides
`position: static` vs `position: fixed`. SSR always ships `static` (in document flow); the reader
wrapper below it separately reserves `min-h-[calc(100dvh-3.5rem)]` regardless of nav mode, so the
combined first-paint height exceeds one viewport, and the page is briefly scrollable — until
hydration's layout effect flips the nav to `fixed`, which pulls it out of flow and snaps the content
back up.

## Options Considered

**Option A — Keep the JS hook, add a pre-hydration inline script**
Mirror the theme/safha-view flash-preventers (`app/layout.tsx`) with a synchronous `<script>` that
sets a `data-*` attribute from `matchMedia` before first paint. Works, but adds a third bespoke
inline script to maintain and re-derives breakpoint values that already exist as CSS `@media` widths
elsewhere in `globals.css`.

**Option B — CSS-gate the positioning directly**
Express the fixed/hidden positioning as `@media` rules using the same breakpoint widths the JS hooks
already encode, keyed only on route (`isOnPagesRoute`, derived from `usePathname()` — correct on the
very first server render, no hydration gap). JS only ever toggles a `visible` class on top; it never
decides `position` itself.

## Decision

Option B. Any UI whose `position`/`display` must be correct on the very first paint — not just after
a later re-render — resolves the breakpoint via CSS `@media`, never via `useIsMobile`/`useIsTablet`/
`useIsDesktopUp` (or any other `matchMedia` hook, however it's timed). Those hooks remain fine for
content that only needs to be right *eventually* (e.g. showing/hiding a button after mount).

## Consequences

- **+** Eliminates a whole class of first-paint flash/reflow bugs — the browser gets the right
  layout in one paint, with no JS execution required at all.
- **+** Reuses breakpoint widths already duplicated across `globals.css`'s `@media` blocks instead of
  adding a second source of truth in a `<script>`.
- **-** Breakpoint values now have two forms in the codebase (CSS `@media` widths and the JS hook
  query strings) that must be kept in sync by hand when either changes.
- **-** Route-gating (e.g. `isOnPagesRoute`) still needs a class hook driven by `usePathname()`, since
  CSS has no way to match a route — only the breakpoint half of the condition moves to CSS.
