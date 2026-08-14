# Fix Sidebar Bottom Clip

**Type:** bug
**Date:** 2026-08-15
**Status:** implemented

## Summary

The last surah/rub in the nav `Sidebar` list is not fully visible on some screens — it's clipped and unreachable by scroll.

## Root Cause

`SheetContent`'s left/right variant ([sheet.tsx:41-43](../../components/ui/sheet.tsx)) sets both `inset-y-0` (top:0, bottom:0) and `h-full` (height:100%). `Sidebar` ([Sidebar.tsx:96-98](../../app/components/nav/Sidebar.tsx)) overrides only `top` inline (`calc(3.5rem + env(safe-area-inset-top, 0px))`) to clear the nav bar, without touching `height`/`bottom`.

With `top`, `height`, and `bottom` all non-auto on a fixed-position box, the box is CSS-over-constrained. Browsers keep the specified `top` and `height` and recompute `bottom`, so the panel keeps its full 100vh height but starts lower — its bottom edge ends up below the actual viewport by the top offset amount. Content near the bottom of the sheet's flex column (the last surah/rub) falls in that clipped region: off-screen, and unreachable by scroll since the panel itself, not the page, is `position: fixed`. Effect is worse on shorter viewports, matching "not fully visible in all screens."

## Fix

- Give the sheet an explicit `height` alongside `top`, removing the over-constraint, so the box terminates at the real viewport bottom.
- Use `dvh` (not `vh`) per the existing mobile-viewport guidance in [DECISIONS.md](../architecture/DECISIONS.md) ("Quran Safha Viewport Fit") — mixing `vh`/`dvh` produces mismatches on mobile browsers with collapsible chrome.
- Add `env(safe-area-inset-bottom, 0px)` bottom padding to both scrollable tab panels, matching the existing pattern in [NavOverflowMenu.tsx:86](../../app/components/nav/NavOverflowMenu.tsx), so the last item isn't flush against the home-indicator/gesture-bar on notched phones.

## Files to Change

- `app/components/nav/Sidebar.tsx`
  - Line 97: replace the `style={{ top: ... }}` inline style with both `top` and `height`:
    ```
    style={{
      top: "calc(3.5rem + env(safe-area-inset-top, 0px))",
      height: "calc(100dvh - 3.5rem - env(safe-area-inset-top, 0px))",
    }}
    ```
  - Lines 130 and 137 (`TabsContent` for `surahs` and `rubs`): add `pb-[calc(1rem+env(safe-area-inset-bottom,0px))]` to the existing class strings — additive on top of the existing `1rem` base padding, not a bare `pb-[env(...)]` replacement (which evaluates to `0px` on devices with no inset, regressing the surahs tab's `p-4` bottom padding to zero — caught in review).

## Constraints

- Do not change `overlayStyle`'s `top` — the overlay covers the full screen behind the nav bar deliberately; only the sheet panel itself needs the height correction.
- Keep `h-full` off the inline style path — an inline `height` always wins over the class regardless, but don't also try to strip `h-full` from the shared `sheetVariants` string, since `top`/`bottom` Sheets (used elsewhere, e.g. mobile bottom sheets) rely on it and aren't over-constrained (they don't get a `top` override).

## Decisions Made

- Added a `DECISIONS.md` entry (below) documenting this over-constraint pitfall so future Sheet `top`-overrides don't reintroduce it.

## What NOT to Do

- None known.
