# ADR 0074: Use the Navigation API for Reader Back-Exit Guard (with popstate fallback)

**Date:** 2026-09-26
**Status:** Accepted

## Context

In installed Android PWA and the Capacitor mobile/tablet shell, the Quran reader route (`/pages/...`, excluding `/mushaf/[grant]/pages/...`) enforces a double-back-to-exit guard (ADR 0040): the first back press displays an `ExitToast` and keeps the user on the current page; a second press within 2 seconds exits the app (`window.close()` in standalone PWA, `App.exitApp()` in Capacitor). The guard must never navigate away to a prior history entry (e.g. Home, `/plans`, or a previously read surah).

`AndroidBackExitGuard` originally relied on a single mount-time `history.pushState` and a `popstate` listener. In the Next.js App Router, navigating between reader pages (e.g. via wird in `PlansWidget`, ayah picker, or in-app links) reuses component instances without unmounting `ReaderPager`, leaving the new page unprotected. Additionally, `popstate` fires after the browser has already initiated traversal, allowing Next.js router restoration to race ahead before the guard can re-push.

## Options Considered

**Option A — Re-arm popstate guard on every anchor change only**
Updates dependency arrays to re-push `guardState()` on page changes. However, `popstate` fires after the browser has already traversed, which can still produce router flicker and does not prevent browser navigation before the handler executes.

**Option B — Feature-detect Navigation API (`navigate` + `event.intercept()`) with popstate fallback**
Intercepts back traversals preemptively before the URL or router state can change, matching the proven approach in `useCloseOnBackGesture` (ADR 0045). Maintains the double-push `popstate` mechanism as fallback where `window.navigation` is unavailable.

## Decision

Option B. `AndroidBackExitGuard` feature-detects `window.navigation`. When available, it listens for `navigate` events of type `traverse` (when no overlay guard is armed) and calls `event.intercept()`, keeping the user on the current Quran page without history movement. On the first press, it displays `ExitToast` and arms a 2-second timer; on a second press within the window, it invokes `exitNativeApp()` in Capacitor or `window.close()` in standalone PWA. Where `window.navigation` is unsupported, it falls back to the double-push `popstate` guard. The guard is persistently mounted within `ReaderPager` throughout reader navigation, avoiding per-page re-pushing and strictly preserving the ADR 0028 swipe invariant.

## Consequences

- **+** Preempts back navigation synchronously before the browser moves the URL or Next.js router restores prior route state.
- **+** Guarantees that navigating from page to page or via `/plans` wird never exposes the reader to falling back to previously visited pages.
- **+** Parity between standalone PWA (`window.close()`) and Capacitor mobile/tablet shell (`App.exitApp()`).
- **+** Respects overlay back guard precedence: `isOverlayBackGuardArmed()` defers exit guard when an overlay (sidebar, dialog, sheet) is open.
- **-** Maintains dual paths (Navigation API and `popstate` fallback) until Navigation API support is ubiquitous.
