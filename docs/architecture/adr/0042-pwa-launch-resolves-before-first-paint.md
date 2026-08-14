# 0042 — PWA Cold Launch Resolves Before First Paint

**Status:** Accepted
**Date:** 2026-08-14
**Supersedes (in part):** [ADR 0014](0014-pwa-offline-architecture.md) Addendum 3's accepted "brief page-1 flash" trade-off
**Related:** [ADR 0028](0028-reader-persistent-pager.md), [ADR 0034](0034-page-turn-readiness-on-slow-networks.md), [ADR 0035](0035-bounded-revalidate-on-static-document-routes.md), [ADR 0040](0040-android-pwa-back-exit-guard.md)

## Context

The installed PWA is supposed to open on the reader page the user last read. It does — but the
user watches it happen. Two separate mechanisms both decide *after* the browser has already
painted something wrong:

1. **Online.** `start_url` is `/`, so the OS opens the home surah list. `AppLaunchRedirect` reads
   `lastReadPage` in a `useEffect` and calls `router.replace`. A `useEffect` runs after the home
   document has been fetched, parsed, styled, painted and hydrated — so the home page is fully
   visible before the reader replaces it.
2. **Offline.** The service worker's `setCatchHandler` serves the precached page-1 document for a
   navigation it cannot fulfil, and `ReaderPager` self-corrects to the real page via `jumpTo` in a
   `useEffect`. Same ordering problem: page 1's server-rendered words paint, then jump.

ADR 0014 Addendum 3 knowingly accepted (2) as a trade-off. (1) was introduced by the app-stickiness
feature, whose plan recorded "no page-1 flash" — true, but it replaced that flash with a home flash
rather than removing the class of problem.

The common defect is architectural, not incidental: **a launch-time navigation decision cannot live
in a React effect, because React effects run after paint by definition.**

## Decision

Every launch-time navigation decision resolves before the browser's first paint.

**1. The PWA launches into a static document that renders nothing.**

`start_url` points at `public/launch.html` — a hand-written static file, not a Next route. Its
entire body is a synchronous `<head>` script that reads the persisted reading position and calls
`location.replace()`. Because the script is synchronous and in `<head>`, the navigation is issued
during HTML parsing; `launch.html` itself never paints, and the OS splash screen stays up until the
reader paints. Nothing intermediate is ever visible.

Being a plain public asset rather than a Next route means it carries no React runtime, no locale
segment, no `revalidate` export, and no exposure to the CDN document-caching hazard ADR 0035 bounds.
It is byte-identical for every user, so it cannot be poisoned with per-user content. It is precached
for free by adding it to `globPublicPatterns` in `next.config.mjs`, alongside the other app-shell
entries — no `app/sw.ts` change is required for it to work offline.

**2. The reading position is persisted as a full path, not a page number.**

`lastReadPath` (`/ar/pages/300`) is written alongside the existing numeric `lastReadPage`, from the
single write site in `LastReadPageContext.setLastReadPage`. The launch script therefore performs no
locale detection at all — no `NEXT_LOCALE` cookie parse, no `navigator.language` heuristic, no
duplicated copy of `i18n/routing.ts`'s locale list. With nothing stored yet it redirects to the
unprefixed `/pages/1` and lets `intl-middleware` resolve the locale exactly as it does for any other
unprefixed URL.

The stored value is validated against `^/(ar|en)/pages/(\d{1,3})$` with the page bounded to 1–604
before it is used. This is load-bearing, not defensive padding: the script navigates to a string
taken from `localStorage`, and an unvalidated read is an open redirect.

**3. The offline fallback self-correction runs in a layout effect.**

