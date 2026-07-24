/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Bumped manually (never automatically on every deploy) when a change
// affects cached page output (reader markup, font logic) — see ADR 0013.
const PAGES_CACHE_VERSION = 1;
const PAGES_CACHE_NAME = `pages-v${PAGES_CACHE_VERSION}`;
const TOTAL_PAGES = 604;

const isSelfReaderPage = (url: URL) =>
  /^\/(ar|en)\/pages\/[0-9]+$/.test(url.pathname);

const isPageFont = (url: URL) =>
  /^\/fonts\/(v1|v4\/colrv1)\/woff2\/p[0-9]+\.woff2$/.test(url.pathname);

// Static per-page content JSON the pager fetches (ADR 0028) — immutable.
const isPageJson = (url: URL) =>
  /^\/quran\/pages\/[0-9]+\.json$/.test(url.pathname);

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Quran content is immutable (Static Generation Strategy decision) —
    // once cached, never re-validated against the network.
    {
      matcher: ({ url }) => isSelfReaderPage(url),
      handler: new CacheFirst({ cacheName: PAGES_CACHE_NAME }),
    },
    {
      matcher: ({ url }) => isPageFont(url),
      handler: new CacheFirst({ cacheName: PAGES_CACHE_NAME }),
    },
    {
      matcher: ({ url }) => isPageJson(url),
      handler: new CacheFirst({ cacheName: PAGES_CACHE_NAME }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// Bulk background pre-cache for the installed PWA only (see ADR 0013). The
// client (use-pwa-precache hook) only sends this after confirming
// `display-mode: standalone` — this file has no way to check that itself.
// The precache set (slim JSON + base fonts) is locale-independent Quran content —
// the localized app shell is precached via the Serwist build manifest, not here.
type PrecacheMessage = { type: "START_PRECACHE" };

const fontUrl = (id: number) => `/fonts/v1/woff2/p${id}.woff2`;
const jsonUrl = (id: number) => `/quran/pages/${id}.json`;

async function reportProgress(cached: number) {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({
      type: "PRECACHE_PROGRESS",
      cached,
      total: TOTAL_PAGES,
    });
  }
}

async function precacheAllPages() {
  const cache = await caches.open(PAGES_CACHE_NAME);
  let cached = 0;

  for (let id = 1; id <= TOTAL_PAGES; id++) {
    const fontReq = new Request(fontUrl(id));
    const jsonReq = new Request(jsonUrl(id));

    // Precache the slim content JSON + base font per page — NOT the ~2.6 MB SSR
    // HTML (ADR 0028). The persistent pager renders any page client-side from this
    // JSON + font once the app shell is loaded, so bulk-caching per-page HTML (~1.5 GB
    // for 604 pages) is unnecessary. Visited page HTML is still runtime-cached
    // (isSelfReaderPage, Cache-First) for offline cold-entry to those URLs.
    if (!(await cache.match(fontReq))) {
      const response = await fetch(fontReq);
      if (response.ok) await cache.put(fontReq, response);
    }
    if (!(await cache.match(jsonReq))) {
      const response = await fetch(jsonReq);
      if (response.ok) await cache.put(jsonReq, response);
    }

    cached++;
    await reportProgress(cached);
    // Throttle: yield 200ms between iterations so active navigation font
    // downloads are not starved by the bulk precache. See plan.
    await new Promise((r) => setTimeout(r, 200));
  }
}

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data as PrecacheMessage;
  if (data?.type === "START_PRECACHE") {
    event.waitUntil(precacheAllPages());
  }
});
