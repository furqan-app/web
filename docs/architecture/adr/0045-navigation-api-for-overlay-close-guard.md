# ADR 0045: Use the Navigation API to intercept the overlay-close back-gesture, with a popstate fallback

**Date:** 2026-08-15
**Status:** Accepted

## Context

`useCloseOnBackGesture` (ADR 0043) closes an open overlay on a back-swipe by pushing a history entry
and reacting to `popstate`. On-device testing (Android, installed PWA), instrumented directly through
the Navigation API's own `navigate`/`currententrychange` event log (ground truth, not inference), found
two distinct events fire ~6ms apart on a single swipe-back that closes an overlay: first, a clean
`navigationType: "traverse"`, same-document traversal — the overlay's guard entry popping correctly,
landing on whatever entry sits beneath it (in practice, `AndroidBackExitGuard`'s own pushed guard
entry, since an overlay always opens on top of an already-mounted reader). Immediately after, a
**second, separate** `navigate` event fires: `navigationType: "reload"`, `userInitiated: false`,
`destination.sameDocument: false` — a genuine, programmatically-triggered hard reload, not part of the
traversal itself. This second event is what produces the full cold-reload network waterfall and the
visible "loading app logo" flash; the traversal that closes the overlay was never the problem.

`popstate` cannot prevent this: by the time any `popstate` listener runs, the browser has already
dispatched the traversal, and whatever triggers the follow-up `reload` navigation does so
independently of our handler. The Navigation API's `navigate` event, with `event.intercept()`, can
observe and suppress *both* events — including the `reload` one — before either commits, since
`intercept()` is available on any `navigate` event regardless of `navigationType`. Reached Baseline
support in January 2026; Safari's implementation on iOS starts at 26.2 specifically (older iOS has no
support at all). Confirmed present (`"navigation" in window`) on the Android test device used for this
investigation.

## Options Considered

**Option A — Keep the popstate/pushState guard as the only mechanism**
No new browser API dependency, but structurally cannot prevent the browser's own parallel hard
navigation — the flicker/reload bug stays unfixed by design, not by oversight.

**Option B — Switch to the Navigation API unconditionally**
Simplest code path, but drops overlay-close-on-back-swipe support entirely for iOS < 26.2 and any
other browser without Navigation API support — a functional regression for those users versus what
ADR 0043 already ships today.

**Option C — Feature-detect the Navigation API; use `navigate` + `intercept()` where available, fall
back to the existing `popstate`/`pushState` guard everywhere else**
Fixes the hard-reload bug wherever the API is available, and never regresses behavior below what ADR
0043 already ships on unsupported browsers.

## Decision

Option C. `useCloseOnBackGesture` feature-detects `window.navigation` support; if present, it listens
for `navigate` and calls `event.intercept()` on **both** the closing `traverse` event **and** any
`navigationType === "reload"` event that follows within `RELOAD_WATCH_MS` of it, since on-device
evidence shows the reload is what actually produces the hard-refresh flash, not the traversal. If the
API is absent, it keeps ADR 0043's `popstate`/`pushState` guard exactly as implemented today.
`AndroidBackExitGuard` (ADR 0040) is untouched — it does not exhibit the hard-reload bug in isolated
on-device testing, so it is out of scope here.

The `traverse` event is matched to the guard's own pushed entry by `NavigationHistoryEntry.key`, not
by custom state (found during implementation — see Consequences).

## Consequences

- **+** Fixes the hard-reload/flicker bug on every browser where the Navigation API is available,
  without a new minimum-browser-version requirement for the feature as a whole.
- **+** No change to `AndroidBackExitGuard` — the fix is contained to `useCloseOnBackGesture`. Its
  coordination with `AndroidBackExitGuard` via the shared armed-count in `overlay-back-guard.ts` needs
  care on the Navigation-API branch specifically (see plan addendum's Constraints), since `navigate`
  fires before `popstate` — this is a real interaction, not something the fix can ignore.
- **-** Two code paths to maintain in `useCloseOnBackGesture` (Navigation API and popstate fallback)
  until Navigation API support is universal across the app's supported browser matrix.
- **-** iOS users below 26.2 keep today's imperfect popstate-based behavior for the overlay-close case
  (unrelated to the exit-toast case, which never used this mechanism) — accepted per user, revisit if
  it proves to affect a meaningful share of users.
- **-** On-device testing observed `popstate` firing a few ms after the (non-intercepted) `traverse`'s
  `navigatesuccess` — confirming it does fire in the baseline case. Whether calling `intercept()`
  specifically suppresses that `popstate` for the same traversal is still unconfirmed; the
  implementation's disarm logic does not assume either way, but this needs an on-device pass once
  deployed — the Navigation-API branch can't be exercised against the installed PWA from a local dev
  server (`docs/standards/pwa-testing.md`).
- **-** The `reload` event's trigger is not fully explained — likely something reacting to landing back
  on `AndroidBackExitGuard`'s stacked guard entry, possibly Next.js's own router failing to reconcile
  it — but intercepting it is sufficient to fix the symptom regardless of its exact source.
- **-** `NavigationHistoryEntry.getState()` did not reliably return the object passed to
  `history.pushState`, found while implementing the identity-matching the plan originally specified via
  `fqOverlayGuardId` — even in the same on-device capture where the legacy `history.state` correctly
  carried it. Matching uses `NavigationHistoryEntry.key` instead (platform-guaranteed-unique, not
  dependent on custom state round-tripping through `getState()`).
- **-** The reload-watch timer/listener started after intercepting the closing `traverse` must survive
  the effect's own `useEffect` cleanup, which React runs essentially immediately once `onClose()` flips
  `open` to `false` — well inside the watch window. An early implementation draft let that cleanup
  unconditionally clear the timer, silently defeating the fix; the shipped version gates the cleanup on
  an `awaitingReload` flag instead.

## Addendum (2026-08-24, issue #418): the self-close echo path must arm the same reload-watch

The original decision covered only the real back-gesture close. The **self-close echo path** — the
microtask cleanup that pops the guard's own entry via `history.back()` when the overlay closes via
X/backdrop/Escape — intercepted its own echo traverse but removed the navigate listener immediately,
never arming the `awaitingReload` watch. The spurious hard-`reload` this ADR documents fires after
*any* back traversal, programmatic ones included: after a browser-initiated document reload (e.g.
the OS reloading the PWA on network reconnect), every X-button overlay close produced a full
document reload.

Amendment: the echo path arms the identical `awaitingReload` + `RELOAD_WATCH_MS` watch instead of
removing the listener immediately — one interception contract for both close paths. Structurally
simpler there than in the gesture path: the watch is armed inside the async traverse handler, after
the effect cleanup has already returned, so the cleanup-survival problem (last Consequence above)
cannot recur. The popstate fallback's echo path keeps its accepted, irreducible gap (see the plan's
Addendum 3, `docs/plans/close-overlays-on-back-swipe.md`).
