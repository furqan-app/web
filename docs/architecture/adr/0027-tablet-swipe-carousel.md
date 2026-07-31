# ADR 0027: Tablet Double-View Swipe Uses a Real 3-Panel Carousel

**Date:** 2026-07-22
**Status:** Accepted

## Context

The mobile swipe animation (DECISIONS.md "Swipe Animation — Core Gesture Only",
`mobile-swipe-animation.md` Addendum 9, superseding ADR 0019) deliberately settled on a
**single-slot** `QuranSwipeNav`: the strip holds only the current page. During the drag the
current page slides and reveals empty background; on commit it flies off-screen and *then*
`router.push` navigates. A three-page strip with adjacent-page fetches was built and removed
(Addenda 2–8) after it was confirmed to give **zero benefit for the post-navigation flicker** —
that investigation was framed entirely around fixing the flicker, and the strip added DB
round-trips and complexity without moving it.

On the tablet full-screen spread (double-page view), the missing incoming page reads as
unnatural: swiping slides the current spread away over blank space, and the next spread only
"pops in" after navigation. Here the goal is different from the mobile investigation — the
adjacent spread is wanted as a **feature** (a natural book-like page turn), not as a flicker fix.

Two facts change the trade-off versus the mobile removal:
1. The reader route is **statically generated** (`generateStaticParams`, all 604 pages). Rendering
   neighbor spreads moves the "extra DB round-trips" objection to **build time**, not per request.
2. The tablet reader already has a CSS scope keyed on the `1024–1366px` media query plus
   `[data-safha-view="double"]`, so the neighbor panels can be revealed and their offset applied
   **in CSS** — no pre-hydration flash, and cleanly gated off every non-tablet viewport.

## Decision

On the **tablet double-page spread only**, `QuranSwipeNav` renders a **3-panel horizontal
carousel** of real, server-rendered spreads instead of a single slot:

- `ReaderPage` fetches three spreads (prev-pair, current-pair, next-pair) and passes all three
  `<QuranSpread>` panels to `QuranSwipeNav`. The neighbor `getPageWords` calls stay **sequential**
  (ADR 0013 — a static-build worker must not exceed the DB connection limit).
- Physical left-to-right panel order is fixed regardless of UI locale:
  `[ next ][ current ][ prev ]`. The strip rests at `translateX(-100%)` (current centered).
- Drag translates the strip live; on commit past the 80px threshold it animates to the neighbor
  panel (`translateX(0)` = next, `translateX(-200%)` = prev) and then `router.push`es. The new
  page renders its own strip **statically centered with no entry animation** — because the centered
  content is identical across the route swap, the old post-navigation pop is largely eliminated.
- **Carousel-only feel tuning** (the single-panel path keeps its original values): the live drag is
  amplified `1.5×` (`CAROUSEL_DRAG_GAIN`) so the wide spread reveals a meaningful chunk of the
  neighbor without a full-width drag — visual transform only, the 80px commit threshold stays on the
  raw finger delta so commit fires at the same travel; and the commit slide runs `380ms`
  (`CAROUSEL_EXIT_MS`) for a book-like turn vs the single-panel fly-off's `220ms` (`SINGLE_EXIT_MS`).
  Standard/native carousels track the finger 1:1 (Swiper's `touchRatio` default), so the amplification
  is a deliberate tablet-only choice, not the default. A commit in flight sets `isCommitting`, which
  blocks a second swipe from firing a stale `router.push` before the route change lands.
- The `-100%` rest offset **and** neighbor-panel visibility (`display`) are expressed in the tablet
  `[data-safha-view="double"]` CSS scope. JS writes an inline `transform` only during an active
  drag/commit and clears it afterward, falling back to the CSS base.
- The strip is forced `dir="ltr"` and each panel restores its own `dir` (rtl for the `ar` locale).
  Flex row order follows `direction`, so without this the `ar` reader lays the panels
  right-to-left and `translateX(-100%)` pushes the current panel off-screen (blank). Forcing the
  strip to ltr keeps the physical order `[next][current][prev]` and the transform geometry
  identical in both locales (`transform` itself is direction-independent), so the gesture mapping
  ("swipe right = next") stays constant — matching the Quran-is-always-rtl convention the
  single-panel swipe already used.
- All six page-fonts get `@font-face` injected so neighbors are painted before they can be reached;
  only the current page keeps `<link rel="preload">`.
- `prefers-reduced-motion` keeps the instant `router.push` (no strip animation).

This is a **tablet-scoped exception** to "Core Gesture Only", not a reversal of it. Mobile and any
single-page view keep the single-slot fly-off swipe **unchanged**: below the tablet scope the
neighbor panels are `display:none`, take no layout space, download no fonts, and the strip rests at
`translateX(0)` exactly as before.

## Consequences

- Each statically-built reader page carries **~3× the Quran word DOM**. This HTML ships to mobile
  too (neighbors hidden there), an accepted weight until the mobile/desktop carousel work is done.
- The static **build** does ~3× the page-word queries (sequential → slower build, but within the
  connection limit).
- On tablet, up to **6 page-fonts** load per page (needed so a neighbor never flashes on reveal);
  gated off non-tablet viewports by the hidden panels.
- The mobile "no adjacent fetches / no entry animation" rules (DECISIONS.md) remain in force for
  mobile — this ADR does not license reintroducing adjacent panels on mobile.
