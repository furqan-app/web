---
title: Restore Continue Reading nav icon on installed PWA
type: bug
date: 2026-08-18
status: implemented
area: pwa
---

# Restore Continue Reading nav icon on installed PWA

## Summary

`ContinueReadingLink` (`app/components/nav/ContinueReadingLink.tsx`) hides itself whenever the app
is standalone/fullscreen (installed PWA) on mobile/tablet. That gate was added when
`AppLaunchRedirect` auto-redirected the home surah list to the last-read page on every cold launch,
making the navbar link redundant there. [ADR 0042](../architecture/adr/0042-pwa-launch-resolves-before-first-paint.md)
later deleted `AppLaunchRedirect` — the cold-launch redirect now happens in `public/launch.html`
before React ever paints, and home became a legitimate mid-session screen (a hard refresh on home
in standalone now correctly stays on home). The nav link's hiding condition was never revisited: on
installed PWA, once a user is on home mid-session (e.g. taps the logo), there is no navbar way back
to their last-read page.

## Root Cause

`ContinueReadingLink.tsx:46` — `if (isStandalone && !isDesktopUp) return null;` — was written to avoid
duplicating what `AppLaunchRedirect` did automatically. That redirect mechanism no longer exists in
the form this condition assumed; the condition is now stale and leaves standalone mobile/tablet users
with no quick path back to their reading position outside of cold launch.

## Approach

Remove the `isStandalone && !isDesktopUp` early return entirely. The link then always renders on
every breakpoint and display mode, exactly matching existing desktop/browser-tab behavior — including
staying visible while already inside the reader (a harmless no-op tap there, same as desktop today).

No decision tree needed — this is a single-condition removal with no remaining branching on
display mode in this component.

## ADR Amendment

[ADR 0042](../architecture/adr/0042-pwa-launch-resolves-before-first-paint.md) explicitly rejected
un-hiding `ContinueReadingLink` on standalone mobile as an alternative, reasoning it "reintroduce[s] a
coupling this ADR removed," and instructed future readers not to restore a home-page redirect "without
re-opening the decision." This plan reopens that decision, not the redirect mechanism: ADR 0042's
core decision (launch-time navigation must resolve before first paint, via `launch.html`) is unchanged.
What's superseded is only the consequence that `ContinueReadingLink` should stay hidden — that
assumption depended on home being reachable only via a redirect-covered cold launch, which is no
longer true now that home is a legitimate mid-session destination with no return path. See the
Addendum added to ADR 0042 for the full amendment text.

## Files to Change

- `app/components/nav/ContinueReadingLink.tsx` — delete the `isStandalone` state, the `useEffect`
  that sets it, the `isStandaloneDisplayMode` import, the `useIsDesktopUp` import/call if no longer
  used elsewhere in the file, and the `if (isStandalone && !isDesktopUp) return null;` line. Update
  the file's leading doc comment (currently describes the hide-on-standalone behavior) to reflect
  that the link is now unconditionally visible everywhere.
- `docs/architecture/COMPONENTS.md` — update the `ContinueReadingLink` entry (currently states
  "hidden when standalone/fullscreen + mobile/tablet") to drop that clause.
- `docs/architecture/adr/0042-pwa-launch-resolves-before-first-paint.md` — add an
  `## Addendum — 2026-08-18` section amending the Consequences bullet that rejected un-hiding this
  link.
- `docs/architecture/DECISIONS.md` — append an amendment note under the existing ADR 0042 entry
  pointing at the new addendum.

## Constraints

- Do not touch `public/launch.html`, the cold-launch redirect mechanism, or anything else ADR 0042
  established — only the `ContinueReadingLink` visibility gate and its documentation are in scope.
- Keep `isStandaloneDisplayMode()` as the single shared display-mode check (`app/utils/platform.ts`)
  for every other surface that still needs it — this change only removes ContinueReadingLink's own
  use of it, not the utility itself.

## What NOT to Do

- Do not restore `AppLaunchRedirect` or any home-page redirect — ADR 0042's core decision (redirect
  lives in `launch.html`, before paint) stays in place.
- Do not add a route-based condition (e.g. hide only within `/pages/*`) — the confirmed scope is
  full parity with desktop/browser behavior, which shows the link unconditionally everywhere.

## Decisions Made

- Full parity with desktop: the link is unconditionally visible on every breakpoint/display mode,
  including while already inside the reader, rather than adding new route-aware hiding logic.
