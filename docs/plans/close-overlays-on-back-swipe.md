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
- `docs/architecture/adr/0055-overlay-close-on-back-gesture.md` — new (written during planning).
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

## Decisions Made

- Scope is mobile/tablet installed PWA, Android **and** iOS, not desktop (user-confirmed) — broader
  than `AndroidBackExitGuard`'s Android-only gate, since the underlying mechanism (history guard +
  popstate) doesn't depend on Android specifically, only `AndroidBackExitGuard`'s own exit-toast half
  does.
- On a link-navigation-while-open edge case, accept a harmless orphaned history entry (one future
  no-op back press) rather than risk undoing the real navigation (user-confirmed).
- The pre-existing `AndroidBackExitGuard` flicker/skipped-toast bug is split into its own GitHub issue
  and explicitly out of scope here (user-confirmed).

## Addendum — 2026-08-15: `popstate` can't stop the browser's own hard reload; use the Navigation API where available

**Status:** implemented. GitHub: [#309](https://github.com/furqan-app/web/issues/309). ADR:
[0045](../architecture/adr/0045-navigation-api-for-overlay-close-guard.md).

### What was reported

After this plan shipped (PR #299, merged), the user reported that swiping back to close an overlay
shows a "loading app logo" flash and the reader visibly rerenders — even though the overlay does
close correctly. The same flash was suspected (but not confirmed) to also affect the plain exit-toast
swipe (`AndroidBackExitGuard`, tracked separately as
[#296](https://github.com/furqan-app/web/issues/296)).

### Investigation

Confirmed via on-device Chrome remote debugging (`chrome://inspect` over `adb`, real physical
back-swipes on an installed Android PWA — not desktop simulation):

- A single, isolated swipe-back to close an open overlay (`NavOverflowMenu`) produces a genuine
  top-level document `GET` request for the current URL, **0.03s before** this plan's own `popstate`
  handler even runs — confirmed by timestamped console markers and a `Page.frameNavigated` CDP event.
  It's followed by a full cold-reload waterfall: every JS chunk, font, CSS file, the manifest,
  favicon, Sentry init, and every data API refetched from scratch. That full reload is the "loading
  app logo" flash — not a React rerender, an actual fresh page load.
- The same swipe, repeated across two earlier (less isolated) test sessions, twice landed on a real
  hard reload — once of the current reader URL, once of the home route (`/ar`) — confirming this
  isn't a one-off.
- A single, isolated swipe-back with **nothing open** (`AndroidBackExitGuard`'s exit-toast path, ADR
  0040) was clean: `popstate` fires, the toast shows, and it auto-dismisses ~2s later exactly matching
  `ARM_WINDOW_MS`. No reload. **This narrows the bug to `useCloseOnBackGesture` (ADR 0055) specifically
  — `AndroidBackExitGuard` does not reproduce it.** [#296](https://github.com/furqan-app/web/issues/296)
  may need its own re-verification; it is not the same bug as this one.

### Root cause

Confirmed precisely via a second on-device round, instrumented directly through the Navigation API's
own `navigate`/`currententrychange` event log (ground truth, not inference — a fully isolated
single-swipe test, opening `NavOverflowMenu` then one swipe-back). **Two separate `navigate` events
fire ~6ms apart:**

1. `navigationType: "traverse"`, same-document, same URL (index 3→2) — the overlay's guard entry
   popping correctly. **This part was never broken** — it lands on whatever entry sits beneath the
   overlay's, which in practice is `AndroidBackExitGuard`'s own pushed guard entry (confirmed: the
   `popstate` fired with `historyState: {"fqExitGuard": true}`).
2. A **second, separate** `navigate` event: `navigationType: "reload"`, `userInitiated: false`,
   `destination.sameDocument: false` — a genuine, programmatically-triggered hard reload. This is what
   produces the cold-reload network waterfall (every chunk/font/CSS/manifest/API refetched) and the
   "loading app logo" flash — not the traversal, not Chrome's gesture handling racing ahead of the
   JS as first suspected. The `reload` event's exact trigger isn't fully explained (candidate: something
   reacting to landing back on `AndroidBackExitGuard`'s stacked entry, possibly Next.js's own router
   failing to reconcile it) — intercepting it is sufficient to fix the symptom regardless of source.

`popstate` cannot prevent either event: it only fires after the browser has already dispatched the
traversal (confirmed: it fired *after* the `reload` event in this capture, not before), so no
`popstate`/`pushState`-based code can act before either commits. The Navigation API's `navigate`
event, via `event.intercept()`, runs *before* the browser commits to a given navigation's default
action and is documented to prevent it — and it applies per-event, so it can intercept the `reload`
event too, not just the `traverse`. Reached Baseline support in January 2026; Safari on iOS starts at
**26.2 specifically** (older iOS has no support at all). Confirmed present (`"navigation" in window`)
on the Android device used for this investigation.

### Decision Tree

| Condition | Mechanism |
|---|---|
| `window.navigation` + `intercept` supported | `navigate` event listener: intercept the closing `traverse` (matched by `navigationType === "traverse"` + `navigation.currentEntry.key`, read at fire time — see identity-matching note below), **and** intercept any `navigationType === "reload"` event that follows within `RELOAD_WATCH_MS` — that second event is what actually causes the flash |
| Not supported (iOS < 26.2, older Android WebView, desktop) | Unchanged: today's `popstate`/`pushState` guard, exactly as implemented in this plan's original body |

**Identity-matching correction (found during implementation, 2026-08-15):** the original plan assumed
matching by the pushed `fqOverlayGuardId` via `NavigationHistoryEntry.getState()`, mirroring the
popstate branch's `fqOverlayGuardId`. On-device capture showed `getState()` did not reliably return
the object passed to `history.pushState` — even in the same capture where the legacy `history.state`
correctly carried it. The implementation matches by `NavigationHistoryEntry.key` instead (a
platform-guaranteed-unique identifier not dependent on custom state round-tripping): captured via
`navigation.currentEntry.key` immediately after the guard's `history.pushState` call (synchronously
the just-pushed entry), then compared against `navigation.currentEntry.key` read again inside the
`navigate` handler — which at fire time for a `traverse` is still the entry being LEFT, not the
`destination` (confirmed on-device: `destination.index` was the target, `currentEntry`/fire-time index
was still the guard's own entry).

Everything else — pushing a fresh, uniquely-id'd guard entry on open, the microtask-deferred
"is my entry still on top" cleanup check, coordination with `AndroidBackExitGuard` via the shared
armed-count — stays as specified above. Only the detection/interception mechanism for "a real back
gesture landed on my entry" changes, and only on the feature-detected branch. `AndroidBackExitGuard`
itself is unmodified — it does not exhibit this bug.

### Verified Test Cases (new)

Confirmed on-device, 2026-08-15 (Android, installed PWA, `chrome://inspect` over `adb`):

11. Single isolated swipe-back closing `NavOverflowMenu`: real `GET` to current URL fires, followed by
    a full cold-reload waterfall. Reproduces the reported flash. This is the case the Navigation API
    branch must fix.
12. Single isolated swipe-back with nothing open (exit-toast path): clean — `popstate` fires, toast
    shows, auto-dismisses at ~2s, no reload. Confirms `AndroidBackExitGuard` is unaffected and must
    stay untouched.
13. Same isolated swipe as case 11, this time instrumented through `window.navigation` directly (not
    just `popstate`/network): shows the `traverse` completing cleanly (same-document, same URL) followed
    ~6ms later by a distinct `navigationType: "reload"` event (`userInitiated: false`,
    `sameDocument: false`) that is the actual source of the reload — not the traversal itself. Pinpoints
    exactly what the Navigation-API branch must intercept.

### Files to Change

- `app/hooks/use-close-on-back-gesture.ts` — Navigation API feature detection (`supportsNavigationApi`);
  branches to a `navigate` event listener when supported, keeps the existing `popstate`/`pushState`
  implementation as the fallback (both live in the same effect, mutually exclusive). No change to the
  hook's public signature (`useCloseOnBackGesture(open, onClose)`).
- `package.json` — added `@types/dom-navigation` (devDependency) — this repo's `lib.dom.d.ts` (TS
  5.6.3) has no `Navigation`/`NavigateEvent`/`Window.navigation` types.
- No other runtime files change — `AndroidBackExitGuard.tsx` and `overlay-back-guard.ts` are untouched,
  though the Navigation-API branch's interaction with the shared armed-count needs care (see
  Constraints) even without editing those files.

### Constraints

- Do not drop the `popstate`/`pushState` fallback — Navigation API support is not universal (notably
  iOS < 26.2), and this hook must not regress below what shipped in this plan's original body for
  those browsers.
- The `navigate` listener fires for *every* navigation, including this hook's own opening `pushState`
  call, any sibling overlay's push, and `AndroidBackExitGuard`'s re-push. It must filter to
  `navigationType === "traverse"` with a matching `navigation.currentEntry.key` (for the close case,
  read at fire time — see the identity-matching correction above) or `navigationType === "reload"`
  occurring within `RELOAD_WATCH_MS` of this guard's own traverse (for the flash case) — without this
  filter the overlay would close itself the instant it opens.
- The reload-watch timer/listener started when a real gesture closes the overlay must survive the
  effect's own cleanup — React runs that cleanup essentially immediately once `onCloseRef.current()`
  flips `open` to `false`, well inside the watch window. The implementation guards this explicitly
  (an `awaitingReload` check as the cleanup's first line) rather than letting the normal
  microtask-deferred "is my entry still on top" cleanup path run in that case — found and fixed during
  implementation; an earlier draft let the cleanup unconditionally clear the reload-watch timer,
  silently defeating the whole fix.
- Use `event.intercept()`, never `event.preventDefault()` — `preventDefault()` leaves the guard entry
  in place, which would make the existing microtask cleanup's `history.back()` pop it a second time.
- `navigate` fires *before* `popstate` (confirmed on-device: `popstate` for the traversal landed after
  the `reload` event in the capture, not before). `AndroidBackExitGuard`'s coordination via
  `isOverlayBackGuardArmed()` assumes its own `popstate` listener runs after the overlay's listener has
  already disarmed — on the Navigation-API branch, disarming inside the `navigate` handler risks the
  exit guard seeing `armed === 0` if `popstate` still fires for the same gesture, wrongly showing "press
  back again to exit" on an overlay close. Disarm must be idempotent and deferred past the current event
  dispatch (not inside the synchronous `navigate` handler) so the exit guard reliably sees the guard as
  armed for that traversal either way.
- The non-back close paths (X button, Escape, in-overlay link) still call `history.back()` from the
  existing microtask cleanup, which fires a `navigate` event on the Navigation-API branch too. Needs an
  equivalent to the `popstate` branch's `selfClosingRef` echo-swallow so that programmatic close doesn't
  get misread as a real back gesture — or, worse, trip the exit-toast.
- Keep pushing the guard entry via `history.pushState` (patched by Next, per ADR 0040) — do not switch
  to `navigation.navigate()` to create it; that would bypass Next's router-tree patching entirely
  (the exact failure class behind issue #288).
- Whether calling `intercept()` on the `traverse` event specifically suppresses the `popstate` that
  otherwise follows it is still unconfirmed — the implementation does not assume either way (the
  `AndroidBackExitGuard` coordination above is written to be correct regardless), but this still needs
  an on-device pass once deployed, since the Navigation API branch cannot be exercised against the
  installed PWA from a local dev server (Serwist/service-worker behavior — and the installed PWA's
  origin generally — differ from `npm run dev`; see `docs/standards/pwa-testing.md`).
- Do not touch `AndroidBackExitGuard.tsx` or `overlay-back-guard.ts` — isolated on-device testing
  confirmed they don't exhibit this bug; keep the fix scoped to `useCloseOnBackGesture`.

### What NOT to Do (new)

- Do not attempt to fix this by changing timing/ordering within the existing `popstate` handler (e.g.
  running it earlier, `stopImmediatePropagation`) — the browser's default navigation is already
  underway by the time any `popstate` listener runs; no listener-ordering trick can prevent it.
- Do not switch to the Navigation API unconditionally without the `popstate` fallback — this would
  regress overlay-close-on-back-swipe entirely for iOS < 26.2, a functional regression versus what
  shipped in PR #299.
- Do not extend this fix to `AndroidBackExitGuard` — it does not reproduce the bug; leave ADR 0040's
  mechanism as-is.

### Decisions Made (new)

- Accept the current, imperfect `popstate`-based behavior for iOS < 26.2 users on the overlay-close
  case rather than delaying the fix until usage data is available (user-confirmed 2026-08-15).

## Addendum — surah Sidebar was missed by the notifyNavigating fix (2026-08-16)

**Type:** bug
**Issue:** [#321](https://github.com/furqan-app/web/issues/321)
**Related:** [#313](https://github.com/furqan-app/web/issues/313) /
`docs/plans/fix-nav-overlay-link-navigation-race.md` (same root cause, different call site)

### Bug

Android standalone PWA only. Tapping a surah in the sidebar (`SurahListItem`) sometimes leaves the
reader's visible content on the old page; it only shows the target page after a subsequent swipe.
Distinct from #320 (the surah-name badge bug, same branch) — here the actual rendered Quran text is
wrong, not just the label.

### Root cause

Exactly the bug `#313` already fixed for `NavOverflowMenu`'s `<Link>` rows (My Marks / My Plans /
Shared mushaf), just at a call site that fix didn't cover. `useCloseOnBackGesture`'s cleanup effect
decides whether to pop its own guard entry via a `queueMicrotask`-deferred check of
`window.history.state`. That check is correct for a sibling overlay's `pushState` (guaranteed to land
within the same commit's effects, and therefore the same microtask flush — ADR 0055's 2026-08-15
addendum), but not for a competing navigation whose own history write isn't guaranteed to land before
that microtask runs.

`SurahListItem`'s click is exactly that shape: `setOpen(false)` (arms the cleanup) and, in the same
handler, `jumpTo(surahStartingPage)` — which calls `window.history.replaceState` for the target page.
`Sidebar` is wired to `useCloseOnBackGesture(open, () => setOpen(false))` the same way `NavOverflowMenu`
is; `#313`'s fix added a `notifyNavigating()` escape hatch to the hook and wired it into
`NavOverflowMenu`'s `<Link>` rows, but `Sidebar`/`SurahListItem` — a different consumer of the same
hook, not audited as part of that investigation — never got it. This resolves the "speculative,
unconfirmed" hypothesis from this addendum's first draft (a `setTimeout` defer, since reverted): the
real mechanism is the same race `#313` already root-caused and fixed elsewhere, not a novel one.

### Approach

Wire the existing `notifyNavigating()` (returned by `useCloseOnBackGesture`, already shipped) from
`Sidebar` through `SidebarContext` to `SurahListItem`, mirroring how `ReaderNavigationContext` exposes
`jumpTo` from `ReaderPager` to the same caller. `SurahListItem` calls it synchronously, immediately
before `setOpen(false)` — the cleanup effect then skips its timing-based `history.state` check
entirely and disarms unconditionally, exactly as it already does for `NavOverflowMenu`'s links.

### Files to Change

- `app/contexts/SidebarContext.tsx` — add `notifyNavigating: (() => void) | null` and
  `setNotifyNavigating`, mirroring `ReaderNavigationContext`'s `jumpTo`/`setJumpTo` shape (including the
  same double-wrap pitfall documented there: `setNotifyNavigating` must be called with the raw function,
  never wrapped again at the call site).
- `app/components/nav/Sidebar.tsx` — capture `{ notifyNavigating }` from the existing
  `useCloseOnBackGesture(open, () => setOpen(false))` call. Since the hook returns a fresh closure every
  render (not `useCallback`-memoized), hold it in a ref and register a stable wrapper into
  `SidebarContext` via `useEffect`/cleanup — the same `navRef`-style stable-wrapper pattern
  `ReaderPager.tsx` already uses for `onArrowNavigate`, not a second copy of the infinite-loop bug
  `docs/plans/fix-reader-nav-infinite-loop.md` fixed once.
- `app/components/SurahListItem.tsx` — revert the `setTimeout` defer from this addendum's first draft;
  call `notifyNavigating?.()` synchronously immediately before `setOpen(false)`, then call `jumpTo`
  synchronously as before (no artificial delay).

### Constraints

- `notifyNavigating()` must be called before `setOpen(false)`, synchronously — same constraint `#313`
  already documented; the ref it sets must be `true` by the time the cleanup effect's check runs.
- Do not modify `use-close-on-back-gesture.ts` itself — `notifyNavigating` already exists and is
  correct (shipped for `#313`); this addendum only wires an existing, unrelated consumer to it.
- Do not reintroduce the `setTimeout`/`requestAnimationFrame` defer — `notifyNavigating` makes it
  unnecessary, and the prior draft's own reasoning (rAF stalls when not compositing) is moot once the
  guard is told explicitly rather than timed around.

### What NOT to Do

- Do not extend this specific wiring to `RubList`/`ContinueReadingLink` without a matching reported
  symptom — same scoping call as this addendum's first draft, unchanged rationale.
- Do not re-litigate `#313`'s own fix (`use-close-on-back-gesture.ts`, `NavOverflowMenu.tsx`) — this
  addendum only adds a second, independent consumer of the same already-shipped API.

### Decisions Made

- Superseded this addendum's own first-draft fix (`setTimeout(fn, 0)` defer in `SurahListItem`),
  written before `#313`'s `notifyNavigating` mechanism was discovered on `main` mid-task. The
  `setTimeout` version was never confirmed on-device; `notifyNavigating` is the established, root-caused
  fix for this exact race shape.

## Addendum 3 (2026-08-24): the self-close echo path must arm the same reload-watch as the gesture path

**Type:** bug
**Status:** implemented (lint + `tsc --noEmit` clean; on-device verification pending — MANDATORY
before release: the bug only reproduces after a browser-initiated reload on the installed PWA,
`chrome://inspect` over adb per `docs/standards/pwa-testing.md`)
**Issue:** [#418](https://github.com/furqan-app/web/issues/418)
**ADR:** [0045](../architecture/adr/0045-navigation-api-for-overlay-close-guard.md) (amended — see its Addendum)

### Bug

Installed Android PWA. After the browser has hard-reloaded the document once (e.g. the
OS-initiated reload on network reconnect), **every** subsequent close of a guarded overlay
(Settings sidebar et al.) via its X button / backdrop / Escape produces a full document reload —
Chrome's own reload progress bar, full cold-reload waterfall. Before any browser reload, the same
closes are clean.

### Root cause

ADR 0045 established (on-device ground truth) that Android Chrome fires a spurious hard-`reload`
`navigate` event ~6ms after a back traversal, and its trigger "is not fully explained — likely
something reacting to landing on `AndroidBackExitGuard`'s stacked guard entry, possibly Next's
router failing to reconcile it." The **real back-gesture** path arms a 200ms `awaitingReload` watch
(`RELOAD_WATCH_MS`) specifically to intercept that follow-up reload.

The **self-close echo path** — the microtask cleanup that pops the guard's own entry via
`window.history.back()` when the overlay closes via X/backdrop/Escape — intercepts its own echo
traverse in the `selfClosingRef` branch but then **removes the navigate listener immediately**
(`use-close-on-back-gesture.ts` ~line 136-142) and never arms the watch. When the spurious reload
follows the echo traverse, nothing intercepts it → full document reload. The popstate fallback's
echo path has the same gap and structurally cannot intercept a reload.

Addendum 1's own Constraints anticipated echo-path danger ("Needs an equivalent to the popstate
branch's `selfClosingRef` echo-swallow so that programmatic close doesn't get misread… or, worse,
trip the exit-toast") but mandated only the echo-*swallow*, not the reload-watch — the gap this
addendum closes.

Why it only reproduces after a browser reload is not fully pinned (same unexplained-trigger
admission as ADR 0045): post-reload, the history stack holds pre-reload document entries and Next's
restored router state — plausibly the exact "router fails to reconcile the stacked guard entry"
condition. The fix does not depend on resolving that question; interception is sufficient (ADR
0045's own precedent). On-device `chrome://inspect` capture during implementation should record the
event sequence for the record.

### Decision Tree / Algorithm

| Close path | Echo traverse (our own `back()`) | Spurious follow-up reload |
|---|---|---|
| Back gesture, Navigation API | intercepted (existing) | intercepted (existing `awaitingReload` watch) — **unchanged** |
| X / backdrop / Escape, Navigation API | intercepted (existing `selfClosingRef` echo) | **NEW — arm the same `awaitingReload` + `RELOAD_WATCH_MS` watch instead of removing the listener immediately; intercept a `reload` (`!userInitiated`) arriving within the window** |
| Any close, popstate fallback (iOS < 26.2) | swallowed via `popstate` echo | cannot intercept — accepted, identical to the gesture path's limitation on these browsers (ADR 0045 precedent) |

Structural note (why this is simpler than the gesture path's watch): the echo path arms the watch
*inside the async traverse handler*, after the effect cleanup has already returned — so the
cleanup-interference problem the gesture path guards against (the `awaitingReload` first-line check
in the cleanup, ADR 0045's Consequences) cannot occur here. The listener is removed by the watch
timer's own callback or by an intercepted reload, never by a competing cleanup.

### Verified Test Cases

Walked through with the user (2026-08-24):

1. **The reported repro:** post-browser-reload, open Settings sidebar → close via X → no document
   reload, sidebar closes, history depth returns to pre-open state.
2. Fresh session (no browser reload), open/close Settings via X → no reload, no regression.
3. Real back-gesture close → unchanged (traverse + reload both intercepted, as shipped).
4. `NavOverflowMenu` → "Settings" row (sibling opened in the same commit, menu's entry orphaned) →
   close Settings via X → no reload; the id-matched top-of-stack check still pops only Settings'
   own entry.
5. Link navigation inside an overlay (`notifyNavigating` path) → unchanged; no watch armed, no
   reload interception needed.
6. iOS < 26.2 / no Navigation API → popstate fallback, behavior unchanged (accepted gap).
7. Rapid open→close→open of the sidebar inside one 200ms window → the first close's watch expires
   or intercepts without swallowing the second open's own `pushState` navigate event (the watch
   only matches `navigationType === "reload"`, never `push`/`replace`/`traverse`).

### Files to Change

- `app/hooks/use-close-on-back-gesture.ts` — in the Navigation API branch's `selfClosingRef` echo
  handling: replace the immediate `removeEventListener` with arming `awaitingReload` +
  `reloadWatchTimer` (same constants and interception condition as the gesture path). Nothing else
  in the file changes.

### Constraints

- The watch must only ever match `navigationType === "reload"` with `!e.userInitiated` within
  `RELOAD_WATCH_MS` — identical filter to the gesture path; widening it risks swallowing real
  navigations.
- Keep the `selfClosingRef` echo semantics otherwise intact: `onClose` must not be re-invoked by
  the echo traverse.
- Do not arm the watch on the "entry no longer on top" branch (line ~200-203) — there is no echo
  traverse to watch there.
- On-device verification is mandatory before marking implemented — the bug only reproduces after a
  browser-initiated reload on the installed PWA (`chrome://inspect` over adb; Serwist disabled in
  dev per `docs/standards/pwa-testing.md`).

### What NOT to Do

- Do not "fix" this by skipping the echo `history.back()` (leaving the guard entry orphaned) —
  that trades a reload for a permanently growing back-stack and breaks test case 1's history-depth
  expectation.
- Do not extend the change to `AndroidBackExitGuard.tsx` or `overlay-back-guard.ts` — ADR 0045's
  scoping stands (isolated testing showed the exit guard doesn't exhibit the reload bug).
- Do not attempt to intercept the reload on the popstate fallback — structurally impossible;
  ADR 0045 already accepted this for iOS < 26.2.

### Decisions Made

- The echo path arms the identical watch rather than a bespoke mechanism — one interception
  contract for both close paths, minimal diff (user-confirmed 2026-08-24).
- The unexplained-trigger question (why only post-reload) is recorded, not blocking — same
  stance ADR 0045 took for the original bug; interception fixes the symptom regardless of source
  (user-confirmed 2026-08-24).
