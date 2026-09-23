---
title: Slim the native shell — stop bundling public/ web assets into the APK
type: chore
date: 2026-09-23
status: implemented
area: pwa
issue: 663
adr: [0072]
---

# Slim the native shell — stop bundling public/ web assets into the APK

## Summary

The debug APK is ~211 MB because `cap sync` copies all of `public/` (263 MB: 192 MB fonts + 71 MB page JSON) into android assets as dead weight. Point `webDir` at a new near-empty dir so the copy — and the APK — shrink to shell-only size (~10–20 MB estimated). Zero runtime impact: with `server.url` set, Capacitor's `Bridge` loads the remote URL and never reads local assets (verified in `Bridge.java`: `appUrl = appUrlConfig`, local assets only in the `else` branch).

## Root Cause / Approach

`capacitor.config.ts` sets `webDir: "public"` so `cap sync`/`copy` never fail on a missing folder — but that also bundles the whole site into every native build. The hosted shell (ADR 0072) needs no local web assets: first-launch connectivity is already accepted, and no local-fallback path exists (the bundled files were never wired as one). Swap the pointer to a placeholder dir that exists but holds (almost) nothing.

## Decision Tree / Algorithm

- If a build runs `cap sync`/`copy` → the placeholder dir copies (~KB), native bridge plugins + `capacitor.config.json` still generate exactly as before.
- If the shell launches → `Bridge` uses `server.url` (unchanged); local assets unread, before and after.
- If the web/PWA builds → untouched: nothing in the Next/Serwist pipeline reads `webDir` (`globPublicPatterns` reads `public/` directly and is unchanged).
- If a future dev points the shell at a LAN host (`CAP_SERVER_URL`) → still a remote URL, still unaffected.

## Verified Test Cases

- `npx cap sync android` succeeds with the new dir (gradle include + runtime config generate).
- CI `Build debug APK` artifact on the PR is shell-sized (~10–20 MB) vs 211 MB before.
- Fresh debug APK installs, cold-launches online into prod, reader + sign-in entries behave exactly as before (device gate, owner).
- `npm run lint` clean; no new `tsc` errors (config-only change).

## Files to Change

- `native-shell-web/` (new): placeholder web dir — `.gitkeep` + 3-line `README.md` explaining why it must exist yet stay empty, so nobody "fixes" it later.
- `capacitor.config.ts`: `webDir: "public"` → `"native-shell-web"` + comment update (keep the never-bake-assets warning).
- `.github/workflows/android-debug.yml`: fix the stale header comment (claims no sync runs; sync does run — it just copies ~KB now).

## Constraints

- The placeholder dir must exist in git (hence `.gitkeep`) or `cap sync` fails.
- Nothing may be added to the placeholder dir later without revisiting this plan — bulk content downloads post-install per edition (ADR 0072 minimal-binary rule).
- Web/PWA behavior unchanged: no edits under `public/`, `app/sw.ts`, or `next.config.mjs`.

## What NOT to Do

- No `minifyEnabled`/`splits` tuning in this slice (debug ergonomics + release splitting are separate concerns; the store bundle already splits per device).
- No iOS work (deferred with the platform).
- No touching `server.url` / `allowNavigation` semantics.

## Decisions Made

- New empty dir over an exclusion list: Capacitor copies all of `webDir` with no per-file exclusion — pointing elsewhere is the only lever.
- New plan file (not an epic addendum): packaging-only chore, no product behavior; the epic's minimal-binary constraint already covers the rule, this records the fix.
- Sweep 2026-09-23: `globPublicPatterns` reads `public/` independently of `webDir` (verified in `next.config.mjs`); no test asserts `webDir`'s value; `e2e/helpers/auth.ts`-class flows untouched — nothing invalidated.
