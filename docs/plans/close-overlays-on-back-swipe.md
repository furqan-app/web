---
title: Close Overlays on Back-Swipe (Mobile/Tablet PWA)
type: bug
date: 2026-08-15
status: implemented
area: nav
issue: 297
adr: [0055, 0045]
---

# Close Overlays on Back-Swipe (Mobile/Tablet PWA)

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

### Navigation API branch (where supported — ADR 0045)

`popstate` fires only *after* the browser has already dispatched the traversal, so it cannot stop the browser's own follow-up: on-device capture (Android installed PWA, `chrome://inspect`) showed a real back-swipe closing an overlay fires a clean same-document `traverse`, then ~6ms later a **separate `navigationType: "reload"`, `userInitiated: false` `navigate` event** — a genuine hard reload (full cold-reload waterfall = the "loading app logo" flash). `AndroidBackExitGuard` does **not** reproduce this; the bug is scoped to `useCloseOnBackGesture`.

Where `window.navigation` + `event.intercept()` exist (Baseline Jan 2026; Safari iOS **26.2+** only, older iOS none), the hook uses a `navigate` listener instead of `popstate`:

| Condition | Mechanism |
|---|---|
| Navigation API supported | `navigate` listener: intercept the closing `traverse` (matched by `navigationType === "traverse"` + `navigation.currentEntry.key` — read at fire time, which for a `traverse` is still the entry being **left**, not `destination`; matched by `.key`, not custom state, because `NavigationHistoryEntry.getState()` did not reliably round-trip the pushed object on-device), **and** intercept any `navigationType === "reload"` (`!userInitiated`) arriving within `RELOAD_WATCH_MS` (200ms) of this guard's own traverse. Use `event.intercept()`, never `event.preventDefault()`. |
| Not supported (iOS < 26.2, older Android WebView, desktop) | The `popstate`/`pushState` guard above, unchanged. |

