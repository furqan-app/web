# PWA Conversion + Offline Quran Page Reading

**Type:** feature  
**Date:** 2026-07-06  
**Status:** implemented

## Summary

Convert the app into an installable PWA (manifest, icons, metadata) and add offline Quran page reading for installed users: a service worker (Serwist) pre-caches all 604 pages of the current locale plus their fonts in the background, only when running as the installed app. Marks stay online-only. See [ADR 0014](../architecture/adr/0014-pwa-offline-architecture.md).

Two bugs found post-deploy merged in: icons 404ing due to missing middleware matcher entry, and a deprecated Apple meta tag warning.

## Approach

### 1. Installability

- `app/manifest.ts` — Next.js metadata-route convention; exports `name`, `short_name`, `description`, `start_url`, `display: "standalone"`, `background_color`, `theme_color`, `icons`.
- Generate PNG icons from `public/icon.svg`: 192×192, 512×512, 512×512 maskable. One-off `scripts/generate-pwa-icons.js` using `sharp` (dev dep), output committed to `public/icons/`.
- `app/layout.tsx` — `viewport` export (theme-color), `metadata.manifest`, Apple PWA meta, plus `<meta name="mobile-web-app-capable" content="yes" />` in `<head>` (Next's typed `Metadata` has no first-class field for this; `appleWebApp.capable` kept for older iOS Safari).

### 2. Service Worker (Serwist)

`next.config.js` wrapped with `withSerwistInit` (chained with `withNextIntl`).

`app/sw.ts`:
- Standard Serwist precache for build assets (JS/CSS/webpack chunks) — automatic per deploy.
- Separate runtime cache `pages-v{N}` (manually bumped only when cached page output changes):
  - `/{locale}/pages/{id}` HTML — `CacheFirst` (static generation, immutable content)
  - `/fonts/v1/ttf/{n}.ttf` — `CacheFirst`, locale-independent
- `message` listener for `START_PRECACHE { locale }` — walks pages 1..604, fetching+caching what's missing, `postMessage`s `{cached, total}` progress. Idempotent/resumable.

### 3. Client Trigger + Progress UI

- `app/hooks/use-pwa-precache.ts` — checks `matchMedia('(display-mode: standalone)').matches` (+ `navigator.standalone` for iOS) on mount. If standalone + SW controller exists, posts `START_PRECACHE` with current locale, subscribes to progress messages, exposes `{ cached, total, isStandalone }`.
- `SettingsSidebar.tsx` — new "Offline Access" section, only rendered when `isStandalone`. Shows `cached/604` with progress bar.

### 4. Marks Offline Gating

- `app/hooks/use-online-status.ts` — wraps `navigator.onLine` + `online`/`offline` event listeners.
- `MarkModal.tsx` — when offline, disable color picker/save/remove buttons; show `markModal.offlineNotice` inline notice.

### 5. Middleware Matcher Fix

`middleware.ts` `config.matcher` excluded known static paths from `intl-middleware` but not `public/icons/`. Requests to `/icons/icon-*.png` were redirected to `/en/icons/...` → 404. Serwist's precache install failed on all three icons.

**Fix:** Add `icons/*` to the matcher exclusion list alongside `fonts/*`.

## Files Changed

- `app/manifest.ts` — new
- `public/icons/` — generated PNGs + `scripts/generate-pwa-icons.js`
- `app/layout.tsx` — viewport export, manifest link, Apple meta, `mobile-web-app-capable`
- `next.config.js` — `withSerwistInit` wrapper
- `app/sw.ts` — service worker source
- `app/hooks/use-pwa-precache.ts`, `use-online-status.ts` — new
- `app/components/SettingsSidebar.tsx` — offline access section
- `app/components/MarkModal.tsx` — offline gate
- `messages/ar.json`, `messages/en.json` — offline notice + settings labels
- `package.json` — add `serwist`, `@serwist/next`, `sharp` (dev)
- `.gitignore` — ignore Serwist-generated `public/sw.js`; keep `app/sw.ts`
- `middleware.ts` — add `icons/*` to matcher exclusion list
- `docs/architecture/DECISIONS.md` — constraint: new `public/` asset dirs must be added to middleware matcher

## Constraints

- Pre-cache only for `display-mode: standalone` — never trigger the ~92MB download for regular web visits.
- No offline mark write-queueing without revisiting ADR 0013 (conflict risk with shared-mushaf last-author-wins).
- Do not bump `pages-v{N}` cache version on unrelated deploys — only when cached page output changes.
- Pre-cache current locale only, not both locales.

## Decisions Made

- Marks offline: disabled with inline notice, not silent fail on submit.
- Pre-cache resumes on every app launch until all 604 pages are cached — not just once after install.
- iOS storage risk accepted (no mitigation beyond resume-on-launch).
- `mobile-web-app-capable` added as explicit `<meta>` tag since Next's `Metadata` type has no field for it.
- Trello: https://trello.com/c/ZatnLnVT/65-add-pwa
