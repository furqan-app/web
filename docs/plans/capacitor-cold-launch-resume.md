---
title: Capacitor Cold Launch — Route Entry Through launch.html to Resume Last-Read Page
type: bug
date: 2026-09-24
status: implemented
area: pwa
issue: 683
---

# Capacitor Cold Launch — Route Entry Through launch.html to Resume Last-Read Page

## Summary

When opening the Capacitor native shell on Android or iOS, the app loads the root home page (`/`) on cold launch rather than resuming the user's last-read Quran page. In the PWA, `start_url` points to `public/launch.html`, which resolves the persisted reading position (`lastReadPath`) and issues a synchronous `location.replace()` during HTML parsing before first paint ([ADR 0042](../architecture/adr/0042-pwa-launch-resolves-before-first-paint.md)). In the Capacitor shell, `server.url` loaded `/` directly, bypassing `launch.html`. Furthermore, `public/launch.html` only inspected `display-mode` media queries and `navigator.standalone`, neither of which match inside a Capacitor WebView. This change configures Capacitor's entry path to `/launch.html` via `server.appStartPath: "/launch.html"` in `capacitor.config.ts`, adds native shell detection (`window.Capacitor.isNativePlatform() === true`) to `public/launch.html`, updates the reader cover script reference, and adds automated unit tests.

## Root Cause / Approach

### Root Cause
1. In `capacitor.config.ts`, `server.url` pointed to `https://${PROD_HOST}` without an entry path, so Capacitor's WebView loaded the root home page (`/`) on initial launch. Because the home page is not precached in the service worker, cold launch while offline failed, and cold launch online showed the home surah list instead of resuming reading.
2. In `public/launch.html`, the synchronous `<head>` script only checked `(display-mode: standalone)`, `(display-mode: fullscreen)`, and `navigator.standalone === true`. Inside a Capacitor WebView, `display-mode` media queries evaluate to false, so `launch.html` evaluated `standalone` as `false` and defaulted to `target = "/"`.
3. In `app/components/reader/ReaderPage.tsx` line 71, an inline comment stated `launch.html needs no such branch: the shell never loads it.` which was accurate before this change but must now be updated.

### Approach
1. In `capacitor.config.ts`, set `server.appStartPath: "/launch.html"`. Keeping `server.url` as the clean origin (e.g., `https://furqan.taha7.com`) preserves valid origins for Android's `addWebMessageListener` and allows Capacitor's native bridge on both Android and iOS to append `appStartPath` to the initial URL.
2. In `native-shell-web/launch.html`, place a minimal sentinel file. Capacitor iOS (`CAPBridgeViewController`) requires any `server.appStartPath` to exist locally in `webDir` before loading the remote URL, calling `fatalLoadError()` if absent.
3. In `public/launch.html`, update the `standalone` boolean check to also include:
   `|| (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() === true)`
   matching `app/utils/platform.ts` and `ReaderPage.tsx`.
4. In `app/components/reader/ReaderPage.tsx`, update line 71 comment to document that `launch.html` now carries the native check for shell cold launch.
5. Add Vitest unit tests in `app/utils/launch-redirect.test.ts` to verify the redirect target derivation for all platform states (Capacitor native shell, PWA standalone, browser tab, desktop breakpoint, valid/invalid path whitelist, and legacy numeric fallback).
6. Document the decision in `docs/architecture/decisions/pwa.md`.

## Decision Tree / Algorithm

Evaluated synchronously in `<head>` of `public/launch.html`:

| Platform / Display Mode | Viewport Width | `localStorage` State | Target URL | Rationale |
|---|---|---|---|---|
| Capacitor Shell (`isNativePlatform() === true`) | Mobile / Tablet (< 1367px) | `lastReadPath = "/ar/pages/150"` | `"/ar/pages/150"` | Validated regex match (`/^\/(?:ar|en)\/pages\/([1-9][0-9]{0,2})$/`), pre-paint resume |
| Capacitor Shell | Mobile / Tablet (< 1367px) | `lastReadPath` missing, `lastReadPage = 50` | `"/pages/50"` | Legacy numeric fallback |
| Capacitor Shell | Mobile / Tablet (< 1367px) | Neither key set | `"/pages/1"` | Fresh install default fallback |
| Capacitor Shell | Mobile / Tablet (< 1367px) | `lastReadPath = "invalid"` or non-numeric | `"/pages/1"` | Validation failure falls back to page 1 |
| Capacitor Shell | Desktop (>= 1367px) | Any | `"/"` | Desktop standalone / shell opens surah list |
| PWA (`standalone` / `fullscreen`) | Mobile / Tablet (< 1367px) | `lastReadPath = "/ar/pages/150"` | `"/ar/pages/150"` | Existing PWA behavior preserved |
| Web Browser Tab | Any | Any | `"/"` | Shared/bookmarked link lands on home |

