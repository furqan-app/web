---
title: Native brand icons and splash from the Furqan mark
type: feature
date: 2026-09-22
status: implemented
area: theming
issue: 654
adr: []
---

# Native brand icons and splash from the Furqan mark

## Summary

Replace every Capacitor-default launcher icon and splash image on `android/` and `ios/` with the Furqan brand mark, generated at all required densities from the user-exported `furqan-logo-512.png`, on the manuscript-ivory background.

## Root Cause / Approach

`npx cap add` scaffolds teal Capacitor placeholder art (mipmap ic_launcher set, 11 splash buckets, AppIcon set with a single 1024 entry, 2732 Splash imageset). Regenerate each file from the brand source with sharp: opaque ivory compositions for launcher/store surfaces, transparent-background adaptive foregrounds, same filenames everywhere so no XML/storyboard/manifest reference changes.

## Decision Tree / Algorithm

- If the surface masks the icon (legacy launcher, round, iOS AppIcon) → opaque ivory `#FAF8EF` + logo at 68–80% centered (inside every mask safe zone).
- If the surface is an adaptive foreground → transparent + logo at 66.7% (72dp of 108dp safe zone); background color token + vector fill become ivory.
- If the surface is a splash bucket → ivory canvas at the bucket's exact existing size + logo at 35% of canvas width centered.
- Play 512 icon: already brand (`public/icons/icon-512.png`) — verify, don't regenerate.

## Verified Test Cases

- Every overwritten PNG matches its predecessor's dimensions exactly (script asserts per-file).
- `AppIcon.appiconset/Contents.json` validates as JSON and names only files present; iOS set expanded to the full standard size list.
- No XML/storyboard/manifest diff except the two background-color values (adaptive color token + vector fill).
- `npx cap sync` still passes (webDir `public` exists).

## Files to Change

- `android/app/src/main/res/mipmap-*/ic_launcher*.png` (15 files) — regenerated.
- `android/app/src/main/res/drawable*/splash.png` (11 files) — regenerated.
- `android/app/src/main/res/values/ic_launcher_background.xml` — `#FFFFFF` → ivory.
- `android/app/src/main/res/drawable/ic_launcher_background.xml` — teal fill → ivory solid.
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/` — full size set + rewritten `Contents.json`.
- `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732*.png` (3 files) — regenerated.

## Constraints

- Same filenames everywhere — no reference changes in XML, storyboard, manifest, or gradle files.
- iOS AppIcon must be opaque (no alpha) or App Store validation fails.
- Logo asset stays outside the repo (`/home/tahamohamed/Pictures/furqan-logo/`); the script lives in `/tmp`, not the repo.
- Splash background is one flat color (no gradient) — changeable in one place later.

## What NOT to Do

- Do not touch `LaunchScreen.storyboard`, `AndroidManifest.xml`, or `capacitor.config.ts` — references stay valid by construction.
- Do not add new asset directories or commit the generator script.
- Do not reintroduce any teal/`#26A69A` background alongside the brand.

## Decisions Made

- Ivory `#FAF8EF` (gold-theme card) as the single brand background: matches the manuscript identity and keeps the emerald/gold mark legible (an emerald field would swallow the mark's emerald parts).
- Full iOS size set instead of the scaffold's single-1024 entry: the single entry relies on newer-Xcode behavior the release machine may not have.
