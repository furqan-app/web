---
title: "PWA App-Launch Stickiness: Auto-Open Last Page + Android Double-Back-to-Exit"
type: feature
date: 2026-08-12
status: implemented
area: pwa
issue: 288
---

# PWA App-Launch Stickiness: Auto-Open Last Page + Android Double-Back-to-Exit

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

---

## Addendum — 2026-08-14: swipe after a language switch reverts to Arabic page 1

**Type:** bug
**Status:** implemented
**Issue:** [#288](https://github.com/furqan-app/web/issues/288)

### Summary

In the installed **Android** PWA, switching the app language leaves the reader on the correct page,
but the **first swipe afterwards** snaps the app back to the previous language *and* to page 1
(Al-Fatihah) — instantly, with no loading state. Reproduces only in the installed PWA; a browser tab
is unaffected. Reported and confirmed by the user on Android.

### Root Cause

Three defects compound. The first is the actual cause; the other two decide where the user lands.

**1. `AndroidBackExitGuard` reuses one state object across pushes.**
`const GUARD_STATE = { fqExitGuard: true }` is module-level and pushed on both mount and every
re-push. Next's history patch calls `copyNextJsInternalHistoryState(data)`, which **mutates its
argument in place** — so the first push permanently stamps `__NA: true` and that moment's
`__PRIVATE_NEXTJS_INTERNALS_TREE` onto the shared object. Every later push then hits the patch's
`if (data?.__NA) return originalPushState(...)` early-out and writes the **frozen** tree into the
current history entry. After a locale switch the guard remounts, pushes again, and stamps the
*previous* locale's tree over the correct one. Full mechanism in ADR 0040's 2026-08-14 addendum.

**2. The pager's `replaceState` reads that poisoned entry back.**
`ReaderPager.commitTo` calls `window.history.replaceState(null, "", ...)`. Next converts external
`replaceState` calls into an `ACTION_RESTORE` whose `tree` comes from
`window.history.state.__PRIVATE_NEXTJS_INTERNALS_TREE`; `restoreReducer` swaps the router's entire
tree to it while reusing the existing cache. So the swipe re-renders the stale locale and page
synchronously, from cache.

**3. The pager's mount self-correction then lands on page 1 rather than the current page.**
The restore flips the `[locale]` segment, so the whole locale subtree remounts: `basePath` becomes
`/ar/pages` while the URL still reads `/en/pages/{n}`, and `LastReadPageProvider` resets to its
hydration default of `1`. The mount effect's `pathname.startsWith(`${basePath}/`)` test fails, so
`requestedPage` falls back to that `1` and it calls `jumpTo(1)`.

Why it hides everywhere else: the guard is gated on `isAndroid() && isStandaloneDisplayMode()`, so
it never mounts in a browser tab; and **within a single locale** the same stale-tree restore is
invisible, because only the page-id segment changes, the pathname check in defect 3 succeeds, and
the pager self-corrects to the right page.

### Decision Tree / Algorithm

Guard push, after the fix:

| Call site | State argument | `url` argument | Effect |
|---|---|---|---|
| Mount | freshly allocated `{ fqExitGuard: true }` | omitted | Next copies the **current** tree; no `ACTION_RESTORE` (patch only dispatches when a `url` is given) |
| Re-push on intercepted back press | freshly allocated | omitted | same |

Pager mount self-correction, after the fix:

| `window.location.pathname` at mount | `basePath` | Resolves to |
|---|---|---|
| `/en/pages/51` | `/en/pages` | 51 (unchanged) |
| `/en/pages/51` | `/ar/pages` (locale mismatch) | 51 — locale prefix stripped from both before matching (was: `lastReadPage`) |
| `/` or `/ar` (SW offline fallback document) | `/ar/pages` | `storage.get("lastReadPage") ?? 1` — read from storage, not the context's hydration default |
| `/ar/mushaf/{grant}/pages/51` | `/ar/mushaf/{grant}/pages` | 51 (unchanged) |

### Verified Test Cases

Walked through with the user (2026-08-14):

1. Android PWA, Arabic, page 50 → switch to English → swipe. **Before:** Arabic page 1. **After:**
   English page 51.
2. Android PWA, back press → toast; second press within 2s → exit attempt. Unchanged — the
   double-push shape and the omitted `url` argument are both preserved.
3. Android PWA offline cold launch: `/` fails, the service worker serves the `/ar/pages/1` fallback
   document. **Before:** the pathname isn't a reader path, so the fallback lands on the context's
   default of 1. **After:** lands on the real last-read page from storage.
4. Swipe with no language switch (single locale). Unchanged — already self-heals.
5. Desktop, iOS, or any browser tab. Unchanged — the guard never mounts.
6. Shared-mushaf grant reader. Unchanged — the guard is excluded there (`grantId` present), and the
   locale-stripping change preserves the longer `mushaf/{grant}/pages` base path.

### Files to Change

- `app/components/reader/AndroidBackExitGuard.tsx` — replace the module-level `GUARD_STATE` constant
  with a factory (`const guardState = () => ({ fqExitGuard: true })`) and call it at both
  `history.pushState` sites. Keep omitting the `url` argument.
- `app/components/reader/ReaderPager.tsx` — in the mount self-correction effect, strip a leading
  `/xx` locale segment from **both** `window.location.pathname` and `basePath` before the
  `startsWith`/slice, so a locale mismatch still yields the requested page; and replace the
  `lastReadPage` context read with `storage.get("lastReadPage") ?? 1`. Drop the now-unused
  `useLastReadPage` import if nothing else in the component needs it.
- `docs/architecture/adr/0040-android-pwa-back-exit-guard.md` — addendum (written during planning).
- `docs/architecture/DECISIONS.md` — new constraint under "App Launch & Back Navigation (Android
  PWA)" (written during planning).

