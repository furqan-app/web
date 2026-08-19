# Restructure Navigation for Clean UX

**Type:** feature
**Date:** 2026-08-19
**Status:** implemented

## Summary
The mobile and desktop navigation bars were restructured to solve layout crowding and improve UX. Previously, the mobile navbar exceeded its visual constraints, causing 6+ elements to squash together with no spacing. A generic hamburger menu (`NavOverflowMenu`) lacked intent and duplicated functionality. The solution establishes a "User Portal" pattern where the User Avatar acts as the primary hub for secondary actions on mobile, while keeping the desktop layout fully unspooled.

## Root Cause / Approach
- **Root Cause**: The layout was broken on mobile because 6 elements (`Logo`, `Surah Toggle`, `Continue Reading`, `Search`, `Settings`, `User Avatar`) plus an empty `flex-1` spacer attempted to occupy the top row. The fixed widths exceeded 320px viewport bounds.
- **Approach**: 
  - Remove the generic `NavOverflowMenu`.
  - Transform `UserMenu.tsx` into a central hub.
  - Exclusively on mobile, move `Settings`, `Shared Mushaf`, and `NotificationBell` into the `UserMenu` dropdown to save space.
  - Dynamically hide `Continue Reading` on mobile *only* when the user is already on a reading page.
  - Upgrade the `UserMenu` trigger to be a clean, circular user avatar without text, integrating the notification badge directly on the avatar itself.

## Decision Tree / Algorithm
- **If Mobile and on Home Page**: Show Logo, Sidebar Toggle (`PanelLeftOpen`), Continue Reading, Search, User Avatar (5 items).
- **If Mobile and on Reading Page**: Show Logo, Surah Toggle (Wide), Search, User Avatar (4 items).
- **If Desktop**: Show all items inline. `Settings` and `NotificationBell` appear in the navbar. `Shared Mushaf` is located permanently inside the `UserMenu` across all devices.

## Verified Test Cases
- **Mobile Home Page**: `flex-1` spacer correctly separates the left cluster (Logo, Sidebar Toggle, Continue Reading) from the right cluster (Search, Avatar).
- **Mobile Reading Page**: `Continue Reading` is hidden. Left cluster (Logo, Surah Toggle) and right cluster (Search, Avatar) are separated by `flex-1`.
- **User Avatar Trigger**: Replaced pill shape with a `size-9` circle containing the `User` icon and red dot notification badge. Text "My Account" is completely removed. "Sign in" and "Sign out" are properly translated.

## Files to Change
- `app/components/nav/Nav.tsx` — removed `NavOverflowMenu`, hidden `Continue Reading` conditionally on mobile, hidden `Settings` and `SharedMushafLink` on mobile. Fixed `order-*` classes for logical `flex-start` to `flex-end` flow.
- `app/components/nav/UserMenu.tsx` — added `onOpenSettings` prop, added `Shared Mushaf` always, added `Settings` and `NotificationBell` conditionally for mobile, changed trigger to circular avatar, fixed translations and icons.
- `app/components/nav/NavOverflowMenu.tsx` — [DELETE] completely.

## Constraints
- **Do not cram elements on mobile**: Ensure no more than 4-5 items are rendered on mobile at any given time.
- **Keep 'Continue Reading' accessible**: It must be 1-tap away on the Home page, but can be hidden if the user is already reading.

## What NOT to Do
- Do not use a generic "Hamburger menu" for navigation options, as it lacks clear intent for the user. Rely on the profile menu (User Portal) or direct icons.
- Do not add text labels to the navbar icons; keep them icon-only for screen real estate efficiency.

## Decisions Made
- Replaced `NavOverflowMenu` with a "User Portal" pattern on mobile.
- Replaced the generic `Target` icon with `CalendarDays` for "My Plans" for better semantic clarity.
