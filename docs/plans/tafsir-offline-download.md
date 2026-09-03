---
title: "Tafsir: Offline Download & Cache Management for PWA"
type: feature
date: 2026-09-03
status: implemented
area: tafsir
issue: 461
adr: [0060]
---

# Tafsir: Offline Download & Cache Management for PWA

## Summary

Let a user on the installed PWA download a whole tafsir edition (all 114 surahs)
for offline reading. Settings gains an "Offline Tafsir" row opening a dedicated
sheet: the six catalog editions, each with a download / progress / delete
control and an approximate size. Downloads are **commentary text only** — a
foreground client `fetch`+`cache.put` loop over QDC's `by_chapter` endpoint (one
request per surah) into a new `tafsir-download-v1` cache, tracked by a
`localStorage` registry. Offline, `qdcTafsirProvider.getTafsir` falls back to
reading the stored chapter blob and finding the verse in it. When the active
mushaf edition's bulk page cache is incomplete, the sheet offers a checkbox to
also kick off the existing 604-page bulk download in parallel. Closes epic
#457's last child (#461); #458–#460 shipped.

## Root Cause / Approach

Tafsir is fetched client-side one verse at a time from
`https://api.qurancdn.com/api/qdc/tafsirs/{id}/by_ayah/{key}` (ADR 0048); offline,
`getTafsir` throws. ADR 0046's offline-recitation model (service worker
`CacheFirst`-matches the live URL, consumer untouched) doesn't transfer cleanly,
because a whole edition is 6,236 verses and 6,236 tiny `by_ayah` requests is
minutes long and can't survive tab backgrounding.

QDC also exposes `tafsirs/{id}/by_chapter/{n}?per_page=300`, returning a whole
surah in one response (verified live: `per_page` honoured, not capped;
`{tafsirs:[{verse_key,text,resource_id,slug,...}],pagination:{total_pages:1,...}}`;
`verse_key` unpadded, e.g. `"2:255"`, matching `normalizeVerseKey` output).
Measured full-edition sizes (stored / gzip wire): Al-Muyassar 2.6 / 0.7 MB,
Al-Sa'di 7.6 / 1.9, Al-Baghawi 10.3 / 2.3, Ibn Kathir 19.8 / 4.1, Al-Qurtubi
20.4 / 5.4, Al-Tabari 47.7 / 8.9 — average ≈ 18 MB stored, all six ≈ 108 MB. A
fraction of the 48 MB bulk mushaf-page download.

**Chosen (ADR 0060):** download `by_chapter/{1..114}` per edition (~114 requests)
under a synthetic cache key `/__fq-tafsir/{editionId}/{chapter}` in a dedicated
`tafsir-download-v1` cache. `getTafsir` tries the live `by_ayah` fetch first
(network-first — the blob is a safety net, not a freshness regression) and, on
failure, reads the matching chapter blob. Whole-edition is the only granularity —
sizes are modest and one tap buys a coherent "this whole commentary works
offline" guarantee.

The service worker **is** touched, minimally: `defaultCache`'s cross-origin
`NetworkFirst` rule (10 s timeout, 32-entry cache) would otherwise both (a) mirror
all 114 `by_chapter` responses into the shared `cross-origin` cache, churning it,
and (b) make every offline `by_ayah` read stall 10 s before rejecting. One new
`NetworkOnly` rule for the QDC tafsir host fixes both; the provider still owns the
offline fallback.

## Decision Tree / Algorithm

### What a download fetches & caches (per edition E)

