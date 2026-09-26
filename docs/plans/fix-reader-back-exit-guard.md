---
title: Fix Reader Back-Exit Guard on Page Navigation & Capacitor Parity (Mobile/Tablet)
type: bug
date: 2026-09-26
status: implemented
area: reader
issue: 710
adr: [0040, 0074]
---

# Fix Reader Back-Exit Guard on Page Navigation & Capacitor Parity (Mobile/Tablet)

## Summary

In installed standalone PWA and the Capacitor mobile/tablet shell, navigating between reader pages (e.g. from Surah Al-Baqarah to `/plans` or via `PlansWidget` wird to Surah An-Nisaa) bypassed the exit guard: pressing back on Surah An-Nisaa unexpectedly navigated straight back to Surah Al-Baqarah instead of staying on the page, showing the exit toast, and exiting on a second press. This plan establishes preemptive back-traversal interception via the modern Navigation API (`event.intercept()`), maintains the double-push `popstate` fallback for older browsers, persistently mounts the exit guard within `ReaderPager` across page transitions without per-swipe history growth (ADR 0028), and ensures identical behavior across both standalone PWA and Capacitor mobile/tablet shells.

## Root Cause / Approach

Three distinct factors caused the exit guard to fail:
1. **In-Reader Wird Navigation:** When `PlanAssignmentRow` was clicked inside `PlansWidget`, it triggered a full `<Link>` router navigation (`router.push`) instead of jumping client-side via `jumpTo`, pushing extra history entries on top of the reader stack.
2. **`popstate` Traversal Lag:** In standard browsers, `popstate` fires *after* the browser has already initiated traversal to the previous history entry and Next.js has begun `ACTION_RESTORE`. Raw `popstate` cannot synchronously prevent the browser from leaving the page.
3. **Capacitor Mobile & Tablet Parity:** Capacitor Android delegates native back button presses to `handleNativeBackButton`. If the reader page is not guarded at the top of history, `window.history.back()` immediately falls through to previous history entries (such as Al-Baqarah or `/plans`) rather than triggering the reader exit flow.

**Approach:**
1. Upgrade `AndroidBackExitGuard` to feature-detect `window.navigation` (matching `useCloseOnBackGesture`, ADR 0045, ADR 0074). When available, intercept `traverse` events using `event.intercept()` before any URL change or Next.js route restore can happen.
2. Route in-reader assignment navigation in `PlanAssignmentRow` through `jumpTo` (`handleReaderJump`) to slide the reader client-side via `replaceState` without adding history entries.
3. Keep the double-push `popstate` state machine as the fallback for environments without Navigation API.
4. On the second back press within 2s, call `exitNativeApp()` in Capacitor (`App.exitApp()`) or `window.close()` in standalone PWA.

## Decision Tree / Algorithm

When the hardware/gesture back action occurs on mobile or tablet (`!isDesktopUp && isStandaloneDisplayMode()`):

| Route / Context | Condition | Action | Result |
|---|---|---|---|
| **Any page** | An overlay is open (`isOverlayBackGuardArmed()` is true) | Close overlay via `useCloseOnBackGesture` | Overlay closes; page stays untouched; exit guard remains silent |
| **Reader (`/pages/...`)** | 1st back press (`!armed`) | Intercept navigation (`event.intercept()` / re-push) | User remains on current Quran page; warning `ExitToast` appears; 2s timer armed |
| **Reader (`/pages/...`)** | 2nd back press within 2s (`armed`) | Do not re-push; call exit handler | In Capacitor: `exitNativeApp()` (`App.exitApp()`). In PWA: `window.close()`. |
| **Reader (`/pages/...`)** | Back press after 2s window | Treated as a new 1st press | User remains on current page; `ExitToast` appears; 2s timer re-armed |
| **Outside reader** (e.g. `/plans`) | `canGoBack` is true | Normal browser history back | Navigates to previous page (e.g. `/plans` → Home) |
| **Outside reader** (e.g. `/plans`) | `canGoBack` is false (history root) | In Capacitor: `exitNativeApp()` | Native app terminates cleanly |

## Verified Test Cases

