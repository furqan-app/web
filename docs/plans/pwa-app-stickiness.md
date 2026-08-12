# PWA App-Launch Stickiness: Auto-Open Last Page + Android Double-Back-to-Exit

**Type:** feature
**Date:** 2026-08-12
**Status:** implemented
**Trello:** #201 https://trello.com/c/yxgElmek

## Summary

Two changes for the installed mobile/tablet PWA, aimed at keeping the user in the reader:

1. Cold app launch always opens the last-read reader page instead of the home surah list. Offline
   cold launch is already handled by the existing service-worker fallback (ADR 0014 Addendum 3);
   only the online path is missing. The nav's `ContinueReadingLink` becomes redundant exactly where
   this applies (standalone mobile/tablet) and is hidden there — kept for desktop and browser tabs,
   which get no auto-redirect.
2. On **Android** standalone/fullscreen mobile/tablet only, pressing back anywhere in the reader
   shows a "press back again to exit" toast on the first press; a second press within 2s exits the
   app. Back navigation is unchanged everywhere else (Settings, Marks, Home, the shared-mushaf grant
   reader). iOS has no back button/gesture to trap, so it only gets item 1.

See [ADR 0040](../architecture/adr/0040-android-pwa-back-exit-guard.md) for why the back-exit guard
needs a double-push history mechanism rather than a single dummy history entry.

## Approach

**Shared platform check.** `isStandaloneDisplayMode()` currently lives inside
`app/hooks/use-pwa-precache.ts`. Both new features need it (and Android detection for the second
one), so it moves to a new `app/utils/platform.ts`, with `use-pwa-precache.ts` importing it instead
of redefining it. `isAndroid()` (a `navigator.userAgent` check) is added alongside it.

**Auto-open last page.** A new client component (`AppLaunchRedirect`), rendered only on the home
page (`app/[locale]/page.tsx`), does nothing unless `isStandaloneDisplayMode() && !isDesktopUp`. On
mount, if a module-level `hasCheckedColdLaunch` flag is still `false`, it flips the flag, reads
`storage.get("lastReadPage")` directly (a one-time synchronous read — this component mounts once
and immediately navigates away, unlike `ContinueReadingLink`, which stays mounted for a whole
session and must stay live), and calls `router.replace('/pages/{page}')` (defaulting to `1`). The
module flag means this fires once per browser session (real page load resets the module), so a
manual tap on the nav's Home icon later in the session renders the surah list normally, not another
redirect.

**Hide the redundant nav link.** `ContinueReadingLink` returns `null` when
`isStandaloneDisplayMode() && !isDesktopUp` — exactly the population the auto-redirect already
covers. Desktop and mobile/tablet browser tabs (no auto-redirect) keep the link.

