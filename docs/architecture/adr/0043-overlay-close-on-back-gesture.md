# ADR 0043: Overlays close on back-gesture via a shared history guard, coordinated with AndroidBackExitGuard

**Date:** 2026-08-15
**Status:** Accepted

## Context

In the installed mobile/tablet PWA (Android and iOS), swiping back while an overlay (menu, settings
sidebar, surah sidebar, mark modal, recitation sidebar) is open does the platform's default back
navigation instead of closing the overlay — none of the five are integrated with history at all,
they're plain Radix `Dialog`/`Sheet` with local `useState`. The overlay stays visually open, now
stacked over whatever the browser navigated to.

Four of the five overlays can be open on a reader page (`/pages/...`) at the same time
`AndroidBackExitGuard` (ADR 0040) is mounted there — it already pushes its own history guard entry
and listens globally for `popstate` to implement the Android "press back again to exit" flow. Any
independent per-overlay `popstate` listener collides with it: both fire on the same event, and
without coordination, both could push additional history entries or misfire.

## Options Considered

**Option A — Give each overlay its own independent history push + popstate listener, no coordination**
Simplest to write, but on a reader page both listeners fire for the same event with no defined
precedence. Whichever runs first (registration-order dependent) can re-push or act before the other
has a chance to, producing unpredictable stacking or a skipped toast/skipped close.

**Option B — One shared hook (`useCloseOnBackGesture`) all five overlays use, plus a shared
module-level "armed" flag that `AndroidBackExitGuard` checks and defers to**
Each overlay pushes one guard entry on open via the shared hook; on a real back press the hook closes
the overlay and clears the flag. `AndroidBackExitGuard`'s `popstate` handler gains one check: if the
shared flag is set, return immediately without re-pushing or arming — the overlay's own listener
(registered later, since it only mounts once the user opens something on top of an already-mounted
reader) runs next in the same event dispatch and handles it exclusively.

## Decision

Option B. `AndroidBackExitGuard` must defer to any currently-armed overlay guard rather than run its
own logic on the same `popstate` event. This relies on mount order (the reader's exit-guard always
mounts before a user can open an overlay on top of it), not registration timing tricks.

## Consequences

- **+** At most one guard acts on any given back-gesture, deterministically, without needing to
  inspect which history entry was actually popped (the browser doesn't expose that).
- **+** Reusable: any future overlay uses the same hook and is automatically coordinated with
  `AndroidBackExitGuard` — no new listener needs to know about the guard explicitly, only about the
  shared flag.
- **-** Any future code that adds a new global `popstate` listener on a reader-mounted route must
  check the shared "overlay armed" flag first, the same way `AndroidBackExitGuard` does now — this is
  a new implicit contract, not enforced by the type system.
- **-** When an overlay's pushed entry is no longer the top of history at close time (e.g. a link
  tapped inside the overlay navigated away before the guard's cleanup ran), the hook does not call
  `history.back()` — doing so would remove the wrong entry instead of the guard's own. The pushed
  entry is left as a harmless orphan; the cost is one future back press being a no-op rather than a
  broken navigation (or, per the identity requirement below, a wrongly-closed sibling overlay).
  Accepted per ADR 0040's own precedent of accepting a best-effort trade-off (`window.close()` no-op)
  rather than adding complexity to eliminate an edge case with no clean fix.
- **-** Same "fresh state object per push" constraint from ADR 0040's 2026-08-14 addendum applies
  here — the shared hook must never reuse a pushed state object across calls.

## Addendum — 2026-08-15: "is my entry still on top" must be deferred and identity-checked

**Status:** Accepted. Amends the implementation of Option B; the shared-hook decision itself stands.

Found in review, before merge (Sonnet, 2026-08-15). `NavOverflowMenu`'s Settings row calls
`closeMenu()` and `setSettingsOpen(true)` in one click handler — both land in the same React commit.
React runs every effect *cleanup* in a commit before any new effect *setup*. The original cleanup
checked `history.state?.fqOverlayGuard` **synchronously** and, seeing its own entry still on top,
called `history.back()` — but that traversal (and its `popstate`) resolves **asynchronously**, against
whatever is on top of history *when the browser actually processes it*, not at call time.
`SettingsSidebar`'s own effect (the new commit's setup phase, running right after) pushed its entry on
top in the interim, so the deferred `back()` popped **`SettingsSidebar`'s** entry instead of
`NavOverflowMenu`'s — and `SettingsSidebar`'s own `popstate` listener, freshly attached, had no way to
attribute that echo to a sibling's cleanup. It read it as a real back press and closed itself
immediately, every time, on exactly the platform this feature targets.

Two changes, both required:

1. **Defer the check to a microtask.** `queueMicrotask` inside cleanup runs after every effect in the
   same commit — including a sibling's `pushState` — has finished, so the check reflects the real,
   settled stack rather than a snapshot mid-commit.
2. **Compare by a unique id, not shape.** Every guarded overlay pushes the identical
   `{ fqOverlayGuard: true }` shape, so even a deferred, accurate-at-the-time check can't tell "my own
   entry is on top" from "a sibling's entry — pushed after mine, in the same commit — is on top
   instead." `overlayGuardState()` now also stamps a unique `fqOverlayGuardId`; each hook instance
   remembers the id it pushed and compares it, not just the shape, before deciding to call
   `history.back()`.

Deferring alone is insufficient without the id: a deferred-but-shape-only check would correctly see
*some* guard's entry on top and still wrongly conclude it was safe to pop.
