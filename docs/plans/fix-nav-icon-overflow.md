# Fix Navbar Icon Overflow on Mobile/Tablet

**Type:** bug
**Date:** 2026-08-05
**Status:** implemented
**Trello:** #186 https://trello.com/c/1FbYzcRq

## Summary

`Nav.tsx`'s always-visible end-icon group (`ContinueReadingLink`, `SharedMushafLink`,
`MarksLink`, `PlansLink`, `NotificationBell`, `UserMenu`, `SettingsSidebar`) overflows the
viewport on mobile and tablet — rightmost icons get clipped/hidden off-screen. Fix: remove
`MarksLink`/`PlansLink` from the nav bar entirely (all breakpoints); "My Marks"/"My Plans"
become entries inside the Account UI instead.

## Root Cause

The end group (`app/components/nav/Nav.tsx:96-121`) is `flex-shrink-0` and renders every
icon unconditionally. Only the center `SearchBar` wrapper can shrink, and it bottoms out at
its own icon+padding floor. Each nav icon was added independently across several merged
plans (`save-last-read-page`, `base-notification-system`, marks, plans, shared-mushaf) with
no total-width check against narrow viewports — nobody hit the ceiling until a 7th icon
landed.

Measured live (dev server, `feature/64` branch, before this fix):
- **Mobile, 375px, `/pages/1`:** end group is 260px wide, right edge lands at **410px** — 35px
  past the viewport, clipping `SettingsSidebar` and part of `NotificationBell`.
- **Tablet, 768px:** `UserMenu` also becomes visible at `md` (`hidden md:flex`), pushing the
  end group's right edge to **968px** on a 768px viewport — 200px overflow.

## Decision Tree / Algorithm

Where "My Marks" / "My Plans" live after the fix — **one place, at every breakpoint**:

| Breakpoint | Access point |
|---|---|
| `<md` (mobile, ≤767px) | `UserMenu` dropdown in the nav bar, icon-only trigger (no "Account" text label) |
| `≥md` (tablet + desktop) | Same `UserMenu` dropdown, icon+"Account" label trigger (unchanged from before) |

`UserMenu` is now visible at every breakpoint (previously `hidden md:flex`, desktop/tablet
only). Its dropdown content is identical across breakpoints: sign-in/out plus "My Marks"/"My
Plans" links, shown regardless of session state. `AccountCard` and the Settings sheet's
mobile-only Account section are removed entirely — redundant now that `UserMenu` covers
mobile too, and a second access point for the same actions was rejected (see Decisions Made).

Nav bar end group after the fix (all breakpoints): `ContinueReadingLink`, `SharedMushafLink`,
`NotificationBell`, `UserMenu`, `SettingsSidebar`. `MarksLink` / `PlansLink` are removed from
the always-visible row entirely — not just hidden below a breakpoint.

## Verified Test Cases

1. Mobile 375px, `/pages/1` → end group icons: Continue Reading, Shared Mushaf,
   Notifications, Account (icon-only), Settings (5, down from 7) → no overflow.
2. Tablet 768px → `UserMenu` "Account" button visible (icon+label); opening it shows My
   Marks / My Plans / Sign out (or Sign in) → no overflow.
3. Desktop → same dropdown-based access; nav row loses two icons, otherwise unchanged.
4. Signed-out user, mobile → tapping the icon-only Account trigger opens the same dropdown as
   desktop: Sign in + My Marks + My Plans (still reachable pre-auth, matching current
   unconditional visibility). No separate Settings-sheet Account section exists anymore.

## Files to Change

- `app/components/nav/Nav.tsx` — remove `<MarksLink />` and `<PlansLink />` from the end
  group; remove the `hidden md:flex` wrapper around `<UserMenu />` so it renders at every
  breakpoint.
- `app/components/nav/UserMenu.tsx` — add "My Marks" / "My Plans" `DropdownMenuItem` links
  (`Link` to `/marks` and `/plans`, reusing the `marks.navLink`/`plans.navLink` i18n keys and
  `Bookmark`/`Target` icons from the deleted components), rendered unconditionally on session
  state (both the signed-in and signed-out branches), before Sign out/Sign in. Trigger button:
  icon-only below `md` (`hidden md:inline` on the "Account" label span, border only at `md:`),
  icon+label at `md`+ (unchanged from before).
- `app/components/SettingsSidebar.tsx` — remove the mobile-only Account section (`AccountCard`
  import + its `md:hidden` wrapper block).
- Delete `app/components/nav/MarksLink.tsx`, `app/components/nav/PlansLink.tsx`, and
  `app/components/nav/AccountCard.tsx` — no longer used anywhere after the above.
- `docs/architecture/COMPONENTS.md` — update `Nav`, `UserMenu`, and `SettingsSidebar`'s
  entries; remove `AccountCard`'s entry.

## Constraints

- "My Marks" / "My Plans" must stay reachable **regardless of sign-in state** — the original
  `MarksLink`/`PlansLink` never gated on `session`, so the new entries in `UserMenu` must not
  either.
- Reuse the existing `marks.navLink` / `plans.navLink` translation keys — no new i18n entries
  needed.
- Do not change `ContinueReadingLink`, `SharedMushafLink`, or `NotificationBell` — they stay
  exactly where they are in the nav bar.
- `UserMenu` must stay a single component covering every breakpoint — do not reintroduce a
  separate mobile-only account surface (`AccountCard` or otherwise); that duplication was
  explicitly rejected (see Decisions Made).

## What NOT to Do

- Do not shrink icon size/padding/gaps as an alternative fix — with 7 icons this would not
  free enough width at 375px, and was explicitly ruled out in favor of reducing icon count.
- Do not build a generic "overflow menu" / kebab component — the Account-menu consolidation
  covers this specific overflow with existing UI (`UserMenu`), no new component needed.
- Do not gate Marks/Plans visibility on `session` inside `UserMenu` — they were always visible
  before, signed in or not.
- Do not leave `MarksLink.tsx`/`PlansLink.tsx`/`AccountCard.tsx` in place as dead code —
  delete them once no longer imported.
- Do not keep both `UserMenu` and a Settings-sheet Account section on mobile — one access
  point only (superseded an earlier version of this plan that split access by breakpoint; see
  Decisions Made).

## Decisions Made

- Scope: **all breakpoints**, not just mobile/tablet — confirmed with user 2026-08-05. Avoids
  two different access patterns for the same links depending on screen size.
- Consolidation target: existing Account UI (`UserMenu` dropdown), not a new overflow/kebab
  menu — mirrors the precedent already set by `mobile-nav-ux.md` (which originally folded
  `UserMenu` into the Settings sheet on mobile; this fix reverses that split so `UserMenu`
  covers every breakpoint instead).
- **Revision (2026-08-05, same day, branch still open):** the first implementation split
  access by breakpoint (`UserMenu` dropdown at `md`+, `AccountCard` inside the Settings sheet
  below `md`). User asked for the mobile experience to match tablet/desktop instead — a single
  `UserMenu` dropdown everywhere, icon-only below `md`. `AccountCard` and the Settings sheet's
  Account section are removed as a result (redundant once `UserMenu` covers mobile too).
  Editing in place rather than stacking an addendum, per this branch still being open.
