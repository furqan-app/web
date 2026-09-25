---
title: Auth return lost on cold start — consume the launch URL on listener mount
type: bug
date: 2026-09-24
status: implemented
area: pwa
issue: 687
adr: [0072]
---

# Auth return lost on cold start — consume the launch URL on listener mount

## Summary

The App Link return works warm (app alive → `appUrlOpen` fires → exchange runs) but dies cold: when the OS kills the app behind the system browser (observed on Vivo aggressive task management), the VIEW intent arrives before `NativeAuthReturnListener` subscribes, nothing ever exchanges the code, and the user lands unsigned-in with no error UI. Fix: on mount (native only) also consume `App.getLaunchUrl()` — the plugin holds the cold-start URL for exactly this case.

## Root Cause / Approach

`appUrlOpen` is a live subscription — it cannot fire for an intent that predates it. Capacitor's `App.getLaunchUrl(): Promise<AppLaunchUrl | undefined>` exists for the cold-start leg. One effect does both: launch URL first, then the live subscription. Idempotent via the existing per-code dedupe in `auth-return.ts` (a warm intent arriving twice, or launch URL + identical event, spends once).

## Decision Tree / Algorithm

- If native + launch URL present with code → `handleAppUrl(launch.url)` (same path as the event branch).
- If native + no launch URL → subscription only, unchanged behavior.
- If bridge lacks `getLaunchUrl` (older shell) → catch, subscription still arms (no regression for warm returns).
- If non-native → return before touching the bridge, as today.

## Verified Test Cases

- Device repro (owner, Vivo, Play build): sign-in → auto-return → signed-in persists across restart (was: returned unsigned-in, no error).
- New `NativeAuthReturnListener.test.tsx` (react-test-renderer, same harness as the smart-completion spec): launch URL with code → single exchange POST + assign(target); launch URL absent → no fetch, listener still registered.
- Existing `auth-return.test.ts` + `platform.test.ts` stay green; lint clean; no new `tsc` errors.

## Files to Change

- `app/components/shell/NativeAuthReturnListener.tsx` — add the `getLaunchUrl()` consumption inside the existing native-gated effect (dynamic import, cancelled-flag discipline unchanged).
- `app/components/shell/NativeAuthReturnListener.test.tsx` (new) — mocked `@capacitor/app` + stubbed shell `window`, real `handleAppUrl` with mocked fetch.
- `docs/plans/INDEX.md` — regenerated.

## Constraints

- Web/PWA untouched: the effect still returns before the bridge on non-native.
- No token in JS; exchange contract unchanged (POST + content-type branch).
- `getLaunchUrl` failure must never break the warm path (catch → subscribe anyway).

## What NOT to Do

- No new plugin, no manifest change, no App Link reconfiguration — the OS delivers correctly (verified: domain `verified` on-device); only the JS consumption was incomplete.
- No auto-retry loops; single spend per code stands.

## Decisions Made

- Chosen over navigating the cold-started WebView to the bootstrap URL: the listener path reuses the deduped exchange and works regardless of which page the shell cold-opens.
- Sweep 2026-09-24: `getLaunchUrl` signature verified in `@capacitor/app` definitions; no test asserts listener behavior today; SW/middleware/i18n untouched.