## Verified Test Cases

1. **Capacitor shell with valid lastReadPath**:
   - Input: `window.Capacitor.isNativePlatform() === true`, viewport 390px, `lastReadPath = "/ar/pages/200"`.
   - Expected Output: `location.replace("/ar/pages/200")`.
2. **Capacitor shell with legacy lastReadPage**:
   - Input: `window.Capacitor.isNativePlatform() === true`, viewport 390px, `lastReadPath` absent, `lastReadPage = 75`.
   - Expected Output: `location.replace("/pages/75")`.
3. **Capacitor shell first launch (no persisted state)**:
   - Input: `window.Capacitor.isNativePlatform() === true`, viewport 390px, storage empty.
   - Expected Output: `location.replace("/pages/1")`.
4. **Capacitor shell with corrupted/malicious path**:
   - Input: `window.Capacitor.isNativePlatform() === true`, viewport 390px, `lastReadPath = "javascript:alert(1)"` or `"/en/pages/9999"`.
   - Expected Output: `location.replace("/pages/1")`.
5. **Capacitor shell on desktop viewport**:
   - Input: `window.Capacitor.isNativePlatform() === true`, viewport 1400px.
   - Expected Output: `location.replace("/")`.
6. **Plain web browser tab**:
   - Input: No Capacitor object, standard browser, viewport 390px.
   - Expected Output: `location.replace("/")`.

## Files to Change

- `capacitor.config.ts` — Add `appStartPath: "/launch.html"` to `server` configuration; sanitize `serverOrigin`.
- `native-shell-web/launch.html` — Minimal sentinel file satisfying iOS `CAPBridgeViewController` local file check.
- `native-shell-web/README.md` — Document sentinel file purpose in hosted shell web dir.
- `public/launch.html` — Add `(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() === true)` to the `standalone` check; update doc comments.
- `app/components/reader/ReaderPage.tsx` — Update comment at line 71 regarding `launch.html`'s native branch.
- `app/utils/launch-redirect.test.ts` — New Vitest test suite executing and verifying `launch.html` redirect logic across all decision-tree branches.
- `docs/architecture/decisions/pwa.md` — Document Capacitor cold launch routing, duplicated platform literal, and iOS sentinel file requirement.
- `docs/architecture/adr/0042-pwa-launch-resolves-before-first-paint.md` — Addendum recording the Capacitor shell cold launch decision and iOS sentinel requirement.

## Constraints

- Launch navigation must resolve synchronously in `<head>` before first paint (ADR 0042) — never in a post-paint `useEffect`.
- `server.url` must stay an origin URL without trailing slash or path segments so `allowedOriginRules` in Capacitor's Android bridge does not fail `WebViewCompat.addWebMessageListener` origin validation.
- Capacitor iOS (`CAPBridgeViewController`) requires `server.appStartPath` to exist locally in `webDir` (`native-shell-web/launch.html`) before loading the remote URL, or it triggers `fatalLoadError()`.
- `lastReadPath` must continue to be strictly validated against the regex whitelist `/^\/(?:ar|en)\/pages\/([1-9][0-9]{0,2})$/` bounded between 1 and 604 before navigating.
- The legacy `lastReadPage` numeric fallback must remain intact.
- Mid-session navigation to the home page (e.g. via navbar logo) must continue to work via client-side soft navigation (`next/link`) without triggering `launch.html`.
- `public/launch.html` must remain in `middleware.ts`'s matcher exclusion list and `globPublicPatterns` in `next.config.mjs`.

## What NOT to Do

- Do NOT attempt to redirect root `/` to the reader in server middleware or client effects when native is detected — this breaks in-app navigation to Home and re-introduces post-paint flicker.
- Do NOT bake a path into `server.url` (use `server.appStartPath` instead).
- Do NOT bundle full Quran or page assets into the native binary (retains ADR 0072 hosted shell model).
- Do NOT remove legacy `lastReadPage` fallback.

## Decisions Made

- Use `server.appStartPath: "/launch.html"` in `capacitor.config.ts`: Capacitor 7/8 officially supports `appStartPath`, which cleanly appends the path on both Android (`Bridge.java`) and iOS (`CAPInstanceConfiguration.swift`) while keeping `server.url` as a clean origin.
- Place a sentinel `native-shell-web/launch.html` file in `webDir`: Capacitor iOS validates `appStartFileURL` on disk before loading the remote URL, calling `fatalLoadError()` if missing. A 200-byte sentinel satisfies this without re-bloating the native shell with ~260 MB of web assets (ADR 0072).
- Duplicate the native platform duck-typing check `(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() === true)` in `public/launch.html`: `launch.html` is a static, pre-React document that cannot import TypeScript modules, following the precedent of the display-mode media queries and desktop breakpoint (ADR 0042 / ADR 0065).
