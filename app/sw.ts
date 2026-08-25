/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, RangeRequestsPlugin, Serwist } from "serwist";
import {
  FALLBACK_LOCALES,
  PAGES_CACHE_NAME,
  PRECACHE_CONCURRENCY,
  RECITATION_AUDIO_HOST,
  RECITATION_DOWNLOAD_CACHE_NAME,
  fallbackDocumentUrl,
  offlineFallbackUrl,
  pageFontUrl,
  pageJsonUrl,
  precacheSentinelUrl,
  versePagesUrl,
} from "@constants/offline";
import type { ClientToSwMessage, SwToClientMessage } from "@constants/offline";
import { DEFAULT_MUSHAF_ID, getMushafEdition } from "@utils/mushaf-editions";

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

// ADR 0014 Addendum 6: a cache miss on a slow-but-alive connection must not
// stall a cold launch for the full SSR document fetch — the catch handler only
// fires on network error, never on slowness. The reader-page handler below is
// therefore a four-row decision tree instead of a bare CacheFirst: cache hit →
// serve; miss + bulk precache complete → serve the precached fallback shell
// instantly, network untouched; miss otherwise → race the navigation-preloaded
// fetch against this timeout, fallback wins → serve the shell while the fetch
// continues in the background and is still cached under its real URL on
// arrival. Slow 3G document loads take 5–20s; merely-meh 4G (~1s) should still
// land real HTML, hence 3s and nothing lower.
const READER_NAV_FALLBACK_TIMEOUT_MS = 3000;

/**
 * Memoized completeness probe for row 2 — runs ONLY on a reader-HTML cache
 * miss, so one cold launch pays the ~604-entry `cache.keys()` walk at most
 * once per worker lifetime. Reset when a bulk precache run completes, so a
 * download finishing mid-session activates row 2 without waiting for the
 * worker to restart.
 */
let defaultPrecacheCompletePromise: Promise<boolean> | undefined;

function isDefaultPrecacheComplete(): Promise<boolean> {
  if (!defaultPrecacheCompletePromise) {
    defaultPrecacheCompletePromise = caches
      .open(PAGES_CACHE_NAME)
      .then((cache) => isCacheComplete(cache, DEFAULT_MUSHAF_ID))
      .catch(() => false);
  }
  return defaultPrecacheCompletePromise;
}

async function serveReaderFallbackShell(url: URL) {
  const locale =
    FALLBACK_LOCALES.find((l) => url.pathname.startsWith(`/${l}/`)) ??
    FALLBACK_LOCALES[0];
  const cache = await caches.open(READER_HTML_CACHE_NAME);
  return cache.match(fallbackDocumentUrl(locale));
}

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

// Juz start positions — verse_key + default-edition start page per juz,
// generated once from the rubs table. Immutable; same treatment as
// verse-pages so home-page juz jump rows resolve offline (ADR 0033).
const isJuzStartsJson = (url: URL) => url.pathname === "/quran/juz-starts.json";

// Offline Recitation Audio (ADR 0046). The chapter-audio metadata route
// RecitationContext.play() already calls — caching its exact response is what
// lets a downloaded item's play() call resolve fully offline with zero
// changes to that function. Immutable per reciter+chapter.
const isRecitationChapterApi = (url: URL) =>
  /^\/api\/quran\/recitations\/[0-9]+\/chapters\/[0-9]+$/.test(url.pathname);