### Constraints

- Preserve ADR 0040's double-push shape exactly — this fix changes only how the state object is
  allocated, never the state machine.
- Keep omitting `pushState`'s third (`url`) argument in the guard. Supplying one makes Next dispatch
  an `ACTION_RESTORE`, which would move the pager's anchor on every back press.
- The locale-stripping regex must be anchored and bounded (`/^\/[a-z]{2}(?=\/|$)/`) so it cannot eat
  a real path segment, and must be applied to `basePath` as well as the pathname — the grant reader's
  base path is `/{locale}/mushaf/{grant}/pages`, not `/{locale}/pages`.
- `LastReadPageContext` keeps its initial value of `1`; it is correct for SSR/hydration agreement
  (see "Nav-level state must be live, not a one-shot localStorage read" in DECISIONS.md). Only the
  pager's mount-time read moves to storage — the always-mounted `ContinueReadingLink` must keep
  reading the live context.

### What NOT to Do

- Do not "fix" this by removing the back-exit guard, by dropping its history push, or by collapsing
  it to a single entry — all three break ADR 0040's confirmed behavior.
- Do not switch the pager from `history.replaceState` to `router.push`/`replace` — ADR 0028 exists
  precisely to keep swipes off the router.
- Do not have the guard write the router tree itself, or read/patch
  `__PRIVATE_NEXTJS_INTERNALS_TREE` directly. Passing a fresh object lets Next's own patch do it.
- Locale defaulting is **out of scope**. The current behavior (URL prefix → `NEXT_LOCALE` cookie →
  `Accept-Language` → `defaultLocale: 'ar'`) is intentional and confirmed by the user on 2026-08-14:
  a first-time visitor gets their device language, and a switch persists via the cookie the
  middleware writes. Do not add `localeDetection: false` or otherwise force Arabic on launch.
- `LanguageToggle` using `next/navigation` plus a `pathname.replace(/^\/[a-z]{2}/, ...)` regex
  instead of `@/i18n/routing` diverges from `docs/standards/i18n.md`, but it is **not** part of this
  bug and is out of scope — it resolves the right page and the middleware still writes the cookie.

### Decisions Made

- Fix the root cause (fresh state object) **and** both downstream fallbacks, rather than the root
  cause alone — defects 2 and 3 are a latent "remount lands on page 1" class that any future
  route/locale remount could hit (user-confirmed).
- Bug 2 from the same investigation (locale default / `LanguageToggle`) is explicitly dropped, not
  deferred — the current device-language behavior is the intended behavior (user-confirmed).
- Extends this plan rather than opening a new one: same component, same ADR (0040), and this is a
  defect in what this plan shipped.

---

## Addendum — 2026-08-14: cold launch flashes the home page before redirecting

