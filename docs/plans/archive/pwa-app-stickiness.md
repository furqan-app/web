---
title: "PWA App-Launch Stickiness: Launch Into Last Page + Android Double-Back-to-Exit"
type: feature
date: 2026-08-12
status: implemented
area: pwa
issue: 288
adr: [0040, 0042]
---

# PWA App-Launch Stickiness: Launch Into Last Page + Android Double-Back-to-Exit

## Summary

Two changes for the installed mobile/tablet PWA, aimed at keeping the user in the reader:

1. **Cold app launch opens the last-read reader page directly — nothing else paints first.** `start_url` is a static `public/launch.html` whose `<head>` script reads the persisted position and `location.replace()`s during HTML parsing, so the OS splash stays up until the reader does — no home flash, no page-1 flash, online or offline ([ADR 0042](../../architecture/adr/0042-pwa-launch-resolves-before-first-paint.md)). The nav's `ContinueReadingLink` is hidden in standalone mobile/tablet (redundant there); desktop and browser tabs keep it and get no auto-redirect.
2. On **Android** standalone/fullscreen mobile/tablet only, pressing back anywhere in the user's own reader shows a "press back again to exit" toast; a second press within 2s exits. Back navigation is unchanged everywhere else and on iOS (no back gesture to trap). See [ADR 0040](../../architecture/adr/0040-android-pwa-back-exit-guard.md) for the double-push history mechanism.

## Approach

### Shared platform check

`isStandaloneDisplayMode()` lives in `app/utils/platform.ts` (moved out of `use-pwa-precache.ts`); `isAndroid()` (`navigator.userAgent`) is alongside it. Every consumer imports the one definition — re-deriving display-mode detection is the drift that caused the ADR 0014 Addendum 3 regression.

### Launch into a document that renders nothing

`start_url` is `/launch.html` — a static hand-written file in `public/`, not a Next route. Its whole body is a synchronous `<head>` script that reads the persisted position and calls `location.replace()` during parsing, so it never paints. As a plain public asset it carries no React runtime, no locale segment, no `revalidate` export, and is byte-identical for every user (no CDN document-cache poisoning hazard, ADR 0035). It is in `globPublicPatterns`, so it is precached at service-worker install and offline cold launch works with **no `app/sw.ts` change**.