`ReaderPager`'s ADR 0014 Addendum 3 self-correction moves from `useEffect` to an isomorphic layout
effect (the `useIsomorphicLayoutEffect` pattern already in `app/hooks/use-is-desktop-up.ts`, which
exists to avoid React's server-side `useLayoutEffect` warning). Layout effects run before the
browser paints, and `jumpTo` is fully synchronous — it calls `setAnchor` directly — so the re-anchor
lands in the same frame. The page-1 fallback's words never reach the screen; the requested page
shows the loading spread ADR 0034 already requires for an uncached page, then fills in.

**4. The manifest pins `id: "/"`.**

A web app manifest with no `id` derives the application's identity from `start_url`. Changing
`start_url` on an already-installed PWA therefore makes browsers treat it as a *different
application*: existing installs stop receiving updates and a reinstall produces a duplicate icon.
Setting `id` to `"/"` — the value today's `start_url` already implies — preserves the identity of
every existing install across this change and permanently decouples identity from `start_url`.

## Alternatives Considered

**Keep `start_url: "/"` and move the redirect into the root layout's existing head script.**
`app/layout.tsx` already runs a synchronous head script for theme and safha-view, so the before-paint
slot exists and is proven. Rejected because that script cannot distinguish "the OS just launched the
app" from "the user hard-refreshed home" or "the user opened a link to home" — all three are the same
URL and the same document load. It would have to guess, and it guesses wrong for every non-launch
load. A dedicated launch URL makes the signal unambiguous, scopes the logic to a path it can never
misfire outside of, and avoids re-inlining `isStandaloneDisplayMode()`'s display-mode list into a
second place — the exact duplication ADR 0014's constraints forbid.

**Cookie plus a middleware redirect on `/`.** Rejected on hosting grounds. Hostinger's CDN strips
query parameters from cache keys and ignores `Vary` (the mechanism behind the RSC and homepage
poisoning incidents — see `docs/plans/fix-rsc-cache-poisoning.md` and
`fix-homepage-cdn-cache-poisoning.md`). A per-user redirect response served from `/` is precisely the
shape of response that gets cached and replayed to everyone. A static, user-identical launch document
with the personalization done client-side has no such failure mode.

**A service worker `fetch` handler that answers the launch navigation from cache.** Considered as the
fix for the offline flash, and rejected because it does not actually fix it: the only reader document
precached is page 1's, so a service worker that knows the last-read page still has nothing better to
serve. It would also have needed the position mirrored into IndexedDB (a service worker cannot read
`localStorage`), and Serwist registers the worker for *every* production visitor, so a new navigation
handler would affect ordinary browser tabs too. The layout-effect fix addresses the real cause at a
fraction of the cost.

**Suppressing the reader's first paint behind a `correcting` flag.** Rejected as unnecessary once
`jumpTo` was confirmed synchronous — a layout effect achieves the same result without adding a render
gate to a path ADR 0028 and ADR 0034 constrain tightly.

## Consequences

- A cold launch costs one extra document fetch (`launch.html`, ~1 KB, precached), replacing the
  discarded fetch of the full home document. Net faster.
- Home is no longer the launch target, so the once-per-session `hasCheckedColdLaunch` module flag has
  nothing to guard against and is deleted with `AppLaunchRedirect`. A consequence the user confirmed
  and wants: a hard refresh while on home in standalone now stays on home, instead of bouncing to the
  reader.
- `public/launch.html` must be added to the root `middleware.ts` `config.matcher` exclusion list, or
  `intl-middleware` will redirect it into a locale prefix and 404 it — the same trap that broke the
  PWA icons (see `docs/plans/pwa-offline-support.md` Addendum 1).
- The launch script is plain hand-written JavaScript outside the TypeScript build: no type checking,
  no bundler, no imports. It must stay small enough to verify by reading, and it carries **two**
  hand-synced literals that this ADR accepts as the price of running before React: the `display-mode`
  list from `app/utils/platform.ts` (re-check whenever the manifest's `display` changes) and the
  `1367px` desktop breakpoint from `DESKTOP_UP_QUERY` in `app/hooks/use-is-desktop-up.ts` (re-check
  whenever that moves). Both are noted at their source. This is why the script's scope is capped at
  "decide a URL and navigate" — every line added to it is another thing that cannot be type-checked.
- The script reads the legacy numeric `lastReadPage` when `lastReadPath` is absent, and resolves it
  to an unprefixed `/pages/{n}`. This is not optional politeness: every install predating this change
  has the numeric key and not the path, so without the fallback the entire existing user base would
  be sent to page 1 on precisely the launch this ADR exists to make seamless. The fallback stays
  useful indefinitely (it costs one `localStorage` read) and there is no migration deadline after
  which it can be deleted safely, since a long-dormant install can surface at any time.
- **Existing installs do not adopt a changed `start_url` immediately.** Android rebuilds the WebAPK
  on its own schedule; iOS may not pick it up without a reinstall. Until an install refreshes, the OS
  still opens `/`, and `AppLaunchRedirect` — which used to redirect from there — no longer exists, so
  a cold launch shows the home surah list with no redirect. This was accepted knowingly: home is a
  legitimate screen rather than a broken state, the behavior converges on its own, and the
  alternatives (keeping a second redirect path alive on home, or un-hiding `ContinueReadingLink` on
  standalone mobile) each reintroduce a coupling this ADR removed. Do not "fix" this later by
  restoring a home-page redirect without re-opening the decision.
- Desktop standalone is deliberately still excluded and lands on home, matching the behavior the
  app-stickiness feature established.
