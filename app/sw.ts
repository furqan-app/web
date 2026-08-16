/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, Serwist } from "serwist";
import {
  FALLBACK_LOCALES,
  PAGES_CACHE_NAME,
  PRECACHE_CONCURRENCY,
  PRECACHE_MUSHAF_ID,
  PRECACHE_SENTINEL_URL,
  TOTAL_PAGES,
  VERSE_PAGES_URL,
  fallbackDocumentUrl,
  offlineFallbackUrl,
  pageFontUrl,
  pageJsonUrl,
} from "@constants/offline";
import type { ClientToSwMessage, SwToClientMessage } from "@constants/offline";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Cheap non-cryptographic string hash (the classic Java String.hashCode
 * polynomial rolling hash, 31*hash+charCode) — a per-deploy fingerprint, not
 * a security boundary, so collision resistance beyond "changes whenever the
 * input changes" is not a requirement here.
 */
const hashString = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
};

// Captured once: InjectManifest string-injects the real manifest at exactly
// one `self.__SW_MANIFEST` reference in the source and fails the build
// ("Multiple instances... found") on a second one, so every other use below
// (both here and in the Serwist config) reads this local instead of
// re-referencing the global.
const precacheManifest = self.__SW_MANIFEST;

// Auto-versioned per deploy, derived from the precache manifest above (every
// entry's `revision` is a content hash, so this changes whenever ANY
// precached asset changes — true on effectively every real deploy).
// Deliberately NOT a webpack DefinePlugin custom value: a
// `process.env.X`/`self.__X__` DefinePlugin target added via
// `webpackCompilationPlugins` was tried first and silently never fired —
// verified by inspecting the built public/sw.js, which showed a genuine
// runtime property read instead of an inlined literal (the worker-target
// child compilation resolves bare `process` through its own polyfill, and the
// exact reason a `self.__*__` global missed too was not conclusively
// isolated). Reusing the manifest sidesteps that whole failure mode by
// depending only on a mechanism already proven correct in this build (its
// entries' real per-deploy content hashes are directly visible in the
// output). Deliberately NOT PAGES_CACHE_VERSION either, which stays manually
// bumped and scoped to font/JSON data-shape changes only (ADR 0014 Addendum
// 4) — a deploy must always bust this cache, but must never
// force-invalidate the 48 MB user download or re-trigger its consent gate.
const READER_HTML_CACHE_PREFIX = "reader-html-";
const READER_HTML_CACHE_NAME = `${READER_HTML_CACHE_PREFIX}${hashString(JSON.stringify(precacheManifest ?? []))}`;

const isSelfReaderPage = (url: URL) =>
  /^\/(ar|en)\/pages\/[0-9]+$/.test(url.pathname);

const isPageFont = (url: URL) =>
  /^\/fonts\/(v1|v4\/colrv1)\/woff2\/p[0-9]+\.woff2$/.test(url.pathname);

// Static per-page content JSON the pager fetches (ADR 0028) — immutable.
// Scoped per mushaf edition: page N of one edition holds different words than
// page N of another (ADR 0033).
const isPageJson = (url: URL) =>
  /^\/quran\/pages\/[0-9]+\/[0-9]+\.json$/.test(url.pathname);

// Per-edition verse_key → page map (ADR 0033) — immutable, same caching as page
// JSON. Without this, rub navigation and edition switching fall back to the
// default edition's page numbers when offline.
const isVersePagesJson = (url: URL) =>
  /^\/quran\/verse-pages\/[0-9]+\.json$/.test(url.pathname);

