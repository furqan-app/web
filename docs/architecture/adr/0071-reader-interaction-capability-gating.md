# ADR 0071: Reader interaction gates on input capability, layout stays width-gated

**Date:** 2026-09-18
**Status:** Accepted

## Context

The 1024–1366px tablet band covers the most common non-touch laptop viewports (1280×800, 1366×768 minus browser chrome). Word interaction (click-to-mark vs touch-long-press) and the nav-overlay tap-toggle were both keyed off the width hook `useIsTablet()`, so a fine-pointer laptop in that band got neither the mark modal nor swipe. Layout in the same band (forced double-page, full-bleed, bottom-bar chrome) is calibrated and must not move.

## Options Considered

**Option A — Move the 1367px desktop threshold or redefine the band**
Would just move the cliff to a new viewport and break calibrated desktop contracts (860px spread cap, 96px rail budget, ADR 0054 size contracts).

**Option B — Gate interaction on input capability, keep layout on width gates**
Add a coarse-pointer capability query alongside the existing width hooks; interaction branching (modal trigger, overlay tap-toggle, pointer drag) keys off capability while every layout/display rule stays on the existing CSS width gates.

**Option C — Force desktop layout for fine pointers inside the band**
Would give single-page + rail chrome to non-touch laptops but requires recalibrating the tablet double-view the band was designed around, and regresses touch tablets at identical widths.

## Decision

Option B. Interaction branches on the primary-input capability query `(pointer: coarse)` (SSR default `false` = fine-pointer/desktop interaction, which is interaction-only and therefore allowed to be one frame wrong per the CSS-gating rule); layout, forced double-page, and overlay positioning stay on the existing width queries, numerically identical to their CSS `@media` twins per ADR 0043.

## Consequences

- **+** Non-touch laptops in the band regain click-to-mark plus discoverable arrows/keyboard/drag nav with zero layout shift.
- **+** Touch tablets keep long-press + tap-toggle + swipe exactly as today; touch-laptops (fine primary) get desktop interaction while their touch swipe handlers keep working independently.
- **-** Two hook families (width + capability) to keep in sync; capability must never drive `position`/`display`.
- **-** True-coarse-primary hybrids with a mouse attached keep touch interaction (click suppressed in overlay mode) — accepted, documented in the plan's edge cases.

---

> **Rules for a valid ADR:**
> - Name the alternatives — if there were no alternatives, this is a reference doc, not an ADR.
> - Record trade-offs — if there are no downsides, you haven't thought hard enough.
> - Don't describe the bug that triggered the work — that context rots; put it in the PR.
> - After writing an ADR, update `DECISIONS.md` in the same commit.
