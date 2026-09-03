---
title: Close Surah Sidebar on Link Click
type: bug
date: 2026-08-03
status: implemented
area: nav
---

# Close Surah Sidebar on Link Click

## Summary

Clicking a surah or rub link inside the surah sidebar navigates to the target page but leaves the sidebar open, covering the new page. The sidebar should close immediately whenever a navigation link inside it is clicked — including when the link points at the page already being viewed.

## Root Cause

`SidebarContext` (`app/contexts/SidebarContext.tsx`) holds `open`/`setOpen`, consumed by `Sidebar.tsx` — a Sheet overlay shown on `/pages/` and `/mushaf/[grant]/` routes at all breakpoints. Its two tabs render navigation links:

- `SurahListItem.tsx:23` — `Link` to `${basePath}/${surahStartingPage}`
- `RubList.tsx:83` — `Link` to `${basePath}/${pageOfVerse(rub.startVerse)}`

Neither calls `setOpen(false)` on click. Only the Sheet's own `SheetClose` X button closes it. Result: navigating via either tab leaves the sidebar open over the destination page.

## Approach

Add `onClick={() => setOpen(false)}` directly on the `Link` in both components, each pulling `setOpen` from the existing `useSidebar()` hook. Closes on every click unconditionally — including clicks that don't change the route (e.g. a rub link pointing at the page already displayed) — confirmed with user as the desired behavior, since "did the pathname actually change" is not a distinction the user cares about here.

## Files to Change

- `app/components/SurahListItem.tsx` — import `useSidebar`, add `const { setOpen } = useSidebar();`, add `onClick={() => setOpen(false)}` to the `Link`.
- `app/components/RubList.tsx` — same: import `useSidebar`, destructure `setOpen`, add `onClick={() => setOpen(false)}` to the `Link`.

## Constraints

- Sidebar closes unconditionally on link click, regardless of whether navigation actually changes the pathname.
- No pathname-watching / route-change detection — a plain `onClick` handler is sufficient and simpler.

## What NOT to Do

- Do not implement this via `usePathname()` route-change detection in `Sidebar.tsx` — considered and rejected because it would leave the sidebar open when a link points at the current page (no pathname change), which the user explicitly wants closed too.

## Decisions Made

- Sidebar always closes on link click, even for same-page clicks — simpler and more consistent than conditioning on actual navigation (user decision, 2026-08-03).