// QDC's audio CDN — cross-origin, confirmed to send
// access-control-allow-origin: * and accept-ranges: bytes (ADR 0046). audio.src
// keeps pointing at this live URL always; this rule is what makes it resolve
// from cache when a download has populated RECITATION_DOWNLOAD_CACHE_NAME.
const isRecitationAudio = (url: URL) => url.hostname === RECITATION_AUDIO_HOST;

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
    //
    // The miss path is ADR 0014 Addendum 6's decision tree, not a bare
    // CacheFirst — see READER_NAV_FALLBACK_TIMEOUT_MS above.
    {
      matcher: ({ url, request }) =>
        isSelfReaderPage(url) && request.mode === "navigate",
      handler: {
        handle: async ({ event, request, url }) => {
          const cache = await caches.open(READER_HTML_CACHE_NAME);
          const cached = await cache.match(request);
          if (cached) return cached;

          // Row 2 — complete precache means every page renders client-side
          // from cached JSON + font once the shell mounts (the pre-paint
          // jumpTo self-correction, ADR 0042), so SSR HTML adds nothing but
          // the network wait.
          if (await isDefaultPrecacheComplete()) {
            const shell = await serveReaderFallbackShell(url);
            if (shell) return shell;
            // No shell cached (e.g. install never completed online) — fall
            // through to the network race below.
          }

          // Row 3 — race the network against the timeout. navigationPreload
          // is enabled, so consume the preloaded response rather than issuing
          // a duplicate document fetch. A rejection here propagates so the
          // route-level catch handler still serves its fallback.
          let timer: ReturnType<typeof setTimeout> | undefined;
          const network = (async () => {
            const fetchEvent = event as FetchEvent;
            const preload =
              "preloadResponse" in fetchEvent ? await fetchEvent.preloadResponse : undefined;
            return preload ?? fetch(request);
          })().then(async (response) => {
            if (timer !== undefined) clearTimeout(timer);
            // Late caching flows through here too when the timeout already
            // won: the response lands under its real URL, making this page a
            // cache-hit for every future launch.
            if (response && response.ok) await cache.put(request, response.clone());
            return response;
          });

          const timeout = new Promise<undefined>((resolve) => {
            timer = setTimeout(() => resolve(undefined), READER_NAV_FALLBACK_TIMEOUT_MS);
          });

          const response = await Promise.race([network, timeout]);
          if (response !== undefined) return response;

          // Timer won. Serve the fallback shell; keep the background fetch
          // alive (and swallow a late failure — we've already answered).
          const shell = await serveReaderFallbackShell(url);
          if (!shell) {
            // Row 4 — nothing to fall back to; today's terminal behavior.
            return network;
          }
          event.waitUntil(network.then(() => {}, () => {}));
          return shell;
        },
      },
    },
    // Page fonts are genuinely immutable (Static Generation Strategy
    // decision) — once cached, never re-validated against the network.
    {
      matcher: ({ url }) => isPageFont(url),
      handler: new CacheFirst({ cacheName: PAGES_CACHE_NAME }),
    },
    {
      matcher: ({ url }) => isPageJson(url) || isVersePagesJson(url) || isJuzStartsJson(url),
      handler: new CacheFirst({ cacheName: PAGES_CACHE_NAME }),
    },
    // Offline Recitation Audio (ADR 0046) — both immutable per reciter+chapter
    // once cached. The audio rule carries RangeRequestsPlugin so a fully-cached
    // response can still serve real byte-range <audio> seeks offline; without
    // it CacheFirst would only ever return the whole file for every request.
    {
      matcher: ({ url }) => isRecitationChapterApi(url),
      handler: new CacheFirst({ cacheName: RECITATION_DOWNLOAD_CACHE_NAME }),
    },
    {
      matcher: ({ url }) => isRecitationAudio(url),
      handler: new CacheFirst({
        cacheName: RECITATION_DOWNLOAD_CACHE_NAME,
        plugins: [new RangeRequestsPlugin()],
      }),
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

// Bulk pre-cache, edition-parameterized (ADR 0014 Addendum 5) — any registered
// mushaf edition can be independently downloaded from the Settings "Mushaf
// Layout" list. User-initiated on an explicit tap — the client (use-pwa-precache
// hook) never auto-starts it, on any surface, for any edition (ADR 0014
// Addendum 2). The precache set (slim JSON + per-edition font) is
// locale-independent Quran content — the localized app shell is precached via
// the Serwist build manifest, not here.
// A service worker is killed and restarted freely, so these live only as long as
// the worker does. That is correct: a run cannot outlive the worker executing it,
// and a restarted worker legitimately has no run in flight. Keyed by mushafId so
// two editions can download concurrently and independently — each edition's
// `activeRunId` identifies its own current run, so a CANCEL can only stop the run
// it names, for the edition it names. Chromium shares one worker between the
// browser tab and the installed PWA (a sharing this feature relies on), so an
// unscoped cancel let one surface abort a download another surface was actively
// displaying.
const activeRunIdByMushaf = new Map<number, number>();
const cancelledRunIdByMushaf = new Map<number, number>();
let nextRunId = 1;

async function postToClients(message: SwToClientMessage) {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) client.postMessage(message);
}