- **Case 1 (Reader first back press stays on page):** On `/ar/pages/77` (reached via `PlansWidget` or link), pressing back does not navigate to Al-Baqarah or any previous route. The page remains on 77, and `ExitToast` ("اضغط رجوع مرة أخرى للخروج من التطبيق") appears.
- **Case 2 (Reader double-back exit):** Pressing back a second time within 2 seconds closes the app (`window.close()` in PWA, `App.exitApp()` in Capacitor).
- **Case 3 (Reader disarm timeout):** Waiting > 2 seconds hides the toast. A subsequent back press acts as a new first press (shows toast again, does not exit).
- **Case 4 (Overlay priority in reader):** Opening `Sidebar`, `MarkModal`, `PlansWidget`, or `TafsirSheet` on a reader page and pressing back closes the overlay; `ExitToast` does not appear, and the reader page does not move.
- **Case 5 (Swipe navigation invariant):** Swiping between pages in the reader continues to use `history.replaceState` (ADR 0028) and does not multiply history entries.
- **Case 6 (Outside reader navigation):** Navigating from `/ar` to `/ar/plans` and pressing back returns to `/ar`.
- **Case 7 (Desktop exclusion):** On desktop browsers (`isDesktopUp` is true, ≥1367px), `AndroidBackExitGuard` is completely disabled.

## Files to Change

- `app/components/reader/AndroidBackExitGuard.tsx` — Add Navigation API `navigate` + `event.intercept()` interception branch with `popstate` fallback and 50ms echo debounce.
- `app/contexts/ReaderNavigationContext.tsx` — Add centralized `handleReaderJump` helper with button and modifier guards.
- `app/contexts/ReaderNavigationContext.test.tsx` [NEW] — Unit test coverage for `handleReaderJump`.
- `app/components/plans/PlanAssignmentRow.tsx` — Wire `handleReaderJump` and optional `onNavigate` handler to slide reader client-side without adding history entries.
- `app/components/plans/PlansWidget.tsx` — Pass `onNavigate={() => setSheetOpen(false)}` to close the wird sheet when an assignment is selected.
- `app/components/SurahListItem.tsx` — Centralize in-reader jump via `handleReaderJump`.
- `app/components/nav/ContinueReadingLink.tsx` — Centralize in-reader jump via `handleReaderJump`.
- `app/components/home/HomeContinueReadingCard.tsx` — Centralize in-reader jump via `handleReaderJump`.
- `app/components/home/HomeRecommendedSurahs.tsx` — Centralize in-reader jump via `handleReaderJump`.
- `app/components/home/HomeSearch.tsx` — Centralize in-reader jump via `handleReaderJump`.
- `app/components/RubList.tsx` — Centralize in-reader jump via `handleReaderJump`.
- `app/utils/navigation-api.ts` [NEW] — Extract shared Navigation API types (`FQNavigateEvent`, `FQNavigation`) and feature detection (`getNavigation`, `supportsNavigationApi`).
- `app/hooks/use-close-on-back-gesture.ts` — Use shared `app/utils/navigation-api.ts`.
- `app/components/reader/AndroidBackExitGuard.test.tsx` [NEW] — Unit test coverage for Navigation API interception, popstate fallback, double-press exit, and overlay deferral.
- `docs/architecture/adr/0074-navigation-api-for-reader-back-exit-guard.md` [NEW] — Document Navigation API adoption for reader back-exit guard.
- `docs/architecture/decisions/pwa.md` — Record ADR 0074 amendment under "App Launch & Back Navigation (Android PWA)".
- `docs/architecture/COMPONENTS.md` — Update component documentation.

## Constraints

- Desktop is strictly excluded: `!isDesktopUp` check must remain active.
- Standalone PWA and Capacitor mobile/tablet only (`useIsStandaloneMobileOrTablet()`).
- Allocate fresh history state objects per push (`guardState()`), never shared constants (ADR 0040).
- Must always defer to `isOverlayBackGuardArmed()` when an overlay is open (ADR 0055).
- Do not let in-reader page swipes (`commitTo`) grow browser history (ADR 0028).

## What NOT to Do

- Do not enable the exit guard on desktop or plain browser tabs.
- Do not remove the `popstate` fallback (required for older WebViews / browsers without Navigation API).
- Do not create a separate, competing back button stack for Capacitor that bypasses web guards.
- Do not reintroduce `router.push` for page swipes.

## Decisions Made

- Adopt the Navigation API in `AndroidBackExitGuard` (`event.intercept()`) to synchronously preempt back navigation on Android PWA and Capacitor.
- Route in-reader assignment navigation through `jumpTo` via `handleReaderJump` so in-app wird selection transitions client-side without polluting browser history.
- Standardize on `App.exitApp()` for Capacitor native double-back exit, matching PR #682.
