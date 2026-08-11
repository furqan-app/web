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