/** Named fields — two adjacent booleans were trivially transposable at a call site. */
const reportProgress = (args: {
  mushafId: number;
  runId: number;
  cached: number;
  failed: number;
  total: number;
  complete: boolean;
  done?: boolean;
}) =>
  postToClients({
    type: "PRECACHE_PROGRESS",
    mushafId: args.mushafId,
    runId: args.runId,
    cached: args.cached,
    failed: args.failed,
    total: args.total,
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

// Precache the slim content JSON + that edition's font per page — NOT the
// ~2.6 MB SSR HTML (ADR 0028). The persistent pager renders any page
// client-side from this JSON + font once the app shell is loaded, so
// bulk-caching per-page HTML (~1.5 GB for 604 pages) is unnecessary. Visited
// page HTML is still runtime-cached (isSelfReaderPage, NetworkFirst) for
// offline cold-entry.
async function cachePage(cache: Cache, mushafId: number, id: number) {
  const results = await Promise.all([
    ensureCached(cache, pageFontUrl(mushafId, id)),
    ensureCached(cache, pageJsonUrl(mushafId, id)),
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
async function isCacheComplete(cache: Cache, mushafId: number, knownCount?: number) {
  if (!(await cache.match(precacheSentinelUrl(mushafId)))) return false;
  if (!(await cache.match(versePagesUrl(mushafId)))) return false;
  const cached = knownCount ?? (await countCachedPages(cache, mushafId));
  return cached === getMushafEdition(mushafId).pagesCount;
}

/** A page is cached only when both its font and its JSON are present, for the given edition. */
async function countCachedPages(cache: Cache, mushafId: number) {
  const fontIds = new Set<string>();
  const jsonIds = new Set<string>();
  const fontPattern = getMushafEdition(mushafId).fontIdPattern;
  const jsonPattern = new RegExp(`^/quran/pages/${mushafId}/([0-9]+)\\.json$`);

  for (const request of await cache.keys()) {
    const { pathname } = new URL(request.url);
    const font = fontPattern.exec(pathname);
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

async function precacheAllPages(mushafId: number) {
  if (activeRunIdByMushaf.has(mushafId)) return;
  const runId = nextRunId++;
  activeRunIdByMushaf.set(mushafId, runId);
  const isCancelled = () => cancelledRunIdByMushaf.get(mushafId) === runId;
  const totalPages = getMushafEdition(mushafId).pagesCount;

  try {
    const cache = await caches.open(PAGES_CACHE_NAME);

    // Short-circuit a complete cache instead of re-walking all of this
    // edition's pages on every launch, which is what Trello #129 reported for
    // the (then-only) default edition. A partially-evicted cache deliberately
    // fails this check and falls through to a resuming run, which refetches
    // only what is missing.
    if (await isCacheComplete(cache, mushafId)) {
      activeRunIdByMushaf.delete(mushafId);
      await reportProgress({
        mushafId,
        runId,
        cached: totalPages,
        failed: 0,
        total: totalPages,
        complete: true,
        done: true,
      });
      return;
    }

    // This edition's verse_key → page map. Without it, rub navigation and
    // edition switching fall back to the default edition's page numbers offline.
    const versePagesOk = await ensureCached(cache, versePagesUrl(mushafId));

    let cached = 0;
    let failed = 0;

    for (let id = 1; id <= totalPages; id += PRECACHE_CONCURRENCY) {
      if (isCancelled()) break;
      const batch: number[] = [];
      for (let n = id; n < id + PRECACHE_CONCURRENCY && n <= totalPages; n++) {
        batch.push(n);
      }
      const results = await Promise.all(
        batch.map((page) => cachePage(cache, mushafId, page)),
      );
      for (const ok of results) {
        if (ok) cached++;
        else failed++;
      }
      await reportProgress({ mushafId, runId, cached, failed, total: totalPages, complete: false });
    }

    const complete =
      !isCancelled() && versePagesOk && cached === totalPages && failed === 0;
    if (complete) {
      await cache.put(
        new Request(precacheSentinelUrl(mushafId)),
        new Response("", { status: 200 }),
      );
      // A row-2 probe memoized before this run finished is stale-negative —
      // drop it so the next reader-page cache miss re-probes and activates
      // the fast fallback path (ADR 0014 Addendum 6).
      if (mushafId === DEFAULT_MUSHAF_ID) defaultPrecacheCompletePromise = undefined;
    }
    // Release the run BEFORE the awaited final report: a START arriving while
    // that postMessage was in flight used to be dropped silently, leaving a
    // client that had already flipped to `running` with no run behind it
    // (reachable by tapping Retry the instant `partial` appears).
    activeRunIdByMushaf.delete(mushafId);
    await reportProgress({ mushafId, runId, cached, failed, total: totalPages, complete, done: true });
  } finally {
    if (activeRunIdByMushaf.get(mushafId) === runId) activeRunIdByMushaf.delete(mushafId);
  }
}

async function reportStatus(mushafId: number) {
  const cache = await caches.open(PAGES_CACHE_NAME);
  const cached = await countCachedPages(cache, mushafId);
  // Reuse the count — isCacheComplete would otherwise walk cache.keys() a second
  // time, once per mounted hook instance.
  const complete = await isCacheComplete(cache, mushafId, cached);
  // Drop a sentinel the cache can no longer back up, so the next run rewrites it
  // only once the missing pages are actually refetched.
  if (!complete) await cache.delete(precacheSentinelUrl(mushafId));
  const activeRunId = activeRunIdByMushaf.get(mushafId) ?? null;
  await postToClients({
    type: "PRECACHE_STATUS",
    mushafId,
    runId: activeRunId,
    cached,
    total: getMushafEdition(mushafId).pagesCount,
    complete,
    running: activeRunId !== null,
  });
}

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data as ClientToSwMessage;
  if (data?.type === "START_PRECACHE") {
    event.waitUntil(precacheAllPages(data.mushafId));
  } else if (data?.type === "REQUEST_PRECACHE_STATUS") {
    event.waitUntil(reportStatus(data.mushafId));
  } else if (data?.type === "CANCEL_PRECACHE") {
    // Only the run the client names, for the edition it names — never whatever
    // happens to be running now for some other edition.
    if (data.runId === activeRunIdByMushaf.get(data.mushafId)) {
      cancelledRunIdByMushaf.set(data.mushafId, data.runId);
    }
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
