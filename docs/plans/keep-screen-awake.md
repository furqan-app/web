# Keep Mobile/Tablet Screen Active While App Is Open

**Type:** feature
**Date:** 2026-08-12
**Status:** ready-to-implement

## Summary

Use the native Wake Lock API to prevent the screen from sleeping while the app is open on mobile/tablet, on any route. Desktop is unaffected. A new Settings toggle (mobile/tablet only) lets users opt out; on by default. Trello card #171.

## Approach

- `KeepScreenAwakeContext` (new) — provider holding `enabled: boolean` + `setEnabled`, persisted to `localStorage` via `storage.ts` under a new `keepScreenAwake` key, defaulting to `true`. Mirrors `LastReadPageContext`'s provider shape.
- `KeepScreenAwakeSync` (new, null-rendering) — mounted once in `app/[locale]/layout.tsx` alongside `LastReadPageSync`/`OfflineInstallPrompt`. Owns the `WakeLockSentinel` ref and the Wake Lock API calls. Reads `enabled` from context and device type from `useIsMobile`/`useIsTablet`.
- Settings toggle — new row in `SettingsSidebar.tsx`, same shape as the existing Tajweed Colors switch, gated to mobile/tablet only (hidden on desktop, since the preference has no effect there — `localStorage` doesn't sync across devices).

## Decision Tree / Algorithm

Wake lock lifecycle, evaluated whenever `enabled`, `isMobile`, or `isTablet` change, and on `visibilitychange`:

| Condition | Action |
|---|---|
| `enabled` && (`isMobile` \|\| `isTablet`) && `document.visibilityState === "visible"` && `"wakeLock" in navigator` | Request lock (`navigator.wakeLock.request("screen")`), store sentinel in ref |
| Any of the above is false, and a sentinel is currently held | Call `sentinel.release()`, clear ref |
| Tab goes hidden | Browser force-releases the sentinel on its own; its `release` event clears our ref — no extra call needed |
| Tab becomes visible again, conditions above still true, no sentinel held | Re-request the lock |
| `request()` throws (e.g. OS low-power mode blocks it) | Catch, silent no-op (no UI error) |
| Toggle flipped off in Settings | Effect re-runs → releases |
| Breakpoint crosses out of mobile/tablet (window resize) | Effect re-runs → releases; Settings row also disappears |
| Wake Lock API unsupported (`"wakeLock" in navigator` is false) | Toggle still renders and can be flipped; lock is simply never requested — no error |
| Component unmounts | Release any held sentinel |

## Verified Test Cases

1. Phone, first open, setting never touched → `enabled` defaults `true`, device is mobile → lock requested on mount.
2. User flips toggle off in Settings → `enabled` becomes `false` → effect releases the lock.
3. User backgrounds the browser tab/app → browser force-releases the sentinel → our `release` listener clears the ref; nothing else happens.
4. User returns to the tab → `visibilitychange` fires `visible`, conditions still true, no sentinel held → re-requests the lock.
5. Tablet user resizes/rotates into a desktop-width window → `isTablet` becomes `false` → effect releases; the Settings toggle row also disappears (re-render).
6. Desktop user opens Settings → no keep-awake row shown at all.
7. Older Safari without Wake Lock API, on mobile, toggle on → row renders, toggle flips state, but `"wakeLock" in navigator` is `false` → lock never requested, no crash, no error surfaced.

## Files to Change

- `app/utils/storage.ts` — add `keepScreenAwake: boolean` to `StorageKey`/`StorageValueType`.
- `app/contexts/KeepScreenAwakeContext.tsx` — new. Provider + `useKeepScreenAwake()` hook, persisted state, default `true`.
- `app/components/KeepScreenAwakeSync.tsx` — new. Null-rendering component owning the `WakeLockSentinel` ref, the request/release effect, and the `visibilitychange` listener.
- `app/[locale]/layout.tsx` — wrap children in `KeepScreenAwakeProvider`; mount `<KeepScreenAwakeSync />` alongside `LastReadPageSync`.
- `app/components/SettingsSidebar.tsx` — add a new toggle row (mobile/tablet only), same shape as the Tajweed Colors switch, backed by `useKeepScreenAwake()`.

## Constraints

- Desktop is never affected — no wake lock requested, no Settings row shown.
- No new dependency — the native Wake Lock API is used directly (Chrome/Android since 2021, Safari 16.4+); no polyfill/fallback library (e.g. NoSleep.js) for unsupported browsers.
- The preference is per-device (`localStorage`), not synced across a user's devices or accounts.

## What NOT to Do

- Do not add a fallback library for browsers without Wake Lock API support — silent no-op is the agreed behavior.
- Do not apply the wake lock (or show its toggle) on desktop.
- Do not scope the wake lock to reader/mushaf routes only — it applies app-wide while open on mobile/tablet.
- Do not surface an error or warning UI when `request()` throws or the API is unsupported.

## Decisions Made

- Scope: entire app (all routes), not reader-only.
- Device scope: mobile/tablet only, matching the card title; desktop excluded.
- User control: Settings toggle added (not fully automatic), default on.
- Toggle visibility: mobile/tablet only in Settings, hidden on desktop.
- Unsupported browsers: silent no-op, toggle still shown.
- No ADR: Wake Lock API usage and the request/release/visibilitychange lifecycle are standard Web API behavior (documented on MDN), not a project-specific architectural decision or invariant.