const serwist = new Serwist({
  precacheEntries: precacheManifest,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Reader-page HTML also carries the app shell (nav, layout, feature code),
    // which is NOT immutable — CacheFirst is only safe here because the cache
    // name is auto-versioned per deploy (READER_HTML_CACHE_NAME above), so a
    // fresh deploy always starts from an empty cache rather than ever serving
    // a genuinely stale response (ADR 0014 Addendum 4, superseding Addendum 1's
    // NetworkFirst fix for the same incident). `request.mode === "navigate"`
    // is load-bearing, not defensive: without it this matcher (registered
    // ahead of `...defaultCache` below) also wins for RSC soft-nav fetches to
    // the same pathname, which would let RSC flight-data get cached here and
    // later served back for a plain document request — the same failure shape
    // fix-rsc-cache-poisoning.md fixed at the CDN layer, relocated to this
    // layer (found in review before this shipped).
    {
      matcher: ({ url, request }) =>
        isSelfReaderPage(url) && request.mode === "navigate",
      handler: new CacheFirst({ cacheName: READER_HTML_CACHE_NAME }),
    },
    // Page fonts are genuinely immutable (Static Generation Strategy
    // decision) — once cached, never re-validated against the network.
    {
      matcher: ({ url }) => isPageFont(url),
      handler: new CacheFirst({ cacheName: PAGES_CACHE_NAME }),
    },
    {
      matcher: ({ url }) => isPageJson(url) || isVersePagesJson(url),
      handler: new CacheFirst({ cacheName: PAGES_CACHE_NAME }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// Deletes stale reader-html-* caches from a previous deploy on activate — the
// counterpart to READER_HTML_CACHE_NAME's auto-versioning (ADR 0014 Addendum
// 4). Without this, every deploy leaves the previous version's cached HTML
// orphaned in Cache Storage forever. Matches on the prefix only — must never
// touch PAGES_CACHE_NAME (the 48 MB user download) or any Serwist-managed
// precache cache, neither of which share this prefix.
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith(READER_HTML_CACHE_PREFIX) &&
              name !== READER_HTML_CACHE_NAME,
          )
          .map((name) => caches.delete(name)),
      );
    })(),
  );
});

// Offline-navigation fallback. Fires when any matched route's strategy fails
// to produce a response — network error with no cache hit — regardless of
// which specific rule (isSelfReaderPage, defaultCache's rsc/html/others
// buckets) matched the request. Only navigation requests get a fallback
// document; any other failed request (an API call, an asset) surfaces as a
// real network error rather than silently succeeding with the wrong content.
//
// Route-aware (ADR 0014 Addendum 4): a reader-page URL keeps the original
// Quran page-1 fallback (ADR 0014 Addendum 3) — ReaderPager's jumpTo
// self-corrects to the actually-requested page once it mounts (ADR 0042).
// Every OTHER route (home, /plans, /settings, ...) used to get that same
// Quran fallback too, leaving the user stuck looking at Quran page 1's
// content at the wrong URL with no way to self-correct — there is no
// jumpTo-equivalent for a non-reader route. Those now get a small dedicated
// offline document instead (terminal state, not flash-then-corrects).
serwist.setCatchHandler(async ({ request, url }) => {
  if (request.mode !== "navigate") return Response.error();
  const locale =
    FALLBACK_LOCALES.find((l) => url.pathname.startsWith(`/${l}/`)) ??
    FALLBACK_LOCALES[0];

  if (isSelfReaderPage(url)) {
    const cache = await caches.open(READER_HTML_CACHE_NAME);
    const fallback = await cache.match(fallbackDocumentUrl(locale));
    return fallback ?? Response.error();
  }

  // Precached via globPublicPatterns (next.config.mjs), same as launch.html —
  // matchPrecache resolves it regardless of which cache Serwist's own
  // versioning happens to store the precache manifest under.
  const fallback = await serwist.matchPrecache(offlineFallbackUrl(locale));
  return fallback ?? Response.error();
});

// Precache the reader fallback document itself — page 1's real reader-page
// HTML for both locales — at install time, for every visitor. Independent of
// the consent-gated bulk download (must work before that has ever run) and
// tiny next to it, so no standalone/consent gate applies here, unlike the
// page fonts and bulk JSON PAGES_CACHE_NAME holds. Best-effort: a failure
// here (installing while offline) just means no fallback exists yet until a
// later online visit. Lives in READER_HTML_CACHE_NAME, not PAGES_CACHE_NAME
// (ADR 0014 Addendum 4) — it's reader HTML like any other, so it needs the
// same per-deploy auto-refresh; the old shared cache location meant this one
// document was fetched once at first install and never revalidated again,
// its own smaller instance of the staleness class the rest of this addendum
// fixes. It shares its cache key with isSelfReaderPage's own CacheFirst rule,
// so any ordinary online visit to page 1 populates it too — this seed is only
// for a visitor who is offline before ever reaching page 1 normally.
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(READER_HTML_CACHE_NAME);
      await Promise.all(
        FALLBACK_LOCALES.map((locale) => ensureCached(cache, fallbackDocumentUrl(locale))),
      );
    })(),
  );
});

