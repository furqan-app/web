# Fix Nav Overlay Link Navigation Race (My Marks / My Plans / Shared Mushaf Do Nothing on Android PWA)

**Type:** bug
**Date:** 2026-08-16
**Status:** implemented
**GitHub:** [#313](https://github.com/furqan-app/web/issues/313)
**ADR:** [0043](../architecture/adr/0043-overlay-close-on-back-gesture.md) (2026-08-16 addendum)

## Summary

On Android, installed PWA (standalone/fullscreen), mobile/tablet: tapping **My Marks**, **My Plans**,
or **Shared mushaf** inside `NavOverflowMenu`'s bottom sheet closes the sheet but never navigates —
the tap silently does nothing. Sign in / Sign out (plain buttons, no `<Link>`) are unaffected. Desktop
and browser tabs are unaffected (the guard this bug lives in never arms there).

## Root Cause

`NavOverflowMenu` arms `useCloseOnBackGesture(open, closeMenu)` while its Sheet is open
(`app/components/nav/NavOverflowMenu.tsx:68`) — a shared hook (ADR 0043) that pushes a history guard
entry on open, mobile/tablet standalone only, so a real back-gesture closes the sheet instead of
navigating the underlying page.

Tapping a `<Link>` row (My Marks/My Plans in `UserMenu.tsx`, Shared mushaf in `SharedMushafLink.tsx`)
fires two things from the same click: the Link's `onClick={onNavigate}` closes the sheet
(`setOpen(false)`), and the Link's own internal handler calls `router.push` to the target route.

`useCloseOnBackGesture`'s cleanup effect (runs when `open` flips to `false`) decides whether to call
`history.back()` to remove its own now-unneeded guard entry, via a `queueMicrotask`-deferred check
(`app/hooks/use-close-on-back-gesture.ts:78-112`) added in ADR 0043's 2026-08-15 addendum to survive a
**sibling overlay's** `pushState` landing in the same React commit. That addendum's fix (defer to a
microtask, compare by unique id) is sufficient for a sibling's `pushState`, which is guaranteed to land
within the same commit's effects and therefore the same microtask flush.

It is not sufficient for a `<Link>`'s own client-side navigation. Next's App Router can defer the
actual `history.pushState` for the target route past the current microtask queue (transition
scheduling, RSC payload fetch — worse on Android). When it does, the guard's cleanup microtask runs
*first*, still sees its own entry on top, concludes "closed via backdrop/Escape/a non-navigating
button," and calls `history.back()` — cancelling the in-flight navigation. The sheet still visually
closes (the `setOpen(false)` React state update is unaffected by any of this), which is exactly the
reported symptom: menu closes, nothing else happens.

This is a different failure from the one ADR 0043's base decision already accepted as a trade-off
("entry left as a harmless orphan when a navigation wins the race") — that trade-off describes the
guard correctly staying out of the way. This bug is the guard **winning** a race it should never have
been entered into, because it has no way to know a navigation is already happening.

## Decision Tree / Algorithm

| Close trigger | Does a competing `pushState` exist? | Cleanup behavior |
|---|---|---|
| Tap My Marks / My Plans / Shared mushaf (`<Link>`) | Yes — Next's router.push, timing not guaranteed | **Fixed:** caller calls `notifyNavigating()` before closing; cleanup skips the timing check entirely, disarms and leaves the guard entry as an orphan unconditionally |
| Tap Settings row | No — opens `SettingsSidebar`, no route change | Unchanged — resolved by existing deferred, id-compared `history.state` check |
| Tap Sign in / Sign out | No — full-page redirect (`window.location`), not a `pushState` | Unchanged — `notifyNavigating()` is harmlessly called too (same `onNavigate` prop), but there's nothing for it to race against |
| Tap backdrop / Escape / sheet's own close button | No | Unchanged — existing check calls `history.back()` to clean up the guard's own entry, as before |
| Real back-gesture while sheet open | N/A | Unchanged — handled by `onPopState`, untouched by this fix |
| Desktop or browser tab | N/A | Unchanged — `useCloseOnBackGesture` never arms (`useIsStandaloneMobileOrTablet()` false) |

## Verified Test Cases

Walked through with the user (2026-08-16):

1. Android standalone, open overflow menu, tap My Marks → `notifyNavigating()` fires, sheet closes,
   `/marks` loads. **Fixed** (previously: nothing).
2. Same for My Plans and Shared mushaf. **Fixed**.
3. Open menu, tap Settings row → unchanged, closes via the existing microtask check (no Link
   involved, nothing to race).
4. Open menu, tap Sign in / Sign out → unchanged; full-page redirect either way,
   `notifyNavigating()` being called is a no-op since there's no `pushState` race on this path.
5. Open menu, tap backdrop/Escape/close button (no item tapped) → unchanged, guard's own
   `history.back()` still fires normally to clean up its entry.
6. Desktop or browser tab → guard never arms, no behavior change.
7. Real Android back-gesture while menu is open → unchanged, `onPopState` path untouched.

## Files to Change

- `app/hooks/use-close-on-back-gesture.ts` — add a `navigatingRef`, reset to `false` at the start of
  each arm cycle (alongside the existing `armedRef`/`pushedIdRef` setup). Return `notifyNavigating`
  (sets the ref to `true`) from the hook. In the cleanup effect, check the ref **before** the
  `queueMicrotask`-deferred `history.state` check: if set, disarm (`removeEventListener`,
  `armedRef.current = false`, `disarmOverlayBackGuard()`) and return — skip the deferred check and
  `history.back()` entirely.
- `app/components/nav/NavOverflowMenu.tsx` — capture `notifyNavigating` from the
  `useCloseOnBackGesture(open, closeMenu)` call. Wrap the `onNavigate` prop passed to
  `SharedMushafLink` and `UserMenu` (both currently `onNavigate={closeMenu}`) into a single
  `closeMenuAndNotify = () => { notifyNavigating(); closeMenu(); }`. The Settings row's own
  `onClick` (which calls `closeMenu()` directly, not via the `onNavigate` prop) stays unchanged.
- `docs/architecture/adr/0043-overlay-close-on-back-gesture.md` — addendum (written during planning).
- `docs/architecture/DECISIONS.md` — new constraint under "Overlay close-on-back-gesture" (written
  during planning).

No changes needed to `UserMenu.tsx` or `SharedMushafLink.tsx` themselves — both already accept and
wire an `onNavigate` prop; only what `NavOverflowMenu` passes into that prop changes.

## Constraints

- `notifyNavigating()` must be called **synchronously**, before the state update that closes the
  overlay (i.e. before `closeMenu()`), not after — the ref must already be set by the time the
  cleanup effect's check runs.
- `navigatingRef` must reset to `false` at the start of each new arm cycle (when the guard pushes a
  fresh entry on open), the same way `armedRef`/`pushedIdRef` already do — otherwise a stale `true`
  from a previous open/close cycle would suppress the real check on a later, unrelated close.
- Do not extend `notifyNavigating` calls to the Settings row's own `onClick` — it doesn't compete
  with a `pushState` and should keep using the existing, already-correct timing check.
- Reuse the existing `onNavigate` prop signature on `UserMenu`/`SharedMushafLink` — do not add a
  second prop; wrap what `NavOverflowMenu` passes into the existing one.

## What NOT to Do

- Do not "fix" this by increasing the `queueMicrotask` delay (e.g. `setTimeout`) to try to outlast
  Next's router — this narrows the race window without eliminating it and reintroduces exactly the
  kind of timing-dependent bug this fix removes.
- Do not extend this fix to `MarkModal`, `RecitationSettingsSheet`, or `SettingsSidebar` — none of
  their `useCloseOnBackGesture` usages close in response to a `<Link>` navigating past them; they have
  no competing `pushState` and are not part of this bug.
- Do not bundle the ADR-0044 `min-h-[calc(100dvh-3.5rem)]` fix for `/marks`, `/plans`, `/mushaf` into
  this change — that's a separate, cosmetic issue (unrelated to navigation not happening) that the
  user explicitly deferred out of this plan's scope.
- Do not remove or weaken the existing deferred, id-compared `history.state` check — it remains the
  correct mechanism for every non-navigating close path (backdrop, Escape, close button, Settings,
  Sign in/out).

## Decisions Made

- Root cause is a race between the overlay guard's timing-based cleanup check and Next's own
  (not-guaranteed-synchronous) `router.push`, distinct from the sibling-overlay race ADR 0043's prior
  addendum already fixed (user-confirmed via the decision tree walkthrough).
- Fix via an explicit `notifyNavigating()` signal from the caller, not a longer timing window
  (user-confirmed as the lower-risk approach, proceeding without on-device log confirmation).
- The ADR-0044 `dvh` min-height gap on `/marks`/`/plans`/`/mushaf` is dropped from this plan's scope —
  cosmetic, unrelated to the reported "nothing happens" symptom (user-confirmed).
