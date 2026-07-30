# ADR 0034: Desktop focus mode uses hover-reveal, decoupled from the tap-toggle guard

**Date:** 2026-07-30
**Status:** Accepted

## Context

Mobile and tablet already hide Nav + the recitation bar on the reader via `NavOverlayContext`'s
`isOverlayMode`, toggled by tapping the reader background (`ReaderPager`/`QuranSwipeNav`'s
`onClick={toggleOverlay}`). Extending the same panel-hiding behavior to desktop (≥1367px, the
"Desktop Reading Group" band) needs a different entry trigger — desktop has no tap-background
convention, and a mouse click on the reader risks conflicting with text selection. `toggleOverlay()`
today no-ops only when `!isOverlayMode`, so naively widening `isOverlayMode`'s definition to include
desktop would silently re-enable that same background-click gesture on desktop too.

## Options Considered

**Option A — Widen `isOverlayMode` only, reuse tap-toggle as-is**
Extend `isOverlayMode` to include desktop and let the existing background-click handler drive it
everywhere. Simplest, but turns on an unrequested, accidental-selection-prone click gesture on desktop.

**Option B — Widen `isOverlayMode` for the fixed/hidden CSS, but gate the click handler separately**
Keep `isOverlayMode` as the single flag driving the fixed-position/hidden CSS on Nav and the
recitation bar (so both platforms share the existing visual mechanism), but move the
background-click-to-toggle guard onto its own `isMobile || isTablet` check instead of the broader
flag. Desktop instead gets an explicit toggle button (persisted in `localStorage`) plus a hover-driven
reveal (top hotzone `onMouseEnter`, Nav's own `onMouseLeave`) reusing the same `overlayVisible` state.

## Decision

Option B: `isOverlayMode` becomes `((isMobile || isTablet) || (isDesktopUp && desktopFocusEnabled)) && isOnPagesRoute`,
but `toggleOverlay()` itself (not each call site) keeps its own explicit `isMobile || isTablet` guard
rather than trusting `isOverlayMode` generically — centralizing the check in the one function every
tap-toggle call site shares means a future new call site inherits the correct behavior automatically,
rather than needing to remember a per-callsite guard. `isDesktopUp` is a new, width-only (≥1367px)
hook, intentionally independent of the Reading Group's ≥800px-tall CSS gate.

## Consequences

- **+** Nav and the recitation bar reuse the exact same fixed/hidden CSS and `overlayVisible` state
  across all three breakpoint bands — no new visual mechanism.
- **+** Desktop mouse users never get an accidental panel-hide from clicking/selecting reader text.
- **-** `isOverlayMode` alone no longer safely implies "background click should toggle" — any future
  code reading this flag to gate a new tap/click behavior must re-check the platform explicitly, not
  assume the flag's true/false state is sufficient. This bit `QuranWord`'s existing click-vs-long-press
  disambiguation (pre-existing code, threaded `isOverlayMode` down from `QuranSafha` on the assumption
  that overlay mode implies a touch device): widening `isOverlayMode` silently broke desktop
  word-click-to-mark once desktop focus mode was on, since desktop never fires the touch events the
  code was waiting for instead. Caught in review before ship. Fixed by exposing a second, narrower
  `isTouchOverlayMode` (mobile/tablet only — the original meaning) for exactly this kind of consumer;
  `isOverlayMode` stays broad for the Nav/bar CSS use case. See the DECISIONS.md entry for the split.
- **-** Two distinct reveal mechanisms now exist for the same `overlayVisible` state (tap-toggle for
  touch, hover for desktop) — a future unification would need to reconcile both, not just one.
