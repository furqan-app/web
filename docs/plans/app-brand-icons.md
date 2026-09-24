---
title: Native brand icons and splash from the Furqan mark
type: feature
date: 2026-09-22
status: ready-to-implement
area: theming
issue: 654
adr: []
---

# Native brand icons and splash from the Furqan mark

## Summary

Replace every Capacitor-default launcher icon and splash image on `android/` and `ios/` with the Furqan brand mark, generated at all required densities from the user-exported `furqan-logo-512.png`, on the manuscript-ivory splash background and (since the 2026-09-24 navy follow-on) the darkest-navy launcher background.

## Root Cause / Approach

`npx cap add` scaffolds teal Capacitor placeholder art (mipmap ic_launcher set, 11 splash buckets, AppIcon set with a single 1024 entry, 2732 Splash imageset). Regenerate each file from the brand source with sharp: opaque navy compositions for launcher/store surfaces, transparent-background adaptive foregrounds, same filenames everywhere so no XML/storyboard/manifest reference changes. Splash buckets keep the ivory canvas.

## Decision Tree / Algorithm

- If the surface masks the icon (legacy launcher, round, iOS AppIcon) → opaque navy `#070F17` + logo at 62% canvas width centered (inside every circle/squircle mask safe zone; the 80% variant crowds the circle crop top/bottom — verified by mask trial).
- If the surface is an adaptive foreground → transparent + logo at 62% of the 108dp viewport; background color token + vector fill are navy `#070F17`.
- If the surface is a splash bucket → ivory `#FAF8EF` canvas at the bucket's exact existing size + logo at 35% of canvas width centered (unchanged).
- Play 512 icon: regenerated on navy with the PWA set (it doubles as the store listing icon and the OG/social image); verify dimensions, don't rename.

## Verified Test Cases

- Every overwritten PNG matches its predecessor's dimensions exactly (script asserts per-file).
- `AppIcon.appiconset/Contents.json` validates as JSON and names only files present; iOS set expanded to the full standard size list.
- No XML/storyboard/manifest diff except the two background-color values (adaptive color token + vector fill, now navy).
- `npx cap sync` still passes (webDir placeholder dir exists).
- Trial renders reviewed with owner before approval: navy-dark vs navy-card vs ivory (`/tmp/opencode/icon-trial.png` — mark legible on navy, gold/white pop); 80% vs 62% scale (`/tmp/opencode/icon-scale-trial.png`) + square/circle/squircle mask trial per scale (`/tmp/opencode/icon-mask-trial.png`) — owner picked the padded 62% variant.

## Files to Change

- `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `icon-apple-180.png` — regenerated on navy.
- `android/app/src/main/res/mipmap-*/ic_launcher*.png` (15 files) — regenerated on navy / transparent foregrounds.
- `android/app/src/main/res/drawable*/splash.png` (11 files) — ivory, unchanged by the navy follow-on.
- `android/app/src/main/res/values/ic_launcher_background.xml` — ivory → navy.
- `android/app/src/main/res/drawable/ic_launcher_background.xml` — ivory solid → navy solid.
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/` — full size set on navy + rewritten `Contents.json`.
- `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732*.png` (3 files) — ivory, unchanged by the navy follow-on.

## Constraints

- Same filenames everywhere — no reference changes in XML, storyboard, manifest, or gradle files.
- iOS AppIcon must be opaque (no alpha) or App Store validation fails.
- Logo asset stays outside the repo (`/home/tahamohamed/Pictures/furqan-logo/`); the script lives in `/tmp`, not the repo.
- Splash background is one flat color (no gradient) — changeable in one place later.
- `app/manifest.ts` (`background_color`/`theme_color` `#16232F`), `LaunchScreen.storyboard`, `AndroidManifest.xml`, `capacitor.config.ts` untouched.

## What NOT to Do

- Do not touch splash PNGs, `LaunchScreen.storyboard`, `AndroidManifest.xml`, or `capacitor.config.ts` — references stay valid by construction.
- Do not add new asset directories or commit the generator script.
- Do not reintroduce any teal/`#26A69A` background alongside the brand.
- Do not use the 80% logo scale on any masked surface (circle crop crowds the mark).

## Decisions Made

- Navy `#070F17` (darkest app navy) as the launcher-icon background: owner-approved after trial renders; matches the dark identity and keeps the mark legible (gold/white pop, emerald fill separates from navy).
- 62% logo scale for all launcher surfaces (mask-trial evidence over the old 68–80% range).
- Full iOS size set instead of the scaffold's single-1024 entry: the single entry relies on newer-Xcode behavior the release machine may not have.
- Accepted side effect: OG/Twitter link previews (`app/layout.tsx`, verse share page) read `icon-512.png`, so previews pick up the navy field too.

## Revision History

- 2026-09-24: folded navy-launcher addendum into the body. **Ivory launcher background superseded by navy `#070F17` (splash stays ivory); 68–80% masked range and 66.7% adaptive scale superseded by 62%.**