**Type:** bug
**Date:** 2026-08-14
**Status:** implemented
**GitHub:** [#290](https://github.com/furqan-app/web/issues/290)
**ADR:** [0042](../architecture/adr/0042-pwa-launch-resolves-before-first-paint.md)

### Summary

The auto-open-last-page feature works, but the user watches it work: cold launch renders the full
home surah list, then swaps to the reader. The body of this plan claimed "no page-1 flash" (Verified
Test Case 2) — accurate as far as it went, but it removed the page-1 flash by introducing a *home*
flash. This addendum removes the whole class of defect, in both the online and offline paths.

### Root Cause

`AppLaunchRedirect` decides in a `useEffect`. React effects run **after** paint, by definition — so
by the time the redirect is issued, the home document has already been fetched, parsed, styled,
painted and hydrated. No amount of tuning that component fixes it; the decision has to move earlier
than React.

The offline path has the identical defect from a different direction: the service worker's
`setCatchHandler` serves the precached page-1 document, and `ReaderPager`'s self-correction
(`ReaderPager.tsx`, the ADR 0014 Addendum 3 mount effect) calls `jumpTo` in a `useEffect` — again
after page 1's words have painted. ADR 0014 Addendum 3 accepted this as a trade-off; ADR 0042
withdraws that acceptance, because `jumpTo` turns out to be fully synchronous (`setAnchor(target)`
directly), so a layout effect re-anchors in the same frame at essentially no cost.

### Approach

**Launch into a document that renders nothing.** `start_url` becomes `/launch.html` — a static
hand-written file in `public/`, not a Next route. Its whole body is a synchronous `<head>` script
that reads the persisted position and calls `location.replace()` during HTML parsing, so it never
paints and the OS splash stays up until the reader does. As a plain public asset it carries no React
runtime, no locale segment, no `revalidate` export, and no exposure to the CDN document-caching
hazard ADR 0035 bounds; it is byte-identical for every user, so it cannot be poisoned with per-user
content. Adding it to `globPublicPatterns` precaches it for every visitor at service-worker install,
so offline cold launch works with **no `app/sw.ts` change at all**.

**Persist the path, not the page number.** `lastReadPath` (`/ar/pages/300`) is written alongside the
existing numeric `lastReadPage` from the single site in `LastReadPageContext.setLastReadPage`. This
removes locale detection from the launch script entirely — no `NEXT_LOCALE` cookie parse, no
`navigator.language` heuristic, no second copy of the locale list. With nothing stored yet, the
script redirects to the unprefixed `/pages/1` and lets `intl-middleware` resolve the locale like it
does for any other unprefixed URL.

**Pin the manifest `id`.** A manifest with no `id` derives app identity from `start_url`, so changing
`start_url` re-identifies the app: existing installs stop updating and a reinstall duplicates the
icon. `id: "/"` (what today's `start_url` already implies) preserves every existing install and
decouples identity from `start_url` permanently. This must ship in the same change as the
`start_url` edit, not after.

**Fix the offline flash with a layout effect.** `ReaderPager`'s self-correction moves from
`useEffect` to the `useIsomorphicLayoutEffect` pattern already in `app/hooks/use-is-desktop-up.ts`
(which exists precisely to suppress React's server-side `useLayoutEffect` warning). The page-1
fallback's words never paint; the requested page shows the loading spread ADR 0034 already mandates
for an uncached page, then fills in.

**Delete `AppLaunchRedirect`.** Its once-per-session `hasCheckedColdLaunch` module flag existed only
to stop the home page bouncing the user every time it mounted. Home is no longer the launch target,
so the flag guards nothing.

### Decision Tree / Algorithm

`public/launch.html`, evaluated synchronously in `<head>`, first match wins:

| Condition | Action |
|---|---|
| Any exception thrown anywhere in the script | `location.replace('/')` |
| Not standalone / fullscreen / iOS `navigator.standalone` | `location.replace('/')` — browser tab or a shared link |
| Desktop (`min-width: 1367px`) | `location.replace('/')` — desktop standalone stays out of scope |
| `lastReadPath` matches `^/(ar\|en)/pages/(\d{1,3})$` **and** page is 1–604 | `location.replace(lastReadPath)` |
| No usable `lastReadPath`, but legacy numeric `lastReadPage` is 1–604 | `location.replace('/pages/' + n)` — unprefixed; `intl-middleware` resolves the locale |
| Neither key usable | `location.replace('/pages/1')` — unprefixed, same resolution |

Added in review: without the legacy row, every install predating this change (which has
`lastReadPage` but has never had `lastReadPath` written) would land on page 1 on the first launch
after this ships — the whole existing user base, on exactly the launch this is meant to fix. A
corrupt value in either key is caught per-read and falls through to the next row rather than
escaping to the outer catch, so only a genuine platform failure reaches the "go home" branch.

The regex whitelist is load-bearing, not defensive padding: the script navigates to a string read
from `localStorage`, so an unvalidated read is an open redirect.

### Verified Test Cases

Walked through with the user (2026-08-14):

1. Fresh install, never read → splash → `/pages/1` → middleware → `/ar/pages/1`. Home never renders.
2. Read to page 300, close, reopen → splash → `/ar/pages/300` directly. No home frame, no page-1
   frame.
3. Nav Home icon tapped mid-session → client-side navigation to `/{locale}`; `launch.html` is a
   document load and is never involved. Surah list renders normally.
4. **Hard refresh while on home in standalone → stays on home** (user-confirmed). A deliberate
   behavior change: today the module flag resets on every document load and bounces the user to the
   reader.
5. Mobile browser tab opens `/launch.html` (someone shared the link) → home.
6. Desktop standalone → home, unchanged from the body of this plan.
7. Offline cold launch, last-read page's HTML cached → `launch.html` served from the install
   precache → redirect → `/ar/pages/300` served from `PAGES_CACHE_NAME`.
8. Offline cold launch, last-read page's HTML **not** cached → catch handler serves the page-1
   fallback → layout-effect self-correction re-anchors to 300 before paint → loading spread for
   page 300, then content. Page 1 never appears (this is the case ADR 0014 Addendum 3 had conceded).
9. Back-exit guard (ADR 0040) unaffected: `location.replace` leaves the reader as the first history
   entry, exactly as today's `router.replace` did.
10. Corrupt `lastReadPath` in localStorage (`//evil.example/x`, `/ar/pages/9999`, a non-string) →
    fails the regex or the 1–604 bound → `/pages/1`.
11. **Upgrading install** (added in review): `lastReadPage` is 300, `lastReadPath` was never written
    → legacy fallback → `/pages/300` → middleware → `/ar/pages/300`. Without this the user would
    have been sent to page 1.
12. Both keys corrupt or unparseable → `/pages/1`, not home — a bad stored value is a failed
    validation, not a platform failure.
13. Relaunching the icon while the app is open on Settings → `focus-existing` focuses the window and
    leaves it on Settings. (`navigate-existing`, used in the first cut of this change, would have
    navigated it to the reader — corrected in review.)

### Files to Change

- `public/launch.html` — **new**. Static, ~20 lines, no build step. Synchronous `<head>` script
  implementing the decision tree above. Body empty; `background:#16232F` (matching the manifest's
  `background_color`) purely as a safety net for the case where the script throws before navigating.
- `app/manifest.ts` — `start_url` → `/launch.html`; add `id: "/"`; add
  `launch_handler: { client_mode: "navigate-existing" }` so relaunching an already-running PWA
  resumes the current page instead of re-running `start_url` (Chromium/Android; iOS ignores it).
  `MetadataRoute.Manifest` may not type `id`/`launch_handler` — cast rather than dropping them.
- `middleware.ts` — add `launch\.html` to the `config.matcher` exclusion list, alongside
  `manifest\.webmanifest` and `sw\.js`.
- `next.config.mjs` — add `launch.html` to `globPublicPatterns` (currently `icon.svg`,
  `icons/**/*`, `quran/chapters.json`). This is what makes offline cold launch work; it fits the
  "app shell only" pin, ~1 KB.
- `app/utils/storage.ts` — add `lastReadPath: string` to `StorageKey` and `StorageValueType`.
- `app/contexts/LastReadPageContext.tsx` — `setLastReadPage` writes `lastReadPath` alongside
  `lastReadPage`, from this one site. Needs the locale (`useLocale()`).
- `app/components/reader/ReaderPager.tsx` — self-correction effect (the ADR 0014 Addendum 3 mount
  effect) becomes an isomorphic layout effect.
- `app/hooks/use-is-desktop-up.ts` — extract `useIsomorphicLayoutEffect` into a shared hook module
  so `ReaderPager` imports it rather than redefining the same three lines.
- `app/components/reader/AppLaunchRedirect.tsx` — **deleted**.
- `app/[locale]/page.tsx` — drop the `<AppLaunchRedirect />` render and its import.
- `app/components/nav/ContinueReadingLink.tsx` — doc comment references `AppLaunchRedirect` by name;
  update it. Behavior unchanged.
- `docs/architecture/adr/0042-pwa-launch-resolves-before-first-paint.md` — new (written during
  planning).
- `docs/architecture/DECISIONS.md` — amended "App Launch & Back Navigation (Android PWA)" and the
  ADR 0014 Addendum 3 flash trade-off (written during planning).

### Constraints

- `id: "/"` must ship in the same commit as the `start_url` change. Shipping `start_url` alone
  re-identifies the installed app: existing installs stop receiving updates and a reinstall leaves
  the user with two icons. There is no way to repair this after the fact for users who already
  updated.
- `public/launch.html` must be added to **both** the `middleware.ts` matcher exclusion and
  `globPublicPatterns`. Missing the first 404s it (the trap that broke the PWA icons — see
  `pwa-offline-support.md` Addendum 1); missing the second breaks offline cold launch silently,
  which no test that runs online will catch.
- The launch script must validate `lastReadPath` against the regex **and** the 1–604 bound before
  navigating. It is a `localStorage` read feeding a navigation.
- The launch script is plain hand-written JS outside the TypeScript build — no types, no bundler, no
  imports. Keep it small enough to verify by reading, and cap its scope at "decide a URL and
  navigate." It necessarily inlines the `display-mode` list from `app/utils/platform.ts`; that is the
  one duplication ADR 0042 accepts, and it must be re-checked whenever the manifest's `display`
  changes.
- `lastReadPath` and `lastReadPage` must be written together from `LastReadPageContext`. A second
  write site lets the launch script and `ContinueReadingLink` disagree.
- The self-correction must be an **isomorphic** layout effect. A bare `useLayoutEffect` in an
  SSR-rendered client component triggers React's server-side warning on every reader page.
- Serwist is disabled in dev, so none of the launch or offline behavior is testable with `npm run
  dev`. Verify with `npm run build:local && npm start` (not `build` — that runs
  `prisma migrate deploy` and fails locally), with any dev server stopped first.

### What NOT to Do

- Do not move the redirect into `app/layout.tsx`'s existing theme head script and keep
  `start_url: "/"`. Rejected in ADR 0042: that script cannot tell an OS launch from a hard refresh or
  a deep link to home — same URL, same document load — and it would re-inline
  `isStandaloneDisplayMode()` into a second place.
- Do not implement this as a cookie plus a middleware redirect on `/`. Rejected in ADR 0042 on
  hosting grounds: Hostinger's CDN strips query params from cache keys and ignores `Vary`, so a
  per-user redirect served from `/` is exactly the shape that gets cached and replayed to everyone
  (`fix-rsc-cache-poisoning.md`, `fix-homepage-cdn-cache-poisoning.md`).
- Do not add a service-worker `fetch` handler or an IndexedDB mirror of the last-read page. This was
  the original proposal for the offline flash and it does not work: page 1's document is the only
  reader HTML precached, so a worker that knows the last-read page still has nothing better to
  serve. It would also affect ordinary browser tabs, since Serwist registers the worker for every
  production visitor.
- Do not add a `correcting` render gate to `ReaderPager`. Unnecessary once `jumpTo` is confirmed
  synchronous, and it would put a new gate on a render path ADR 0028 and ADR 0034 constrain tightly.
- Do not make `/launch` a Next route under `app/[locale]/`. It would need a locale segment, a
  `revalidate` export per ADR 0035, an explicit `sw.ts` install-precache entry per locale, and it
  would render behind the locale layout's `<Nav />` — which paints before `{children}`.
- Do not restore the once-per-session `hasCheckedColdLaunch` flag. It guarded home against
  self-bouncing; home is no longer the launch target.
- Do not extend this to desktop standalone. Out of scope here exactly as in the body of this plan.

### Decisions Made

- Hard refresh on home in standalone stays on home — the behavior change is intended, not a
  regression (user-confirmed).
- The offline page-1 flash is fixed in this task rather than deferred (user-confirmed), via the
  layout effect rather than the service-worker mechanism originally proposed.
- `/launch.html` reached by a non-standalone visitor (browser tab, desktop standalone, shared link)
  redirects to home rather than 404ing or rendering anything.
- `ContinueReadingLink`'s existing standalone-hiding rule is unchanged — the auto-redirect still
  covers exactly the same population.