// Bulk pre-cache of the base mushaf. User-initiated on an explicit tap — the
// client (use-pwa-precache hook) never auto-starts it, on any surface (ADR 0014
// Addendum 2). The precache set (slim JSON + base fonts) is locale-independent
// Quran content — the localized app shell is precached via the Serwist build
// manifest, not here.
// A service worker is killed and restarted freely, so these live only as long as
// the worker does. That is correct: a run cannot outlive the worker executing it,
// and a restarted worker legitimately has no run in flight. `activeRunId`
// identifies the current run so a CANCEL can only stop the run it names —
// Chromium shares one worker between the browser tab and the installed PWA
// (a sharing this feature relies on), so an unscoped cancel let one surface abort
// a download another surface was actively displaying.
let activeRunId: number | null = null;
let cancelledRunId: number | null = null;
let nextRunId = 1;

async function postToClients(message: SwToClientMessage) {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) client.postMessage(message);
}

/** Named fields — two adjacent booleans were trivially transposable at a call site. */
const reportProgress = (args: {
  runId: number;
  cached: number;
  failed: number;
  complete: boolean;
  done?: boolean;
}) =>
  postToClients({
    type: "PRECACHE_PROGRESS",
    runId: args.runId,
    cached: args.cached,
    failed: args.failed,
    total: TOTAL_PAGES,
    complete: args.complete,
    done: args.done ?? false,
  });

/** Fetch + store `url` unless already cached. Returns whether it is now cached. */
async function ensureCached(cache: Cache, url: string) {
  const request = new Request(url);
  if (await cache.match(request)) return true;
  try {
    const response = await fetch(request);
    if (!response.ok) return false;
    await cache.put(request, response);
    return true;
  } catch {
    // Offline or a network error mid-run — a failure to count, not a throw that
    // would abandon the whole run and leave the client waiting forever.
    return false;
  }
}

// Precache the slim content JSON + base font per page — NOT the ~2.6 MB SSR
// HTML (ADR 0028). The persistent pager renders any page client-side from this
// JSON + font once the app shell is loaded, so bulk-caching per-page HTML
// (~1.5 GB for 604 pages) is unnecessary. Visited page HTML is still
// runtime-cached (isSelfReaderPage, NetworkFirst) for offline cold-entry.
async function cachePage(cache: Cache, id: number) {
  const results = await Promise.all([
    ensureCached(cache, pageFontUrl(id)),
    ensureCached(cache, pageJsonUrl(id)),
  ]);
  // A page counts only when BOTH its font and its JSON are present — either one
  // missing means the pager cannot render it offline.
  return results.every(Boolean);
}

/**
 * The sentinel plus an actual page count — the sentinel alone would report a
 * partially-evicted cache as ready (iOS evicts entries out from under a completed
 * run; ADR 0014). Costs one cache.keys() and no per-entry reads, so it still
 * avoids the 604-page re-walk this replaced (Trello #129).
 */
async function isCacheComplete(cache: Cache, knownCount?: number) {
  if (!(await cache.match(PRECACHE_SENTINEL_URL))) return false;
  if (!(await cache.match(VERSE_PAGES_URL))) return false;
  const cached = knownCount ?? (await countCachedPages(cache));
  return cached === TOTAL_PAGES;
}

/** A page is cached only when both its font and its JSON are present. */
async function countCachedPages(cache: Cache) {
  const fontIds = new Set<string>();
  const jsonIds = new Set<string>();
  const jsonPattern = new RegExp(
    `^/quran/pages/${PRECACHE_MUSHAF_ID}/([0-9]+)\\.json$`,
  );

  for (const request of await cache.keys()) {
    const { pathname } = new URL(request.url);
    const font = /^\/fonts\/v1\/woff2\/p([0-9]+)\.woff2$/.exec(pathname);
    if (font) {
      fontIds.add(font[1]);
      continue;
    }
    const json = jsonPattern.exec(pathname);
    if (json) jsonIds.add(json[1]);
  }

  let cached = 0;
  fontIds.forEach((id) => {
    if (jsonIds.has(id)) cached++;
  });
  return cached;
}

