/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, Serwist } from "serwist";

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
  /^\/fonts\/v1\/ttf\/p[0-9]+\.ttf$/.test(url.pathname);

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
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// Bulk background pre-cache for the installed PWA only (see ADR 0013). The
// client (use-pwa-precache hook) only sends this after confirming
// `display-mode: standalone` — this file has no way to check that itself.
type PrecacheMessage = { type: "START_PRECACHE"; locale: "ar" | "en" };

const pageUrl = (locale: string, id: number) => `/${locale}/pages/${id}`;
const fontUrl = (id: number) => `/fonts/v1/ttf/p${id}.ttf`;

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

async function precacheAllPages(locale: string) {
  const cache = await caches.open(PAGES_CACHE_NAME);
  let cached = 0;

  for (let id = 1; id <= TOTAL_PAGES; id++) {
    const pageReq = new Request(pageUrl(locale, id));
    const fontReq = new Request(fontUrl(id));

    if (!(await cache.match(pageReq))) {
      const response = await fetch(pageReq);
      if (response.ok) await cache.put(pageReq, response);
    }
    if (!(await cache.match(fontReq))) {
      const response = await fetch(fontReq);
      if (response.ok) await cache.put(fontReq, response);
    }

    cached++;
    await reportProgress(cached);
  }
}

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data as PrecacheMessage;
  if (data?.type === "START_PRECACHE") {
    event.waitUntil(precacheAllPages(data.locale));
  }
});
