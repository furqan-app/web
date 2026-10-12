---
title: Native brand icons and splash from the Furqan mark
type: feature
date: 2026-09-22
status: implemented
area: theming
issue: 764
adr: []
---

# Native brand icons and splash from the Furqan mark

## Summary

Replace every Capacitor-default launcher icon and splash image on `android/` and `ios/` with the Furqan brand mark, generated at all required densities from the user-exported `furqan-logo-512.png`, on the navy splash background (unified 2026-10-09 with the web splash-continuity cover: `#16232F` canvas + white logo mark, no text) and the darkest-navy launcher background.

## Root Cause / Approach

`npx cap add` scaffolds teal Capacitor placeholder art (mipmap ic_launcher set, 11 splash buckets, AppIcon set with a single 1024 entry, 2732 Splash imageset). Regenerate each file from the brand source with sharp: opaque navy compositions for launcher/store surfaces, transparent-background adaptive foregrounds, same filenames everywhere so no XML/storyboard/manifest reference changes. Splash buckets keep a flat navy `#16232F` canvas with the logo at 35% of canvas width centered — the same look as the web splash-continuity cover (navy + white logo mark, no text), so cold launch reads as one continuous splash → page transition.

## Decision Tree / Algorithm

- If the surface masks the icon (legacy launcher, round, iOS AppIcon) → opaque navy `#070F17` + logo at 62% canvas width centered (inside every circle/squircle mask safe zone; the 80% variant crowds the circle crop top/bottom — verified by mask trial).
- If the surface is an adaptive foreground → transparent + logo at 62% of the 108dp viewport; background color token + vector fill are navy `#070F17`.
- If the surface is a splash bucket (Android `drawable*/splash.png`, iOS `Splash` imageset) → flat navy `#16232F` canvas at the bucket's exact existing size + logo at 35% of canvas width centered.
- If the surface is the web splash-continuity cover (standalone mobile/tablet only — the `fq-launch-cover` scope) → same navy background + same white logo mark centered (CSS mask over the already-precached `/icons/logo-navbar-white.png`); lift logic unchanged (visible-pair data + `pageFontsReady` + mushaf hydrated, or the 5s safety timer; opacity-only fade, instant under `prefers-reduced-motion`). Desktop and plain browser tabs never reveal it.
- Play 512 icon: regenerated on navy with the PWA set (it doubles as the store listing icon and the OG/social image); verify dimensions, don't rename.

## Verified Test Cases

- Every overwritten PNG matches its predecessor's dimensions exactly (script asserts per-file).
- `AppIcon.appiconset/Contents.json` validates as JSON and names only files present; iOS set expanded to the full standard size list.
- No XML/storyboard/manifest diff except the two background-color values (adaptive color token + vector fill, now navy).
- `npx cap sync` still passes (webDir placeholder dir exists).
- Trial renders reviewed with owner before approval: navy-dark vs navy-card vs ivory (`/tmp/opencode/icon-trial.png` — mark legible on navy, gold/white pop); 80% vs 62% scale (`/tmp/opencode/icon-scale-trial.png`) + square/circle/squircle mask trial per scale (`/tmp/opencode/icon-mask-trial.png`) — owner picked the padded 62% variant.
- Unification (owner-confirmed 2026-10-09): Android shell cold launch → native navy+logo → cover navy+logo → reader pair (no ivory flash, no text flash); iOS shell cold launch → same; PWA standalone mobile cold launch to last-read page → manifest navy splash → cover navy+logo → pair with no skeleton; browser tab and desktop → no cover, pixel-identical to before; fresh-install first launch → splash → cover → offline-setup gate on top, dismissing the gate reveals the cover until the pair is ready. e2e `offline-pwa.spec.ts` "1b" extended with a logo-span visibility assertion while the cover is up (passes on mobile; rest of the file skips per its desktop/mobile gates).

## Files to Change

- `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `icon-apple-180.png` — regenerated on navy.
- `android/app/src/main/res/mipmap-*/ic_launcher*.png` (15 files) — regenerated on navy / transparent foregrounds.
- `android/app/src/main/res/drawable*/splash.png` (11 files) — regenerated on navy `#16232F`.
- `android/app/src/main/res/values/ic_launcher_background.xml` — ivory → navy.
- `android/app/src/main/res/drawable/ic_launcher_background.xml` — ivory solid → navy solid.
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/` — full size set on navy + rewritten `Contents.json`.
- `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732*.png` (3 files) — regenerated on navy `#16232F`.
- `app/components/reader/ReaderPage.tsx` — cover layer shows a logo span (mask from the already-precached `/icons/logo-navbar-white.png`) instead of the text wordmark; `aria-hidden` div, parse-time reveal script, and `LaunchSplashCover` removal ownership unchanged.
- `app/globals.css` — `.fq-launch-cover-mark` text rules replaced with `.fq-launch-cover-logo` mask rules (112px square, mask contain, `#f5f1e6` fill on the unchanged `#16232F` background); `z-40`, flex centering, opacity-only fade, and `prefers-reduced-motion` instant path unchanged.
- `e2e/tests/offline-pwa.spec.ts` — "1b" asserts the logo span is visible while the cover is up.

