# ADR 0046: Offline recitation audio via explicit per-surah/juz download, reusing the page cache and the wird override mechanism

**Date:** 2026-08-17
**Status:** Accepted

## Context

Recitation audio (ADR 0021) streams live from QDC's audio CDN (`download.quranicaudio.com`) — a runtime dependency with no offline path. The existing offline architecture (ADR 0014) only covers Quran page JSON + fonts, gated to the installed PWA, downloaded in one all-or-nothing 48MB pass. Users want to pick a surah or juz, download its recitation ahead of time, and listen to it later without a connection. Recitation also now hard-stops when leaving any `/pages/` route (ADR 0021's 2026-08-02 addendum) — offline playback therefore always happens while the reader is visible, so an audio-only download is not self-contained: the recited pages must also render offline.

## Options Considered

**Option A — Audio-only download, require the existing bulk page/font download as a prerequisite**
Smaller download, but ties two otherwise-independent user actions together with no way to reason about "did I actually get offline reading for this surah" short of checking whether the *other* feature was ever completed.

**Option B — Self-contained per-surah/juz download (chosen)**
Bundle that surah/juz's audio, verse-timing metadata, and its own reader pages (JSON + font) into one user-initiated download. Reuses the existing `PAGES_CACHE_NAME` cache for the page assets (so a page cached by either this feature or the full bulk download serves both, no duplication) and adds a new cache for audio + recitation metadata.

**Option C — Auto-cache whatever the user streams live, no explicit "download" step**
Simplest UX on paper, but reintroduces exactly the silent/unbounded-transfer problem ADR 0014's Addendum 2 explicitly moved away from (consent-gated, user-initiated downloads only).

## Decision

Option B. A new "Offline Recitation" surface (Settings-only, standalone-PWA-gated) lets the user pick a reciter and download a surah or a whole juz. Each download:

- Fetches the chapter's audio MP3 directly from the QDC CDN and the two existing same-origin JSON routes (`/api/quran/recitations/{reciterId}/chapters/{chapterId}`, `/api/quran/chapters/{chapterId}/verse-pages`), writing all three into a new `recitation-download-v{N}` cache via a plain client-side `fetch` + `cache.put()` loop — no service-worker message-passing needed, since (unlike the 604-page bulk walk) a single chapter's download is short enough to not need to survive the tab backgrounding.
- Resolves and caches that chapter's reader pages (JSON + font) into the **existing** `PAGES_CACHE_NAME` — the same cache the bulk download uses.
- For a juz, first resolves the juz's exact verse/chapter bounds from the `Rub` table (a juz is 8 consecutive rubs; `RubVerseMapping` already gives each rub's chapters) via a new `GET /api/quran/juz/[juzNumber]/bounds` route, then downloads every whole chapter the juz touches.

A new service-worker runtime-caching rule (`CacheFirst` + `RangeRequestsPlugin`, both already part of the `serwist` package this app uses) matches the QDC audio CDN host — confirmed live to send `access-control-allow-origin: *` and `accept-ranges: bytes`, so a fully-cached response can serve real byte-range `<audio>` seeks offline. This makes offline audio playback transparent to `RecitationContext`: `audio.src` is set to the same live QDC URL as always, and the service worker serves it from cache when present — no branching added to the playback code path itself.

Playing a downloaded item reuses the existing `PlaybackOverride` mechanism built for listening-wird (`docs/plans/listening-wird-inline-playback.md`): the start/stop verse bounds are computed once at download time and stored, so playback never needs a live stop-point DB lookup, and the existing cross-chapter chaining logic (ADR 0021's 2026-07-16 addendum) handles a juz spanning multiple chapters with no new logic.

A `localStorage` registry (list of `{reciterId, chapterId, pages[], sizeBytes, downloadedAt}`) tracks what's been downloaded — deriving this from `cache.keys()` alone (as the bulk-download's `isCacheComplete` does) isn't enough here, since nothing in the cache says *which* chapters were deliberately downloaded versus opportunistically present. Deleting a download reference-counts page assets against every other still-downloaded item, and never touches a page if the full 604-page bulk cache is already complete (that guarantee belongs to the other feature and must not regress because this one's registry shrank).

## Consequences

- **+** Reuses three already-proven mechanisms wholesale — `PAGES_CACHE_NAME`, `PlaybackOverride`, cross-chapter chaining — instead of building parallel versions of any of them.
- **+** Zero changes to `RecitationContext`'s actual audio-loading code path; the service worker's cache-first rule makes offline/online indistinguishable to the player.
- **+** Self-contained: downloading a surah/juz never requires the user to have separately completed the full-Quran page/font download.
- **-** Page-asset deletion requires reference-counting across every downloaded recitation item (and deferring to the bulk-cache sentinel) — real branching logic, not a bare cache-name delete.
- **-** A second, feature-specific cache (`recitation-download-v{N}`) plus a `localStorage` registry is more moving parts than either existing offline system alone; justified because audio downloads are per-item and reciter-scoped in a way the all-or-nothing bulk page cache is not.
- **-** Offline playback of a non-downloaded surah/juz still fails (network error surfaced as a "not downloaded" notice) — this ADR does not add any general "cache whatever you stream" fallback.