- **Persist the path, not just the number.** `lastReadPath` (`/ar/pages/300`) is written alongside the existing numeric `lastReadPage`, from the single site `LastReadPageContext.setLastReadPage` (needs `useLocale()`). This keeps locale detection out of the launch script. With nothing stored, the script redirects to the unprefixed `/pages/1` and lets `intl-middleware` resolve the locale.
- **Legacy fallback.** An install predating this change has `lastReadPage` but never `lastReadPath` — the script must fall back to `/pages/{lastReadPage}` (unprefixed) so the whole existing user base doesn't land on page 1 on the first launch after this ships.
- **Pin the manifest `id`.** `id: "/"` (what today's `start_url` already implies) — a manifest with no `id` derives app identity from `start_url`, so changing `start_url` without pinning `id` re-identifies the app (existing installs stop updating, a reinstall duplicates the icon). Must ship in the same commit as the `start_url` edit.
- **`launch_handler: { client_mode: "navigate-existing" }`** so relaunching a running PWA resumes the current page rather than re-running `start_url` (Chromium/Android; iOS ignores it). Relaunching while on Settings uses `focus-existing` behaviour and stays on Settings.
- **`AppLaunchRedirect` is deleted** — home is no longer the launch target, so its once-per-session `hasCheckedColdLaunch` module flag guards nothing.

### Offline flash

`ReaderPager`'s self-correction (the ADR 0014 Addendum 3 mount effect) moves from `useEffect` to `useIsomorphicLayoutEffect` (shared hook, extracted from `use-is-desktop-up.ts`). `jumpTo` is fully synchronous (`setAnchor(target)`), so a layout effect re-anchors in the same frame: the page-1 fallback's words never paint; the requested page shows the loading spread ADR 0034 mandates, then fills in. The self-correction also strips a leading `/xx` locale segment (anchored `/^\/[a-z]{2}(?=\/|$)/`) from **both** `window.location.pathname` and `basePath` before matching, so a locale mismatch still yields the requested page, and reads `storage.get("lastReadPage") ?? 1` (not the context's hydration default of `1`) when the pathname isn't a reader path.

### Android back-exit guard

`AndroidBackExitGuard`, mounted inside `ReaderPager`, active only when `isAndroid() && isStandaloneDisplayMode() && !isDesktopUp && !grantId`. On mount it pushes one history guard entry and attaches a `popstate` listener implementing ADR 0040's double-push state machine: an intercepted press shows `ExitToast` and re-pushes the guard; a second press within 2s skips the re-push and calls `window.close()`. Unmount removes the listener; the one pushed entry is left in history.

**Each push allocates a fresh state object** — `const guardState = () => ({ fqExitGuard: true })` called at both `history.pushState` sites, never a module constant. Next's history patch calls `copyNextJsInternalHistoryState(data)` which *mutates its argument in place*, stamping `__NA: true` and a frozen router tree onto a shared object; a later push then writes that frozen tree into the current entry, and after a locale switch the pager's `replaceState` reads it back and re-renders the stale locale + page 1. **Keep omitting `pushState`'s third (`url`) argument** — supplying one makes Next dispatch an `ACTION_RESTORE` that moves the pager's anchor on every back press.

Swipe navigation uses `history.replaceState`, not `pushState`, so swiping never grows history — the guard behaves identically after 20 swipes or 0.

## Decision Tree / Algorithm

### `public/launch.html`, evaluated synchronously in `<head>`, first match wins

| Condition | Action |
|---|---|
| Any exception thrown anywhere in the script | `location.replace('/')` |
| Not standalone/fullscreen/iOS `navigator.standalone` | `location.replace('/')` — browser tab or shared link |
| Desktop (`min-width: 1367px`) | `location.replace('/')` — desktop standalone out of scope |
| `lastReadPath` matches `^/(ar\|en)/pages/(\d{1,3})$` **and** page is 1–604 | `location.replace(lastReadPath)` |
| No usable `lastReadPath`, legacy numeric `lastReadPage` is 1–604 | `location.replace('/pages/' + n)` — unprefixed; `intl-middleware` resolves the locale |
| Neither key usable | `location.replace('/pages/1')` — unprefixed |

A corrupt value in either key is caught per-read and falls through to the next row, not the outer catch — only a genuine platform failure reaches "go home". The regex whitelist is load-bearing: the script navigates to a string read from `localStorage`, so an unvalidated read is an open redirect.

### Back-exit guard scope

| Condition | Guard active? |
|---|---|
| Android, standalone/fullscreen, mobile/tablet, own reader (`grantId` absent) | Yes |
| Same, iOS / desktop | No |
| Shared-mushaf grant reader (`grantId` present) | No — mirrors `LastReadPageSync`'s exclusion |
| Any non-reader route | No — `AndroidBackExitGuard` isn't mounted there |

### Back-press state machine (while the guard is active, ADR 0040 Option B)

| State | Trigger | Action |
|---|---|---|
| Mount on reader route | — | push one guard entry (fresh object, no `url` arg) |
| 1st back press | `popstate` on guard, unarmed | show toast; re-push (fresh object); start 2s timer; arm |
| 2nd back press within 2s | `popstate`, armed | `window.close()` (best-effort); do not re-push |
| Timer expires | 2s elapse | disarm; toast hides; next press is a fresh 1st |
| Route change away | unmount | remove listener; leave the one pushed entry |

## Verified Test Cases

Walked through with the user (2026-08-12 / 08-14):

1. Fresh install, never read → splash → `/pages/1` → middleware → `/ar/pages/1`. Home never renders.
2. Read to page 300, close, reopen → splash → `/ar/pages/300` directly. No home frame, no page-1 frame.
3. Nav Home icon tapped mid-session → client-side navigation to `/{locale}`; `launch.html` never involved. Surah list renders normally.
4. Hard refresh while on home in standalone → **stays on home** (deliberate change from the original module-flag behaviour).
5. Mobile browser tab opens `/launch.html` (shared link) → home. Desktop standalone → home.
6. Offline cold launch, last-read HTML cached → `launch.html` from the install precache → `/ar/pages/300` from `PAGES_CACHE_NAME`.
7. Offline cold launch, last-read HTML **not** cached → catch handler serves the page-1 fallback → layout-effect self-correction re-anchors to 300 before paint → loading spread for 300, then content. Page 1 never appears.
8. Android PWA, Arabic page 50 → switch to English → swipe. **Before:** Arabic page 1. **After:** English page 51.
9. Upgrading install: `lastReadPage` 300, `lastReadPath` never written → legacy fallback → `/pages/300` → `/ar/pages/300`.
10. Corrupt `lastReadPath` (`//evil.example/x`, `/ar/pages/9999`, non-string) → fails regex or bound → `/pages/1`. Both keys corrupt → `/pages/1`, not home.
11. On page 52 (reached via 5 swipes) → back → toast, stays on 52 → back within 2s → exit attempt. Swipe count irrelevant (`replaceState`).
12. Back once (toast) → wait 3s → toast hides → next back is a fresh 1st press.
13. Reader → tap Settings → back → normal navigation to the reader (no toast) — guard unmounted. Relaunching the icon while on Settings focuses the window and stays on Settings.
14. iOS installed PWA → no back-exit guard, but the launch-into-last-page still fires. Desktop installed PWA → neither applies.
15. Shared-mushaf grant reader on Android standalone → guard inactive (`grantId` present); the locale-strip change preserves the longer `mushaf/{grant}/pages` base path.
16. Mobile/tablet browser tab → `ContinueReadingLink` still renders (like desktop). Standalone after launch → it is hidden.
17. Back-exit guard unaffected by `location.replace` — the reader stays the first history entry, as `router.replace` was.

## Files to Change

- `app/utils/platform.ts` — `isStandaloneDisplayMode()` (moved) + `isAndroid()`.
- `app/hooks/use-pwa-precache.ts` — import `isStandaloneDisplayMode` from `platform.ts`.
- `public/launch.html` — **new**. Static, ~20 lines, no build step. Synchronous `<head>` script implementing the decision tree; body empty, `background:#16232F` as a throw-before-navigate safety net. Necessarily inlines the `display-mode` list from `platform.ts` — the one duplication ADR 0042 accepts; re-check it if the manifest `display` changes.
- `app/manifest.ts` — `start_url` → `/launch.html`; `id: "/"`; `launch_handler: { client_mode: "navigate-existing" }`. Cast where `MetadataRoute.Manifest` doesn't type `id`/`launch_handler`.
- `middleware.ts` — add `launch\.html` to `config.matcher` exclusions (alongside `manifest\.webmanifest`, `sw\.js`).
- `next.config.mjs` — add `launch.html` to `globPublicPatterns`.
- `app/utils/storage.ts` — `lastReadPath: string` in `StorageKey` / `StorageValueType`.
- `app/contexts/LastReadPageContext.tsx` — `setLastReadPage` writes `lastReadPath` alongside `lastReadPage` from this one site.
- `app/components/reader/ReaderPager.tsx` — self-correction effect → isomorphic layout effect; locale-strip both pathname and `basePath`; read `storage.get("lastReadPage") ?? 1` for the non-reader-path case. Mount `<AndroidBackExitGuard />` gated on `!grantId`.
- `app/hooks/use-is-desktop-up.ts` — extract `useIsomorphicLayoutEffect` into a shared module.
- `app/components/reader/AndroidBackExitGuard.tsx` — **new**. ADR 0040 double-push guard; `guardState()` factory at both push sites; renders `<ExitToast />` while armed.
- `app/components/reader/ExitToast.tsx` — **new**. Minimal bottom-anchored toast, clear of `RecitationPlayerBar` and `PlansWidget`'s `bottom-20 end-4`.
- `app/components/reader/AppLaunchRedirect.tsx` — **deleted**; `app/[locale]/page.tsx` drops its render + import.
- `app/components/nav/ContinueReadingLink.tsx` — return `null` when `isStandaloneDisplayMode() && !isDesktopUp`; update the doc comment that named `AppLaunchRedirect`.
- `messages/en.json` / `messages/ar.json` — `exitApp.pressBackAgain`.
- `docs/architecture/adr/0040-android-pwa-back-exit-guard.md`, `docs/architecture/adr/0042-pwa-launch-resolves-before-first-paint.md` — created; `docs/architecture/DECISIONS.md` — "App Launch & Back Navigation (Android PWA)" section + the ADR 0014 Addendum 3 flash trade-off amended.

## Constraints

- `isStandaloneDisplayMode()` has exactly one definition (`app/utils/platform.ts`); every consumer imports it. `public/launch.html` inlining the display-mode list is the only accepted duplication.
- `id: "/"` must ship in the same commit as the `start_url` change — shipping `start_url` alone re-identifies the installed app irreversibly for users who already updated.
- `public/launch.html` must be in **both** the `middleware.ts` matcher exclusion (or it 404s — the trap from `pwa-offline-support.md` Addendum 1) and `globPublicPatterns` (or offline cold launch breaks silently, and no online test catches it).
- The launch script must validate `lastReadPath` against the regex **and** the 1–604 bound before navigating — it is a `localStorage` read feeding a navigation.
- The launch script is plain hand-written JS outside the TS build — no types, no bundler, no imports. Small enough to verify by reading; scope capped at "decide a URL and navigate".
- `lastReadPath` and `lastReadPage` are written together from `LastReadPageContext` — a second write site lets the launch script and `ContinueReadingLink` disagree. `LastReadPageContext` keeps its initial value of `1` for SSR/hydration agreement; only the pager's mount-time read moves to storage, and the always-mounted `ContinueReadingLink` keeps reading the live context.
- The pager self-correction must be an **isomorphic** layout effect — a bare `useLayoutEffect` in an SSR-rendered client component triggers React's server-side warning on every reader page.
- The locale-stripping regex is anchored and bounded (`/^\/[a-z]{2}(?=\/|$)/`) so it cannot eat a real path segment, and is applied to `basePath` as well (the grant reader's base is `/{locale}/mushaf/{grant}/pages`).
- The back-exit guard uses the ADR 0040 double-push pattern, never a single pushed entry (a single push falls through to real history — e.g. Home — on the second press). Preserve the double-push shape exactly; the #288 fix changes only how the state object is allocated. Keep omitting `pushState`'s `url` argument.
- The guard is excluded on the shared-mushaf grant reader (`grantId` present).
- The cold-launch redirect fires at most once per launch and only from `launch.html` — never key reader-opening off "pathname is home".
- `window.close()` is best-effort; do not add a fallback UI (it only no-ops outside the gated platform).
- Serwist is disabled in dev — verify launch/offline behaviour with `npm run build:local && npm start` (not `build`, which runs `prisma migrate deploy`), dev server stopped first.

## What NOT to Do

- Do not move the redirect into `app/layout.tsx`'s theme head script and keep `start_url: "/"` — that script cannot tell an OS launch from a hard refresh or a deep link to home (same URL, same document load), and it re-inlines `isStandaloneDisplayMode()` into a second place (ADR 0042).
- Do not implement this as a cookie + a middleware redirect on `/` — Hostinger's CDN strips query params from cache keys and ignores `Vary`, so a per-user redirect served from `/` gets cached and replayed to everyone (`fix-rsc-cache-poisoning.md`, `fix-homepage-cdn-cache-poisoning.md`).
- Do not add a service-worker `fetch` handler or an IndexedDB mirror of the last-read page for the offline flash — page 1's document is the only reader HTML precached, so a worker that knows the last-read page still has nothing better to serve, and it would affect ordinary browser tabs.
- Do not add a `correcting` render gate to `ReaderPager` — unnecessary once `jumpTo` is synchronous, and it puts a new gate on a path ADR 0028 / 0034 constrain tightly.
- Do not make `/launch` a Next route under `app/[locale]/` — it would need a locale segment, a `revalidate` export, per-locale `sw.ts` precache entries, and would render behind the locale layout's `<Nav />`.
- Do not restore the once-per-session `hasCheckedColdLaunch` flag, or remove `ContinueReadingLink` entirely (desktop + browser tabs need it — only hide it in standalone mobile/tablet).
- Do not implement the back-exit guard with a single pushed history entry (ADR 0040 Option A, rejected); do not extend it to iOS or desktop; do not gate it on `/pages/` pathname matching (use the `grantId` prop).
- Do not "fix" the swipe-reverts-to-Arabic bug by removing the guard, dropping its push, or collapsing it to one entry; do not switch the pager from `history.replaceState` to `router.push`/`replace` (ADR 0028); do not have the guard write the router tree itself or read/patch `__PRIVATE_NEXTJS_INTERNALS_TREE` directly (a fresh object lets Next's patch do it).
- Do not add offline/service-worker changes for the auto-redirect — the offline cold-launch path is already precache + layout-effect self-correction.
- Do not build a general-purpose toast/notification system — `ExitToast` is single-purpose (Trello #161 separately tracks a shared toast library).
- Locale defaulting is **out of scope** — the URL-prefix → `NEXT_LOCALE` cookie → `Accept-Language` → `defaultLocale: 'ar'` chain is intentional (user-confirmed 2026-08-14). Do not add `localeDetection: false` or force Arabic on launch. `LanguageToggle`'s `next/navigation` + regex approach diverges from `docs/standards/i18n.md` but is not part of this work.

## Decisions Made

- Launch into a non-painting `public/launch.html`, not a React component that decides in a `useEffect` (effects run after paint, so the home document is fully painted before the redirect). Static public asset — no locale segment, no CDN poisoning surface.
- Persist `lastReadPath` alongside `lastReadPage` so the launch script needs no locale detection; legacy `lastReadPage` fallback so existing installs don't land on page 1.
- `id: "/"` pins app identity, shipped with the `start_url` change.
- The offline page-1 flash is fixed in this task via an isomorphic layout effect (not the originally-proposed service-worker mechanism, which can't help).
- Hard refresh on home in standalone stays on home — intended behaviour change.
- Back-exit toast scope: anywhere in the user's own reader, not the whole app; Home is exempt; the second press always exits, never falls back to a real history entry (this forced ADR 0040's double-push design).
- Back-exit guard is Android-only; iOS still gets the launch-into-last-page.
- The #288 swipe-reverts bug: fix the root cause (fresh state object) **and** both downstream fallbacks (locale strip, storage read) — defects 2 and 3 are a latent "remount lands on page 1" class any future route/locale remount could hit. The locale-default half of that investigation is explicitly dropped, not deferred.
- `ContinueReadingLink` hidden only where `isStandaloneDisplayMode() && !isDesktopUp`.

## Revision History

- 2026-08-14 — folded Addendum (#288): "swipe after a language switch reverts to Arabic page 1" in the installed Android PWA. `AndroidBackExitGuard` pushed a shared module-level state object; Next's history patch mutated it in place, freezing a router tree that the pager's `replaceState` later read back. Fix: a `guardState()` factory allocating a fresh object per push (keep omitting the `url` argument), plus locale-stripping and a storage read in the pager's mount self-correction to cover the "remount lands on page 1" class. Locale-default behaviour dropped as intended.
- 2026-08-14 — folded Addendum (#290, [ADR 0042](../../architecture/adr/0042-pwa-launch-resolves-before-first-paint.md)): "cold launch flashes the home page before redirecting". **Supersedes the `AppLaunchRedirect` component approach** — a React effect runs after paint, so the home surah list rendered before the redirect. `AppLaunchRedirect` is deleted; `start_url` is now a static `public/launch.html` that redirects synchronously in `<head>`, `lastReadPath` is persisted alongside `lastReadPage`, the manifest gains `id: "/"` and `launch_handler`, and the offline page-1 flash is fixed by moving the pager self-correction to an isomorphic layout effect.
