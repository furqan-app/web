# ADR 0040: Double-push history guard for Android PWA back-to-exit

**Date:** 2026-08-12
**Status:** Accepted

## Context

The installed Android PWA reader should show a "press back again to exit" toast on the first back
press, and actually exit on a second press within a short window — and it must always exit, never
fall through to a real prior history entry (e.g. the home surah list) even when one genuinely
exists. The web platform has no "exit app" API; `window.close()` is the only candidate, and it only
closes an installed standalone/fullscreen Android PWA's top-level browsing context, not arbitrary
tabs. Achieving "second press always exits" therefore requires intercepting *every* back press
while on a guarded route, not just the first — a single dummy history entry only buys one
interception before falling through to whatever is genuinely behind it.

## Options Considered

**Option A — Single dummy history entry, let the second back press fall through**
Push one guard state on mount; first back press pops it and is caught; second back press pops the
real prior entry (home, or true exit if nothing precedes it). Simplest, but violates "always exit,
never land on home" whenever the reader was reached via real navigation.

**Option B — Double-push guard: re-push after every intercepted press, skip the re-push to exit**
Push a guard entry on mount. Each `popstate` while unarmed re-pushes the guard (keeping the user on
the same URL) and arms a timer; a `popstate` while armed skips the re-push and calls
`window.close()` instead. The real history behind the guard is never reached while the guard is
mounted — there is no path to "fall through to home."

## Decision

Option B. The guard commits to intercepting back indefinitely (as long as the reader route is
mounted); the only two outcomes of a back press are "stay + show toast" or "attempt exit."

## Consequences

- **+** Satisfies "always exit, never fall back to a real prior entry" exactly, regardless of how
  the reader was reached (cold launch vs. navigated in from home).
- **+** No dependency on knowing or inspecting real history depth.
- **-** `window.close()` is a best-effort call with platform-specific support (installed
  standalone/fullscreen Android Chrome). Where it's a no-op, the second back press produces no
  visible effect — accepted, since the guard itself is gated to exactly that platform, so a context
  where `close()` doesn't work is a context where the guard shouldn't be running at all.
- **-** Must never be "simplified" back to a single push — that silently reintroduces Option A's
  fall-through-to-home behavior. Every future change to this code must preserve the
  re-push-until-armed / skip-to-exit shape.
- **-** iOS and desktop get no back-exit guard (no back button/gesture to trap on iOS; desktop is
  out of scope for this affordance) — those platforms are excluded by the same
  `isStandaloneDisplayMode()` + platform check the guard mounts behind, not by this history
  mechanism.
