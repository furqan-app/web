# PWA Testing (Browser Pane, No Device)

Most PWA-gated behavior (`isStandaloneDisplayMode()`, `isAndroid()`, both in `app/utils/platform.ts`)
never activates in a normal browser tab, so it's easy to assume it's untestable without a physical
device install. For anything gated on **display mode** or **user agent** (not on the service worker
itself), it can be exercised directly in the Browser pane.

## Spoofing standalone/fullscreen mode

`isStandaloneDisplayMode()` calls `window.matchMedia(...)` inline on every call — it is not cached at
mount — so overriding `matchMedia` takes effect on the next render that reads it, no reload needed.
Inject before triggering whatever state change (e.g. opening an overlay) exercises the gated code:

```js
const realMatchMedia = window.matchMedia.bind(window);
window.matchMedia = (query) =>
  query.includes("display-mode")
    ? { matches: true, media: query, addEventListener() {}, removeEventListener() {} }
    : realMatchMedia(query);
```

Run via `javascript_tool`. Keep the passthrough for non-`display-mode` queries — `useIsDesktopUp`
(`app/hooks/use-is-desktop-up.ts`) also calls `matchMedia` for its `min-width` breakpoint, and a
blanket override would falsely report desktop-width too.

## Spoofing Android

`isAndroid()` reads `navigator.userAgent`. Override it the same way, in the same script:

```js
Object.defineProperty(navigator, "userAgent", {
  value: navigator.userAgent + " Android",
  configurable: true,
});
```

## Simulating a back-gesture / back button

A swipe-back gesture and a hardware back press both just fire a `popstate` event — there is no way
for page JS to distinguish them from each other or from a programmatic one. `navigate` with
`url: "back"` triggers a real `popstate` the same way, so it's a faithful test of any
history-guard mechanism (e.g. `AndroidBackExitGuard`, ADR 0040; the overlay close-on-back guard, ADR
0043). What it does **not** simulate is the OS-level swipe preview/animation (e.g. Android's
predictive-back gesture) — only the resulting event, which is what this app's guards actually key off.

## What this can't cover

Offline / service-worker behavior (precaching, the offline fallback document, `launch.html`) needs
the real production service worker — Serwist is disabled entirely in `npm run dev`. Use
`npm run build:local && npm start` (not `npm run build`, which also runs `prisma migrate deploy` and
fails locally) with any dev server on the same port stopped first. See ADR 0042 and the "App Launch &
Back Navigation (Android PWA)" section of `DECISIONS.md`.
