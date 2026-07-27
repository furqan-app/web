# Fix: Users See Stale App After Deployment (Service Worker Cache)

**Type:** bug
**Date:** 2026-07-24
**Status:** implemented

## Summary

Users report seeing the old version of the app after a deploy — both on regular (non-installed) browser visits, fixed only by a hard refresh, and on the installed PWA, fixed only by manually clearing the site's cache. Root cause is in `app/sw.ts`'s service worker runtime caching.

## Root Cause

1. **The service worker is active for every production visitor, not just installed-PWA users.** `@serwist/next` defaults to `register: true`, so it registers and controls regular browser tabs too. The existing `display-mode: standalone` gate (`app/hooks/use-pwa-precache.ts`) only decides whether to fire the *bulk 604-page pre-cache* — it does nothing to scope the service worker's runtime-caching rules, which apply to any client it controls.
2. **The reader-page HTML route (`/{locale}/pages/{id}`) is cached with `CacheFirst`**, under the premise that "Quran content is immutable" (true for verse text/fonts, per `docs/architecture/DECISIONS.md`'s Static Generation Strategy decision). But that route's HTML response also contains the app shell — nav, layout, any feature code — which is *not* immutable and changes on ordinary deploys. Once cached, `CacheFirst` never revalidates it, so any browser (regular or installed) that had visited a reader page before a deploy keeps serving that pre-deploy shell indefinitely, until the manually-bumped `PAGES_CACHE_VERSION` changes (a bump reserved for "reader markup/font logic" changes only — too narrow to cover this).

This matches the reported symptoms exactly: a hard refresh bypasses the service worker for that one navigation (fixes it in a regular tab); an installed PWA has no such gesture, so only clearing Cache Storage fixes it there.

See ADR 0014 Addendum 1 for the full incident writeup.

## Decision Tree / Fix

| Resource | Matcher (`app/sw.ts`) | Before | After | Why |
|---|---|---|---|---|
| Page fonts (`/fonts/v1/ttf/p{n}.ttf`) | `isPageFont` | `CacheFirst` | **unchanged** — `CacheFirst` | Genuinely immutable |
| Reader page HTML (`/{locale}/pages/{id}`) | `isSelfReaderPage` | `CacheFirst` | **`NetworkFirst`** (same `pages-v{N}` cache name) | HTML carries the app shell, which changes on deploy; cache is now offline-fallback only |

## Verified Test Cases

| Scenario | Online? | Installed PWA? | Before (CacheFirst) | After (NetworkFirst) |
|---|---|---|---|---|
| Regular browser, first visit post-deploy | Yes | No | Fresh (cache miss) | Fresh (cache miss) |
| Regular browser, revisit (cached pre-deploy) | Yes | No | Stale — the bug | Fresh (network wins) |
| Installed PWA, revisit online post-deploy | Yes | Yes | Stale — the bug | Fresh (network wins) |
| Installed PWA, offline | No | Yes | Cached copy (intended, offline reading) | Cached copy (unchanged — network fails, falls back) |
| Regular browser, offline (edge case) | No | No | Cached if previously visited | Cached if previously visited (unchanged) |

Confirmed with the user: offline behavior for installed users is fully preserved; only online visits (regular or installed) stop serving frozen HTML.

## Files to Change

- `app/sw.ts` — change `isSelfReaderPage`'s `runtimeCaching` entry from `new CacheFirst(...)` to `new NetworkFirst(...)`, keeping `cacheName: PAGES_CACHE_NAME`. Leave `isPageFont`'s entry untouched.
- `docs/architecture/DECISIONS.md` — "PWA & Offline Quran Page Caching" section: added constraints documenting the registration-scope gap and the CacheFirst→NetworkFirst correction (already applied during planning).
- `docs/architecture/adr/0014-pwa-offline-architecture.md` — Addendum 1 documenting the incident and fix (already applied during planning).

## Constraints

- Do not change `isPageFont`'s handler — fonts are confirmed genuinely immutable.
- Do not revert `isSelfReaderPage` back to `CacheFirst` — that reintroduces this exact bug.
- Do not bump `PAGES_CACHE_VERSION` as part of this fix — `NetworkFirst` naturally overwrites stale cache entries on the next successful online fetch; no forced re-download is needed.
- Do not add a `networkTimeoutSeconds` to the new `NetworkFirst` rule — the goal is "always prefer network when it succeeds," not a fast-timeout-to-cache fallback; only a genuine network failure (e.g., offline) should fall back to cache.

## What NOT to Do

- Do not restrict service worker *registration* to `display-mode: standalone` only. `NetworkFirst` alone fixes the regular-browser case (online visits always get fresh content), so there's no need to also change registration scope — smaller, more surgical fix.
- Do not queue offline mark writes or otherwise reopen ADR 0014's Option C — out of scope, unrelated to this bug.
- Do not change the bulk pre-cache gating (`display-mode: standalone` check in `use-pwa-precache.ts`) — unaffected by this bug.

## Decisions Made

- Fonts stay `CacheFirst` (immutable); reader-page HTML moves to `NetworkFirst` (app shell is not immutable).
- No `PAGES_CACHE_VERSION` bump needed for this fix.
- Trello: https://trello.com/c/CSbMCvFd/122-users-still-see-the-old-version-after-deployment
