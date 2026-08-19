// Shared between the service worker (app/sw.ts) and the client hook
// (app/hooks/use-pwa-precache.ts). Both sides key storage off
// PAGES_CACHE_VERSION, so it must never be duplicated as a literal in either
// file — a drift would leave the dismissed flag and the cache pointing at
// different versions. See ADR 0014.
//
// mushaf-editions.ts has no DOM/React dependency (plain data), so importing
// it here — and transitively into the service worker — is safe.
import { DEFAULT_MUSHAF_ID, getMushafEdition } from "@utils/mushaf-editions";

// Bumped manually (never automatically on every deploy) when a change affects
// cached page output (reader markup, font logic).
// v2: per-page content JSON moved under /quran/pages/{mushafId}/ when mushaf
// editions gained their own word placement (ADR 0033), so every v1 JSON entry
// is a stale path and must not be served.
export const PAGES_CACHE_VERSION = 2;
export const PAGES_CACHE_NAME = `pages-v${PAGES_CACHE_VERSION}`;

export const TOTAL_PAGES = 604;

// Bulk precache is edition-parameterized (ADR 0014 Addendum 5) — any
// registered edition can be independently downloaded from the Settings
// "Mushaf Layout" list, with its own sentinel/dismissed-flag/progress state.
// The first-run gate and post-install prompt stay scoped to DEFAULT_MUSHAF_ID
// only (ADR 0014 Addendum 2 still stands for those two surfaces).
export const pageFontUrl = (mushafId: number, id: number) =>
  getMushafEdition(mushafId).fontUrl(id);
export const pageJsonUrl = (mushafId: number, id: number) =>
  getMushafEdition(mushafId).pageJsonUrl(id);
export const versePagesUrl = (mushafId: number) =>
  `/quran/verse-pages/${mushafId}.json`;

// Hardcoded rather than imported from i18n/routing.ts — that module pulls in
// next-intl's routing/navigation code, which has no reason to be bundled into
// the service worker. isSelfReaderPage below (and its sibling matchers)
// already hardcode the same two locales; mirrors that convention.
export const FALLBACK_LOCALES = ["ar", "en"] as const;

// The offline-navigation fallback document (ADR 0014 Addendum 3): page 1's
// real reader-page HTML, precached at service-worker install for every
// visitor (both locales) — independent of, and much smaller than, the
// consent-gated bulk 604-page download, so it works even on a fresh install
// before that download has ever run. Registered as the setCatchHandler
// fallback in app/sw.ts for a failed navigation request; ReaderPager then
// self-corrects to whatever page was actually requested (or the last-read
// page) once it mounts.
export const fallbackDocumentUrl = (locale: (typeof FALLBACK_LOCALES)[number]) =>
  `/${locale}/pages/1`;

// Offline fallback for every OTHER failed navigation (ADR 0014 Addendum 4) — a
// failed nav to a non-reader route (e.g. /plans, /settings) used to also get
// fallbackDocumentUrl's Quran page-1 document, which left the user stuck
// looking at the wrong app with no self-correction (unlike the reader route,
// there is no jumpTo-equivalent for these routes). Static file, same
// no-React-runtime shape as launch.html — see public/offline-{ar,en}.html.
export const offlineFallbackUrl = (locale: (typeof FALLBACK_LOCALES)[number]) =>
  `/offline-${locale}.html`;

// Synthetic cache entry written only after a fully successful precache run.
// Per-edition (ADR 0014 Addendum 5) — a shared sentinel would report an
// edition "ready" the instant any OTHER edition's run finished. Living inside
// the versioned cache name makes it version-scoped for free, and reduces a
// completion check to one cache.match() instead of enumerating ~1200 entries.
// Never written for a partial run — a 603/604 cache cannot serve offline and
// must not report "ready".
// The sentinel alone is NOT proof of a servable cache — iOS can evict entries out
// from under a completed run (ADR 0014), and the old code only self-healed from
// that because it re-walked every page on every launch. It is therefore always
// validated against a page count derived from cache.keys() (pure string work, no
// per-entry reads) before being trusted. Do not treat its mere presence as
// "ready"; a partially-evicted cache must fall back to a resumable run.
export const precacheSentinelUrl = (mushafId: number) =>
  `/__fq-precache-complete-${mushafId}`;

