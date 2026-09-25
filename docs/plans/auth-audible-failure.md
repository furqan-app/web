---
title: Auth return fails silently in shell — route failed exchanges to the retry UI
type: bug
date: 2026-09-25
status: implemented
area: pwa
issue: 702
adr: [0072]
---

# Auth return fails silently in shell — route failed exchanges to the retry UI

## Summary

When `handleAppUrl` fails inside `NativeAuthReturnListener` (no UI of its own), the user lands on a normal unsigned-in home with zero indication — indistinguishable from "nothing happened" (owner report 2026-09-25: returns to app, not signed in, no error screen). Fix: when the listener sees a code yet the exchange fails, navigate the WebView to the return URL itself so the bootstrap page retries or shows its retry UI.

## Root Cause / Approach

Two return consumers with asymmetric failure UX: the bootstrap page owns retry/error UI; the listener is silent by design. Any listener-side failure (spent code, offline flash, rejected exchange) currently vanishes. Route the failing URL into the page that can speak: `window.location.assign(href)` carries code + target, the page re-attempts once (transient failures self-heal) or renders retry (spent/expired → fresh mint from the system browser). No-code deep links stay silent, correctly — there is nothing to say.

## Decision Tree / Algorithm

- If exchange succeeds → navigate to target, as today.
- If exchange fails AND the URL carries a code → assign the return URL into the WebView (bootstrap page takes over).
- If exchange fails AND no code → silent, as today (plain deep link, no promise made).
- No loops: the bootstrap page never auto-navigates on failure; retry always mints fresh.

## Verified Test Cases

- Listener spec: failed exchange with code → assign(return URL); failed without code → no navigation; success → assign(target) once.
- Existing shell/platform specs stay green; lint clean; no new `tsc` errors.
- Device gate (owner, Play build): sign-in → auto-return signed-in persists; forced-failure path (stale code) now shows the retry screen instead of a silent home.

## Files to Change

- `app/components/shell/NativeAuthReturnListener.tsx` — shared `consumeReturnUrl` wrapper used by both the launch-URL and event branches.
- `app/components/shell/NativeAuthReturnListener.test.tsx` — the two new failure-branch cases.
- `docs/plans/INDEX.md` — regenerated.

## Constraints

- Web/PWA untouched (native gate first, unchanged).
- Single spend per code stands (dedupe untouched); the page re-attempt is safe because failure means nothing was spent (network error → may succeed) or the code is dead (401 → retry UI, no loop).
- No token in JS; exchange contract unchanged.

## What NOT to Do

- No auto-retry loops anywhere; no silent `location.reload`.
- No new plugin/manifest/App Link changes — OS delivery verified working on-device.

## Decisions Made

- Chosen over a toast/error UI inside the listener: the bootstrap page already owns exactly that UI in both locales — reuse, don't duplicate.
- Sweep 2026-09-25: failure branches are the only behavior change; warm-path and non-native paths byte-identical; SW/middleware/i18n untouched.
