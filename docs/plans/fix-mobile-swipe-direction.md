# Fix Reversed Mobile Swipe Navigation Direction

**Type:** bug  
**Date:** 2026-07-03  
**Status:** implemented

## Root Cause

`QuranPageShell` branched `goNext` on `isRTL` (UI locale), but `nextHref`/`prevHref` from `getNavigationHref` are themselves locale-dependent (they flip by `isRTL` to match desktop arrow visual positions). Reusing them for swipe made swipe locale-dependent too — wrong direction in `en`. The Quran text is always Arabic/RTL, so the gesture mapping must be locale-independent.

## Fix

**`app/[locale]/pages/[id]/page.tsx`:** compute `nextPageId`/`prevPageId` directly as `pageId ± 1` (with 1⇄604 wraparound), independent of `isRTL`. Pass `` `/${locale}/pages/${nextPageId}` ``/`` `/${locale}/pages/${prevPageId}` `` to the swipe wrapper — never `getNavigationHref` output. `getNavigationHref`, `NavigationArrow`, and desktop arrow-click are untouched.

**`app/components/QuranPageShell.tsx` → renamed `QuranSwipeNav.tsx`:** remove `isRTL` prop; change `const goNext = isRTL ? deltaX < 0 : deltaX > 0` to `const goNext = deltaX > 0` (swipe right = next, always). Updated comment: Quran content direction is constant, gesture mapping is locale-independent.

**Reference updates:** `page.tsx` import/usage, `docs/architecture/COMPONENTS.md`, `adr/0011-mobile-quran-font-scale-vw-formula.md`, `plans/mobile-safha-sizing.md`.

## Constraints

- Do not reuse `getNavigationHref` for swipe hrefs — it is coupled to desktop arrows' visual-flip logic, not plain page order.
- Do not change `NavigationArrow` or `getNavigationHref`.
- Swipe right = next page, in both `ar` and `en` locales — no locale branching.
