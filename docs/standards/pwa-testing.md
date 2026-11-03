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

## On-Device Fast Local Testing (PWA & Android Shell)

When verifying on real hardware (e.g. system bar insets, touch gestures, full-bleed screen layouts):

### 1. Android Capacitor Shell (Zero APK Rebuilds for Web Changes)
The shell is a hosted hybrid (`server.url`). Point it to your LAN dev/preview server using:
```bash
LOCAL_DEV_SERVER=http://<lan-ip>:7000
```
- **Web UI & CSS edits:** Do NOT rebuild the APK. Any change in CSS, React components, or web logic updates live on the server. Simply dismiss and reopen the app or reload the page on the device.
- **When to rebuild APK:** Only when native code (`MainActivity.java`, plugins, or `AndroidManifest.xml`) changes. Run `cd android && ./gradlew assembleDebug`.
- **In-place updates:** `android/debug.keystore` is committed with standard dev credentials (`android`), ensuring `adb install -r` updates the existing app on-device without wiping user storage or certificates.

### 2. Installed PWA on Real Mobile Devices (LAN HTTPS)
Testing PWA installation and service-worker lifecycle on real mobile devices requires HTTPS:
- **LAN TLS Proxy:** Run a reverse proxy (e.g. on port `:7443 -> :7000`) with a local root CA.
- **Trust CA on Device:** Push the root CA certificate to the phone (`/sdcard/furqan-local-ca.crt`) and install it under Android Credential Storage -> CA Certificates.
- **Service Worker Production Build:** Serwist is disabled in development; build locally via `npm run build:local && PORT=7000 npm start`.
- **Bypassing Service Worker Cache:** When updating CSS or JS, restart the server, then dismiss the installed WebAPK from Android recent apps (swipe away) before reopening to trigger `clientsClaim` / `skipWaiting` updates.

### 3. USB Port Reversal (`adb reverse`) & Dev-Server Testing (No HTTPS/Certs Needed)
Chromium considers `http://localhost` a secure origin by spec. Connecting over USB with port reversal gives full PWA capabilities (Service Worker, WebAPK installation, standalone/fullscreen display mode) without generating local certificates or configuring LAN TLS:

1. **Reverse the dev port:**
   ```bash
   adb reverse tcp:7000 tcp:7000
   ```
2. **Open on device:**
   Navigate in Chrome on the device to `http://localhost:7000/launch.html` or `http://localhost:7000/ar`.
3. **Bypass the Development-Mode Offline Gate:**
   In development (`npm run dev`), Serwist disables the service worker, which prevents `navigator.serviceWorker.ready` from resolving. This leaves `OfflineSetupGate` stuck indefinitely on an unclosable wait spinner in standalone mode. To bypass it immediately during development, set the versioned dismissal flag in localStorage:
   ```js
   localStorage.setItem("fq-offline-prompt-dismissed-v2-2", "1");
   window.dispatchEvent(new Event("fq-offline-dismissed"));
   ```
4. **Remote Debugging & Inspections:**
   Forward DevTools:
   ```bash
   adb forward tcp:9223 localabstract:chrome_devtools_remote
   ```
   Query tabs with `curl http://localhost:9223/json`, inspect DOM/evaluate JS via WebSocket, take screenshots directly with:
   ```bash
   adb exec-out screencap -p > /tmp/screen.png
   ```
5. **Xiaomi / MIUI Gotcha:**
   On Linux, Xiaomi devices require a udev rule (`ATTR{idVendor}=="2717"`). Additionally, `adb shell input tap` throws `SecurityException` unless "USB debugging (Security settings)" is enabled with a SIM card in MIUI. As an alternative, dispatch input events directly via DevTools Protocol (`Input.dispatchMouseEvent` / CDP) without needing MIUI security permissions.

