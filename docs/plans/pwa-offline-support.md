# PWA Conversion + Offline Quran Page Reading

**Type:** feature
**Date:** 2026-07-06
**Status:** implemented

## Summary

Convert the app into an installable PWA (manifest, icons, `theme-color`, install metadata) and add offline Quran page reading for users who've installed it: a service worker (via Serwist) pre-caches all 604 pages of the current locale plus their per-page fonts in the background, only when running as the installed app. Marks stay online-only. See [ADR 0013](../architecture/adr/0013-pwa-offline-architecture.md) for the full rationale and rejected alternatives, and the new "PWA & Offline Quran Page Caching" section in `DECISIONS.md` for the standing constraints.

## Approach

### 1. Installability

- Add `app/manifest.ts` (Next.js metadata-route convention) exporting `name`, `short_name`, `description`, `start_url`, `display: "standalone"`, `background_color`, `theme_color`, and `icons`.
- Generate PNG icons from the existing `public/icon.svg`: `192x192`, `512x512`, and a `512x512` maskable variant (extra safe-zone padding per Android adaptive-icon spec). One-off generation script using `sharp` (dev dependency), output committed to `public/icons/`.
- Add `theme-color` / `viewport` metadata in `app/layout.tsx` (Next 14's `viewport` export) and link the manifest via `metadata.manifest`.
- Add Apple-specific meta (`apple-touch-icon`, `apple-mobile-web-app-capable`) since iOS doesn't fully honor the standard manifest.

### 2. Service worker via Serwist

- Add `@serwist/next` + `serwist` deps. Wrap `next.config.js` with `withSerwistInit` (chained with the existing `withNextIntl`).
- Add `app/sw.ts` (Serwist service worker source):
  - Standard Serwist precache manifest for build assets (JS/CSS/webpack chunks) — this part is fully automatic per deploy, no manual versioning needed.
  - A separate, manually-versioned runtime cache (e.g. cache name `pages-v1`) for:
    - `/{locale}/pages/{id}` HTML (`CacheFirst`, since content is immutable — matches Static Generation Strategy decision)
    - `/fonts/v1/ttf/{n}.ttf` (`CacheFirst`, locale-independent, shared across the `ar`/`en` route caches)
  - A `message` event listener for a `START_PRECACHE` message (locale payload) that walks pages 1..604 for that locale, fetching+caching any not already in `pages-v1`, and `postMessage`s progress (`{cached, total}`) back to clients after each page. Idempotent/resumable — re-running it only fetches what's missing.

### 3. Client-side trigger + progress UI

- `app/hooks/use-pwa-precache.ts`: on mount, checks `matchMedia('(display-mode: standalone)').matches` (and `navigator.standalone` for iOS). If standalone and a service worker controller exists, posts `START_PRECACHE` with the current locale, and subscribes to progress messages, exposing `{ cached, total, isStandalone }`.
- Call this hook from `SettingsSidebar.tsx`. Add a new "Offline Access" section (only rendered when `isStandalone`) showing `cached/604` with a simple progress bar. No section shown for non-installed web visits.

### 4. Marks offline gating

- Add `app/hooks/use-online-status.ts`: wraps `navigator.onLine` + `online`/`offline` window event listeners.
- In `MarkModal.tsx`, use this hook: when offline, disable the color picker / save / remove buttons and show an inline notice (`markModal.offlineNotice`, new i18n key in both `messages/ar.json` and `messages/en.json`) instead of allowing a submit that will fail.

## Files to Change

- `app/manifest.ts` — new, web app manifest.
- `public/icons/` — new, generated PNG icons (192, 512, 512-maskable) + a small one-off generation script (e.g. `scripts/generate-pwa-icons.js`).
- `app/layout.tsx` — add `viewport` export (theme-color), `metadata.manifest`, Apple PWA meta tags.
- `next.config.js` — wrap with `withSerwistInit`.
- `app/sw.ts` — new, Serwist service worker source (precache + runtime caching + bulk-precache message handler).
- `app/hooks/use-pwa-precache.ts` — new.
- `app/hooks/use-online-status.ts` — new.
- `app/components/SettingsSidebar.tsx` — new "Offline Access" section, standalone-only.
- `app/components/MarkModal.tsx` — disable marking + inline notice when offline.
- `messages/ar.json`, `messages/en.json` — new translation keys (offline notice, settings section labels).
- `package.json` — add `serwist`, `@serwist/next`, `sharp` (dev).
- `.gitignore` — Serwist generates `public/sw.js` (and related workbox files) at build time; ignore the generated output, keep `app/sw.ts` source committed.

## Edge Cases & Decisions Made

- **Marks offline:** disabled with inline notice, not silently failing on submit. No offline write-queue (rejected — conflict risk with shared-mushaf last-author-wins, ADR 0013).
- **Pre-cache scope:** current locale's 604 pages only, not both locales. Fonts are locale-independent and shared regardless.
- **Pre-cache gating:** `display-mode: standalone` only — regular browser visits are entirely unaffected, never trigger the ~92MB background download.
- **Resumability:** pre-cache re-checks and resumes on every app launch until all 604 pages for the current locale are cached, not just once after install.
- **Cache versioning across deploys:** the `pages-v{N}` runtime cache version is bumped manually, only when a change affects cached page output (reader markup, font logic) — not automatically on every deploy. Serwist's own build-asset precache still revisions automatically per deploy as normal.
- **iOS storage risk:** accepted, no mitigation beyond the existing resume-on-launch behavior (see ADR 0013 consequences).

## Constraints (do not violate)

- Do not pre-cache fonts/pages for non-standalone (regular web tab) visits under any circumstance — this is the load-bearing gate that keeps this feature from conflicting with the Font System decision.
- Do not add offline mark write-queueing without revisiting ADR 0013 first.
- Do not bump the `pages-v{N}` cache version as part of routine/unrelated deploys.
- Do not pre-cache both locales.

## Trello

Card to be created in the "Todo" list on the Furqan board: "PWA conversion + offline Quran page reading", linking this plan, labeled `Feature`.
