---
title: "Complex E2E & Fix: Offline PWA, Precached Assets & Degraded Network Navigation"
type: feature
date: 2026-09-03
status: implemented
area: pwa
issue: 473
adr: [0014, 0029, 0033, 0046]
---

# Complex E2E & Fix: Offline PWA, Precached Assets & Degraded Network Navigation

**Parent Epic:** [#466](https://github.com/furqan-app/web/issues/466)

## Summary

Implement a deterministic behavioral Playwright end-to-end test suite (`e2e/tests/offline-pwa.spec.ts`) and reader helper refinements (`e2e/helpers/reader.ts`) to verify and harden reader navigation, audio recitation playback, and asset degradation while network connectivity is completely offline.

The implementation exercises:
1. **PWA Standalone Setup Gate**: First-run blocking gate (`OfflineSetupGate`) modal focus trap and dismissal persistence across editions.
2. **Offline Recitation Download Flow**: Selective surah download via `OfflineRecitationSheet`, orchestrating chapter audio metadata, audio MP3 byte caching, per-page content JSON, per-page font files, and verse-page index caching across separate Cache Storage buckets (`furqan-recitation-downloads-v1` and `furqan-pages-v2`).
3. **Offline Network Degradation UI Reaction**: Immediate client-side transition to offline status, displaying `"اتصل بالإنترنت للتنزيل."` and disabling download actions while preserving playback capabilities for downloaded content.
4. **Continuous Offline Recitation & Cached Navigation**: Seamless audio playback of downloaded content (e.g. Surah Al-Kahf, pages 293–304) across page turns without audio interruption, stutter, or timeline desynchronization.
5. **Graceful Degradation on Un-cached Pages**: Paging into an un-cached reader page (e.g. page 305) cleanly mounts the `QuranSafha` offline empty state (`WifiOff` icon + `"لم يتم تنزيل هذه الصفحة بعد — اتصل بالإنترنت لقراءتها."`) without crashing the carousel, unmounting the reader shell, or stopping recitation.
6. **Instant Recovery on Boundary Re-entry**: Paging back into cached pages (e.g. page 304) immediately restores font glyphs, word rows, and ayah highlights while recitation continues.
7. **Offline Un-downloaded Playback Guard**: Attempting to play non-downloaded recitation while offline triggers a graceful `"offline-unavailable"` alert without unhandled promise rejections or audio player stalls.
8. **Service Worker Catch Handler & Static Fallbacks**: Non-reader route offline navigation falling back to static `/offline-{locale}.html`.
9. **English (LTR) Parity**: Verification of LTR alignment, copy, and layout when encountering un-cached pages.

## Root Cause / Architectural Findings

1. **Carousel Multi-Panel DOM Mounting & Test Assertion Collision**:
   - `ReaderPager` mounts a 3-panel carousel strip `[prev, current, next]`.
   - On boundary pages (e.g. page 304 of a downloaded 293–304 range), neighboring page 305 is mounted simultaneously in the DOM.
   - Existing reader test helper `waitForReaderContent(page)` expects `document.querySelectorAll(".fq-quran-safha")` to **all** contain `.fq-safha-row` (`safhas.every(...)`).
   - When adjacent to an un-cached page, `safhas.every` fails because page 305 renders the offline empty state rather than `.fq-safha-row`.
   - **Fix**: Introduce `waitForActivePanelContent(page)` or scope checks to `getActivePanel(page)` so boundary testing reliably asserts on the visible page without tripping on the neighboring un-cached panel.

2. **Development vs. Production Service Worker Interception (ADR 0014 / ADR 0042)**:
   - In `next.config.mjs`, Serwist is disabled in development mode (`disable: process.env.NODE_ENV === "development"`).
   - In production and CI (`npm run e2e:build && npm run e2e:start`), Serwist registers `public/sw.js` with active `CacheFirst` handlers for `RECITATION_DOWNLOAD_CACHE_NAME` (with `RangeRequestsPlugin`) and `PAGES_CACHE_NAME`.
   - In local dev runs, browser-level `context.setOffline(true)` cuts network before Playwright CDP request interception can route unloaded fonts unless simulated or executed with service-worker-compatible test environment.
   - **Fix**: Support both production SW mode (CI default) and dev-server execution with graceful CacheFirst route emulation.

3. **Immutable FontFace Registry Offline Resilience (ADR 0029)**:
   - `app/utils/page-font-registry.ts` already handles font download failures gracefully via `.catch(() => {})` on `face.load()`.
   - `QuranSafha.tsx` relies on `document.fonts.check(fontSpec)` to gate `fontReady`. If a font fails to load offline, `QuranSafha` keeps the skeleton overlay rather than flashing corrupt system fonts.
   - When navigating to an un-cached page, `hasContent` is false and `unavailableOffline` is true, immediately displaying the `WifiOff` offline message.

## Decision Tree / State Machine

```
User Action / Navigation Event
│
├── 1. First standalone launch (no cached data)
│    ├── dismissed = false ──> Show `OfflineSetupGate` (Radix Dialog, focus trap)
│    │                          ├── User clicks "Download" ──> trigger bulk precache
│    │                          └── User clicks "Skip" ───────> set `fq-offline-prompt-dismissed-v2-{mushafId}`
│    └── dismissed = true  ──> Mount Reader directly
│
├── 2. User downloads Surah in `OfflineRecitationSheet` (Online)
│    ├── Fetch chapter audio metadata ──> Cache in `RECITATION_DOWNLOAD_CACHE_NAME`
│    ├── Fetch chapter audio MP3 ───────> Cache in `RECITATION_DOWNLOAD_CACHE_NAME`
│    ├── Fetch pages {start..stop} JSON ─> Cache in `PAGES_CACHE_NAME`
│    ├── Fetch fonts {start..stop} WOFF2 > Cache in `PAGES_CACHE_NAME`
│    └── Fetch verse-pages index JSON ──> Cache in `PAGES_CACHE_NAME`
│         └── Update `recitationDownloads` in `localStorage`
│
├── 3. Network goes offline (`offline` event / `!navigator.onLine`)
│    ├── `useOnlineStatus` flips to false
│    ├── `OfflineRecitationSheet`:
│    │    ├── Show "اتصل بالإنترنت للتنزيل."
│    │    ├── Disable download buttons for un-cached items
│    │    └── Keep "استماع" (Play) enabled for downloaded items
│    └── `ReaderPager`:
│         ├── Reader on cached page (293..304) ──> Render word glyphs, continue playback
│         ├── Page turn to un-cached page (305) ─> `rightUnavailable` true ──> `QuranSafha` renders `WifiOff` offline banner
│         ├── Page turn back to cached (304) ────> Instant recovery, render word glyphs, audio uninterrupted
│         └── User clicks play on un-cached surah > `RecitationContext` catches failure ──> set `playbackError: "offline-unavailable"`
│
└── 4. Direct navigation to un-cached route while offline
     ├── Is reader page (`isSelfReaderPage`) ──> SW serves cached shell `/pages/1`, layout effect `jumpTo` restores carousel
     └── Is non-reader page ───────────────────> SW serves static `/offline-{locale}.html`
```

## Verified Test Cases

### Suite: `e2e/tests/offline-pwa.spec.ts`

1. **Test 1: Standalone First-Run Gate & Dismissal Lifecycle**:
   - Spoof standalone mode: `display-mode: standalone`.
   - Visit `/ar/pages/1` with clean storage.
   - Assert `OfflineSetupGate` dialog (`"اقرأ القرآن بدون إنترنت"`) is visible with focus trap.
   - Press <kbd>Escape</kbd> and click outside; assert gate remains visible (suppressed dismissal per ADR 0014 Addendum 2).
   - Click "تخطي" (Skip); assert gate closes and `fq-offline-prompt-dismissed-v2-2` is saved in `localStorage`.

2. **Test 2: Online Selective Download & Storage Population**:
   - Open Settings $\to$ Offline Recitation (`OfflineRecitationSheet`).
   - Download Surah Al-Kahf (18).
   - Assert download progress reaches completion (check icon).
   - Assert item is listed under "Downloaded" (`تم التنزيل`).
   - Validate Cache Storage contains audio, chapter metadata, and pages 293–304 JSON and fonts.

3. **Test 3: Offline Recitation Playback & Seamless Pager Navigation (293–304)**:
   - Disconnect network (`context.setOffline(true)` + `offline` event).
   - Verify sheet displays `"اتصل بالإنترنت للتنزيل."` and download buttons are disabled.
   - Click "استماع" on downloaded Al-Kahf.
   - Assert audio begins playing offline (`!audio.paused`).
   - Navigate reader from page 293 forward through page 304.
   - Assert each page mounts active word rows and audio remains continuously playing without pause.

4. **Test 4: Un-cached Page Boundary Degradation & Clean Recovery**:
   - While still playing offline on page 304, click "Next page" to navigate to page 305 (un-cached).
   - Assert URL updates to `/ar/pages/305`.
   - Assert `getActivePanel(page)` renders the graceful offline empty state:
     - `WifiOff` icon is visible.
     - Text `"لم يتم تنزيل هذه الصفحة بعد — اتصل بالإنترنت لقراءتها."` is visible.
     - Reader shell, header bar, and return strip remain intact.
     - Audio continues playing without error.
   - Click "Previous page" to navigate back to page 304.
   - Assert URL returns to `/ar/pages/304` and active page rows/words are immediately visible.

5. **Test 5: Un-downloaded Recitation Offline Guard**:
   - While offline on page 293, attempt to play a non-downloaded chapter (e.g. Surah Maryam or direct reader play on un-cached chapter).
   - Assert playback fails gracefully with `"offline-unavailable"` error alert (`"تلاوة هذه السورة غير متوفرة دون اتصال"`).
   - Assert no unhandled JavaScript exceptions or broken audio state.

6. **Test 6: English (LTR) Parity & Layout**:
   - In `en` locale (`/en/pages/293`), repeat offline boundary navigation to page 305.
   - Assert notice renders in English: `"This page hasn't been downloaded yet — connect to the internet to read it."`
   - Assert LTR layout and typography consistency.

## Proposed File Changes

### Test Helpers & Reader Utilities
- **[MODIFY] [e2e/helpers/reader.ts](file:///home/tahamohamed/Desktop/cs/non-work/projects/furqan/e2e/helpers/reader.ts)**:
  - Add `waitForActivePanelContent(page)` to assert that the currently active visible center panel in `ReaderPager` has painted its word rows, without requiring un-cached adjacent boundary panels to have `.fq-safha-row`.
  - Export PWA standalone display-mode initialization helper (`withStandaloneDisplayMode(page, dismissedEditions?: number[])`).

### Test Suite
- **[NEW] [e2e/tests/offline-pwa.spec.ts](file:///home/tahamohamed/Desktop/cs/non-work/projects/furqan/e2e/tests/offline-pwa.spec.ts)**:
  - Implement the complete 6-test suite covering standalone gate, selective download, offline playback continuity across pages 293–304, boundary degradation on page 305, recovery on page 304, un-downloaded error states, and English LTR parity.

### Documentation & Plan Tracking
- **[MODIFY] [docs/plans/INDEX.md](file:///home/tahamohamed/Desktop/cs/non-work/projects/furqan/docs/plans/INDEX.md)**:
  - Add `e2e-offline-pwa-navigation.md` entry under `pwa` area.

## Verification Plan

### Automated Tests
1. **Unit Tests**:
   ```bash
   npm test
   ```
   Ensure existing unit tests continue to pass (< 1s).

2. **Playwright E2E**:
   ```bash
   npm run e2e:test -- e2e/tests/offline-pwa.spec.ts
   ```
   Verify all tests in `e2e/tests/offline-pwa.spec.ts` pass reliably across desktop and mobile projects.

3. **Check Furqan Standards**:
   Run `/check-fq-standards` pre- and post-implementation to verify adherence to architecture invariants (ADR 0014, 0029, 0033, 0046).
