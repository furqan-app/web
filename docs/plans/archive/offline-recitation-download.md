---
title: Offline Recitation Audio Download
type: feature
date: 2026-08-17
status: implemented
area: recitation
adr: [0046]
---

# Offline Recitation Audio Download

## Summary

Let users download a surah's or a whole juz's recitation audio (for a chosen reciter) on the installed PWA, so it plays back later without a connection. Settings gains an "Offline Recitation" row opening a dedicated sheet: a reciter picker, By Surah / By Juz lists each with a per-row download control, and a Downloaded section listing what's cached with a delete action. Downloads are **self-contained** — each one also caches that content's reader pages, so it doesn't require the separate full-Quran page/font download first. Reuses three already-proven mechanisms wholesale: the existing `PAGES_CACHE_NAME` page/font cache, the `PlaybackOverride` mechanism built for listening-wird, and the existing cross-chapter chaining logic.

## Approach

**Audio caching, transparently.** QDC's audio CDN (`download.quranicaudio.com`, confirmed live) sends `access-control-allow-origin: *` and `accept-ranges: bytes` for every reciter tested. A new service-worker runtime-caching rule (`CacheFirst` + `RangeRequestsPlugin`, both already part of the `serwist` package) matches that host. `RecitationContext`'s existing `audio.src = chapterAudio.audioUrl` line is untouched — the service worker serves it from cache when present, live otherwise. The same-origin JSON route recitation already calls for chapter audio (`/api/quran/recitations/{reciterId}/chapters/{chapterId}`) gets its own dedicated `CacheFirst` rule for the same reason: `fetchChapterAudio()` inside `play()` needs zero changes to work offline for a downloaded item. Verse→page resolution (`getVersePages()` inside `RecitationContext`) does **not** call a per-chapter API route — it fetches one static per-edition file (`/quran/verse-pages/{mushafId}.json`, ~73KB, ADR 0033), which already has its own `CacheFirst` rule under the existing `PAGES_CACHE_NAME` (found during implementation — the plan's original assumption of a per-chapter verse-pages API route was stale, that route was removed when mushaf editions shipped). A download only needs to ensure this one shared file is cached once, not per-chapter.

**The download action itself** is a plain client-side `fetch` + `cache.put()` sequence (a new hook), not routed through service-worker message-passing — unlike the 604-page bulk walk, a single chapter's download is short enough to not need to survive tab backgrounding.

**Playback of a downloaded item** reuses `play(verseKey, overrides: PlaybackOverride)` — the exact mechanism `listening-wird` already uses (`docs/plans/listening-wird-inline-playback.md`). Start/stop verse bounds are computed once, at download time, from data already fetched during the download (chapter's own `verseTimings` for a surah; a new juz-bounds endpoint for a juz) — so playback never needs a live stop-point DB lookup, and works regardless of the user's persisted `settings.stopPoint`.

**Juz bounds** come from the `Rub` table, not a new static file: juz N is rubs `(N-1)*8+1..N*8`, and `RubVerseMapping` already records each rub's chapters. A new route resolves `{firstVerseKey, lastVerseKey, lastChapterId, chapterIds}` for a juz number.

**Page assets are shared, not duplicated.** A download's reader pages (JSON + font) go into the *same* `PAGES_CACHE_NAME` the existing bulk 48MB download uses — a page cached by either feature serves both. Deletion therefore needs reference-counting (see Decision Tree below), not a bare per-download cache wipe.

## Decision Tree / Algorithm

### What a download fetches & caches

| Asset | Source | Cache |
|---|---|---|
| Chapter audio MP3 | `download.quranicaudio.com/.../{chapter}.mp3` | new `recitation-download-v{N}` |
| Reciter+chapter metadata (audioUrl, verseTimings) | `/api/quran/recitations/{reciterId}/chapters/{chapterId}` (existing route) | `recitation-download-v{N}` |
| Edition verse→page map (`/quran/verse-pages/{mushafId}.json`, static, ~73KB) | existing `VERSE_PAGES_URL` (default edition) | **reused `PAGES_CACHE_NAME`** — ensured once per download, not per chapter |
| That chapter's reader pages (JSON+font) | existing `pageJsonUrl`/`pageFontUrl` helpers, page range from `chapters.json`'s `pages` field, default edition (`PRECACHE_MUSHAF_ID`) only | **reused `PAGES_CACHE_NAME`** |

### Resolving download bounds (used both to know what to fetch and as the `PlaybackOverride` for later playback)

| Scope | Chapters to download | `startVerseKey` | `stopVerseKey` / `stopChapterId` | Needs a DB call at download time? |
|---|---|---|---|---|
| Surah | that one chapter | chapter's first verse (`verseTimings[0]`, already fetched) | chapter's last verse/id (`verseTimings[last]`, already fetched) | No |
| Juz | every chapter in `chapterIds` from `/api/quran/juz/[juzNumber]/bounds` | juz's first verse (from that route) | juz's last verse/chapter (from that route) | Yes — one call, at download time only, not at playback time |

### Playing a downloaded item

| Step | Action |
|---|---|
| User taps Play on a downloaded row | If `settings.reciterId !== item.reciterId`, call `updateSettings({ reciterId: item.reciterId })` first (`play()` always reads `settings.reciterId`, it takes no reciter argument) |
| | Call `play(item.startVerseKey, { stopVerseKey: item.stopVerseKey, stopChapterId: item.stopChapterId, rangeRepeatCount: 1, id: `download:${item.kind}:${item.key}`, label: item.label })` |
| Juz spans multiple chapters | Existing cross-chapter chaining (`decideChapterEnd`/`chainToNextChapter`, unchanged) advances through them; each chapter's audio+metadata resolves from `recitation-download-v{N}` since every chapter the juz touches was downloaded |
| Settings sheet | Existing `activeOverride` banner + the existing Stop-at/Repeat-disabled-during-override behavior (`listening-wird-inline-playback.md`'s "Disable Stop-at/Repeat" addendum) apply automatically — no new sheet logic needed |

### Deleting a download — page-asset reference counting

| Condition | Action |
|---|---|
| Full bulk page/font cache already complete (`PRECACHE_SENTINEL_URL` present) | Never touch page/font entries in `PAGES_CACHE_NAME` — that guarantee belongs to the other feature |
| Bulk cache incomplete, another still-downloaded item (from the `localStorage` registry) also spans that page | Keep it |
| Bulk cache incomplete, no other downloaded item spans that page | Evict that page's JSON+font from `PAGES_CACHE_NAME` |
| This item's own audio + metadata in `recitation-download-v{N}` | Always deleted |
| `localStorage` registry entry | Always removed |

### Download button gating

| State | Button |
|---|---|
| Not standalone PWA | Section doesn't render at all (same as `OfflineAccessSection`) |
| Standalone, offline | Disabled, same `disabled={!isOnline}` pattern as `OfflineEditionRow` |
| Standalone, online | Enabled |

### Offline playback of a non-downloaded item

| Trigger | Result |
|---|---|
| Tap Play (player-bar quick-play, `MarkModal` "play from here", etc.) on a surah/reciter combo that was never downloaded, while offline | `fetchChapterAudio` fails (no cache hit, no network) → `play()`'s existing `catch` resets to idle. New: sets a `playbackError: "offline-unavailable"` flag on `RecitationContext`, consumed by `RecitationPlayerBar` to show a brief inline "not available offline" notice (mirrors `MarkModal`'s existing `offlineNotice` pattern), auto-clearing on the next successful `play()` |

## Verified Test Cases

Walked through during planning (2026-08-17):

1. **Download Al-Fatiha (single page, single chapter), reciter Mishari Alafasy.** Fetches `1.mp3` + metadata into `recitation-download-v{N}`, page 1's JSON+font into `PAGES_CACHE_NAME`. Registry gets one entry. Going offline and tapping Play on that row: `settings.reciterId` already matches, `play("1:1", {stopVerseKey:"1:7", stopChapterId:1, rangeRepeatCount:1, ...})` — plays start to finish via the override, no DB call anywhere in the path.
2. **Download Al-Baqarah (pages 2–49, single chapter).** All 48 pages' JSON+font cached into `PAGES_CACHE_NAME`. Offline, playing it: page-follow (`RecitationFollow`) navigates through pages 2→49 exactly as it does live, since each page's JSON/font resolves from cache — no visual difference from an online session.
3. **Download Juz 1 (crosses the chapter 1→2 boundary at `2:141`).** `chapterIds = [1, 2]`; both chapters' audio+metadata+pages downloaded. Offline playback: chapter 1 plays to its end, `chainToNextChapter` loads chapter 2 from `recitation-download-v{N}` (cache hit, no network), continues to `2:141`, stops — identical behavior to the live "juz" stop point, just resolved at download time instead of via a live DB call.
4. **Delete Al-Fatiha's download when the full 604-page bulk cache is NOT complete and no other downloaded item spans page 1.** Page 1's JSON+font evicted from `PAGES_CACHE_NAME`; audio+metadata evicted from `recitation-download-v{N}`; registry entry removed.
5. **Delete Al-Fatiha's download when the full bulk cache IS complete** (user separately ran the 48MB download). Page 1's JSON+font are left untouched — only the audio+metadata+registry entry go.
6. **Delete Al-Baqarah's download while Juz 1 (chapters 1–2) is also downloaded.** Page 2 is spanned by both. Al-Baqarah's own audio/metadata/registry entry is removed; page 2's JSON+font stay, since Juz 1's download still references it.
7. **User has downloaded Surah Al-Mulk under reciter A, then changes their persisted reciter to B in the settings sheet, then goes offline and taps Play on the Al-Mulk downloaded row.** `settings.reciterId` (B) doesn't match the item's reciter (A) → `updateSettings({reciterId: A})` fires first, then `play()` — resolves from A's cached download, plays correctly, and the settings sheet now shows reciter A as selected (matches how a live reciter switch already behaves).
8. **Offline, tap the normal player-bar Play button on a page whose surah was never downloaded.** `fetchChapterAudio` fails, `play()` catches, `playbackError` is set, `RecitationPlayerBar` shows the "not available offline" notice; nothing plays.
9. **Tap Download while offline.** Button is disabled — matches `OfflineEditionRow`'s existing `disabled={!isOnline}` behavior, no new state needed.

## Files to Change

- `app/constants/offline.ts` — add `RECITATION_DOWNLOAD_CACHE_VERSION`/`RECITATION_DOWNLOAD_CACHE_NAME`, `RECITATION_AUDIO_HOST` (`download.quranicaudio.com`), a `RECITATION_DOWNLOADS_KEY` localStorage key, and the small message/type additions the download hook needs. Reuses `PAGES_CACHE_NAME`/`PRECACHE_SENTINEL_URL`/`pageFontUrl`/`pageJsonUrl` — no duplication of those.
- `app/sw.ts` — new `runtimeCaching` entries (inserted before `...defaultCache`, same ordering convention as the existing rules): `CacheFirst` + `RangeRequestsPlugin` matching `RECITATION_AUDIO_HOST`; `CacheFirst` matching the `/api/quran/recitations/[reciterId]/chapters/[chapterId]` pattern, cache name `RECITATION_DOWNLOAD_CACHE_NAME`.
- `app/api/quran/juz/[juzNumber]/bounds/route.ts` — new. Resolves juz N's `{firstVerseKey, lastVerseKey, lastChapterId, chapterIds}` from the `Rub`/`RubVerseMapping` tables (rubs `(N-1)*8+1..N*8`). `jsonResponse()` envelope per `docs/standards/api-conventions.md`.
- `app/hooks/use-recitation-download.ts` — new. Owns the download/cancel/delete/list lifecycle: `caches.open`, `fetch`+`cache.put()` for audio/metadata/pages, the `localStorage` registry read/write, per-item state (`idle`/`downloading`/`downloaded`/`failed`), and the reference-counted deletion logic (Decision Tree above).
- `app/components/offline/OfflineRecitationSection.tsx` — new. Settings row, standalone-gated, mirrors `OfflineAccessSection`'s shape (renders nothing if not standalone).
- `app/components/offline/OfflineRecitationSheet.tsx` — new. Reciter picker (reuses `ReciterCombobox`) + By Surah / By Juz tabs (surah rows styled like `SurahListItem`, juz rows like `RubList`'s juz grouping) + Downloaded section with per-item delete.
- `app/components/SettingsSidebar.tsx` — render `<OfflineRecitationSection />` alongside the existing `<OfflineAccessSection />`.
- `app/contexts/RecitationContext.tsx` — new `playbackError: "offline-unavailable" | null` state, set in `play()`'s catch block when `!isOnline` (reads `useOnlineStatus`), cleared at the start of the next `play()` call. `RecitationContextType` gains `playbackError`.
- `app/components/RecitationPlayerBar.tsx` — brief inline "not available offline" notice when `playbackError === "offline-unavailable"` (`RecitationPlayButton` no longer exists — its role was consolidated into this bar's own play/pause button since the plan was written; discovered during implementation).
- `messages/en.json`, `messages/ar.json` — new `offlineRecitation.*` namespace (section title, download/downloaded/delete labels, size notices, the "not available offline" notice).
- `docs/architecture/adr/0046-offline-recitation-audio.md` — written during planning (this task).
- `docs/architecture/DECISIONS.md` — "Offline Recitation Audio" section written during planning (this task).

## Constraints

- Whole chapters only — never slice/clip audio. A juz download fetches every full chapter it touches, same as the live "juz" stop point already does.
- The download action does not go through service-worker message-passing — it's a foreground-only client `fetch`+`cache.put()` loop. Do not build a `START_RECITATION_DOWNLOAD` SW message contract mirroring the bulk-precache one; that resilience isn't needed for a single-chapter-scale download.
- Page assets (JSON+font) must be written into and read from the **existing** `PAGES_CACHE_NAME` — never a separate per-feature page cache. Default edition (`PRECACHE_MUSHAF_ID`) only, same as the bulk download.
- Deletion must reference-count against the `localStorage` registry and defer to the bulk-cache sentinel (Decision Tree above) — never a bare "delete this download's pages" operation.
- `play()` continues to read `settings.reciterId` only — do not add a reciter parameter to `play()`; sync the setting before calling it instead.
- The new SW rules for the audio host and the two JSON routes must be inserted before `...defaultCache` in `runtimeCaching`, matching the existing ordering convention (first-match-wins).
- Gate the whole feature (Settings row + sheet) on `isStandaloneDisplayMode()` — no browser-tab path, per the confirmed scope decision.

## What NOT to Do

- Do not build true per-page audio slicing/clipping — dropped in favor of surah/juz-only granularity (confirmed during planning).
- Do not let this feature work in a regular (non-installed) browser tab — standalone-PWA-only, confirmed during planning after initially considering a browser-tab path.
- Do not duplicate page JSON/font storage in a feature-specific cache — always the shared `PAGES_CACHE_NAME`.
- Do not evict a page asset on deletion without first checking (a) the bulk-cache sentinel and (b) every other still-downloaded item's page range.
- Do not add a new stop-point-resolution code path for downloaded playback — reuse `PlaybackOverride` exactly as listening-wird does.
- Do not add a background/silent auto-cache-on-play fallback for non-downloaded content (Option C in ADR 0046, rejected) — downloads stay explicit and user-initiated, matching ADR 0014 Addendum 2's precedent.
- Do not build a full "not available offline" redesign of the player UI — a brief inline notice only, per the confirmed scope.

## Decisions Made

- Download granularity: surah and juz only, no per-page audio (QDC has no per-page audio asset; true clipping considered and rejected as out of scope) — confirmed 2026-08-17.
- Standalone-PWA-only, no browser-tab path — confirmed 2026-08-17 (reversed an earlier "make it work in browser too" direction after weighing it against the existing architecture's one gate).
- Entry point: Settings row → dedicated sheet (reciter picker + surah/juz tabs + downloaded-items manager), no player-bar shortcut icon for v1 — confirmed 2026-08-17.
- Downloads are self-contained (bundle that content's reader pages, not just audio) — confirmed 2026-08-17, since recitation now hard-stops off the reader route (ADR 0021), so offline listening always happens while the reader itself needs to render.
- Reuse `PAGES_CACHE_NAME` for the bundled page assets rather than a separate cache — confirmed 2026-08-17.
- Reuse `PlaybackOverride` for downloaded-item playback rather than a new stop-resolution path — confirmed 2026-08-17.
- Offline-tap-on-non-downloaded-content gets a real "not available offline" notice, not silent failure — confirmed 2026-08-17.

## Implementation Notes (2026-08-18)

Two stale-plan corrections, found by reading current code before editing (both fixed in the plan body above, not just here):

- `RecitationPlayButton.tsx` no longer exists — its role was consolidated into `RecitationPlayerBar.tsx`'s own play/pause button sometime after this plan's investigation. The offline notice was added there instead.
- `/api/quran/chapters/[chapterId]/verse-pages` no longer exists — superseded by a static per-edition file (`/quran/verse-pages/{mushafId}.json`, already covered by an existing `PAGES_CACHE_NAME` `CacheFirst` rule) when mushaf editions shipped (ADR 0033). This simplified the design: a download only ensures this one shared file is cached once, not per-chapter, and needed no new SW rule for it.

`RecitationDownloadItem.chapters` stores each chapter's resolved `audioUrl` alongside its `chapterId` (not just a bare `chapterIds: number[]` as first sketched) — deletion needs the exact cache key to evict and must not require a network call (which could easily be unavailable, e.g. deleting a download while offline to free space) to re-derive it.

`ensureCachedBytes`/`fetchAndCacheJson` (`app/hooks/use-recitation-download.ts`) skip the network entirely when the target URL is already in the cache — verified this makes a juz download and an overlapping surah download (sharing a chapter or a page) correctly reuse what's already there instead of re-fetching.

### Manual Verification (2026-08-18)

`npm run lint` and `npx tsc --noEmit` both clean (the latter's only output is 3 pre-existing, unrelated `use-close-on-back-gesture.ts` Navigation-API-typing errors, confirmed identical on the main branch before this branch existed).

Live in the Browser pane (`npm run dev`, standalone spoofed per `docs/standards/pwa-testing.md` — Serwist itself is disabled in dev, so the SW runtime-caching rules are unverified here, only the client-side download/registry/playback mechanism):

- `GET /api/quran/juz/1/bounds` → `{firstVerseKey:"1:1", lastVerseKey:"2:141", lastChapterId:2, chapterIds:[1,2]}` and juz 30 → chapters 78–114 ending `114:6` — both match hand-derived expectations exactly.
- Settings → Offline Recitation row renders under the standalone spoof with **no service-worker dependency** (unlike `OfflineAccessSection`, which stays hidden in dev since it waits on a `PRECACHE_STATUS` message a disabled Serwist never sends) — confirms the two sections' gates are correctly independent.
- Downloaded Al-Fatiha (reciter Yasser Ad Dussary): network log showed exactly the expected sequence (`/api/quran/recitations/97/chapters/1`, `/quran/verse-pages/2.json`, `/quran/pages/2/1.json`, `/fonts/v1/woff2/p1.woff2`), the cross-origin MP3 fetch succeeded (confirmed via the registry's resulting `sizeBytes` and by inspecting Cache Storage directly, since the network-request reader tool didn't surface the cross-origin entry). `recitation-download-v1` held both the metadata route and the raw `download.quranicaudio.com` URL; `pages-v2` held the page 1 JSON+font+verse-pages map. The `localStorage` registry entry matched Verified Test Case 1 exactly (`startVerseKey:"1:1"`, `stopVerseKey:"1:7"`, `stopChapterId:1`).
- Tapping Play on the downloaded row started real playback through the `PlaybackOverride` path — `audio.src` was the live QDC URL, `currentTime` advanced, no network calls beyond what was already cached (same reciter already selected, so the reciter-sync branch wasn't exercised here).
- Deleting the download cleared the registry and evicted both `recitation-download-v1` entries and page 1's JSON+font from `pages-v2`; `verse-pages/2.json` was deliberately left (not reference-counted per-download, since it's a small always-useful shared file with no single owner — harmless to leave cached).

Not exercised this session: a juz download, the reciter-mismatch sync-then-play branch, and the offline "not available offline" notice (all three reuse the exact same verified `downloadChapter`/`ensureCachedBytes`/registry building blocks as the surah-download path above, and Serwist's actual runtime-caching behavior needs `npm run build:local && npm start` per `docs/standards/pwa-testing.md`, not attempted this session).

### Review Fixes (2026-08-18)

An independent Codex CLI review (`/review-fq-work`, run against Codex per user request rather than the default Opus subagent) found 6 issues, verified against the code before fixing. 5 fixed on this same branch:

- **Critical-adjacent**: `fetchAndCacheJson` (`app/hooks/use-recitation-download.ts`) checked `response.ok` before deciding whether to cache, but `jsonResponse()` (`app/api/response.ts`) always returns HTTP 200 regardless of its own `code` field — so a genuine logical failure (e.g. no audio for a reciter+chapter) got `cache.put()`'d before the envelope's `success` flag was ever checked, permanently poisoning that cache entry for every future retry. Fixed: the envelope is now parsed and validated first; only a confirmed-successful response is cached.
- `deleteDownload` cleared the `localStorage` registry entry before the Cache Storage deletions ran — a failed `cache.delete()` mid-run would orphan bytes with no registry entry left to retry from. Fixed: `persist(remaining)` now runs last, after every cache eviction has been attempted.
- `/api/quran/juz/[juzNumber]/bounds/route.ts` accepted `parseInt`-parseable garbage (`"1foo"`, `"1.5"`) as a valid juz number. Fixed with a digit-only regex check before parsing (same fix would apply to `pages/[pageId]/bounds/route.ts`'s identical pre-existing pattern, but that route is unchanged — out of scope here).
- `app/hooks/use-juz-bounds.ts` was dead code — `use-recitation-download.ts` calls `fetchJuzBounds` directly instead of through this React Query wrapper (a one-shot download action has no use for query caching the way `use-page-verse-bounds.ts`'s hover-prefetch use case does). Deleted; removed from Files to Change above.
- `OfflineRecitationSheet.tsx`'s download buttons had no `disabled` state while offline — the plan's own gating table says "Disabled, same `disabled={!isOnline}` pattern as `OfflineEditionRow`," but the button only no-op'd silently on click. Fixed: `RowIcon` takes a `disabled` prop, passed `!isOnline || !reciterId` from both tab call sites.

**Not fixed, deliberately**: `getVersePages()` (`RecitationContext.tsx`) resolves the verse→page map for the *active* mushaf edition, but a download only ever caches the *default* edition's map — so `play()` on an already-downloaded item can still fail offline if the user has switched to Tajweed mode. Real, but overlaps an already-accepted limitation: Tajweed is fully excluded from offline reading everywhere else (ADR 0023), so a user in Tajweed mode while offline already can't render any page, downloaded-recitation or not — this finding doesn't make an already-broken combined state meaningfully worse, and fixing it properly would mean either caching Tajweed page assets per download (explicitly rejected — ADR 0023's exclusion) or adding new degrade-gracefully branching to `RecitationContext`'s core `play()` error handling, beyond this task's scope.
