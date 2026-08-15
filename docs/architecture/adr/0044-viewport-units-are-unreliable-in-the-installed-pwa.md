# ADR 0044: Viewport Units Are Unreliable Across the Installed PWA's Fullscreen Transition

**Date:** 2026-08-15
**Status:** Accepted
**Related:** [ADR 0042](0042-pwa-launch-resolves-before-first-paint.md) (the launch document this races against), [ADR 0043](0043-breakpoint-positioning-must-be-css-gated.md) (same "must be right at first paint" family), [ADR 0036](0036-reader-fills-height-band.md) (how height travels below the reader box), [ADR 0011](0011-mobile-quran-font-scale-vw-formula.md) (the mobile font formula this protects)

## Context

The installed PWA declares `display: "fullscreen"`. Android launches it **non-immersive** — the OS
splash paints with the status bar and gesture pill visible — and Chrome enters immersive fullscreen
a moment later. `public/launch.html` redirects into the reader during that window, so the reader
document's first layout can land on either side of the transition.

When it lands *during* the transition, Chrome pins the document's viewport units to the transitional
viewport and never re-resolves them once the viewport settles. Measured on-device (vivo V2530,
393×870 CSS px, 37.5 CSS px display cutout) over the DevTools protocol, in the broken state:

- `100dvh` on elements that existed at transition time resolves to **888.364px**, while
  `window.innerHeight` reports **832** and `visualViewport.height` reports **832.364**.
- The same `100dvh` on an element created *after* the transition resolves correctly to **832.364px**,
  in the same document, in the same frame. `svh`, `lvh` and `vh` behave identically to `dvh`.
- `html`/`body` are correct at 832.364px — they are sized `height: 100%`, which resolves against the
  initial containing block rather than a viewport unit.
- `position: fixed; inset: 0` measures 832.364px; `height: 100%` chained from `body` measures
  832.364px.
- No `resize` or `visualViewport.resize` event fires, so nothing in the page can even observe the
  change. Dispatching a synthetic `resize` does nothing. Writing any custom property on `:root`
  forces re-resolution and the page corrects permanently.

Nothing in our CSS is wrong: 888.364 × 2.75 = 2443 physical px ≈ the full display (2392) plus the
navigation bar (49), i.e. the layout viewport mid-transition. 832.364 × 2.75 = 2289 = display minus
the cutout (103), i.e. the settled immersive viewport. The reader is simply sized against a viewport
that no longer exists, ends up 56px too tall, and the document scrolls — the last mushaf line and the
page footer fall below the fold.

This is a race, not a launch-order rule. A watcher polling the live PWA caught two clean launches and
one broken launch through the same `/launch.html` path, which is why it reads as "works the first
time, breaks later" from the outside.

## Decision

**Any box whose height must equal the visible viewport resolves that height from the initial
containing block, never from a viewport unit.** In practice that means `position: fixed` with
`inset: 0` for the box that establishes the reader's height, and ordinary containment below it —
never `100dvh`/`100svh`/`100lvh`/`100vh` on a box that is laid out at document load.

Below that box, height travels the way [ADR 0036](0036-reader-fills-height-band.md) already
mandates for the desktop spread — by `align-items: stretch`, not by percentage heights. A
`height: 100%` inside a flex-grown box resolves to `auto` and collapses the card; this was measured
again here (the card fell from 812px to 469px on the first attempt).

Viewport units remain fine for anything that is **not** a full-viewport height contract and can be
wrong by a few percent without breaking a layout guarantee — e.g. `max-h-[70dvh]` on a bottom sheet.

## Options Considered

**Option A — Detect the mismatch in JS and force re-resolution.**
Compare `innerHeight` against a measured `100dvh` probe on mount, `resize`, `visualViewport.resize`,
`visibilitychange` and `pageshow`; on mismatch, write a custom property on `documentElement`.
Verified to work on the live broken instance — one property write corrected every affected element
and the correction persisted. Rejected: it can only run *after* paint, so a losing launch would paint
the wrong size and then visibly jump from one size to another. Rejected by the user on exactly that
ground. It also cannot fire pre-emptively, because no resize event is delivered at all.

**Option B — Change the manifest `display` to `standalone`.**
Removes the immersive transition, and with it the race. Rejected: fullscreen reading is a deliberate
product feature (`docs/plans/feature-pwa-fullscreen-focus-mode.md`), and this trades it away to work
around a browser bug.

**Option C — Anchor to the initial containing block.**
Adopted. Correct on the very first paint with no JS, no event to miss, and no jump. The ICB tracks
the settled viewport correctly even in the broken state — measured, not assumed.

## Consequences

- **+** The reader can no longer be sized against a stale viewport, because it no longer reads the
  viewport at all. The failure mode is structurally impossible rather than repaired after the fact.
- **+** No JS, no post-paint correction, no size jump; correct in the first frame on both sides of
  the race.
- **−** **Supersedes the standing "use `dvh`, not `vh`" rule** for full-viewport heights
  (`DECISIONS.md`, the mobile safha entry and the `Sidebar` bottom-clip entry). That rule was correct
  about `vh` vs `dvh` on browsers with collapsible chrome and still is — but in the installed PWA
  *both* are unreliable, so full-viewport heights leave the viewport-unit family entirely. `dvh`
  stays the right choice anywhere a viewport unit is still used.
- **−** The reader's height box becomes `position: fixed`, so it no longer participates in document
  flow on the gated breakpoints. Anything that assumed the reader contributes document height must be
  re-checked (nothing does today: `Nav`, `RecitationPlayerBar`, `PlansWidget` and `Sidebar` are all
  already `fixed`).
- **−** Two sizing mechanisms now coexist in the reader: ICB-anchored at mobile/tablet, and the
  existing `min-h-[calc(100dvh-3.5rem)]` flow layout at desktop, where there is no immersive
  transition and no race. Keep the gate breakpoints identical to the nav overlay's.
- **−** The tablet font cap (`--fq-tablet-word`) derives a *font size* from `100dvh`, so a stale
  launch there produces an oversized font rather than a scroll. It needs the same treatment and
  cannot simply inherit a box height.