async function precacheAllPages() {
  if (activeRunId !== null) return;
  const runId = nextRunId++;
  activeRunId = runId;
  const isCancelled = () => cancelledRunId === runId;

  try {
    const cache = await caches.open(PAGES_CACHE_NAME);

    // Short-circuit a complete cache instead of re-walking all 604 pages on
    // every launch, which is what Trello #129 reported. A partially-evicted
    // cache deliberately fails this check and falls through to a resuming run,
    // which refetches only what is missing.
    if (await isCacheComplete(cache)) {
      activeRunId = null;
      await reportProgress({
        runId,
        cached: TOTAL_PAGES,
        failed: 0,
        complete: true,
        done: true,
      });
      return;
    }

    // The per-edition verse_key → page map. Without it, rub navigation and
    // edition switching fall back to the default edition's page numbers offline.
    const versePagesOk = await ensureCached(cache, VERSE_PAGES_URL);

    let cached = 0;
    let failed = 0;

    for (let id = 1; id <= TOTAL_PAGES; id += PRECACHE_CONCURRENCY) {
      if (isCancelled()) break;
      const batch: number[] = [];
      for (let n = id; n < id + PRECACHE_CONCURRENCY && n <= TOTAL_PAGES; n++) {
        batch.push(n);
      }
      const results = await Promise.all(
        batch.map((page) => cachePage(cache, page)),
      );
      for (const ok of results) {
        if (ok) cached++;
        else failed++;
      }
      await reportProgress({ runId, cached, failed, complete: false });
    }

    const complete =
      !isCancelled() && versePagesOk && cached === TOTAL_PAGES && failed === 0;
    if (complete) {
      await cache.put(
        new Request(PRECACHE_SENTINEL_URL),
        new Response("", { status: 200 }),
      );
    }
    // Release the run BEFORE the awaited final report: a START arriving while
    // that postMessage was in flight used to be dropped silently, leaving a
    // client that had already flipped to `running` with no run behind it
    // (reachable by tapping Retry the instant `partial` appears).
    activeRunId = null;
    await reportProgress({ runId, cached, failed, complete, done: true });
  } finally {
    if (activeRunId === runId) activeRunId = null;
  }
}

async function reportStatus() {
  const cache = await caches.open(PAGES_CACHE_NAME);
  const cached = await countCachedPages(cache);
  // Reuse the count — isCacheComplete would otherwise walk cache.keys() a second
  // time, once per mounted hook instance.
  const complete = await isCacheComplete(cache, cached);
  // Drop a sentinel the cache can no longer back up, so the next run rewrites it
  // only once the missing pages are actually refetched.
  if (!complete) await cache.delete(PRECACHE_SENTINEL_URL);
  await postToClients({
    type: "PRECACHE_STATUS",
    runId: activeRunId,
    cached,
    total: TOTAL_PAGES,
    complete,
    running: activeRunId !== null,
  });
}

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data as ClientToSwMessage;
  if (data?.type === "START_PRECACHE") {
    event.waitUntil(precacheAllPages());
  } else if (data?.type === "REQUEST_PRECACHE_STATUS") {
    event.waitUntil(reportStatus());
  } else if (data?.type === "CANCEL_PRECACHE") {
    // Only the run the client names — never whatever happens to be running now.
    if (data.runId === activeRunId) cancelledRunId = data.runId;
  }
});

// Base notification system (ADR 0037) — Web Push handlers.
type PushNotificationData = { title?: string; body?: string; url?: string; notificationId?: number };

self.addEventListener("push", (event: PushEvent) => {
  let data: PushNotificationData = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = {};
  }

  const title = data.title ?? "Furqan";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.notificationId ? String(data.notificationId) : undefined,
      data: { url: data.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/";

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        await existing.navigate(url);
        await existing.focus();
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});

type PushSubscriptionChangeEvent = ExtendableEvent & { oldSubscription: PushSubscription | null };

self.addEventListener("pushsubscriptionchange", ((event: PushSubscriptionChangeEvent) => {
  event.waitUntil(
    (async () => {
      const applicationServerKey = event.oldSubscription?.options.applicationServerKey ?? undefined;
      const subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      const json = subscription.toJSON();
      await fetch("/api/notifications/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
    })()
  );
}) as EventListener);