## Constraints

- Same filenames everywhere — no reference changes in XML, storyboard, manifest, or gradle files.
- iOS AppIcon must be opaque (no alpha) or App Store validation fails.
- Logo asset stays outside the repo (`/home/tahamohamed/Pictures/furqan-logo/`); the script lives in `/tmp`, not the repo.
- Splash background is one flat color (no gradient) — changeable in one place later. Splash/cover navy is `#16232F`; launcher navy stays `#070F17` — the two navies coexist by design, and "identical" scopes to the two launch layers, not the launcher icon.
- `app/manifest.ts` (`background_color`/`theme_color` `#16232F`), `LaunchScreen.storyboard`, `AndroidManifest.xml`, `capacitor.config.ts` untouched.
- Cover stays static SSR markup (identical bytes for every user), `aria-hidden`, no focus trap, `z-40` below the Radix ceiling, never a download trigger; reveal scope and removal signals unchanged (ADR 0065).
- The cover mask `url()` must point at the already-precached `/icons/logo-navbar-white.png` (`icons/**/*` is in `globPublicPatterns`, `icons/*` excluded in the middleware matcher) — a service-worker cache hit, zero runtime network. No `<img>`, no new precache entry, no cache version bump.

## What NOT to Do

- Do not touch `LaunchScreen.storyboard`, `AndroidManifest.xml`, or `capacitor.config.ts` — references stay valid by construction.
- Do not add new asset directories or commit the generator script.
- Do not reintroduce any teal/`#26A69A` background alongside the brand; do not reintroduce ivory on the splash/cover.
- Do not use the 80% logo scale on any masked surface (circle crop crowds the mark).
- Do not use `<img>` or inline the mark PNG as a data URI in the cover (it would ride along in all 604 statically generated reader documents).
- Do not change the cover reveal scope, removal signals, safety timer, or stacking; do not touch launcher backgrounds or the iOS AppIcon set.
- Do not change `app/manifest.ts`, `public/launch.html`, `android/.../values/styles.xml`, `colors.xml`, or the shell decor — already `#16232F`, verified.

## Decisions Made

- Navy `#070F17` (darkest app navy) as the launcher-icon background: owner-approved after trial renders; matches the dark identity and keeps the mark legible (gold/white pop, emerald fill separates from navy).
- 62% logo scale for all launcher surfaces (mask-trial evidence over the old 68–80% range).
- Full iOS size set instead of the scaffold's single-1024 entry: the single entry relies on newer-Xcode behavior the release machine may not have.
- Accepted side effect: OG/Twitter link previews (`app/layout.tsx`, verse share page) read `icon-512.png`, so previews pick up the navy field too.
- Unification (2026-10-09, #764): navy + logo only, shade `#16232F`, logo-only with no text, all platforms together, mask-from-precached icon for the web layer. ADR 0065's "no fetched asset" is preserved in spirit — the mask resolves to a precached same-origin icon (SW cache hit, no network), honouring the root-layout network budget; no new ADR.
- Sweep: e2e "1b" asserts only the cover class lifecycle + `#fq-launch-cover` hidden, so it stays green with the added logo assertion; `COMPONENTS.md` needs no change (its `LaunchSplashCover` line names no wordmark). Every "unchanged" claim was opened and confirmed (manifest, `launch.html` body, `colors.xml`, `styles.xml`, decor).

## Revision History

- 2026-09-24: folded navy-launcher addendum into the body. **Ivory launcher background superseded by navy `#070F17` (splash stays ivory); 68–80% masked range and 66.7% adaptive scale superseded by 62%.**
- 2026-10-09: folded splash-cover unification addendum into the body (#764). **Ivory splash canvas superseded by navy `#16232F` + white logo mark; web cover wordmark text superseded by the same logo mark; "do not touch splash PNGs" superseded for the canvas color only** — geometry, sizes, filenames, and the no-reference-change rule stand.
