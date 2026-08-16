# Close Overlays on Back-Swipe (Mobile/Tablet PWA)

**Type:** bug
**Date:** 2026-08-15
**Status:** implemented
**GitHub:** [#297](https://github.com/furqan-app/web/issues/297)
**ADR:** [0043](../architecture/adr/0043-overlay-close-on-back-gesture.md)

## Summary

In the installed mobile/tablet PWA (Android and iOS), swiping back while an overlay is open — the
nav menu (`NavOverflowMenu`), settings sidebar (`SettingsSidebar`), surah sidebar
(`app/components/nav/Sidebar.tsx`), mark modal (`MarkModal`), or recitation settings sheet
(`RecitationSettingsSheet`) — navigates the underlying page instead of closing the overlay. A second
back-swipe is needed to actually get rid of it. Fix: the first back-swipe closes the overlay; the
next one behaves normally (real navigation, or the reader's existing exit-toast on Android).

Desktop installed PWA is explicitly out of scope (user-confirmed) — matches
`AndroidBackExitGuard`'s existing `!isDesktopUp` gate.

A separate, unrelated bug the user surfaced during investigation — `AndroidBackExitGuard`'s own back
press sometimes flickers or skips its exit toast — is tracked separately as
[#296](https://github.com/furqan-app/web/issues/296) and is **not** part of this plan.

## Root Cause

None of the five overlays are integrated with browser history at all — they're plain Radix
`Dialog`/`Sheet` (`components/ui/dialog.tsx`, `components/ui/sheet.tsx`) driven by local `useState`.
Radix's own dismiss handling covers Escape and outside-click only; it has no hook into back
navigation. So a back-swipe does the platform's default action — pops real history — while the
overlay's `open` state is untouched, leaving it visually open and now stacked over whatever the
browser navigated to.

Four of the five overlays (`MarkModal`, the surah `Sidebar`, `NavOverflowMenu`,
`RecitationSettingsSheet`) can be open on a reader page (`/pages/...`) at the same time
`AndroidBackExitGuard` (ADR 0040) is mounted there, already pushing its own history guard entry and
listening globally for `popstate` to drive the Android "press back again to exit" flow. Any
independent per-overlay history push/listener would race with it on the same event.

Investigation also confirmed every one of the five overlays is a **modal** Radix `Dialog`/`Sheet` —
it blocks interaction with anything behind it — and `NavOverflowMenu` explicitly closes itself before
opening `SettingsSidebar` (never nests them). So **at most one overlay is ever open at a time**; no
stacking/priority logic is needed, just a single shared "is an overlay guard currently armed" flag.

**Found in review (Sonnet, 2026-08-15) and fixed before merge:** "at most one open at a time"
describes the *visual* stacking, not the *history-API* transition. `NavOverflowMenu`'s Settings row
calls `closeMenu()` and `setSettingsOpen(true)` in the same click handler, landing both state changes
in one React commit. React runs every effect *cleanup* in a commit before any new effect *setup*, so
the first cut of `useCloseOnBackGesture`'s cleanup called `history.back()` synchronously — but
`history.back()`'s traversal (and its `popstate`) resolves asynchronously, against whatever is on top
of history *at that later moment*, not at call time. `SettingsSidebar`'s own effect pushes its entry
moments later in the same commit, so by the time the deferred `back()` resolved, it popped
`SettingsSidebar`'s entry instead of `NavOverflowMenu`'s — and `SettingsSidebar`'s own `popstate`
listener, freshly attached, had no way to attribute that echo to a sibling's cleanup, so it read it as
a real back press and closed itself immediately. Confirmed in the browser: tapping Settings opened and
instantly closed the sheet, every time, on the exact platform this feature targets. Fixed by (1)
deferring the "is my entry still on top" check to a microtask, so it runs after every effect in the
commit (including a sibling's `pushState`) has settled, and (2) giving every pushed entry a unique id
(`fqOverlayGuardId`), since a shape-only check (`fqOverlayGuard === true`) can't tell "my own entry is
on top" from "a sibling's entry, which has the identical shape, is on top instead."

## Decision Tree / Algorithm

**Platform gate** (shared by all five overlays, via the new `useCloseOnBackGesture` hook):

| Condition | Guard active? |
|---|---|
| Mobile/tablet, standalone/fullscreen (Android or iOS) | Yes |
| Mobile/tablet, browser tab (not installed) | No |
| Desktop, standalone or browser tab | No |

**Guard lifecycle**, per overlay instance, while the platform gate passes:

| Event | Action |
|---|---|
| Overlay opens (`open` becomes `true`) | Push one fresh history-state guard entry (`{ fqOverlayGuard: true }`, freshly allocated per ADR 0040's 2026-08-14 addendum — never a module constant); mark this guard "armed"; increment the shared `overlayGuardArmed` count |
| Real back-swipe (`popstate` fires, our entry gets popped) | Call the overlay's own close handler (same one Escape/outside-click already use); mark "unarmed"; decrement the shared count |
| Overlay closes another way (X button, backdrop tap, Escape, in-menu link navigation, or a sibling overlay opening in the same commit) while our entry is still armed | **Deferred to a microtask** (so every effect in the same React commit — including a sibling overlay's `pushState` — has already run). If our pushed entry (matched by its unique `fqOverlayGuardId`, not just the shared `fqOverlayGuard` shape) is still the current top of history: call `history.back()` once to remove it, and swallow the resulting `popstate` (don't re-invoke the close handler, since it's already closing) — decrement the shared count only once that echo is processed |
| Same, but our entry is **not** the current top by id (something else navigated past it, e.g. a link tapped inside `NavOverflowMenu` — or a sibling overlay opened in the same commit and pushed its own entry on top) | Do nothing to history — calling `history.back()` here would remove the wrong entry. Decrement the shared count immediately; leave the orphaned entry (costs one future no-op back press, never a broken nav or a wrongly-closed sibling) |

**`AndroidBackExitGuard` coordination** (one line added to its existing `popstate` handler):

| Condition at the moment a `popstate` fires on a reader page | Behavior |
|---|---|
| Shared `overlayGuardArmed` count > 0 | Return immediately — do not re-push, arm, show the toast, or attempt exit. The overlay's own listener (registered later, since it only mounts once the user opens something on top of the already-mounted reader) handles this event next |
| Count is 0 | Existing ADR 0040 double-push state machine, unchanged |

This ordering is structural, not timing-dependent: `AndroidBackExitGuard` always mounts before a user
can open any overlay on top of it, so its `popstate` listener is always registered first and always
runs first for the same event.

## Verified Test Cases

Walked through with the user (2026-08-15):

1. Android standalone reader page, open surah Sidebar → swipe back → exit-guard sees
   `overlayGuardArmed > 0`, no-ops → Sidebar's own listener closes it, count drops to 0. Swipe back
   again → count is 0 → exit-guard runs normally (shows its own toast).
2. iOS standalone reader page, open Mark modal → back → modal closes (no exit-guard exists on iOS at
   all, so no coordination needed — the overlay's own listener is the only one).
3. Home page (no reader, no exit-guard mounted anywhere), open the nav menu → back → menu closes;
   next back does real navigation (leaves the app or goes to the prior real history entry).
4. Open Settings sidebar → tap the in-sheet X close button (not a back-swipe) → guard entry is still
   the top of history → `history.back()` fires once, its echo is swallowed by the same listener,
   sheet closes cleanly, history depth returns to what it was before opening — a following back-swipe
   does the real prior navigation, not a no-op.
5. Open the nav menu → tap `SharedMushafLink` inside it (closes the menu **and** triggers a client-side
   navigation to a new URL) → by the time cleanup runs, the guard entry is no longer the top of
   history → no `history.back()` call (would undo the navigation) → orphaned entry accepted; one
   future back-swipe on that new page is a harmless no-op instead of closing anything.
6. Android standalone reader, `RecitationSettingsSheet` open → back → sheet closes, exit-guard
   deferred exactly as in case 1.
7. Desktop installed PWA, any overlay → back → guard inactive (`isDesktopUp`), platform default
   back-navigation behavior, unchanged from today.
8. Mobile/tablet browser tab (not installed), any overlay → guard inactive
   (`!isStandaloneDisplayMode()`), unchanged from today.
9. Shared-mushaf grant reader (`grantId` present), Android standalone — `AndroidBackExitGuard` is
   already inactive there (`active={!grantId}`); an overlay opened on that route still gets its own
   close-on-back guard normally, with nothing to coordinate against.
10. **(Added in review)** Open the nav menu → tap "Settings" (closes the menu **and** opens
    `SettingsSidebar` in the same click handler / React commit) → `SettingsSidebar` opens and stays
    open; the menu's own guard entry is left as a harmless orphan (case 5's outcome) rather than
    popping `SettingsSidebar`'s freshly-pushed entry out from under it. Verified in the browser both
    before the fix (reproduced: opened then instantly closed) and after (stays open, confirmed stable,
    and a following back-swipe closes it correctly).

## Files to Change

- `app/utils/overlay-back-guard.ts` — **new**. Module-level armed counter:
  `armOverlayBackGuard()`, `disarmOverlayBackGuard()`, `isOverlayBackGuardArmed()`.
- `app/hooks/use-is-standalone-mobile-or-tablet.ts` — **new** (added in review, dedup). Shared
  `useIsStandaloneMobileOrTablet()` — the `!isDesktopUp && isStandaloneDisplayMode()` half common to
  both `useCloseOnBackGesture` and `AndroidBackExitGuard`'s platform gates.
- `app/hooks/use-close-on-back-gesture.ts` — **new**. `useCloseOnBackGesture(open, onClose)`
  implementing the guard lifecycle table above, including the microtask-deferred, id-matched cleanup
  check. Platform gate via `useIsStandaloneMobileOrTablet()` — no `isAndroid()` check, unlike
  `AndroidBackExitGuard`.
- `app/components/reader/AndroidBackExitGuard.tsx` — add the `isOverlayBackGuardArmed()` early-return
  at the top of `onPopState`; platform gate switched to `useIsStandaloneMobileOrTablet()` (still
  combined with its own `isAndroid()` check).
- `app/components/MarkModal.tsx` — `useCloseOnBackGesture(isOpen, close)` (both already exist as
  props, MarkModal.tsx:73-74).
- `app/components/SettingsSidebar.tsx` — `useCloseOnBackGesture(open ?? false, () =>
  onOpenChange?.(false))`. Only ever rendered controlled (one call site, `NavOverflowMenu.tsx:109`);
  the component's own uncontrolled trigger branch (`!controlled &&` at SettingsSidebar.tsx:57) is
  currently unused in practice but left as-is — out of scope here.
- `app/components/nav/Sidebar.tsx` — `useCloseOnBackGesture(open, () => setOpen(false))`, using the
  existing `open`/`setOpen` from `useSidebar()`.
- `app/components/nav/NavOverflowMenu.tsx` — `useCloseOnBackGesture(open, () => setOpen(false))` for
  its own Sheet only (`open`/`setOpen` at NavOverflowMenu.tsx:63). `SettingsSidebar` gets its own
  guard independently via its own component.
- `app/components/RecitationSettingsSheet.tsx` — `useCloseOnBackGesture(isSettingsOpen,
  closeSettings)`, both from `useRecitation()` (`RecitationContext.tsx`).
- `docs/architecture/adr/0043-overlay-close-on-back-gesture.md` — new (written during planning).
- `docs/architecture/DECISIONS.md` — new "Overlay close-on-back-gesture" entry under "App Launch &
  Back Navigation (Android PWA)" (written during planning).

## Constraints

- Allocate a fresh state object on every `history.pushState` call inside the new hook — never a
  module-level constant. Same reasoning as ADR 0040's 2026-08-14 addendum (Next's history patch
  mutates whatever object it's handed).
- Never remove the guard's `popstate` listener before triggering a programmatic `history.back()` in
  cleanup — the listener must stay attached to catch and swallow its own echo, or `AndroidBackExitGuard`
  (or a future second overlay) could misinterpret that synthetic event as a real user back press.
- `AndroidBackExitGuard`'s deferral check must be the first thing its `popstate` handler does, before
  any re-push/arm/exit logic — it relies on running before the overlay's own listener in the same
  event dispatch, not after.
- Do not call `history.back()` when the guard's pushed entry is no longer the current top of history
  — doing so removes the wrong entry instead of the guard's own.
- `useCloseOnBackGesture`'s platform gate must never re-derive display-mode detection independently —
  it goes through `useIsStandaloneMobileOrTablet()`, same as `AndroidBackExitGuard`.
- The cleanup's "is my entry still on top" check must be deferred to a microtask, and must compare by
  the pushed entry's unique id (`fqOverlayGuardId`), not just the shared `fqOverlayGuard` shape.
  Checking synchronously, or checking shape only, both reintroduce the same-commit race where one
  overlay's cleanup pops a sibling overlay's freshly-pushed entry instead of its own (found in review,
  reproduced via `NavOverflowMenu`'s Settings row).

## What NOT to Do

- Do not give each overlay its own independent `popstate` listener with no coordination — rejected in
  ADR 0043 (Option A) for producing undefined precedence against `AndroidBackExitGuard` on a reader
  page.
- Do not build stacking/priority logic for multiple simultaneously-open overlays — investigation
  confirmed all five are modal (block interaction with whatever's behind them) and never nest, so at
  most one is ever open at a time. A single armed count is sufficient.
- Do not extend this to desktop installed PWA — out of scope (user-confirmed), matches
  `AndroidBackExitGuard`'s existing `!isDesktopUp` gate.
- Do not investigate or fix the separate `AndroidBackExitGuard` flicker/skipped-toast bug as part of
  this task — tracked at [#296](https://github.com/furqan-app/web/issues/296), needs its own
  device-instrumented investigation.
- Do not refactor `SettingsSidebar`'s unused uncontrolled-trigger branch as part of this change — not
  exercised by any current call site, out of scope.

## Decisions Made

- Scope is mobile/tablet installed PWA, Android **and** iOS, not desktop (user-confirmed) — broader
  than `AndroidBackExitGuard`'s Android-only gate, since the underlying mechanism (history guard +
  popstate) doesn't depend on Android specifically, only `AndroidBackExitGuard`'s own exit-toast half
  does.
- On a link-navigation-while-open edge case, accept a harmless orphaned history entry (one future
  no-op back press) rather than risk undoing the real navigation (user-confirmed).
- The pre-existing `AndroidBackExitGuard` flicker/skipped-toast bug is split into its own GitHub issue
  and explicitly out of scope here (user-confirmed).

## Addendum — jumpTo overwrites the surah-sidebar's guard entry before it can pop (2026-08-16)

**Type:** bug (speculative fix, unconfirmed root cause)
**Issue:** [#321](https://github.com/furqan-app/web/issues/321)

### Bug

Android standalone PWA only (not a browser tab, not reproducible via simulated clicks in a desktop
browser — confirmed by testing). Tapping a surah in the sidebar (`SurahListItem`) sometimes leaves the
reader's visible content on the old page; it only shows the target page after a subsequent swipe.
Distinct from #320 (the surah-name badge bug fixed earlier in this same branch) — here the actual
rendered Quran text is wrong, not just the label.

### Suspected mechanism

`SurahListItem`'s `onClick` calls `setOpen(false)` (closing the sidebar) then, for a plain click,
`jumpTo(surahStartingPage)` — which calls `window.history.replaceState(null, "", newUrl)` synchronously,
in the same tick, **before** React has processed the `setOpen(false)` state update or run any effect
cleanup. On standalone mobile/tablet, `Sidebar` is wired to `useCloseOnBackGesture(open, () =>
setOpen(false))` (this same plan, above) — while the sidebar was open it pushed a guard history entry.
That entry is still the current top of the history stack at the moment `jumpTo` fires, so
`replaceState`'s target is the guard's own entry, not the pre-sidebar page-N entry beneath it.

This does **not** structurally match the `NavOverflowMenu`/`SettingsSidebar` sibling-guard collision
this plan already fixed (both sides of that one were React effects racing each other; here, `jumpTo`'s
`replaceState` is an imperative call that always wins the race, running before the guard's own
microtask-deferred cleanup gets a chance to check anything). Tracing `useCloseOnBackGesture`'s cleanup
against this ordering, it actually degrades gracefully on its own terms — by the time its deferred check
runs, `window.history.state` no longer matches its `fqOverlayGuardId`, so it takes the safe "entry no
longer on top, leave it as a harmless orphan" branch (same file, same behavior already accepted for the
link-tapped-inside-an-overlay case above) — it does not call `history.back()` and does not appear to
corrupt anything by itself.

**Confidence note:** the deeper mechanism this project has hit before (ADR 0040's addendum, `#288`) —
Next's history patch stamping the router's current tree onto whatever object `replaceState` is handed,
then a later `ACTION_RESTORE` restoring a stale one — requires the **same state object** to be reused
across calls to bite. `jumpTo` passes a literal `null` each call, which Next's patch should treat as
fresh every time, not a reused reference. So this addendum's fix is a **speculative, testable** attempt
based on the one concrete structural gap found (`jumpTo`'s `replaceState` unconditionally firing before
the guard's cleanup settles), not a confirmed root cause — the standalone PWA environment could not be
reproduced or instrumented directly (no on-device console access in this session). If this fix does not
resolve it, the next step is on-device remote debugging (Android `chrome://inspect`) to capture the
actual `ACTION_RESTORE`/history state at the moment of failure.

### Approach

Defer `jumpTo`'s call by one tick (`setTimeout(fn, 0)`) so it runs after React has committed the
`setOpen(false)` update and run `useCloseOnBackGesture`'s effect cleanup (which itself defers its own
check to a microtask — a `setTimeout(0)` task is comfortably after both). This restores the intended
ordering: the guard's entry is settled (popped, if still on top) before `jumpTo` touches history, so
`jumpTo` always operates on the real page-N entry, never the guard's. `requestAnimationFrame` was tried
first and rejected — it depends on the document actively compositing frames, so it is throttled or never
fires while the tab/PWA is backgrounded or occluded, which a navigation must not silently depend on;
`setTimeout` has no such dependency. Scoped to `SurahListItem` only — `RubList`/`ContinueReadingLink`
call the same `jumpTo`, but the reported bug is specific to the surah sidebar's
guarded-overlay-close-then-jump sequence; deferring elsewhere without a matching report would be
unmotivated scope creep.

### Files to Change

- `app/components/SurahListItem.tsx` — wrap the `jumpTo(surahStartingPage)` call in
  `setTimeout(() => jumpTo(surahStartingPage), 0)`. `setPinnedSurahId` (issue #320's fix) stays
  synchronous — it only needs to land before `jumpTo`'s eventual `setAnchor`, not before the guard
  settles.

### Constraints

- Do not touch `jumpTo`/`commitTo`'s core `history.replaceState`-based navigation — deliberate
  architecture (ADR 0028, `DECISIONS.md` "Reader Navigation — Persistent Client Pager"), not the bug.
- Do not revert to `router.push` for sidebar navigation — the whole point of `replaceState` here is to
  bypass Next's router/RSC remount for in-reader page changes; reverting would reintroduce the
  performance regression ADR 0028 exists to fix.

### What NOT to Do

- Do not assume this fix is confirmed correct — it addresses the one structural gap found via static
  tracing, not a live-instrumented root cause. Report back after on-device testing; if unresolved, escalate
  to remote-debugging the actual device rather than iterating on more speculative timing changes blind.
- Do not extend the `requestAnimationFrame` defer to `RubList`/`ContinueReadingLink` without a matching
  reported symptom there.
