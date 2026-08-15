// Shared between the service worker (app/sw.ts) and the client hook
// (app/hooks/use-pwa-precache.ts). Both sides key storage off
// PAGES_CACHE_VERSION, so it must never be duplicated as a literal in either
// file — a drift would leave the dismissed flag and the cache pointing at
// different versions. See ADR 0014.

// Bumped manually (never automatically on every deploy) when a change affects
// cached page output (reader markup, font logic).
// v2: per-page content JSON moved under /quran/pages/{mushafId}/ when mushaf
// editions gained their own word placement (ADR 0033), so every v1 JSON entry
// is a stale path and must not be served.
export const PAGES_CACHE_VERSION = 2;
export const PAGES_CACHE_NAME = `pages-v${PAGES_CACHE_VERSION}`;

export const TOTAL_PAGES = 604;

// The DEFAULT edition only. Bulk-precaching a second edition would roughly
// double the installed cache against an already-fragile iOS quota, and the
// tajweed edition's COLRv1 fonts are excluded for the same reason
// (ADR 0014, ADR 0023). Non-default editions load over the network on demand
// and are still runtime-cached once fetched.
export const PRECACHE_MUSHAF_ID = 2;

export const pageFontUrl = (id: number) => `/fonts/v1/woff2/p${id}.woff2`;
export const pageJsonUrl = (id: number) =>
  `/quran/pages/${PRECACHE_MUSHAF_ID}/${id}.json`;
export const VERSE_PAGES_URL = `/quran/verse-pages/${PRECACHE_MUSHAF_ID}.json`;

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
// Living inside the versioned cache name makes it version-scoped for free, and
// reduces a completion check to one cache.match() instead of enumerating ~1200
// entries. Never written for a partial run — a 603/604 cache cannot serve
// offline and must not report "ready".
// The sentinel alone is NOT proof of a servable cache — iOS can evict entries out
// from under a completed run (ADR 0014), and the old code only self-healed from
// that because it re-walked every page on every launch. It is therefore always
// validated against a page count derived from cache.keys() (pure string work, no
// per-entry reads) before being trusted. Do not treat its mere presence as
// "ready"; a partially-evicted cache must fall back to a resumable run.
export const PRECACHE_SENTINEL_URL = "/__fq-precache-complete";

// localStorage key recording that the user dismissed a download surface
// (completed, skipped, or continued past failures). Version-scoped so a
// deliberate PAGES_CACHE_VERSION bump re-prompts. Set on dismissal only —
// never on download start, so an interrupted run is re-offered rather than
// silently abandoned.
export const PRECACHE_DISMISSED_KEY = `fq-offline-prompt-dismissed-v${PAGES_CACHE_VERSION}`;

// Approximate wire size of a full base-mushaf precache, shown to the user
// before anything transfers. Measured 2026-08-10: 45.7 MiB of per-page WOFF2
// (already compressed, ~95% of the total) + ~2.0 MiB of gzipped per-page JSON
// + 12 KB verse-pages map. Re-measure with:
//   du -sb public/fonts/v1/woff2
//   for f in public/quran/pages/2/*.json; do gzip -6 -c "$f" | wc -c; done
export const OFFLINE_DOWNLOAD_MB = 48;

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

/** Sent page → service worker. `runId` scopes a cancel to the run that owns it. */
export type ClientToSwMessage =
  | { type: "START_PRECACHE" }
  | { type: "REQUEST_PRECACHE_STATUS" }
  | { type: "CANCEL_PRECACHE"; runId: number };

/** Sent service worker → every window client. */
export type SwToClientMessage =
  | {
      type: "PRECACHE_PROGRESS";
      runId: number;
      cached: number;
      failed: number;
      total: number;
      complete: boolean;
      done: boolean;
    }
  | {
      type: "PRECACHE_STATUS";
      runId: number | null;
      cached: number;
      total: number;
      complete: boolean;
      running: boolean;
    };
