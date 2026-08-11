/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, Serwist } from "serwist";
import {
  PAGES_CACHE_NAME,
  PRECACHE_CONCURRENCY,
  PRECACHE_MUSHAF_ID,
  PRECACHE_SENTINEL_URL,
  TOTAL_PAGES,
  pageFontUrl,
  pageJsonUrl,
  versePagesUrl,
} from "@constants/offline";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

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
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Reader-page HTML also carries the app shell (nav, layout, feature
    // code), which is NOT immutable — NetworkFirst so online visits always
    // get the current deploy; the cache here only backstops offline reads
    // (see ADR 0014 Addendum 1).
    {
      matcher: ({ url }) => isSelfReaderPage(url),
      handler: new NetworkFirst({ cacheName: PAGES_CACHE_NAME }),
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

// Bulk pre-cache of the base mushaf. User-initiated on an explicit tap — the
// client (use-pwa-precache hook) never auto-starts it, on any surface (ADR 0014
// Addendum 2). The precache set (slim JSON + base fonts) is locale-independent
// Quran content — the localized app shell is precached via the Serwist build
// manifest, not here.
type PrecacheMessage = {
  type: "START_PRECACHE" | "REQUEST_PRECACHE_STATUS" | "CANCEL_PRECACHE";
};

let precacheRunning = false;
let cancelRequested = false;

async function postToClients(message: Record<string, unknown>) {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) client.postMessage(message);
}

const reportProgress = (
  cached: number,
  failed: number,
  complete: boolean,
  done = false,
) =>
  postToClients({
    type: "PRECACHE_PROGRESS",
    cached,
    failed,
    total: TOTAL_PAGES,
    complete,
    done,
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
  if (!(await cache.match(versePagesUrl()))) return false;
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
  if (precacheRunning) return;
  precacheRunning = true;
  cancelRequested = false;

  try {
    const cache = await caches.open(PAGES_CACHE_NAME);

    // Short-circuit a complete cache instead of re-walking all 604 pages on
    // every launch, which is what Trello #129 reported. A partially-evicted
    // cache deliberately fails this check and falls through to a resuming run,
    // which refetches only what is missing.
    if (await isCacheComplete(cache)) {
      await reportProgress(TOTAL_PAGES, 0, true, true);
      return;
    }

    // The per-edition verse_key → page map. Without it, rub navigation and
    // edition switching fall back to the default edition's page numbers offline.
    const versePagesOk = await ensureCached(cache, versePagesUrl());

    let cached = 0;
    let failed = 0;

    for (let id = 1; id <= TOTAL_PAGES; id += PRECACHE_CONCURRENCY) {
      if (cancelRequested) break;
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
      await reportProgress(cached, failed, false);
    }

    const complete =
      !cancelRequested && versePagesOk && cached === TOTAL_PAGES && failed === 0;
    if (complete) {
      await cache.put(
        new Request(PRECACHE_SENTINEL_URL),
        new Response("", { status: 200 }),
      );
    }
    await reportProgress(cached, failed, complete, true);
  } finally {
    precacheRunning = false;
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
    cached,
    total: TOTAL_PAGES,
    complete,
    running: precacheRunning,
  });
}

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data as PrecacheMessage;
  if (data?.type === "START_PRECACHE") {
    event.waitUntil(precacheAllPages());
  } else if (data?.type === "REQUEST_PRECACHE_STATUS") {
    event.waitUntil(reportStatus());
  } else if (data?.type === "CANCEL_PRECACHE") {
    cancelRequested = true;
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