**Android back-exit guard.** A new component (`AndroidBackExitGuard`), mounted inside
`ReaderPager` and active only when `isAndroid() && isStandaloneDisplayMode() && !isDesktopUp &&
!grantId` (the last condition excludes the shared-mushaf grant reader, mirroring
`LastReadPageSync`'s existing `/mushaf/` exclusion). On mount it pushes one history guard entry and
attaches a `popstate` listener implementing the double-push state machine from ADR 0040: an
intercepted press shows a toast (`ExitToast`, new — no toast primitive exists in the codebase yet)
and re-pushes the guard; a second press within 2s skips the re-push and calls `window.close()`.
Unmounting (route change away from the reader) removes the listener; the one already-pushed guard
entry is left in history, so a subsequent back press from Settings/Marks/Home lands back on the
reader exactly like any other real navigation — no special handling needed there.

Because swipe navigation uses `history.replaceState`, not `pushState`
(`app/components/reader/ReaderPager.tsx:292`), swiping through any number of pages never grows
history — the guard's behavior after 20 swipes is identical to its behavior after 0.

## Decision Tree / Algorithm

**Cold-launch redirect** (`AppLaunchRedirect`, home page only):

| Condition | Behavior |
|---|---|
| Standalone/fullscreen (Android or iOS), not desktop, first mount this session, on locale root | `router.replace('/pages/{lastReadPage}')` (defaults to 1) |
| Browser tab (not installed) | No redirect — home renders normally |
| Desktop standalone | No redirect — out of scope |
| Home icon tapped later in the same session | No redirect — module flag already consumed |
| Offline cold launch | Unchanged — already handled by ADR 0014 Addendum 3's fallback document + `ReaderPager` self-correction |

**Back-exit guard scope** (`AndroidBackExitGuard`, mounted inside `ReaderPager`):

| Condition | Guard active? |
|---|---|
| Android, standalone/fullscreen, mobile/tablet, own reader (`grantId` absent) | Yes |
| Same, iOS | No — no back button/gesture to trap |
| Same, desktop | No |
| Shared-mushaf grant reader (`grantId` present) | No — mirrors `LastReadPageSync`'s exclusion |
| Any non-reader route | No — `AndroidBackExitGuard` isn't mounted there at all |

**Back-press state machine** (only while the guard is active, per ADR 0040 Option B):

| State | Trigger | Action |
|---|---|---|
| Mount on reader route | — | push one history guard entry |
| 1st back press | `popstate` on guard, unarmed | show "Press back again to exit" toast; re-push guard entry; start 2s timer; arm |
| 2nd back press within 2s | `popstate`, armed | `window.close()` (best-effort); do not re-push |
| Timer expires, no 2nd press | 2s elapse | disarm; toast hides; next press is treated as 1st again |
| Route change away from reader | unmount | remove listener; leave the one pushed guard entry in history |

## Verified Test Cases

Walked through with the user (2026-08-12):

1. Fresh install, never read → launch → redirects to `/pages/1`.
2. Read to page 300, close, reopen → redirects to `/pages/300`, no page-1 flash (direct client
   redirect, unlike the offline fallback path).
3. On page 52 (reached via 5 swipes from page 47) → back → toast shown, stays on page 52 → back
   again within 2s → exit attempted. Swipe count is irrelevant — `replaceState` never grew history.
4. Back once (toast shown) → wait 3s with no 2nd press → toast hides → next back press is a fresh
   "1st press," not treated as a continuation.
5. Home → tap a surah → reader page 47 → back → toast (does **not** navigate to Home) → back again
   → exits. Never lands on Home, even though it's genuinely in history — per ADR 0040 Option B.
6. Reader page 47 → tap Settings → back → normal navigation, returns to page 47 (no toast, no exit
   attempt) — `AndroidBackExitGuard` unmounted when the reader unmounted.
7. Mobile browser tab (not installed) → native back button behavior; feature entirely inactive.
8. iOS installed PWA → no back-exit guard (nothing to trap), but item 1's auto-redirect still fires.
9. Desktop installed PWA → neither auto-redirect nor back-guard applies.
10. Shared-mushaf grant reader open on Android standalone → guard inactive (`grantId` present);
    native back navigation leaves the grant reader normally.
11. Mobile/tablet browser tab (not installed), never auto-redirected → `ContinueReadingLink` still
    renders in the nav, same as desktop.
12. Mobile/tablet standalone, after the cold-launch redirect already fired once this session →
    `ContinueReadingLink` is hidden — redundant, since the redirect already put the user in the
    reader.

## Files to Change

- `app/utils/platform.ts` — **new**. `isStandaloneDisplayMode()` (moved from
  `use-pwa-precache.ts`, unchanged logic) and a new `isAndroid()` (`navigator.userAgent` check).
- `app/hooks/use-pwa-precache.ts` — import `isStandaloneDisplayMode` from `@/app/utils/platform`
  instead of the local definition.
- `app/components/reader/AppLaunchRedirect.tsx` — **new**. Client component, home-page-only.
  Module-level `hasCheckedColdLaunch` flag; on mount, if standalone + not desktop + flag unset,
  reads `storage.get("lastReadPage")` and `router.replace`s to `/pages/{page}`.
- `app/[locale]/page.tsx` — render `<AppLaunchRedirect />` alongside the existing home content.
- `app/components/reader/AndroidBackExitGuard.tsx` — **new**. Implements the ADR 0040 double-push
  history guard; renders `<ExitToast />` while armed.
- `app/components/reader/ExitToast.tsx` — **new**. Minimal bottom-anchored toast, "Press back again
  to exit" copy, positioned clear of `RecitationPlayerBar` and `PlansWidget`'s `bottom-20 end-4`.
- `app/components/reader/ReaderPager.tsx` — mount `<AndroidBackExitGuard />`, gated on
  `!grantId` (already an existing prop — no new plumbing needed to detect the grant reader).
- `app/components/nav/ContinueReadingLink.tsx` — return `null` when
  `isStandaloneDisplayMode() && !isDesktopUp`.
- `messages/en.json`, `messages/ar.json` — new `exitApp.pressBackAgain` key (e.g. en: "Press back
  again to exit", ar: "اضغط رجوع مرة أخرى للخروج").
- `docs/architecture/adr/0040-android-pwa-back-exit-guard.md` — new (written during planning).
- `docs/architecture/DECISIONS.md` — new "App Launch & Back Navigation (Android PWA)" section;
  amended `isStandaloneDisplayMode()` constraint under "PWA & Offline Quran Page Caching" (written
  during planning).

## Constraints

- `isStandaloneDisplayMode()` must have exactly one definition (`app/utils/platform.ts`) — every
  consumer (offline surfaces, `AppLaunchRedirect`, `ContinueReadingLink`,
  `AndroidBackExitGuard`) imports it. Re-deriving display-mode detection anywhere is the exact drift
  that caused the ADR 0014 Addendum 3 regression.
- The back-exit guard must use the double-push history pattern from ADR 0040 — never a single
  pushed entry. A single-push implementation makes the second back press fall through to whatever
  real history exists (e.g. Home), violating the confirmed "always exit, never fall back to Home"
  requirement.
- The guard must be excluded on the shared-mushaf grant reader (`grantId` present) — that reader
  isn't the user's own session, mirroring `LastReadPageSync`'s existing `/mushaf/` exclusion.
- The cold-launch redirect must fire at most once per browser session. Do not key it off "pathname
  is home" alone — that would make the nav's Home icon permanently unusable in standalone mode.
- `AppLaunchRedirect`'s one-time `storage.get("lastReadPage")` read is intentionally NOT a live
  subscription like `LastReadPageContext` — it mounts once and immediately navigates away, so there
  is no "goes stale mid-session" risk the way there was for the always-mounted nav link (see
  `docs/plans/save-last-read-page.md`, "What NOT to Do").
- `window.close()` is best-effort. Do not add a fallback UI for the case where it silently no-ops —
  that only happens outside the platform this guard is gated to run on in the first place (see ADR
  0040 Consequences).

## What NOT to Do

- Do not remove `ContinueReadingLink` entirely — desktop and mobile/tablet browser-tab visitors get
  no auto-redirect and still need it. Only hide it where standalone + mobile/tablet.
- Do not implement the back-exit guard with a single pushed history entry — rejected in ADR 0040
  (Option A) for silently falling back to Home on the second press whenever real history exists.
- Do not extend the back-exit guard to iOS or desktop — no back button/gesture exists to trap on
  iOS; desktop is out of scope for this affordance per the user's ask.
- Do not gate the back-exit guard on `/pages/` pathname matching — `ReaderPager` already receives
  `grantId` as a prop; use that directly instead of re-deriving route type from the URL.
- Do not add offline/service-worker changes for the auto-redirect — the offline cold-launch path is
  already fully handled by the existing ADR 0014 Addendum 3 mechanism.
- Do not build a general-purpose toast/notification system — `ExitToast` is a single-purpose
  component for this feature. (Trello #161 separately tracks evaluating a shared toast library;
  don't conflate the two.)

## Decisions Made

- Back-exit toast scope: anywhere in the user's own reader (`/pages/...`), not the whole app —
  normal back navigation everywhere else (user-confirmed).
- Home page is exempt from the back-exit guard: back from Home always returns to the reader
  normally, never triggers the toast (user-confirmed).
- Second back press always exits the app, never falls back to a real prior history entry like Home,
  even when one exists (user-confirmed) — this is what forced the ADR 0040 double-push design.
- Back-exit guard is Android-only; iOS is unaffected (no back button to trap) but still gets the
  auto-open-last-page behavior (user-confirmed).
- Cold-launch redirect fires once per session; tapping the nav's Home icon afterward still opens
  the surah list normally (user-confirmed).
- `ContinueReadingLink` is hidden only where `isStandaloneDisplayMode() && !isDesktopUp` — kept for
  desktop and browser tabs, which have no auto-redirect safety net (user-confirmed).