// localStorage key recording that the user dismissed a download surface for a
// given edition (completed, skipped, or continued past failures). Per-edition
// for the same reason the sentinel is — dismissing the default edition's
// surface must not silently dismiss Tajweed's. Version-scoped so a deliberate
// PAGES_CACHE_VERSION bump re-prompts. Set on dismissal only — never on
// download start, so an interrupted run is re-offered rather than silently
// abandoned.
export const precacheDismissedKey = (mushafId: number) =>
  `fq-offline-prompt-dismissed-v${PAGES_CACHE_VERSION}-${mushafId}`;

// Approximate wire size of a full precache, per edition, shown to the user
// before anything transfers — see each edition's `downloadSizeMb` in
// mushaf-editions.ts for the measurement note. Re-measure with:
//   du -sb public/fonts/v1/woff2 public/fonts/v4/colrv1/woff2
//   for f in public/quran/pages/{2,19}/*.json; do gzip -6 -c "$f" | wc -c; done
export const OFFLINE_DOWNLOAD_MB = getMushafEdition(DEFAULT_MUSHAF_ID).downloadSizeMb;

// Fetch this many pages at once. There is deliberately no inter-page delay: the
// precache is always foreground and user-initiated now, so nothing competes with
// it for bandwidth. The previous 200ms-per-page throttle existed to protect an
// active reader's font fetches from a silent background precache, and imposed a
// hard 604 x 200ms ~= 2 minute floor. See ADR 0014 Addendum 2.
export const PRECACHE_CONCURRENCY = 6;

// ---------------------------------------------------------------------------
// Message contract between the page and the service worker.
//
// Both sides import these types so the payloads cannot drift silently: the SW
// posts `SwToClientMessage` and the hook narrows on the same union. A bare
// `Record<string, unknown>` on the SW side let a renamed field compile fine on
// one side and read as `undefined` on the other.
// ---------------------------------------------------------------------------

/**
 * Sent page → service worker. `mushafId` scopes every message to one edition's
 * run — two editions can download independently, so `runId` alone (unique but
 * edition-blind) is not enough to route a message to the right row. `runId`
 * still scopes a cancel to the specific run within that edition.
 */
export type ClientToSwMessage =
  | { type: "START_PRECACHE"; mushafId: number }
  | { type: "REQUEST_PRECACHE_STATUS"; mushafId: number }
  | { type: "CANCEL_PRECACHE"; mushafId: number; runId: number };

// ---------------------------------------------------------------------------
// Offline Recitation Audio (ADR 0046) — per-surah/juz downloads, reciter-
// scoped. Shared between app/sw.ts (the CacheFirst+RangeRequestsPlugin
// runtime rule) and app/hooks/use-recitation-download.ts (the client-side
// fetch+cache.put download step). Unlike the bulk page/font precache above,
// the download action itself does not go through service-worker
// message-passing — a single chapter's download is short enough to not need
// to survive tab backgrounding — so there is no message contract here, only
// the shared cache name and audio-CDN host.
// ---------------------------------------------------------------------------

// Bumped manually when the cached audio/metadata shape changes.
export const RECITATION_DOWNLOAD_CACHE_VERSION = 1;
export const RECITATION_DOWNLOAD_CACHE_NAME = `recitation-download-v${RECITATION_DOWNLOAD_CACHE_VERSION}`;

// QDC's audio CDN — confirmed live (2026-08-17) to be stable across every
// reciter tested (only the path varies), and to send
// `access-control-allow-origin: *` + `accept-ranges: bytes` — the CORS and
// Range-request support RangeRequestsPlugin needs to serve real `<audio>`
// seeks from a fully-cached cross-origin response.
export const RECITATION_AUDIO_HOST = "download.quranicaudio.com";

// The registry of what's deliberately downloaded lives in localStorage under
// the "recitationDownloads" key via app/utils/storage.ts's typed helper — no
// separate constant needed here, since a service worker has no synchronous
// localStorage access and this key is never read from app/sw.ts.

/** Sent service worker → every window client; each hook instance filters by `mushafId`. */
export type SwToClientMessage =
  | {
      type: "PRECACHE_PROGRESS";
      mushafId: number;
      runId: number;
      cached: number;
      failed: number;
      total: number;
      complete: boolean;
      done: boolean;
    }
  | {
      type: "PRECACHE_STATUS";
      mushafId: number;
      runId: number | null;
      cached: number;
      total: number;
      complete: boolean;
      running: boolean;
    };
