# Fix Reversed Mobile Swipe Navigation Direction

**Type:** bug
**Date:** 2026-07-03
**Status:** implemented

## Summary

On the mobile Quran reader, swipe-to-navigate (`app/components/QuranPageShell.tsx`) goes the wrong direction. In the default `ar` (RTL) locale, swiping left currently triggers "next page" and swiping right triggers "previous page" — the opposite of what a mushaf reader expects (forward/next should unfold toward the right, since Arabic reads right-to-left). The user confirmed swipe direction should be based on the fact that the Quran text itself is always Arabic/RTL, not on UI locale — so the gesture mapping should be a single, locale-independent rule: swipe right = next, swipe left = previous, in both `ar` and `en` UI locales.

## Root Cause

```tsx
// In RTL (Arabic), the "next" page arrow is on the left, so swipe left = next page.
const goNext = isRTL ? deltaX < 0 : deltaX > 0;
router.push(goNext ? nextHref : prevHref);
```

`goNext` branches on the `isRTL` prop (derived from UI locale). The `nextHref`/`prevHref` values passed into `QuranPageShell` are already resolved correctly for actual page order (via `getNavigationHref` in `app/[locale]/pages/[id]/page.tsx`, which does account for `isRTL`) — so `QuranPageShell` itself should not re-branch on locale for the gesture-to-target mapping. It should just always map "swipe right" → `nextHref` and "swipe left" → `prevHref`, since the reading content direction is constant (Arabic Quran text) regardless of which UI locale (ar/en) is active.

## Files to Change

- `app/components/QuranPageShell.tsx`:
  - Remove the `isRTL` prop from `Props` and the function signature.
  - Change `const goNext = isRTL ? deltaX < 0 : deltaX > 0;` to `const goNext = deltaX > 0;` with an updated comment explaining the content is always Arabic/RTL so the gesture mapping is locale-independent.
- `app/[locale]/pages/[id]/page.tsx`:
  - Remove the `isRTL={isRTL}` prop passed to `<QuranPageShell>` (line ~89). Leave the other two `isRTL` usages (`NavigationArrow`, `getNavigationHref`) untouched — those are unrelated to swipe and still need locale-aware arrow direction/page-order logic.

## Constraints

- Do not change `NavigationArrow` or `getNavigationHref` — the desktop arrow-click behavior is not reported broken and is out of scope.
- Do not make swipe behavior conditional on locale — user explicitly confirmed one behavior for both `ar` and `en`.

## Decisions Made

- No ADR needed — this is a bug fix correcting an inverted condition, not a new architectural decision.

## Addendum: Code Review Fixes (/review-fq-work findings)

**Date:** 2026-07-03
**Status:** implemented

### The original fix was incomplete

This plan's Root Cause section assumed `getNavigationHref`'s `nextHref`/`prevHref` "are already resolved correctly for actual page order," so `QuranPageShell` just needed to stop re-branching on `isRTL`. That assumption was wrong: `getNavigationHref` intentionally flips by `isRTL` — for `isNext=true` it returns `pageId - 1` when the UI locale is `en` and `pageId + 1` when `ar` — because it exists to keep the desktop arrows' click target matching their `isRTL`-flipped *visual* position (see `NavigationArrow`'s `showLeft` logic in `page.tsx`), not to express "actual page order." Reusing its output for swipe means `nextHref` is itself locale-dependent, so after this plan's original fix, swiping right still advanced the mushaf in `ar` but went *backward* in `en` — the exact bug this plan set out to fix, just relocated. Caught by `/review-fq-work`.

### Real fix: compute plain page-order hrefs for swipe

`app/[locale]/pages/[id]/page.tsx` now derives `nextPageId`/`prevPageId` directly from `pageId ± 1` (with 1⇄604 wraparound), independent of `isRTL`, and passes `` `/${locale}/pages/${nextPageId}` ``/`` `/${locale}/pages/${prevPageId}` `` to the swipe wrapper — instead of reusing `getNavigationHref`. `getNavigationHref` itself, `NavigationArrow`, and desktop arrow-click behavior are untouched, per this plan's original constraint.

### Component renamed

`app/components/QuranPageShell.tsx` → `app/components/QuranSwipeNav.tsx` (component `QuranPageShell` → `QuranSwipeNav`), since its sole responsibility is swipe-gesture handling, not general page layout. All references updated: `page.tsx` import/usage, `docs/architecture/COMPONENTS.md`, `docs/architecture/adr/0011-mobile-quran-font-scale-vw-formula.md`, `docs/plans/mobile-safha-sizing.md`.

### Files Changed

- `app/[locale]/pages/[id]/page.tsx` — added locale-independent `nextPageId`/`prevPageId` computation; swipe wrapper now receives these instead of `getNavigationHref(...)` output; renamed import/usage to `QuranSwipeNav`.
- `app/components/QuranPageShell.tsx` → `app/components/QuranSwipeNav.tsx` — renamed (content otherwise unchanged from the original swipe-handling logic, aside from an updated comment).
- `docs/architecture/COMPONENTS.md`, `docs/architecture/adr/0011-mobile-quran-font-scale-vw-formula.md`, `docs/plans/mobile-safha-sizing.md` — reference updates for the rename.

### Constraints

- Do not reuse `getNavigationHref` for swipe/gesture hrefs — it is coupled to the desktop arrows' visual-flip logic, not plain page order. Any future gesture or keyboard-nav feature should compute its own `pageId ± 1` hrefs the same way.