| Step | Detail |
|---|---|
| For `chapter` in 1..114, concurrency 4 | `GET https://api.qurancdn.com/api/qdc/tafsirs/{E}/by_chapter/{chapter}?per_page=300` |
| Per-chapter retry | up to 3 attempts with backoff (250 ms → 1 s → 2 s) — QDC visibly rate-limits under burst (sporadic 403/503) |
| Skip-if-cached | if `tafsir-download-v1` already has `/__fq-tafsir/{E}/{chapter}`, don't refetch; still add its cached `.blob().size` to the running total |
| Store | `await cache.put("/__fq-tafsir/{E}/{chapter}", response.clone()); size += (await response.blob()).size;` — the `.clone()` ordering is mandatory (a `Response` body is single-use; see `use-recitation-download.ts:31-38`) |
| On all 114 present | write the `tafsirDownloads` registry entry `{ editionId: E, editionName, sizeBytes, downloadedAt }` **from the async download function** (read → merge → `storage.set`), then set component state — do **not** persist inside a `setState` updater (see What NOT to Do) |
| On any chapter failing all 3 attempts | edition state → `failed`; **no** registry entry |
| On `QuotaExceededError` from `cache.put` | edition state → `quota-exceeded` (distinct from `failed`); surface "not enough space" |

`per_page=300` is a fixed constant (> 286, the largest surah), so every response
is a single page — no pagination loop.

### Per-edition state (in `use-tafsir-download.ts`)

| State | Meaning | Control shown |
|---|---|---|
| `idle` | not in registry, no run | Download button |
| `downloading` | loop in flight | spinner + progress bar (`chaptersCached / 114`, `motion-reduce:` on transitions) |
| `downloaded` | registry entry present **and** `listCachedChapters(E).length === 114` | Check + Delete (trash) |
| `failed` | a run ended with a missing chapter, or an eviction check found < 114 blobs | Retry button (resumes via skip-if-cached) |
| `quota-exceeded` | `cache.put` threw `QuotaExceededError` | "Not enough space" notice, no Retry until space frees |
| `offline` (derived) | `!isOnline` while `idle`/`failed` | disabled + notice, same as `OfflineRecitationSheet` |

### Eviction healing (the tafsir counterpart of ADR 0014 Addendum 10)

The `tafsirDownloads` registry is a sentinel with the same weakness `pwa.md`
documents for `PRECACHE_SENTINEL_URL`: iOS evicts Cache Storage entries out from
under a completed run. Therefore its presence is **not** proof of a servable
download.

| When | Check |
|---|---|
| Sheet opens; `useTafsirDownloads()` reads the registry for the badge | for each registry entry, `listCachedChapters(id).length` — if `< 114`, drop that edition's derived state to `failed` and offer Retry (skip-if-cached makes healing cheap) |
| `getTafsir` offline read finds the chapter blob absent | treat as a real miss (rethrow) — the healing above will correct the registry on the next sheet open |

### Offline serving — `qdcTafsirProvider.getTafsir(id, verseKey, signal)`

The existing `by_ayah` `fetch` gains a wrapper. `try` is scoped to the `fetch()`
call **only**, so an online success path has identical latency/behaviour to today.

| Condition | Action |
|---|---|
| `fetch` rejects with an **abort** (`signal?.aborted` or `err.name === "AbortError"`) | **rethrow immediately** — React Query aborts the previous query on every verse step; an abort must never trigger a blob read or surface as a failure |
| `fetch` rejects (network error / offline) | → fallback read (below) |
| `fetch` resolves, `res.status >= 500` | → fallback read (below) — verified: QDC returns **503** (not 404) for a verse with no commentary record, e.g. Al-Sa'di `2:107` |
| `fetch` resolves `res.status === 404` | existing path — return `null` |
| `fetch` resolves other non-ok 4xx | existing path — throw `TafsirProviderError` |
| `fetch` resolves ok (200) | existing path — parse, return `VerseTafsir` |

**Fallback read** `readCachedVerseTafsir(id, normalizedKey)`:

| Sub-case | Result |
|---|---|
| chapter = `Number(normalizedKey.split(":")[0])`; open `tafsir-download-v1`, `match("/__fq-tafsir/{id}/{chapter}")` — **blob present**, `tafsirs.find(t => t.verse_key === normalizedKey)` hit | return `{ tafsirId: id, verseKey: normalizedKey, resourceName: getTafsirEdition(id)?.name ?? "", text: hit.text ?? "", languageName: getTafsirEdition(id)?.languageName }` |
| blob present, **verse absent from it** | return `null` — verified: `by_chapter` legitimately omits verses with no commentary (Al-Sa'di surah 2 is missing 2:107/109/111, surah 12 missing 12:111, surah 55 missing 55:22). This is the existing "no commentary for this verse" empty state, **not** an error. Never rethrow here. |
| **blob absent** | rethrow the original error → `useTafsir` → `isError` → existing retry UI; the sheet-open eviction check then heals the registry |

`useTafsir` / `tafsirQueryKey` unchanged (already `networkMode: "always"`). To
keep the offline error path snappy, `useTafsir` gains a `retry` predicate that
does **not** retry once `readCachedVerseTafsir` has confirmed a genuine
blob-absent miss (avoids ~7 s of default backoff, each attempt re-opening the
cache). Network-first still applies online; the 24h `staleTime` is unchanged.

### On the read path when a download exists or the app is offline

`defaultCache`'s cross-origin `NetworkFirst` waits up to 10 s before rejecting,
so the "safety net" would only engage after a 10 s stall. Mitigate on two fronts:

1. **New SW rule** (`app/sw.ts`, inserted before `...defaultCache`): matcher
   `url.hostname === "api.qurancdn.com" && url.pathname.startsWith("/api/qdc/tafsirs/")`
   → `NetworkOnly`. Keeps QDC tafsir responses out of the 32-entry `cross-origin`
   cache entirely and makes a failed fetch reject promptly.
2. **Read-path race**: in `getTafsir`, when `!navigator.onLine` **or** the edition
   is in the registry, race the `by_ayah` fetch against a ~2 s `AbortController`
   timeout; on timeout, go straight to the blob (and let the fetch settle in the
   background, ignored).

### Deleting an edition

| Step | Action |
|---|---|
| 1 | `cache.keys()` on `tafsir-download-v1`, filter pathname prefix `/__fq-tafsir/{editionId}/`, `cache.delete` each |
| 2 | remove the `tafsirDownloads` registry entry (**last**, after step 1 completes — mirrors `use-recitation-download`'s "persist last") |
| 3 | dispatch `fq-tafsir-downloads-changed` (below) |

No reference-counting: each edition's blobs are uniquely prefixed by `editionId`,
and nothing is shared with other editions or with `PAGES_CACHE_NAME`.

### Cross-component registry sync

The native `storage` event does **not** fire in the same tab (documented in
`use-pwa-precache.ts:41-49`, which invents `fq-offline-dismissed` for exactly
this). Copy the pattern:

- Every registry write dispatches `window.dispatchEvent(new Event("fq-tafsir-downloads-changed"))`.
- `use-tafsir-download.ts` and `useTafsirDownloads()` listen for that event **and**
  `storage` (cross-tab), re-reading the registry on either.
- This is what makes the `TafsirEditionSelect` badge appear immediately after a
  download finishes in the Settings sheet (a different component tree, same tab).

### "Also download mushaf pages" checkbox

`usePwaPrecache` states are `unknown | idle | running | done | partial | offline`
(`use-pwa-precache.ts:19-25`).

| Condition | Behaviour |
|---|---|
| checkbox rendered only when `state === "idle" || state === "partial"` | (not `unknown` — which is the first-render value and the permanent value with no SW / insecure context; not `done`; not `running`) |
| `!isOnline` | checkbox disabled |
| checkbox checked + user taps an edition's Download | also call `usePwaPrecache(activeMushafId).start()` once, in parallel |
| the `usePwaPrecache` instance | mounted **only while the sheet is open** — it fires `REQUEST_PRECACHE_STATUS` on mount + on `visibilitychange`/`focus`, the chatter #440 removed from always-mounted surfaces |
| mushaf download progress | shown on the existing Settings → Mushaf Layout row, **not** in this sheet |
| checkbox helper copy | explains *why* (the reader behind the sheet needs its page cached to render offline), not just "~48 MB" |

`activeMushafId` from `useQuranMushaf()`.

### Dropdown indicator — `TafsirEditionSelect`

| Condition | Rendering |
|---|---|
| `useTafsirDownloads().isDownloaded(edition.id)` (registry entry + 114-blob check) | small `CloudCheck` icon beside the row + `sr-only` "Available offline" (`tafsir.availableOffline`) |
| registry read | on mount; re-read on `fq-tafsir-downloads-changed` and `storage` events |

### Gate

| Context | Result |
|---|---|
| not `isStandaloneDisplayMode()` | `OfflineTafsirSection` renders `null` — no Settings row, no behaviour change; registry empty so no dropdown badges |
| standalone, offline | download controls disabled + notice (mirrors `OfflineRecitationSheet`) |
| standalone, online | enabled |

## Verified Test Cases

Walked through with the user during planning, revised after an Opus plan review
that verified QDC live (2026-09-03):

1. **Download Al-Muyassar** — standalone, online, active mushaf already cached.
   114 `by_chapter` fetches (concurrency 4, per-chapter retry) → 114 entries under
   `/__fq-tafsir/16/*` (~2.6 MB) → registry entry `{editionId:16}` written from
   the async fn → `fq-tafsir-downloads-changed` dispatched → `TafsirEditionSelect`
   badge appears. Checkbox not shown.
2. **Offline, tafsir sheet on 2:255, edition 16.** `by_ayah` fetch rejects (or the
   2 s race times out) → `readCachedVerseTafsir(16, "2:255")` → chapter 2 blob →
   hit → renders. Step to 2:256 (same blob); the previous query's abort is
   rethrown, not treated as a miss. Step across to 3:1 (chapter 3 blob).
3. **Offline, edition Al-Sa'di (91) downloaded, sheet steps onto 2:107** (a verse
   Al-Sa'di has no record for). `by_ayah` fails → blob present, verse absent →
   `readCachedVerseTafsir` returns `null` → `TafsirContent` shows its empty
   "no commentary" state, **not** an error. (Online, the same verse returns 503 →
   `res.status >= 500` → same fallback → same empty state.)
4. **Offline, edition switched to Ibn Kathir (14, not downloaded).**
   `readCachedVerseTafsir(14, …)` → blob absent → rethrow → `TafsirContent` error;
   `useTafsir`'s retry predicate short-circuits (no 7 s backoff). Next time the
   Settings sheet opens, the eviction check confirms 14 was never downloaded — no
   false badge.
5. **Download interrupted at chapter 60** (tab backgrounded / network drop after
   3 failed attempts). State → `failed`, no registry entry. Reopen sheet, tap
   Retry → loop resumes, 1–60 skipped (cache hit, sizes still summed), 61–114
   fetched → success → registry written.
6. **iOS evicts ~20 of Al-Muyassar's blobs after a completed download.** Sheet
   opens → `useTafsirDownloads` runs `listCachedChapters(16).length` → 94 < 114 →
   edition 16 drops to `failed`, badge removed, Retry offered → Retry refetches
   only the 20 missing chapters.
7. **Delete Al-Muyassar** while Al-Tabari (15) also downloaded. All
   `/__fq-tafsir/16/*` removed; registry entry removed last; event dispatched;
   badge for 16 disappears. Al-Tabari's `/__fq-tafsir/15/*` untouched.
8. **Download Al-Sa'di with "Also download mushaf pages" checked**, active mushaf
   edition's bulk cache `state === "idle"`. Tafsir loop runs; a sheet-scoped
   `usePwaPrecache(activeMushafId)` instance's `start()` fires once in parallel;
   bulk progress appears on the Mushaf Layout row, tafsir progress in the sheet.
   Closing the sheet mid-run does not stop the bulk download (it lives in the SW
   `waitUntil`).
9. **Non-standalone browser tab.** `OfflineTafsirSection` renders `null`; registry
   empty → no dropdown badges. Zero behaviour change.
10. **Online, edition 16 downloaded, sheet on 1:1.** `by_ayah/1:1` fetch succeeds
    → fresh text (blob is fallback only). Network-first, always.
11. **Storage full.** `cache.put` throws `QuotaExceededError` → state
    `quota-exceeded` → sheet shows "not enough space" with the estimate from
    `navigator.storage.estimate()`, not a generic "failed / retry".

## Files to Change

- `app/constants/tafsir.ts` — add an approximate `downloadSizeMb` per edition (from the measured table) for the sheet's size notice.
- `app/constants/offline.ts` — add `TAFSIR_DOWNLOAD_CACHE_VERSION` / `TAFSIR_DOWNLOAD_CACHE_NAME` (`tafsir-download-v1`), `tafsirChapterCacheUrl(editionId, chapter)` → `/__fq-tafsir/{editionId}/{chapter}`, and the QDC tafsir host constant. Document in the constant's comment that a version bump orphans the old cache (no activate-handler cleanup covers this prefix — see below).
- `app/sw.ts` — one new `runtimeCaching` entry before `...defaultCache`: matcher `url.hostname === QDC_TAFSIR_HOST && url.pathname.startsWith("/api/qdc/tafsirs/")` → `NetworkOnly`. Also add `tafsir-download-*` to the `activate` handler's prefix-scoped cache cleanup (alongside `reader-html-*`) so a `TAFSIR_DOWNLOAD_CACHE_VERSION` bump doesn't orphan the old cache.
- `app/lib/tafsir/offline-cache.ts` — **new**. `readCachedVerseTafsir(id, normalizedKey)`, `writeCachedChapter(id, chapter, response)`, `listCachedChapters(id): Promise<number[]>`, `deleteCachedEdition(id)` — thin `caches.open(TAFSIR_DOWNLOAD_CACHE_NAME)` wrappers.
- `app/lib/tafsir/qdc-provider.ts` — add `getChapterTafsir(tafsirId, chapter, signal?)` (fetches `by_chapter/{n}?per_page=300`, returns the raw `Response`). In `getTafsir`: wrap only the `by_ayah` `fetch()` in `try/catch`; rethrow aborts immediately; on network rejection or `res.status >= 500` call the fallback; keep 404 → `null` and other 4xx → throw. Add the optional read-path race (registry hit / offline → 2 s `AbortController` timeout → blob).
- `app/hooks/use-tafsir.ts` — add a `retry` predicate that does not retry a confirmed blob-absent offline miss.
- `app/hooks/use-tafsir-download.ts` — **new**. Per-edition download loop (concurrency 4, per-chapter retry-with-backoff, skip-if-cached with cached-size read, `.clone()` before size), the `tafsirDownloads` registry read/write **from the async fn** (never inside `setState`), per-edition state (`idle`/`downloading`/`downloaded`/`failed`/`quota-exceeded`), progress (`chaptersCached`), `QuotaExceededError` handling, `deleteEdition`, the sheet-open eviction check, and `fq-tafsir-downloads-changed` dispatch on every write.
- `app/hooks/use-tafsir-downloads.ts` — **new** (read-only registry accessor for `TafsirEditionSelect`): `isDownloaded(id)` (registry + 114-blob check), re-reads on `fq-tafsir-downloads-changed` and `storage`.
- `app/utils/storage.ts` — add `'tafsirDownloads'` to `StorageKey` and `TafsirDownloadItem[]` to `StorageValueType` (unprefixed key, consistent with `recitationDownloads`).
- `app/types/tafsir.ts` — add `TafsirDownloadItem { editionId: number; editionName: string; sizeBytes: number; downloadedAt: number }`.
- `app/components/offline/OfflineProgressBar.tsx` — add an optional `label`/`ariaLabel` prop (or a `namespace` prop) so it can render "{cached} of {total} surahs" instead of the hardcoded `offline.progress` ("pages"). Default unchanged.
- `app/components/offline/OfflineTafsirSection.tsx` — **new**. `isStandaloneDisplayMode()` gate → `<OfflineTafsirSheet />` or `null`. Mirrors `OfflineRecitationSection.tsx`.
- `app/components/offline/OfflineTafsirSheet.tsx` — **new**. Settings-row trigger → sheet: `side={isRTL ? "left" : "right"}`, `dir={getLanguageDirection(locale)}`, `sr-only` `SheetDescription` (Radix requires it — `docs/plans/fix-dialog-missing-description.md`), `useCloseOnBackGesture`. The 6 editions (name, author, ~size) with download/loader/check/retry + trash on downloaded rows (icon buttons ≥ 44px touch target), `OfflineProgressBar` with the surah label while running, the "also download mushaf pages" checkbox when `usePwaPrecache(activeMushafId).state` is `idle`/`partial`, offline notice, `navigator.storage.estimate()` space line, `motion-reduce:` on spinner/bar.
- `app/components/SettingsSidebar.tsx` — render `<OfflineTafsirSection />` next to `<OfflineRecitationSection />` in the "Device & Recitation" section.
- `app/components/tafsir/TafsirEditionSelect.tsx` — badge downloaded editions via `useTafsirDownloads()`.
- `messages/en.json`, `messages/ar.json` — new `offlineTafsir.*` namespace (row title/description, download/downloaded/delete/retry labels, per-edition size notice, surah-progress text, offline notice, "not enough space", mushaf-pages checkbox label + why-copy) + `tafsir.availableOffline`. All placeholder-bearing keys use next-intl's `useTranslations` directly, never `use-translations.ts` (`docs/standards/i18n.md`). Run `npm run extract-translations`.
- `docs/architecture/adr/0060-offline-tafsir-download.md` — **new** (this task).
- `docs/architecture/decisions/pwa.md` — "Offline Tafsir" section (this task).
- `docs/architecture/decisions/tafsir.md` — two-line cross-reference under the provider section pointing at the pwa.md decision (`getTafsir` is no longer a pure network read).

## Constraints

- **`try` in `getTafsir` wraps only the `fetch()` call**, and the catch rethrows aborts (`signal?.aborted` / `AbortError`) before anything else. An abort fires on every verse step and on unmount — it must never read a blob or surface as a failure.
- **Fall back on network rejection AND on `res.status >= 500`** — QDC returns 503 (not 404) for a verse with no commentary record. Keep 404 → `null`, other 4xx → throw.
- **Blob present + verse absent → return `null`** (empty "no commentary" state). Rethrow only when the chapter blob itself is absent. `by_chapter` legitimately omits verses.
- **The registry is not proof of a servable download** — validate `listCachedChapters(id).length === 114` on sheet open / badge read; a short count → `failed` + Retry. This is the tafsir counterpart of ADR 0014 Addendum 10.
- **`app/sw.ts` gets exactly one new rule** (`NetworkOnly` for the QDC tafsir host) plus `tafsir-download-*` in the activate cleanup — nothing more. No message contract, no `CacheFirst` rule (the download URL ≠ the live read URL, so a `CacheFirst` rule can't be populated by the download).
- **Network-first in `getTafsir`** — the live `by_ayah` fetch is attempted first when online; the blob is a fallback. The optional 2 s race applies only when offline or the edition is downloaded.
- The `tafsirDownloads` registry entry is written **only** after all 114 chapters are cached, **from the async download function**, never inside a `setState` updater (a multi-minute download's "user closed Settings before it finished" is the normal case; React won't run an updater for an unmounted component).
- Deletion removes cache entries first, registry entry last, then dispatches `fq-tafsir-downloads-changed`.
- `cache.put(response.clone())` **before** reading `response.blob()` size; on a skipped (already-cached) chapter, read the cached entry's size so a resumed run's total is correct.
- Every registry write dispatches `fq-tafsir-downloads-changed`; consumers listen for it and `storage`. The native `storage` event alone does not fire in-tab.
- The sheet-scoped `usePwaPrecache` instance is mounted only while the sheet is open. The checkbox renders only for `state` `idle`/`partial`, disabled while `!isOnline`.
- Whole edition only — no per-surah / per-juz UI. `per_page=300` fixed. Concurrency 4 (not `PRECACHE_CONCURRENCY`'s 6 — that is calibrated for same-origin static assets; QDC is a rate-limiting third-party API). Per-chapter retry: 3 attempts, 250 ms/1 s/2 s backoff.
- `QuotaExceededError` from `cache.put` is a distinct `quota-exceeded` state, not `failed` — surface "not enough space" with `navigator.storage.estimate()`.
- Tafsir downloads never cache page/font assets and never reference-count — the mushaf-pages checkbox delegates entirely to `usePwaPrecache().start()`.
- Gate on `isStandaloneDisplayMode()`, Settings-only, no browser-tab path (matches ADR 0046).
- Keep `useTafsir`'s query key, `TafsirSheet`'s edition `localStorage` key (`fq_tafsir_edition_id`), and `TafsirContext` unchanged.
- No Next.js proxy routes for QDC (existing Tafsir provider constraint, ADR 0048).
- New sheet: RTL side, `dir`, `sr-only` `SheetDescription`, `motion-reduce:` transitions, ≥ 44px icon-button targets, `messages/ar.json` parity.
- `TafsirDownloadItem.editionName` is stored so no display path depends on the catalog still containing that id.
- The offline header verse-snippet degrades to *empty* on step (see What NOT to Do) — accepted, not fixed here.

## What NOT to Do

- Do not use the per-ayah transparent model (ADR 0046 style) as the *download* mechanism — 6,236 requests per edition, rejected in ADR 0060. (Fanning 114 chapter fetches out to 6,236 `by_ayah`-keyed `cache.put`s is a real alternative, recorded as rejected in the ADR — do not silently adopt it either.)
- Do not add a `START_TAFSIR_DOWNLOAD` service-worker message contract or any SW-driven resumable download — foreground client loop only (user-confirmed).
- Do not add a `CacheFirst` SW rule for the QDC tafsir host — it cannot be populated by a `by_chapter` download.
- Do not bundle mushaf page/font assets into a tafsir download, and do not add reference-counting against the bulk sentinel — the checkbox reuses the existing bulk precache instead (user-confirmed).
- Do not add a per-surah or per-juz picker — whole edition only (user-confirmed after seeing the size table).
- Do not create Next.js API proxy routes for the QDC `by_chapter` / `by_ayah` endpoints.
- Do not make `getTafsir` cache-first, or read the blob before trying the network when online (except the explicit 2 s race for offline / downloaded editions).
- Do not paginate `by_chapter` — `per_page=300` covers every surah in one response.
- Do not write the registry entry on a partial/interrupted run, and do not write it from inside a `setState` updater.
- Do not rethrow from `readCachedVerseTafsir` when the blob is present but the verse is missing — that is the empty state, not an error.
- Do not treat an `AbortError` as an offline signal.
- Do not copy `use-recitation-download.ts`'s `replaceItem` (localStorage write inside `setDownloads`) — diverge deliberately.
- Do not reuse `OfflineProgressBar` without a label override — its hardcoded copy says "pages".
- Do not instantiate `usePwaPrecache` at the section/always-mounted level — only inside the open sheet.
- Do not fix the offline header verse-snippet, `TafsirReaderSync` jumping to an uncached page, or a build-time tafsir dataset in this task — out of scope, noted for the ADR.
- Do not change `PAGES_CACHE_NAME`, `PRECACHE_CONCURRENCY`, or the bulk-precache message contract.

## Decisions Made

- **Granularity: whole edition only, chapter blobs** — confirmed 2026-09-03 after measuring full-edition sizes (avg ~18 MB stored, all six ~108 MB; per-ayay alternative is 6,236 requests).
- **Offline serving via a provider fallback + one `NetworkOnly` SW rule** — the download and live-read URLs differ, so a `CacheFirst` rule is unusable; the `NetworkOnly` rule only keeps QDC tafsir out of the shared `cross-origin` `NetworkFirst` cache and its 10 s timeout — confirmed 2026-09-03 (ADR 0060, revised after review).
- **Fall back on 5xx as well as rejection; abort rethrown; missing-verse → `null`** — confirmed against live QDC 2026-09-03 (503 for missing records; `by_chapter` omits uncommented verses).
- **Registry validated against a 114-blob count on every read** (eviction healing) — confirmed 2026-09-03, matching ADR 0014 Addendum 10's rationale.
- **Network-first, blob as safety net; 2 s race only when offline / downloaded** — confirmed 2026-09-03.
- **Foreground client loop, concurrency 4, per-chapter retry, resumable via skip-if-cached** — confirmed 2026-09-03.
- **Registry written from the async fn, not `setState`; `fq-tafsir-downloads-changed` for in-tab sync** — confirmed 2026-09-03 (review).
- **Mushaf-pages nudge = a pre-download checkbox** gated to `usePwaPrecache` `idle`/`partial`, hook mounted only while the sheet is open — confirmed 2026-09-03.
- **Downloaded editions marked in `TafsirEditionSelect`** — confirmed 2026-09-03.
- **Standalone-PWA-only, Settings-only** entry point, mirroring `OfflineRecitationSection` — confirmed 2026-09-03.
- **`quota-exceeded` is a distinct state** with `navigator.storage.estimate()` — added 2026-09-03 (review).

## Implementation Notes (2026-09-03)

Divergences from the plan body above, made during implementation and an Opus code review:

- **Download lifecycle is a module singleton, not a hook's React state.** `app/lib/tafsir/download-manager.ts` owns the per-edition state / progress / registry and is consumed via `useSyncExternalStore` in `use-tafsir-download.ts` (`useTafsirDownload` + `useTafsirDownloads`). React state in the sheet body was lost on close, letting a 114-request run be double-started and hiding its progress on reopen. No `use-tafsir-downloads.ts` file — both hooks live in `use-tafsir-download.ts`.
- **No `fq-tafsir-downloads-changed` custom event.** The singleton *is* the same-tab coordination point (every component renders from its one snapshot); only a native `storage` listener (added while it has subscribers) is needed for cross-tab.
- **One shared `AbortController` per run.** The first worker to hit a non-abort error aborts the pool, so a failed run stops promptly instead of finishing three more workers behind a failed row.
- **`ensureCachedBytes` extracted to `app/lib/offline/ensure-cached-bytes.ts`** and shared with `use-recitation-download.ts` (identical fetch→put→size sequence). It takes `{ fetcher, ignoreVary }`; tafsir passes a 3-attempt retrying fetcher and `ignoreVary: true`. `app/lib/tafsir/offline-cache.ts` wraps it as `cacheChapterBytes` and is the only module that opens the tafsir cache.
- **`preferCache` reduced to `navigator.onLine === false`.** Racing a downloaded edition's online reads against a 2 s timeout served a possibly-stale blob on any link slower than 2 s. Online now always runs the fetch to completion (the `NetworkOnly` SW rule already removed the 10 s cross-origin stall). The offline race no longer aborts the fetch — it stops waiting and serves cache — so a timeout is never re-surfaced as an `AbortError`. `editionHasOfflineDownload` (localStorage hand-roll in the provider) is gone.
- **`downloadSizeMb` is an optional field on `TafsirEdition`**, populated in the `TAFSIR_EDITIONS` catalog — not the `TAFSIR_EDITION_DOWNLOAD_MB` side table the plan sketched.
- **`TAFSIR_TOTAL_CHAPTERS` re-exports `QURAN_LAST_CHAPTER_ID`**; the mushaf-checkbox size comes from the existing `OFFLINE_DOWNLOAD_MB` constant; the checkbox fires `usePwaPrecache().start()` at most once per sheet mount (a `useRef` guard).
- **`quota-exceeded` keeps an enabled Retry** (the user may have freed space) with the warning icon and a "not enough space · N MB available" row label.
- **Retry predicate keys on `navigator.onLine === false`** rather than "confirmed blob-absent miss" — coarser, but an offline retry is a guaranteed no-op anyway, so the effect is the same.
- **`byChapterTafsirUrl` (a URL builder) is exported from `qdc-provider.ts`**; the download `fetch` happens in `download-manager.ts` rather than a provider `getChapterTafsir(): Response` method.
- New Vitest coverage in `app/lib/tafsir/qdc-provider.test.ts`: 503→blob, blob-present-verse-absent→`null`, blob-absent→rethrow, `AbortError`→rethrow-without-cache-read.