The **self-close echo path** (X / backdrop / Escape → the microtask cleanup's own `history.back()`) must arm the *same* `awaitingReload` + `RELOAD_WATCH_MS` watch, not just swallow its echo traverse and remove the listener — after a browser has hard-reloaded the document once, every subsequent X/backdrop/Escape close also triggers the spurious reload, and nothing intercepts it otherwise (#418). The echo path arms the watch *inside* the async traverse handler, after the effect cleanup has returned, so the cleanup-interference guard the gesture path needs doesn't apply here.

The guard entry is still pushed via `history.pushState` (Next-patched, ADR 0040) — never `navigation.navigate()`, which bypasses Next's router-tree patching.

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
  existing `open`/`setOpen` from `useSidebar()`. Also capture `{ notifyNavigating }` from that call, hold it in a ref, and register a **stable wrapper** into `SidebarContext` via `useEffect`/cleanup (the `navRef`-style pattern `ReaderPager` uses for `onArrowNavigate` — the hook returns a fresh closure every render, so registering it raw re-triggers `fix-reader-nav-infinite-loop.md`).
- `app/contexts/SidebarContext.tsx` — add `notifyNavigating: (() => void) | null` + `setNotifyNavigating` (mirroring `ReaderNavigationContext`'s `jumpTo`/`setJumpTo`, including the double-wrap pitfall: call `setNotifyNavigating` with the raw function).
- `app/components/SurahListItem.tsx` — call `notifyNavigating?.()` **synchronously, immediately before `setOpen(false)`**, then `jumpTo` as before (no `setTimeout`/`rAF` defer). Without this the microtask cleanup's timing-based `history.state` check races `jumpTo`'s `replaceState` and the reader keeps the old page until the next swipe (#321 — same race #313 fixed for `NavOverflowMenu`'s links).
- `app/hooks/use-close-on-back-gesture.ts` — Navigation API feature detection (`supportsNavigationApi`); a `navigate` listener when supported, keeping the `popstate`/`pushState` implementation as the mutually-exclusive fallback in the same effect. Public signature `useCloseOnBackGesture(open, onClose)` unchanged; it also returns `notifyNavigating` (shipped for #313). The `selfClosingRef` echo path arms the same `awaitingReload` + `RELOAD_WATCH_MS` watch as the gesture path (#418).
- `package.json` — `@types/dom-navigation` devDependency (this repo's `lib.dom.d.ts` has no `Navigation`/`NavigateEvent` types).
- `app/components/nav/NavOverflowMenu.tsx` — `useCloseOnBackGesture(open, () => setOpen(false))` for
  its own Sheet only (`open`/`setOpen` at NavOverflowMenu.tsx:63). `SettingsSidebar` gets its own
  guard independently via its own component.
- `app/components/RecitationSettingsSheet.tsx` — `useCloseOnBackGesture(isSettingsOpen,
  closeSettings)`, both from `useRecitation()` (`RecitationContext.tsx`).
- `docs/architecture/adr/0055-overlay-close-on-back-gesture.md` — new; `docs/architecture/adr/0045-navigation-api-for-overlay-close-guard.md` — new (+ its own Addendum for #418).
- `docs/architecture/DECISIONS.md` — new "Overlay close-on-back-gesture" entry under "App Launch & Back Navigation (Android PWA)".

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
  overlay's cleanup pops a sibling overlay's freshly-pushed entry instead of its own.
- **Navigation API branch:** use `event.intercept()`, never `event.preventDefault()` (the latter leaves the guard entry in place, so the microtask cleanup's `history.back()` pops it a second time). Keep the `popstate` fallback — Navigation API support is not universal (iOS < 26.2). The `navigate` listener fires for *every* navigation including this hook's own `pushState` — filter to `traverse` + matching `currentEntry.key`, or `reload` within `RELOAD_WATCH_MS`, or the overlay closes itself the instant it opens. Disarm must be idempotent and deferred past the current event dispatch (not inside the synchronous `navigate` handler) so `AndroidBackExitGuard` reliably sees the guard as armed whether or not `popstate` also fires. The echo-path reload-watch listener must survive the effect's own cleanup (an `awaitingReload` first-line check), and only ever match `navigationType === "reload"` with `!userInitiated`. Do not arm the watch on the "entry no longer on top" branch.
- **`notifyNavigating()` must be called synchronously, before `setOpen(false)`** — its ref must read `true` by the time the cleanup effect's check runs. Do not modify `use-close-on-back-gesture.ts`'s `notifyNavigating` (shipped for #313, correct as-is). Do not reintroduce a `setTimeout`/`rAF` defer in `SurahListItem`.

## What NOT to Do

- Do not give each overlay its own independent `popstate` listener with no coordination — rejected in
  ADR 0055 (Option A) for producing undefined precedence against `AndroidBackExitGuard` on a reader
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
- Do not attempt to fix the reload flash by changing timing/ordering within the `popstate` handler (running it earlier, `stopImmediatePropagation`) — the browser's default navigation is already underway before any `popstate` listener runs.
- Do not switch to the Navigation API unconditionally without the `popstate` fallback — regresses overlay-close-on-back for iOS < 26.2.
- Do not touch `AndroidBackExitGuard.tsx` / `overlay-back-guard.ts` for any of the Navigation-API / reload / #321 / #418 work — isolated on-device testing confirmed the exit guard doesn't exhibit these bugs.
- Do not "fix" #418 by skipping the echo `history.back()` — that trades a reload for a permanently growing back-stack.
- Do not extend the `notifyNavigating` wiring to `RubList`/`ContinueReadingLink` without a matching reported symptom.

## Decisions Made

- Scope is mobile/tablet installed PWA, Android **and** iOS, not desktop (user-confirmed).
- On a link-navigation-while-open edge case, accept a harmless orphaned history entry rather than risk undoing the real navigation (user-confirmed).
- The pre-existing `AndroidBackExitGuard` flicker/skipped-toast bug is split into its own GitHub issue (#296) and explicitly out of scope.
- Where the Navigation API exists, intercept the closing `traverse` and the spurious follow-up `reload`; keep the `popstate` guard as the iOS < 26.2 / older-WebView fallback and accept its inability to intercept the reload there (ADR 0045, user-confirmed 2026-08-15).
- The `#418` echo-path reload arms the *identical* watch as the gesture path — one interception contract for both close paths, minimal diff (user-confirmed 2026-08-24).
- `#321` is fixed by wiring the already-shipped `notifyNavigating()` from `Sidebar` → `SidebarContext` → `SurahListItem`, superseding this addendum's own first-draft `setTimeout(fn, 0)` defer (written before `#313`'s mechanism was found on main).

## Revision History

- 2026-08-15 — folded Addendum "`popstate` can't stop the browser's own hard reload" (#309, [ADR 0045](../architecture/adr/0045-navigation-api-for-overlay-close-guard.md)). On-device capture showed a real back-swipe closing an overlay fires a clean `traverse` and then a *separate* spurious hard `reload` navigate event (the "loading app logo" flash). `popstate` runs too late to stop either. **Adds a Navigation API branch** (`navigate` + `event.intercept()`) that intercepts the `traverse` (matched by `NavigationHistoryEntry.key`, not custom state) and any follow-up `reload` within 200ms; `popstate`/`pushState` stays as the iOS < 26.2 / older-WebView fallback. `AndroidBackExitGuard` untouched (doesn't reproduce it).
- 2026-08-16 — folded Addendum "surah Sidebar was missed by the notifyNavigating fix" (#321). `SurahListItem`'s tap (`setOpen(false)` + `jumpTo` → `replaceState` in one handler) raced the microtask cleanup — the same shape #313 fixed for `NavOverflowMenu`'s links, at a call site that fix didn't cover. Fix: wire the already-shipped `notifyNavigating()` from `Sidebar` through `SidebarContext` to `SurahListItem`, called synchronously before `setOpen(false)`. **Supersedes this addendum's own first-draft `setTimeout(fn, 0)` defer.**
- 2026-08-24 — folded Addendum 3 "the self-close echo path must arm the same reload-watch" (#418). After the browser has hard-reloaded once, every subsequent X/backdrop/Escape close of a guarded overlay triggers the spurious reload — the echo path swallowed its traverse but removed the listener immediately without arming the `awaitingReload` watch. Fix: the echo path arms the identical `awaitingReload` + `RELOAD_WATCH_MS` watch as the gesture path. Popstate fallback still can't intercept a reload (accepted, ADR 0045).

