# ADR 0060: Offline Tafsir via per-edition whole-Quran chapter-blob download, served by a provider cache fallback

**Date:** 2026-09-03
**Status:** Accepted

## Context

Tafsir commentary is fetched client-side, one verse at a time, from QDC's public
`tafsirs/{id}/by_ayah/{key}` endpoint (ADR 0048); offline, `getTafsir` throws.
ADR 0046 gave offline recitation a transparent model — the service worker
`CacheFirst`-matches the live audio URL, so the player is untouched — but that
works only because the URL played is the URL downloaded. A whole tafsir edition
is the whole Quran (6,236 verses). QDC also exposes
`tafsirs/{id}/by_chapter/{n}?per_page=N`, returning an entire surah in one
request. Measured full-edition sizes: Al-Muyassar ≈ 2.6 MB stored, Al-Tabari
≈ 47.7 MB, average ≈ 18 MB — a fraction of the 48 MB bulk mushaf-page download.

## Options Considered

**Option A — Transparent, per-ayah (mirror ADR 0046)**
Download every `by_ayah/{key}` URL and `cache.put` it under that exact key, add a
`CacheFirst` service-worker rule on the QDC tafsir host; `useTafsir` then works
offline with zero provider changes. Rejected: a full edition is 6,236 tiny
requests — minutes long, cannot survive tab backgrounding.

**Option B — Chapter fetch, per-ayah cache writes**
Fetch `by_chapter` (114 requests) but fan each response out to per-verse
`cache.put`s under synthetic `by_ayah`-shaped Response objects, preserving Option
A's transparent SW-served model at Option A's request count. Rejected: ~6,236
cache entries per edition and a synthesized `Response` per verse, for no
functional gain over a direct provider read of the 114 blobs already in hand.

**Option C — Per-edition chapter blobs, provider cache fallback (chosen)**
Download `by_chapter/{n}?per_page=300` for all 114 surahs (~114 requests/edition)
under a synthetic key, and give `getTafsir` a fallback branch that reads the
matching chapter blob and finds the verse in it.

**Option D — IndexedDB instead of Cache Storage**
Store the chapter JSON in IndexedDB with `navigator.storage.persist()`. More
durable against iOS's Cache Storage eviction, and the payload is plain JSON, not
an HTTP response that needs replaying. Rejected for consistency: every other
offline surface in the app is Cache Storage (`PAGES_CACHE_NAME`,
`recitation-download-v{N}`), the eviction risk is mitigated by the same
count-validation healing those use (ADR 0014 Addendum 10), and a second storage
technology is a maintenance cost. Revisit if iOS eviction proves worse here than
for pages.

**Option E — Build-time / self-hosted tafsir dataset**
Ship the commentaries as static JSON like `public/quran/pages/*.json`, generated
by the existing seeder. Would make offline tafsir free and remove QDC from the
offline path entirely. Rejected for now: licensing/attribution review of
redistributing six full commentaries is out of this issue's scope, and it would
not serve online reads (still QDC). A strong candidate for a later ADR.

## Decision

Option C. A tafsir edition is downloaded as 114 `by_chapter` responses stored in
a dedicated `tafsir-download-v1` cache under synthetic keys
`/__fq-tafsir/{editionId}/{chapter}`. `qdcTafsirProvider.getTafsir` tries the
live `by_ayah` fetch first (network-first — the blob is a safety net, not a
freshness regression) and falls back to `readCachedVerseTafsir(id, key)` when the
fetch **rejects** (network error / offline) or resolves **`>= 500`** — verified
live: QDC returns 503, not 404, for a verse with no commentary record. An
`AbortError` is rethrown untouched (React Query aborts the prior query on every
verse step). A 404 still maps to `null`; other 4xx still throw. When the blob is
present but the verse is absent from it — which `by_chapter` legitimately allows,
some editions omit uncommented verses — the fallback returns `null` (the existing
empty state), never an error; it rethrows only when the chapter blob itself is
missing.

The service worker is touched **minimally**: one `NetworkOnly` rule for the QDC
tafsir host, because `defaultCache`'s cross-origin `NetworkFirst` rule would
otherwise mirror all 114 `by_chapter` responses into the shared 32-entry
`cross-origin` cache and impose its 10 s timeout on every offline `by_ayah` read.
No `CacheFirst` rule and no message contract — the download URL (`by_chapter`)
and the live read URL (`by_ayah`) differ, so a `CacheFirst` rule could never be
populated by the download, and the provider owning the fallback keeps the rest of
`app/sw.ts` untouched.

The whole download lifecycle is a **module singleton** (`download-manager.ts`)
consumed through `useSyncExternalStore`, so an in-flight run survives the
Settings sheet unmounting and cannot be double-started. The download is a
foreground client `fetch` + `cache.put` loop (concurrency 4, 3-attempt
per-chapter retry with backoff against a rate-limiting third-party API,
skip-if-cached, one shared `AbortController` so the first failure stops the other
workers), resumable on Retry. A `localStorage` registry entry is written only on
a full 114/114 run and is **not** trusted on its own: `verifyAndHeal()` validates
each entry against a live `listCachedChapters(id).length === 114` count on the
first subscribe and on every cross-tab `storage` change, healing a short cache to
a resumable `failed` state — the tafsir counterpart of ADR 0014 Addendum 10. A
`QuotaExceededError` is surfaced as a distinct "not enough space" state, not a
generic failure. It is Settings-only and standalone-PWA-gated, like ADR 0046.

Whole-edition is the only granularity (no per-surah / per-juz picker): the sizes
are modest and one tap buys a coherent "this whole commentary works offline"
guarantee. The download does **not** bundle mushaf page assets; when the active
mushaf edition's bulk precache is incomplete, the sheet offers a checkbox that
also fires the existing `usePwaPrecache().start()` for that edition in parallel.

## Consequences

- **+** ~114 requests per edition instead of ~6,236; a full edition download is a
  short, foreground-tolerable action.
- **+** `app/sw.ts` gains exactly one `NetworkOnly` rule (plus prefixed cache
  cleanup) — no second service-worker download subsystem, no message contract.
- **+** `useTafsir` / `tafsirQueryKey` unchanged; the only consumer change is a
  narrowly-scoped `try/catch` around the `by_ayah` `fetch` in the provider.
- **+** Chapter blobs are atomic and idempotent — a partially-written or
  partially-evicted cache is always safe (the provider falls back to the network
  for absent chapters), so Retry resumes for free.
- **-** Diverges from ADR 0046's transparent model — offline tafsir has its own
  cache-read path in the provider rather than a URL the service worker serves.
- **-** No per-surah / per-juz granularity: a user wanting one surah's commentary
  offline must download the whole edition.
- **-** The offline fallback holds a whole surah's JSON in memory to find one
  verse (largest single blob ≈ 1.6 MB, Ibn Kathir Al-Baqarah).
- **-** The `getTafsir` error model must now distinguish abort / 5xx / 404 / other
  4xx / network rejection precisely — a subtler branch than the pre-offline path.
- **-** iOS Cache Storage eviction can silently invalidate a completed download;
  mitigated by `verifyAndHeal()` on subscribe and on cross-tab changes, not
  eliminated (an eviction mid-session is caught on the next sheet open, not the
  instant it happens).
- **-** Two more moving parts than "nothing" — a feature cache
  (`tafsir-download-v1`) and a `localStorage` registry — plus a module singleton
  standing in for React state so the download survives the sheet unmounting.
- **-** Online, a downloaded edition still hits the network for every verse read
  (network-first); the blob only serves when `navigator.onLine === false` or the
  fetch fails, so a downloaded edition is not a latency win while connected.
