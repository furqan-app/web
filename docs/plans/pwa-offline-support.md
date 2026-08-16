# PWA Conversion + Offline Quran Page Reading

**Type:** feature  
**Date:** 2026-07-06  
**Status:** implemented

## Summary

Convert the app into an installable PWA (manifest, icons, metadata) and add offline Quran page reading for installed users: a service worker (Serwist) pre-caches all 604 pages of the current locale plus their fonts in the background, only when running as the installed app. Marks stay online-only. See [ADR 0014](../architecture/adr/0014-pwa-offline-architecture.md).

Two bugs found post-deploy merged in: icons 404ing due to missing middleware matcher entry, and a deprecated Apple meta tag warning.

## Approach

### 1. Installability

- `app/manifest.ts` — Next.js metadata-route convention; exports `name`, `short_name`, `description`, `start_url`, `display: "standalone"`, `background_color`, `theme_color`, `icons`.
- Generate PNG icons from `public/icon.svg`: 192×192, 512×512, 512×512 maskable. One-off `scripts/generate-pwa-icons.js` using `sharp` (dev dep), output committed to `public/icons/`.
- `app/layout.tsx` — `viewport` export (theme-color), `metadata.manifest`, Apple PWA meta, plus `<meta name="mobile-web-app-capable" content="yes" />` in `<head>` (Next's typed `Metadata` has no first-class field for this; `appleWebApp.capable` kept for older iOS Safari).

### 2. Service Worker (Serwist)

`next.config.js` wrapped with `withSerwistInit` (chained with `withNextIntl`).

`app/sw.ts`:
- Standard Serwist precache for build assets (JS/CSS/webpack chunks) — automatic per deploy.
- Separate runtime cache `pages-v{N}` (manually bumped only when cached page output changes):
  - `/{locale}/pages/{id}` HTML — `CacheFirst` (static generation, immutable content)
  - `/fonts/v1/ttf/{n}.ttf` — `CacheFirst`, locale-independent
- `message` listener for `START_PRECACHE { locale }` — walks pages 1..604, fetching+caching what's missing, `postMessage`s `{cached, total}` progress. Idempotent/resumable.

### 3. Client Trigger + Progress UI

- `app/hooks/use-pwa-precache.ts` — checks `matchMedia('(display-mode: standalone)').matches` (+ `navigator.standalone` for iOS) on mount. If standalone + SW controller exists, posts `START_PRECACHE` with current locale, subscribes to progress messages, exposes `{ cached, total, isStandalone }`.
- `SettingsSidebar.tsx` — new "Offline Access" section, only rendered when `isStandalone`. Shows `cached/604` with progress bar.

### 4. Marks Offline Gating

- `app/hooks/use-online-status.ts` — wraps `navigator.onLine` + `online`/`offline` event listeners.
- `MarkModal.tsx` — when offline, disable color picker/save/remove buttons; show `markModal.offlineNotice` inline notice.

### 5. Middleware Matcher Fix

`middleware.ts` `config.matcher` excluded known static paths from `intl-middleware` but not `public/icons/`. Requests to `/icons/icon-*.png` were redirected to `/en/icons/...` → 404. Serwist's precache install failed on all three icons.

**Fix:** Add `icons/*` to the matcher exclusion list alongside `fonts/*`.

## Files Changed

- `app/manifest.ts` — new
- `public/icons/` — generated PNGs + `scripts/generate-pwa-icons.js`
- `app/layout.tsx` — viewport export, manifest link, Apple meta, `mobile-web-app-capable`
- `next.config.js` — `withSerwistInit` wrapper
- `app/sw.ts` — service worker source
- `app/hooks/use-pwa-precache.ts`, `use-online-status.ts` — new
- `app/components/SettingsSidebar.tsx` — offline access section
- `app/components/MarkModal.tsx` — offline gate
- `messages/ar.json`, `messages/en.json` — offline notice + settings labels
- `package.json` — add `serwist`, `@serwist/next`, `sharp` (dev)
- `.gitignore` — ignore Serwist-generated `public/sw.js`; keep `app/sw.ts`
- `middleware.ts` — add `icons/*` to matcher exclusion list
- `docs/architecture/DECISIONS.md` — constraint: new `public/` asset dirs must be added to middleware matcher

## Constraints

- Pre-cache only for `display-mode: standalone` — never trigger the ~92MB download for regular web visits.
- No offline mark write-queueing without revisiting ADR 0013 (conflict risk with shared-mushaf last-author-wins).
- Do not bump `pages-v{N}` cache version on unrelated deploys — only when cached page output changes.
- Pre-cache current locale only, not both locales.

## Decisions Made

- Marks offline: disabled with inline notice, not silent fail on submit.
- Pre-cache resumes on every app launch until all 604 pages are cached — not just once after install.
- iOS storage risk accepted (no mitigation beyond resume-on-launch).
- `mobile-web-app-capable` added as explicit `<meta>` tag since Next's `Metadata` type has no field for it.
- Trello: https://trello.com/c/ZatnLnVT/65-add-pwa

---

# Addendum 1 (2026-08-10): Consent-gated up-front offline download

**Type:** feature
**Status:** implemented
**Trello:** https://trello.com/c/oOICaTUy/187-on-mobiletablet-download-only-the-madani-mushaf-and-allow-download-othr-mushafs-on-demand (#187)

## Summary

The offline cache currently fills itself silently in the background over the user's first several installed-app sessions, surfaced only as an ambient progress bar in Settings. Replace that with an explicit, consent-gated, up-front download offered on three surfaces: an in-tab prompt right after install (Chromium), a blocking first-run gate on the installed app, and a permanent Settings button. The ambient Settings progress bar is removed. Base (madani) mushaf only — the tajweed edition stays network-on-demand, with the Settings section shaped so a second row drops in later.

Measured download for the base mushaf: **≈48 MB** (45.7 MiB of per-page WOFF2 + ~2.0 MiB gzipped JSON + 12 KB verse-pages map), occupying **≈67 MiB** of Cache Storage once the JSON is stored decompressed.

## Why the current behavior is wrong for this ask

- The user cannot choose when a 48 MB transfer happens, or know it is pending, without opening Settings.
- Nothing tells them offline reading is *not yet* ready — they discover it by going offline and finding the reader broken.
- The precache re-runs its full 604-iteration loop on **every** standalone launch even when complete, because there is no completion check — only a per-page `cache.match()` inside the loop. This is Trello #129 ("PWA pages loads for offline in every reload"), fixed incidentally by the sentinel below.

## Measured sizes

| Asset | On disk | Over the wire |
|---|---|---|
| `public/fonts/v1/woff2/p{1..604}.woff2` | 45.7 MiB | 45.7 MiB (WOFF2 — already compressed) |
| `public/quran/pages/2/{1..604}.json` | 21.3 MiB | ~2.0 MiB (sum of per-file gzip) |
| `public/quran/verse-pages/2.json` | 72 KB | 12 KB |
| **Base mushaf total** | **≈67 MiB** | **≈48 MB** |
| Tajweed edition (`v4/colrv1` + `pages/19`) — deferred | ≈71 MiB | ≈51 MB |

Fonts are ~95% of the transfer and cannot be compressed further. The user-facing figure is the **download** size (48 MB), since that is what costs them data.

## Three surfaces

| Surface | Context | Shown when |
|---|---|---|
| Install prompt | browser tab | `appinstalled` fires (Chromium only — no such event on iOS) |
| First-run gate | installed PWA, full-screen block | first standalone launch with nothing cached |
| Settings row | installed PWA | always |

All three drive the same state machine and the same `START_PRECACHE` service-worker message.

## Persisted state

- **Cache sentinel** — a synthetic `Response` stored at `/__fq-precache-complete` inside `pages-v{N}`, written only after a fully successful run, and version-scoped for free by living inside the versioned cache name. **Its presence alone is not sufficient** — see the eviction note below.
- **Integrity check (`isCacheComplete`)** — the sentinel is only trusted when a page count derived from `cache.keys()` also equals 604 and the verse-pages map is present. This is pure string work over the key list with no per-entry reads, so it still avoids the 604-page re-walk that Trello #129 was about. A cache failing the check has its sentinel deleted and falls through to a resuming run that refetches only what is missing.
- **`fq-offline-prompt-dismissed-v{N}`** in `localStorage` — set when any surface is dismissed (completed, skipped, or "continue anyway"). Version-scoped so a deliberate `PAGES_CACHE_VERSION` bump re-prompts.

The flag is set only on dismissal, never on download *start* — that is what makes an interrupted download resume via the gate instead of silently becoming the user's problem (case 5 below).

## Decision Tree — which surface shows

| # | Context | Sentinel | Dismissed flag | Behavior |
|---|---|---|---|---|
| 1 | Browser tab, no `appinstalled` this session | any | any | **Nothing.** No prompt, no bulk download |
| 2 | Browser tab, `appinstalled` fired | absent | not set | In-tab install prompt |
| 3 | Browser tab, `appinstalled` fired | present | any | Nothing — already cached |
| 4 | Browser tab, `appinstalled` fired | absent | set | Nothing — user already declined |
| 5 | Standalone launch | present | any | No gate. Settings reads "Ready" |
| 6 | Standalone launch | absent | not set | **Blocking full-screen gate** |
| 7 | Standalone launch | absent | set | No gate. Settings reads "Download (48 MB)" |

## Decision Tree — state machine (shared by all three surfaces)

| State | Entered when | UI | Actions |
|---|---|---|---|
| `idle` | surface first shown | "Read the Quran offline — about 48 MB. Best on Wi-Fi." | **Download** → `running`; **Skip for now** / **Not now** → dismiss |
| `running` | Download tapped | determinate bar, "n of 604 pages" | **Skip for now** → abort + dismiss |
| `done` | all 604 font+JSON pairs cached, 0 failures | — | write sentinel, set flag, auto-close |
| `partial` | loop finished with failures > 0 | "n of 604 ready. Some pages couldn't be downloaded." | **Retry** → `running`; **Continue anyway** → dismiss, no sentinel |
| `offline` | `navigator.onLine === false` while `idle` | "You're offline. Connect to download." Download disabled | **Skip for now** |

Nothing auto-starts. The download always requires an explicit tap, on every surface.

## Verified Test Cases

| # | Scenario | Expected |
|---|---|---|
| 1 | Android: install from Chrome menu → prompt (case 2) → **Download** → 48 MB completes in the tab → open from home screen | Sentinel + flag set; case 5, no gate; reader works offline immediately. *This is the "downloaded before first open" outcome.* |
| 2 | Same, but taps **Not now** | Flag set, no sentinel → case 7 on launch: no gate. Settings has the button. Re-blocking someone who declined seconds earlier would be hostile. |
| 3 | iOS: Add to Home Screen (no event fires) → first launch | Case 6 gate, `idle` → **Download** → `done` → reader opens. |
| 4 | iOS: gate → **Skip for now** | Flag set, reader opens now. Next launch is case 7, no gate. |
| 5 | Download killed at 300/604 (app force-quit) | Sentinel absent, flag never set → next launch is case 6, gate returns `idle`; **Download** resumes at 300 (per-page `cache.match()` skips what exists). |
| 6 | `PAGES_CACHE_VERSION` 2 → 3 | New empty cache, new flag key → case 6, gate returns, still skippable. |
| 7 | Browser-only visitor who never installs | Case 1. Zero behavior change; ADR 0014's core protection intact. |
| 8 | Offline at first standalone launch | Case 6 in `offline` state; Download disabled, Skip only. |
| 9 | Bad deploy, some font URLs 404 | `partial`; no sentinel written. Settings still reads "Download", never "Ready". |
| 10 | Complete cache, ordinary feature deploy (no version bump) | Case 5. No re-download, no gate, no re-run of the 604-loop (fixes #129). |
| 11 | Complete cache, then iOS evicts some entries | The sentinel is present but the page count is short, so `isCacheComplete` returns false, the stale sentinel is deleted, and Settings reports "Not available offline" with a Download that resumes and refetches only the evicted pages. Verified by deleting `p300.woff2` from the live cache. |

## Verification (2026-08-10, production build served locally)

Serwist is disabled in `next dev`, so none of this is reachable without `next build && next start`. Results:

| Check | Result |
|---|---|
| Precache manifest after the `globPublicPatterns` fix | 2482 → **64 entries**; zero fonts, zero page JSON |
| Origin storage at SW install | **213.8 MiB → 6.8 MiB** |
| Case 1 — browser tab, no install event | 0 page-cache entries; nothing downloaded |
| Status protocol on a fresh origin | `{cached: 0, complete: false, running: false, total: 604}` |
| Full run | 604 cached, 0 failed, ~3 s on localhost (the removed 200 ms throttle alone floored this at ~121 s) |
| Measured size | 45.7 MiB fonts + 21.4 MiB JSON = **67.1 MiB** stored, matching the planning estimate |
| Sentinel | Written on full success; absent after cancel |
| #129 short-circuit | 44 ms on a complete cache vs a 604-page walk |
| Case 11 — evict 3 entries | `601 / complete: false`, stale sentinel deleted, resume refetched exactly those 3 in 0.2 s |
| Cancel mid-run | Stopped at 210/604, no sentinel |
| **Offline reading end-to-end** (server killed) | `/ar/pages/1` rendered 512 words; arrowing forward reached page 7 (816 words) with **only page 1's HTML ever cached** — pages 3/5/7 came purely from precached JSON + fonts |

Not verified here: the `partial` state (attempting to induce it is what exposed the `globPublicPatterns` bug, and a 3 s localhost run outruns a mid-run server kill), and the gate's rendered appearance — it requires `display-mode: standalone`, which a normal tab cannot fake after hydration, so it needs a real install. iOS needs a device either way.

## Review Fixes (2026-08-11, post-PR #200)

An Opus review pass on the branch surfaced one critical defect and a set of robustness/quality gaps. All fixed on the same branch:

| # | Fix |
|---|---|
| 1 | **Critical — Arabic rendered as English.** All four parameterized `offline.*` keys went through the project `use-translations` wrapper + `.replace()`. The wrapper calls `t(key)` with no ICU values; client-side that returns the key path, which trips its own missing-key test, so the inline English default was served and every Arabic string was dead. Now uses next-intl's `useTranslations("offline")` with values — the pattern `docs/plans/fix-viewing-chip-intl-interpolation.md` already established and whose constraints this had violated. |
| 2 | A killed service worker left the client stuck on `running` forever (a run lives in `event.waitUntil`; browsers kill workers). Status is now re-requested on `visibilitychange`/`focus`. |
| 3 | `CANCEL_PRECACHE` was an unscoped module flag, so one surface could abort a download another surface was displaying — reachable because Chromium shares one worker between the tab and the installed PWA. Runs now carry a `runId` and a cancel must name it. |
| 4 | `activeRunId` is released *before* the awaited final progress report; a `START` arriving during that window used to be dropped silently while the client already showed `running`. |
| 5 | `dismissed` was per-hook-instance, so dismissing on one surface left others stale. localStorage is now the source of truth, fanned out in-tab by a custom event (the native `storage` event only fires in other tabs). |
| 6 | `postToServiceWorker` had no `.catch()` — a rejected `serviceWorker.ready` stranded the surface silently. |
| 7 | The `offline` state covered only `idle`, so `partial`'s Retry was offered while offline and disagreed with Settings' disabled button. Now covers both. |
| 8, 16 | The gate declared `aria-modal` with no focus trap, Escape handling, or scroll lock — a keyboard/screen-reader user could Tab into the app it exists to block. Rebuilt on the Radix Dialog primitive with Escape and outside-pointer dismissal suppressed. |
| 9 | The gate rendered nothing during the SW round-trip, so the reader flashed first. It now renders a wait state for `unknown`. |
| 10 | The progress bar, its label and a `num()` helper were duplicated across two surfaces, and only one copy carried `role="progressbar"`. Extracted as `OfflineProgressBar`. |
| 11 | The panel's `state` prop admitted `done`/`unknown` and fell through to the Download button, so both callers repeated the same guard. Narrowed to `Exclude<PrecacheState,"done">`. |
| 12 | `reportStatus` walked `cache.keys()` twice per request. The count is now passed into `isCacheComplete`. |
| 13 | `reportProgress`'s two adjacent booleans were transposable at a call site; now a named-field object. |
| 14 | `failed` was plumbed end-to-end but unread — now surfaced in the `partial` copy. |
| 15 | `versePagesUrl()` was a zero-arg function returning a constant → `VERSE_PAGES_URL`. |
| 17 | `postToClients` took `Record<string, unknown>`, letting SW and client payloads drift. Both now share `ClientToSwMessage`/`SwToClientMessage`. |
| 18 | `z-[100]` was the only z-index above the app's Radix ceiling, floating the prompt over an open Settings sheet; also collided with `RecitationPlayerBar`/`PlansWidget`. Now `z-50` at `bottom-24 start-4`. |
| 19–22 | Doc corrections: the i18n standard asserted the wrong mechanism, `PAGES_CACHE_VERSION`'s location was stale, a removed `useOfflineSizeNotice` export was still referenced, and a DECISIONS constraint read as absolute where the code has a deliberate carve-out. |
| 23 | Settings promised a shape where a tajweed row "drops in" but was one hardcoded card. Extracted `OfflineEditionRow`. |

Not fixed, deliberately: the gate's post-SW-round-trip appearance is inherent to reading cache state asynchronously (mitigated by #9's wait state, not eliminated).

## Files to Change

- `app/sw.ts`
  - Write the `/__fq-precache-complete` sentinel into `pages-v{N}` on a fully successful run; never on a partial one.
  - New `PRECACHE_STATUS` message → replies `{ complete, cached }`. Short-circuit `precacheAllPages` when the sentinel is present.
  - New `CANCEL_PRECACHE` message → sets an abort flag the loop checks between batches.
  - Count real successes: `cached++` at sw.ts:121 currently runs unconditionally, so a run where every fetch fails still reports 604/604. Increment only when both the font and JSON for that page are present or newly cached, and track `failed` separately.
  - Add `failed` to the `PRECACHE_PROGRESS` payload.
  - Replace the sequential loop + `await sleep(200)` with concurrency-6 batches (see Decisions Made).
- `app/constants/offline.ts` — new. Shared by `app/sw.ts` and the hook: cache version/name, page counts, URL builders, sentinel path, dismissed-flag key, `OFFLINE_DOWNLOAD_MB`, concurrency. `PAGES_CACHE_VERSION` must live in exactly one place — duplicating it as a literal would let the cache and the dismissed flag drift onto different versions.
- `app/hooks/use-pwa-precache.ts` — rewrite. No auto-start on mount. Query status, expose `{ state, cached, failed, total, isStandalone, isOnline, dismissed, start, cancel, dismiss }` for all three surfaces, and own the `localStorage` dismissed flag. `dismissed` initializes `true` so no surface can flash before localStorage is read.
- `app/hooks/use-app-installed.ts` — new. `appinstalled` event listener; returns whether install completed this session.
- `app/components/offline/OfflineDownloadPanel.tsx` — new. The shared state-machine body (idle/running/partial/offline), so the gate and the prompt don't each reimplement it.
- `app/components/offline/OfflineSetupGate.tsx` — new. Full-screen blocking gate, standalone only.
- `app/components/offline/OfflineInstallPrompt.tsx` — new. In-tab prompt after `appinstalled`, dismissible bottom card rather than a full-screen block.
- `app/components/offline/OfflineAccessSection.tsx` — new. The Settings row, extracted from `SettingsSidebar` rather than inlined, since it now carries three states.
- `app/[locale]/layout.tsx` — mount the gate and the prompt inside the existing provider tree.
- `app/components/SettingsSidebar.tsx` — drop the ambient progress bar and the `usePwaPrecache` call; render `<OfflineAccessSection />` instead.
- `messages/en.json`, `messages/ar.json` — new `offline.*` namespace; `offlineAccess` kept as the section heading, `offlinePagesReady` removed (superseded by `offline.progress`).
- `next.config.mjs` — pin `globPublicPatterns` to the app shell (`icon.svg`, `icons/**/*`, `quran/chapters.json`). Its default of `["**/*"]` put all 604 base fonts, all 604 tajweed fonts and all 1208 page JSON files into the service worker's install-time precache manifest (2482 entries, ~137.7 MiB) for every production visitor, gated by nothing. Found during verification of this task; see ADR 0014's `globPublicPatterns` section.
- `docs/architecture/adr/0014-pwa-offline-architecture.md` — Addendum 2 (see below).
- `docs/architecture/DECISIONS.md` — update the "PWA & Offline Quran Page Caching" entry and its constraint list.

## Constraints

- **The `appinstalled` prompt downloads fonts in a browser context.** This narrows, but does not remove, DECISIONS.md's "the `display-mode: standalone` gate is load-bearing" constraint — the gate becomes *explicit consent* (a completed install **plus** a tap) rather than *display mode*. Recorded in ADR 0014 Addendum 2. Case 1 of the tree — a browser tab with no install event — must still download nothing, ever.
- Only fire the in-tab prompt on a real `appinstalled` event. Do not add a custom `beforeinstallprompt`-driven "install our app" CTA as part of this task; that is a separate feature with its own design.
- Do not write the sentinel on a partial run. A cache that is 603/604 complete is not offline-capable and must not report "Ready".
- Do not treat the sentinel's presence as sufficient proof of a servable cache, and do not "optimize" `isCacheComplete` back down to a bare `cache.match()` of the sentinel. iOS evicts entries out from under a completed run, and the pre-existing code only self-healed from that because it re-walked every page on every launch — removing the walk without adding the count would have made an evicted cache silently report "Ready" forever, on the exact platform ADR 0014 names as the eviction risk.
- The dismissed flag must be scoped to `PAGES_CACHE_VERSION`. An unversioned flag would leave a user permanently un-prompted after a bump, with silently broken offline reading.
- Base mushaf (`PRECACHE_MUSHAF_ID = 2`) only. Do not parameterize the bulk precache per edition in this task, and do not add tajweed fonts to it — ADR 0023's exclusion stands.
- The blocking gate is standalone-only. It must never render in a browser tab.
- Serwist is disabled in development, so none of this is testable via `npm run dev` — use `npm run build:local && npm start` (`build`, the CI script, has no env file and dies on `prisma migrate deploy`). Stop the dev server before building: sharing `.next` between the two corrupts the build, and it fails as prerendered routes 500ing with nothing in the log.

## What NOT to Do

- Do not auto-start the download on any surface. Rejected in planning: a 48 MB transfer on cellular without a tap is not acceptable, even with a Skip button visible.
- Do not implement a hard block with no escape. Rejected: a user on a bad connection would be stuck at a spinner with the app unusable.
- Do not gate on `navigator.connection` / metered-network detection. Rejected: unsupported on iOS Safari, the platform that most needs it, so it buys two code paths for a partial win.
- Do not keep the ambient Settings progress bar. It is explicitly being removed; progress belongs on the surface that started the download.
- Do not fall back to silent background precaching after a Skip. Skipping means nothing downloads until the user taps the Settings button.
- Do not ship the tajweed download rows in this task (deferred), and do not bulk-precache both editions — ~99 MB / ~138 MiB against an already-fragile iOS quota.
- Do not switch `isSelfReaderPage` back to `CacheFirst` — ADR 0014 Addendum 1, Trello #122.
- Do not add font, page-JSON, or verse-pages globs to `globPublicPatterns`, and do not restore its `["**/*"]` default. Entries there are precached at service-worker install for every visitor, bypassing the standalone check, the dismissed flag and the sentinel alike.
- Do not render a placeholder-bearing translation key through `@hooks/use-translations` + `.replace()`. The first implementation of this addendum did, which silently served English copy to Arabic users for all four `offline.*` parameterized keys — the wrapper passes no ICU values, next-intl returns the key path, and the wrapper's missing-key test then falls back to the inline English default. Use next-intl's `useTranslations(namespace)` directly with values, per `docs/plans/fix-viewing-chip-intl-interpolation.md` and `docs/standards/i18n.md`.
- Do not add offline mark write-queueing. Unchanged from the original plan.

## Decisions Made

- **Blocking first-run gate on all platforms, rather than an Android-only pre-install path.** iOS exposes neither `beforeinstallprompt` nor `appinstalled`, so "before first open" is unachievable there by any means; one shared gate gives iOS a correct experience instead of a divergent one, and on Android the `appinstalled` prompt usually means the gate never appears.
- **In-tab prompt on `appinstalled` retained despite requiring an explicit tap.** The tab is still open and visible at that moment, so consent and "before first open" are not in conflict. Chromium shares Cache Storage between the tab and the installed PWA (same origin, same profile), so the transfer carries over. Best-effort: if the tab closes mid-download the service worker may be killed, but the run is resumable and the gate finishes it.
- **A cache-version bump re-shows the blocking gate** (case 6). This deliberately reads against ADR 0014's "routine deploys don't force re-downloads" intent, but that intent is about *routine deploys*, which no longer bump the version at all; a bump is a deliberate assertion that the cached data is wrong, so re-prompting is correct — and it is still skippable.
- **The 200 ms per-page throttle is removed** in favor of concurrency-6 batches. It existed to avoid starving an active reader's font fetches while the precache ran silently in the background; the precache is now always foreground and user-initiated with nothing competing. It also imposed a hard 604 × 200 ms ≈ 2 min floor, which would have dominated a 48 MB transfer and made the blocking gate needlessly slow.
- **Tajweed deferred**, keeping ADR 0023's precache exclusion. Settings is shaped so a "Tajweed mushaf (51 MB)" row is additive.
- User-facing size is the wire figure (48 MB), not the 67 MiB stored footprint.
- Trello #129 ("PWA pages loads for offline in every reload") is fixed incidentally by the sentinel short-circuit and should be closed with this work.

---

# Addendum 3 (2026-08-12): Fix offline navigation + standalone detection + resume UI

**Type:** bug
**Status:** implemented (not browser/offline-verified — lint + typecheck only; see Manual Verification below)
**Trello:** https://trello.com/c/lWMkW1jp/194-download-offline-works-but-when-i-navigate-using-the-sidebar-or-from-the-home-page-it-doesnt-work (#194)

## Manual Verification

Not exercised in a browser this session (skipped by request). Serwist is disabled under `npm run dev`, so none of this is reachable there — verify with `npm run build:local && npm start`, then, per the Verified Test Cases above:

- Install the built app, complete or partially complete the offline download, then go offline and confirm swipe still works (unchanged), a sidebar tap to an unread surah lands correctly (row 2/4), a cold relaunch resumes the last-read page (row 5), and cancelling a download mid-run shows "Resume download" in Settings with the right count.
- Confirm the Settings offline row and first-run gate now actually render on a device where the earlier `display-mode: fullscreen` bug hid them.
- Confirm a page whose JSON was never downloaded shows the new inline notice instead of spinning forever (row 6).

## Summary

Three reports bundled under one card, two sharing a root cause:

1. Cold offline app launch shows a blank shell, not the reader.
2. Offline, swiping between pages works; sidebar/rub taps and home-page surah taps do nothing.
3. The Settings "Offline Access" row (already built, `OfflineAccessSection`) never appears on an installed Android device, even after a successful download.

## Root Cause

**(1) and (2):** the bulk precache (Addendum 1/2) only ever caches per-page **JSON + fonts**, never page HTML — correct for swipe, which never navigates (`ReaderPager` uses `history.replaceState` + a client fetch of precached JSON). But `SurahListItem`, `RubList`, the home page's surah list, and `ContinueReadingLink` all use next-intl's `<Link>` — a real navigation, fetching that route's document/RSC. `isSelfReaderPage` caches that `NetworkFirst`, but only for pages actually visited online — never part of the bulk precache. Offline + never-visited page = the fetch fails with no cache entry. The same gap exists one level up: `start_url: "/"` needs the home route's document, which is cached only opportunistically (defaultCache's LRU-capped "others"/html buckets), not guaranteed.

**(3):** `app/manifest.ts`'s `display` was changed `"standalone"` → `"fullscreen"` for Android status-bar hiding (`docs/plans/feature-pwa-fullscreen-focus-mode.md`, 2026-07-31) — three weeks after `isStandaloneDisplayMode()` (`app/hooks/use-pwa-precache.ts:27-28`) was written checking only `display-mode: standalone`. On any platform that honors `fullscreen` as the effective mode, `isStandalone` is `false` for the whole session, so every surface gated on it (Settings row, first-run gate) silently never renders. The one download that worked went through the in-tab `appinstalled` prompt, which doesn't check display mode — explaining why it worked once and then the status vanished.

See [ADR 0014 Addendum 3](../architecture/adr/0014-pwa-offline-architecture.md) for the full mechanism.

## Decision Tree / Algorithm

**Offline navigation:**

| # | Trigger | Reader already mounted? | Online? | Result |
|---|---|---|---|---|
| 1 | Swipe / in-spread arrow / keyboard | Yes | any | Unchanged |
| 2 | Sidebar/rub tap, Continue Reading | Yes | any | `ReaderPager.jumpTo` directly — no navigation, no fallback needed |
| 3 | Sidebar/home tap → new page | No | Yes | Unchanged (normal navigation) |
| 4 | Sidebar/home tap → new page | No | No | `setCatchHandler` serves the precached `/{locale}/pages/1` fallback document; client reads the requested id from `location.pathname` on mount and calls `jumpTo` to correct to it (or, if that page's JSON isn't cached, to the last-read page, or page 1 if neither is known) |
| 5 | Cold app launch (`start_url`) | No | No | Same fallback path as #4, correcting to the last-read page or page 1 |
| 6 | Landed on a page whose JSON/fonts were never downloaded | — | No | Inline "not available offline yet" notice instead of an indefinite loading skeleton |

**Settings offline row (resume/partial state):**

| State | `cached` | Shown |
|---|---|---|
| Nothing downloaded | 0 | "Download (48 MB)" |
| Fully downloaded | 604 | "Available offline" (unchanged) |
| Cancelled/interrupted | 1–603 | "n/604 downloaded" + "Resume download" |
| Interrupted with real fetch failures | 1–603, `failed > 0` | same as above + "some pages couldn't be downloaded" |
| Download in progress | — | Progress bar (unchanged) |

Resume works today at the protocol level with no change: `START_PRECACHE` re-runs `precacheAllPages`, and `ensureCached` skips any font/JSON already in the cache — a cancelled run resumes from where it stopped, it's only the Settings UI that currently can't tell the difference from "nothing downloaded."

## Verified Test Cases

Walked through with the user (2026-08-12):

- Never-visited page tapped from the nav sidebar while offline, reader already open → row 2, instant client-side jump, works regardless of whether that page was ever swiped to.
- Never-visited page tapped from the home page while offline → row 4, brief page-1 flash then corrects to the tapped page (if its JSON is cached) — accepted trade-off, not eliminated (mirrors the first-run gate's own post-round-trip flash, Addendum 2).
- Fresh install, never opened online, opened offline → row 5, falls back to page 1 (no last-read page exists yet).
- User cancels a download at 312/604 → sentinel not written, `failed` stays 0, Settings shows "312/604 downloaded" + "Resume download"; tapping it fetches only the remaining 292 pages.
- A run has genuine fetch failures (not a cancel) → Settings additionally notes some pages couldn't be downloaded, per the `failed` count already plumbed through `PRECACHE_PROGRESS`.
- Installed on Android (`display: "fullscreen"` in effect) → Settings row now renders; first-run gate now fires on a fresh install.

## Files to Change

Actual files touched during implementation (supersedes the draft list from planning — `use-quran-page.ts` itself needed no change; the offline-unavailable signal is computed where the query result already lives, in `ReaderPager`'s `Panel`, and threaded down as a prop instead):

- `app/hooks/use-pwa-precache.ts` — `isStandaloneDisplayMode()` also checks `matchMedia("(display-mode: fullscreen)")`.
- `app/constants/offline.ts` — `FALLBACK_LOCALES`, `fallbackDocumentUrl()`.
- `app/sw.ts` — `serwist.setCatchHandler(...)` serves the precached fallback document for a failed navigation request; a new `install` listener precaches `/{locale}/pages/1` (both locales) independent of the bulk download.
- `app/contexts/ReaderNavigationContext.tsx` — new. Exposes `jumpTo`, published by `ReaderPager` while mounted.
- `app/[locale]/layout.tsx` — mounts `ReaderNavigationProvider`.
- `app/components/reader/ReaderPager.tsx` — registers `jumpTo` into the new context; on mount only, compares `window.location.pathname` against its SSR-seeded `initialPage` and self-corrects via `jumpTo` to the real requested page (reader-path mismatch) or the last-read page (any other path — the fallback served for a failed `/` or `/{locale}`).
- `app/components/SurahListItem.tsx`, `app/components/RubList.tsx`, `app/components/nav/ContinueReadingLink.tsx` — read `jumpTo` from `ReaderNavigationContext`; on a plain click (no modifiers), `preventDefault` and call it instead of letting the `<Link>` navigate. Falls back to normal navigation when no pager is mounted.
- `app/components/reader/QuranSpread.tsx`, `app/components/QuranSafha.tsx` — thread an `unavailableOffline` flag (derived from `usePage`'s `isPaused`/`isError` in `Panel`, since React Query's default `networkMode` pauses rather than errors a query made while offline) down to where the skeleton renders; shows a "not available offline" notice layered over the existing skeleton bars (not replacing them, to preserve their layout-height role) instead of spinning forever.
- `app/components/offline/OfflineAccessSection.tsx` — `OfflineEditionRow` distinguishes `cached === 0` ("Download") from `0 < cached < total` ("n/total downloaded" + "Resume download"), and surfaces `failed > 0` via the existing `partialBody` copy.
- `messages/en.json`, `messages/ar.json` — `offline.resumeProgress`, `offline.resume`, `offline.notAvailableOffline`.
- `docs/architecture/adr/0014-pwa-offline-architecture.md` — Addendum 3 (written during planning).
- `docs/architecture/DECISIONS.md` — PWA section amended (written during planning).
- `docs/architecture/COMPONENTS.md` — `ReaderNavigationContext` entry; `ReaderPager`/`OfflineAccessSection` entries updated.

## Constraints

- The fallback document must stay tiny and must not depend on `isCacheComplete`/the bulk download having run — it has to work on a fresh install before any consent-gated download exists.
- `isStandaloneDisplayMode()` must be the single place every offline surface checks — do not let a component re-derive display-mode detection independently, or this exact drift (manifest changes, gate doesn't) recurs.
- Sidebar/rub/Continue-Reading navigation must still fall back to a normal `<Link>` when no `ReaderPager` is mounted (home page, marks, settings) — `jumpTo` only exists once the pager is live.
- Do not bulk-precache all 604 pages' HTML to sidestep the fallback-document design — that reopens the ~1.5 GB cost the original decision rejected.

## What NOT to Do

- Do not make the offline navigation fix depend on completing the 48 MB bulk download first — bugs 1 and 2 must be fixed for a fresh install too.
- Do not treat the fullscreen-detection bug as "working as designed" — it's a genuine regression from the later fullscreen-mode change, not an intentional gate.
- Do not silently reinterpret "Resume download" as starting over — the SW's existing `ensureCached` skip-if-cached behavior must be preserved; this task only changes what Settings displays, not the resume mechanics.

## Decisions Made

- Full offline support: any of the 604 precached pages must open offline even if never previously visited/swiped to (not just the last-read page) — user confirmed 2026-08-12.
- The offline indicator/download button stays in the Settings sidebar (not the nav surah/rub sidebar) — user confirmed 2026-08-12; the existing `OfflineAccessSection` location is correct, its non-appearance was the fullscreen-detection bug, not a placement problem.
- A brief page-1 flash before `jumpTo` corrects to the requested page is accepted, not solved further — inherent to any fallback-document approach, and consistent with the first-run gate's own accepted round-trip flash (Addendum 2).

---

# Addendum 4 (2026-08-15): CacheFirst reader HTML + route-aware offline fallback

**Type:** bug
**Status:** implemented (lint + typecheck + full `build:local` production build verified; not yet
browser/offline-verified — see Manual Verification below)
**Trello:** https://github.com/furqan-app/web/issues/312 (#312)
**ADR:** [0014 Addendum 4](../architecture/adr/0014-pwa-offline-architecture.md)

## Manual Verification

Not exercised in a browser this session. `npx tsc --noEmit`, `npm run lint`, and
`npm run build:local && next build` all pass clean, and the built `public/sw.js` was directly inspected
to confirm: `offline-ar.html`/`offline-en.html` are in the precache manifest; the reader-HTML cache name
resolves to a real computed hash (not the `"dev"` fallback); `CacheFirst` with the `request.mode ===
"navigate"` guard is in place. Per `docs/standards/pwa-testing.md`, none of this is reachable via
`npm run dev` (Serwist is disabled there) — verify with `npm run build:local && npm start`:

- Load a reader page while online, go offline, reload it → served instantly from
  `reader-html-{hash}` (`CacheFirst`), no network wait.
- Deploy again (or force a manifest change) and confirm the reader page's HTML actually updates on the
  next online load rather than staying pinned to the old cached response.
- Trigger a `controllerchange` (e.g. update `public/sw.js` and reload) and confirm the banner appears,
  "Refresh" reloads onto the new version, and "Later" dismisses without reloading.
- Go offline and navigate to a non-reader route with no prior cache entry (e.g. `/plans` cold) →
  confirm the new `offline-{locale}.html` renders, not Quran page 1.
- Confirm the existing reader offline-navigation fallback (Addendum 3: page-1 fallback + pre-paint
  `jumpTo` self-correction, ADR 0042) still works unchanged.

## Summary

Two reports bundled under one card:

1. A user with the full 48 MB offline download already in place still saw slow/broken reader loads on
   3G — the JSON+font content being local doesn't help when the reader-page *document* itself
   (`isSelfReaderPage`) is `NetworkFirst` with no timeout, so a slow-but-working connection just hangs
   instead of falling back.
2. `setCatchHandler` is global and always serves the Quran page-1 fallback document for *any* failed
   navigation, including non-reader routes. Offline, a failed nav to `/plans` (or any other DB-backed
   route) shows Quran page 1's content at that URL with no way to self-correct — unlike the reader
   route, there is no `jumpTo`-equivalent for these routes, so the user is stuck looking at the wrong
   app entirely.

## Root Cause / Approach

**(1)** Timeout-tuning `NetworkFirst` was considered first and rejected: it still leaves every reader
load waiting up to the timeout on a real 3G connection, and a timeout short enough to feel fast (2-3s)
would fire on almost every 3G load of a reader page, since that route's SSR HTML is ~2.6 MB — at the Fast
3G throughput already measured for this app (~195 KB/s, `fix-page-turn-blank-slow-network.md`), that's
~13s of pure transfer. The chosen approach instead restores `CacheFirst`'s actual speed — instant
regardless of connection quality — while specifically avoiding Addendum 1's original failure mode. Full
mechanism and the risks found while designing it (independently, by two separate reviews — a fresh
Sonnet agent and a Codex CLI review) are recorded in ADR 0014 Addendum 4; summarized in the decision
tree below.

**(2)** `serwist.setCatchHandler` never distinguished which route the failed navigation was for. Made
route-aware: reader-page paths keep the existing Quran page-1 fallback + `jumpTo` self-correction
(Addendum 3, unaffected); every other path gets a new, small, dedicated offline-fallback document.

## Decision Tree / Algorithm

### Reader-page HTML caching

| Piece | Before | After |
|---|---|---|
| Strategy | `NetworkFirst`, no timeout | `CacheFirst` |
| Cache name | `pages-v{N}` (`PAGES_CACHE_VERSION`, manually bumped) | `reader-html-{hash}` (auto — a checksum of Serwist's own `self.__SW_MANIFEST` precache manifest, which changes on every real deploy; a webpack `DefinePlugin` build-stamp was tried first per the original plan and silently didn't work, see ADR 0014 Addendum 4's Implementation Note) |
| Matcher | `url.pathname` only | adds `request.mode === "navigate"` guard, so RSC-flagged fetches to the same path fall through to `defaultCache`'s own RSC rule instead of being swallowed here |
| `activate` | none | new listener deletes stale `reader-html-*` caches; must not touch `pages-v{N}` |
| `skipWaiting`/`clientsClaim` | `true`/`true` | unchanged |
| Update visibility | none | `controllerchange` listener → "new version available" banner → tap → reload (prompt, not silent — avoids losing reading scroll position) |
| Offline-nav fallback doc (`/{locale}/pages/1`) | precached into `pages-v{N}` at `install` | moves to `reader-html-{hash}`, so it also auto-refreshes per deploy instead of being cached once and never revalidated |

### `setCatchHandler` routing

| Failed navigate request | Today | After |
|---|---|---|
| `/{locale}/pages/{id}` (reader) | Quran page-1 fallback, `jumpTo` self-corrects pre-paint (ADR 0042) | unchanged |
| `/`, `/{locale}` (home) | Quran page-1 fallback shown, stuck | new dedicated offline-fallback document |
| any other route (`/plans`, `/settings`, …) | Quran page-1 fallback shown, stuck | new dedicated offline-fallback document |

New fallback document: static files (`public/offline-ar.html` / `public/offline-en.html`), same pattern
as `launch.html` (ADR 0042) — no React runtime, no CDN-poisoning exposure, byte-identical per locale,
trivially precached via `globPublicPatterns`. Locale picked the same way `fallbackDocumentUrl()` already
resolves it. No self-correction is possible for these routes (no `jumpTo`-equivalent for `/plans`, etc.)
— this is a terminal "can't load this page, check your connection" state, not a flash-then-corrects one.

## Verified Test Cases

Walked through across two independent reviews (fresh Sonnet agent, then a Codex CLI review with direct
read access to `app/sw.ts`/ADR 0014/DECISIONS.md) before this was locked in:

- **Repeat visit to a previously-cached reader page, any connection speed** → instant from
  `reader-html-{hash}`, no network round-trip.
- **First visit to a reader page after a fresh deploy** → cache miss on the new build stamp → network
  fetch (same speed characteristics as today's `NetworkFirst`) → cached for every subsequent load until
  the next deploy.
- **Soft-nav (sidebar/rub tap) to an unmounted reader page** → `RSC: 1` header present → `request.mode
  !== "navigate"` → falls through to `defaultCache`'s RSC rule, not `isSelfReaderPage` → no risk of RSC
  flight-data getting cached as if it were a document response (the bug Codex's review caught).
- **A user reopens/backgrounds-then-foregrounds the installed PWA for a long session without a fresh
  navigation** → `clientsClaim` alone doesn't force a new request, so the reader-HTML document handler
  may not fire again all session → the `controllerchange` banner is what actually bounds this, not the
  versioning alone (the gap the Sonnet review caught) — user sees the banner once the new SW has taken
  control, taps to refresh.
- **A deploy lands and the very first cache-populating fetch for a page happens to hit Hostinger's CDN
  inside its 5-minute post-deploy staleness window (ADR 0035)** → that stale-but-recent response gets
  pinned in `reader-html-{hash}` for the rest of the deployment's lifetime, not just 5 minutes —
  accepted residual risk, not fixed further here (see ADR 0014 Addendum 4).
- **Offline nav to `/plans` from a never-visited state** → today: Quran page 1 shown, stuck. After: the
  new offline-fallback document, no wrong-app content shown.
- **Offline nav to a reader page** → unchanged from Addendum 3 — Quran fallback + pre-paint `jumpTo`
  self-correction (ADR 0042), not touched by this addendum.
- **Marks** → untouched. `/api/*` routes are a separate matcher (`defaultCache`'s `apis` rule, already
  timed at 10s) and marks are online-only by explicit design (Constraints, above) — nothing in this
  addendum changes that.

## Files to Change

Actual files touched during implementation (supersedes the draft list from planning — the cache-name
mechanism changed from the planned webpack `DefinePlugin` build-stamp to a hash of Serwist's own precache
manifest; see ADR 0014 Addendum 4's Implementation Note for why):

- `app/sw.ts`
  - `isSelfReaderPage`'s rule: `NetworkFirst` → `CacheFirst`; cache name `READER_HTML_CACHE_NAME`
    (`reader-html-{hash}`, derived locally from `self.__SW_MANIFEST`, captured once as `precacheManifest`
    since InjectManifest requires that exact global be referenced exactly once in the source); matcher
    gains `request.mode === "navigate"`.
  - New `hashString` helper — cheap non-cryptographic checksum, no new dependency.
  - New `activate` listener: deletes cache names matching the `reader-html-` prefix other than the
    current `READER_HTML_CACHE_NAME`. Does not touch `PAGES_CACHE_NAME`.
  - `install` listener: fallback-document precache (`fallbackDocumentUrl`) moves from `PAGES_CACHE_NAME`
    to `READER_HTML_CACHE_NAME`.
  - `setCatchHandler`: branches on `isSelfReaderPage(url)` — reader paths keep the existing fallback
    (now read from `READER_HTML_CACHE_NAME`); everything else serves the new `offlineFallbackUrl(locale)`
    document via `serwist.matchPrecache`.
- `app/constants/offline.ts` — `offlineFallbackUrl(locale)` alongside the existing
  `fallbackDocumentUrl(locale)`. (`READER_HTML_CACHE_NAME` ended up SW-only — nothing client-side needs
  it, so it's declared directly in `app/sw.ts` rather than re-exported here.)
- `next.config.mjs` — `offline-ar.html`/`offline-en.html` added to `globPublicPatterns` alongside the
  existing app-shell entries. (The planned `webpackCompilationPlugins`/`DefinePlugin` addition was tried,
  found not to work, and removed rather than left in — see ADR 0014 Addendum 4.)
- `middleware.ts` — `offline-ar.html`/`offline-en.html` added to the `intl-middleware` matcher exclusion
  list, the same trap `launch.html` and the PWA icons hit before (ADR 0042; `pwa-offline-support.md`
  Addendum 1).
- `public/offline-ar.html`, `public/offline-en.html` — new. Static, no build step, same pattern as
  `public/launch.html` (ADR 0042).
- `app/hooks/use-sw-update.ts` — new. Listens for `controllerchange`, ignoring the first one for a given
  page load (that fires on a tab's initial SW activation too, not just an update); exposes
  `{ updateAvailable, reload }`.
- `app/components/offline/SwUpdateBanner.tsx` — new. Full-width top bar (every other fixed PWA surface
  anchors a bottom corner, so this needed no offset coordination with them); "Refresh" reloads, "Later"
  dismisses for the session without reloading.
- `app/[locale]/layout.tsx` — mounts `<SwUpdateBanner />` alongside the existing offline surfaces.
- `messages/en.json`, `messages/ar.json` — new `swUpdate.*` namespace (no ICU placeholders, so the
  project's `use-translations` wrapper is safe to use here per `docs/standards/i18n.md`).
- `docs/architecture/adr/0014-pwa-offline-architecture.md` — Addendum 4, plus an Implementation Note
  added post-build.
- `docs/architecture/DECISIONS.md` — PWA section amended.

## Constraints

- `PAGES_CACHE_VERSION`/`PAGES_CACHE_NAME` stay scoped to font/JSON data-shape changes only — do not
  fold the reader-HTML cache into it, and do not let `BUILD_STAMP` influence it either. The two must
  bump independently: a deploy always changes `BUILD_STAMP`, but must not force-invalidate the 48 MB
  user download or re-trigger its consent gate.
- The `activate` cleanup must match on the `reader-html-` prefix only — it must never delete
  `PAGES_CACHE_NAME`, any Serwist-managed precache cache, or a cache it doesn't recognize.
- The update banner must prompt, never silently reload — a silent reload mid-reading loses scroll
  position (Decisions Made, ADR 0014 Addendum 4).
- The new offline-fallback documents must stay static (no React runtime), matching `launch.html`'s
  rationale: no CDN-poisoning exposure, byte-identical per user, trivially precached.
- Marks (`/api/*`) are untouched by this addendum — do not add a `networkTimeoutSeconds` or strategy
  change to the `apis` matcher as part of this work; out of scope.

## What NOT to Do

- Do not manually bump a version number for the reader-HTML cache — that's exactly the mistake
  Addendum 1's incident traces back to (a version string that's easy to forget to bump). `BUILD_STAMP`
  must be automatic.
- Do not flip `skipWaiting`/`clientsClaim` to gate SW activation behind user consent. Considered and
  rejected — SW updates are all-or-nothing for the whole app, so that would gate every future fix (not
  just reader HTML) behind a manual tap. See ADR 0014 Addendum 4.
- Do not attempt to defeat the Hostinger CDN-staleness residual risk with a cache-busting query
  parameter on the SW's populate-fetch — already proven not to work against this CDN specifically
  (`fix-rsc-cache-poisoning.md`: Hostinger strips query params from its cache key).
- Do not widen the timeout-tuning approach for `isSelfReaderPage`/RSC/RSC-prefetch that was explored
  earlier in this task's investigation — superseded by the `CacheFirst` direction above. (RSC-prefetch's
  own missing timeout in `defaultCache` remains a real, separate gap, but is out of scope here — it
  isn't on the reader's critical path the way `isSelfReaderPage` was.)
- Do not give the new non-reader offline-fallback document any self-correction/`jumpTo`-equivalent
  logic — there is nothing route-specific to correct *to* for `/plans` or `/settings`; it is a terminal
  state, not a flash-then-corrects one.

## Decisions Made

- **`CacheFirst` + auto-versioned cache + update banner, over timeout-tuned `NetworkFirst`** — user
  confirmed 2026-08-15, after two independent second opinions (fresh Sonnet agent, then Codex CLI)
  weighed both directions.
- **`skipWaiting`/`clientsClaim` stay unchanged, no app-wide consent gate** — user confirmed 2026-08-15,
  after the app-wide-gating alternative was raised and found unnecessary given the `controllerchange`-
  banner approach achieves the same freshness guarantee without it.
- **The Hostinger CDN-staleness residual risk is accepted, not further mitigated** — user confirmed
  2026-08-15, after it was found by an independent Codex review and weighed explicitly against reverting
  to timeout-tuned `NetworkFirst`.
- **Route-aware `setCatchHandler`, not proactive `navigator.onLine` detection, as the primary fix for
  non-reader routes** — the independent Sonnet review recommended this specifically: `navigator.onLine`
  is unreliable (false positives on captive portals) and doesn't cover slow-but-connected cases, which
  the catch handler already covers regardless of cause. A proactive online/offline banner remains
  possible future polish, not attempted here.
