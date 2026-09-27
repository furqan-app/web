---
title: Fix search sheet blank space with soft keyboard in the native shell
type: bug
date: 2026-09-27
status: implemented
area: search
---

# Fix search sheet blank space with soft keyboard in the native shell

## Summary

In the Capacitor Android shell (Play build, verified on the 1.9.4 AAB), opening the search overlay and focusing the input shows a large blank area consuming real layout space instead of the result rows; closing the keyboard restores the normal layout. The standalone PWA on the same class of device is unaffected, and search data itself is healthy (the "view all N results" footer renders its count). The cause class is keyboard/viewport geometry: the top-anchored sheet is sized with a full-screen viewport unit while the shell's window and the keyboard resize differently than Chrome PWA. The fix re-anchors the sheet to the initial containing block with a single scroll container, with a native `windowSoftInputMode` fallback behind a device gate.

## Root Cause / Approach

Traced on `origin/main` (verified 2026-09-27; the reporter's branch checkout is stale, so every claim below was re-checked against `origin/main`):

- `SearchBar` renders a Radix `Sheet`, `side="top"`, with `h-screen` (`100vh`) and nested scrollers: the base `SheetContent` variant carries `overflow-y-auto` and the sheet body adds its own `flex-1 overflow-y-auto` container.
- `android/app/src/main/AndroidManifest.xml` sets no `windowSoftInputMode` (grep: no match), so the shell uses the system default, while the viewport meta (`app/layout.tsx`) sets only `themeColor` + `viewportFit: cover` with no `interactive-widget` mode — Chrome PWA therefore keeps layout-viewport behavior the sheet was designed against, and the WebView does not. Same sheet, two geometries: PWA fine, shell broken.
- This is the exact failure class two standing decisions already cover: full-viewport heights must anchor to the initial containing block, never to viewport units (`decisions/reader.md`, ADR 0044), and a `SheetContent` that overrides positioning must not leave a viewport-unit height to compute on its own (`decisions/nav.md`, sheet `top`/`h-full` sizing). The search sheet violates both.
- Owner-observed facts that scope the fix: happens from home AND reader (rules out reader-pager stacking contexts), data path healthy (footer count renders), blank consumes layout space (rules out z-index/overlay theories — `decisions/nav.md` z-index left untouched).

Approach: apply the sanctioned ICB pattern to the search sheet (top + bottom anchoring, `height: auto`, one scroll container), verify on the physical device, and only if the device still misbehaves, add the one-line native `windowSoftInputMode` fallback. No data-path, API, or navigation changes.

## Decision Tree / Algorithm

The exact on-device geometry is confirmed behind a device gate (shell keyboard behavior is not reproducible in Playwright — precedent: `mobile-app-capacitor.md`). The implementer inspects via `chrome://inspect` on the reporter's device class and follows the first matching branch:

- If the sheet's border-box height equals the full-screen `vh` value while the visual viewport is keyboard-shrunk (stale-unit case, ADR 0044 pattern) → drop `h-screen`; anchor `top-0 bottom-0` with `height: auto` (the `decisions/nav.md` sheet rule) and collapse the two nested `overflow-y-auto` regions into a single scroll container (input row + footer `shrink-0`).
- Else, if the window never resizes and the keyboard overlays the fixed sheet (`adjustPan`-style) → the same ICB anchoring applies (bottom-anchored sheet ends above the keyboard); verify the footer sits above the keyboard with no manual scroll.
- Else, if the sheet geometry is correct on-device but rows still do not show → take the native fallback: set `windowSoftInputMode="adjustResize"` on `MainActivity` in `AndroidManifest.xml` (one attribute, web code untouched by this branch) and re-run the device gates.
- Else, if taps on the blank area navigate (rows present but invisible — not observed; owner reports layout consumption, not invisibility) → abandon the geometry path and treat as a text/contrast rendering path instead; do not ship the geometry change.

In all geometry branches the web fix stays: it is correct under both resize and pan behaviors, so the branches converge rather than fork the code.

## Verified Test Cases

Live walkthrough is device-gated (no Playwright soft-keyboard coverage exists or is possible in CI). The implementer runs these on the verified 1.9.4 shell (Actions run `36273919449`, `versionName` parsed from the built manifest) on the reporter's device class (vivo, Android 15 family), plus Chrome standalone PWA on the same device as the no-regression control:

1. Home → open search → keyboard up → typed query shows tappable surah/verse rows AND the "view all" footer above the keyboard, no blank consumption.
2. Reader page → same as (1) from the reader entry point.
3. Keyboard dismissed → layout identical to pre-fix (input, idle/loading/results states, footer).
4. Standalone PWA, same device, keyboard up and down → pixel-identical behavior to pre-fix.
5. Back gesture with search open still closes the overlay first (`close-overlays-on-back-swipe.md` behavior preserved).
6. Arabic RTL and English LTR parity for (1).

Cases (1)–(2) are the bug; (3)–(6) are the no-regression net. The owner re-confirms (1) on their physical device before ship — same gate the shell plan uses.

## Files to Change

- `app/components/search/SearchBar.tsx` — replace the sheet's `h-screen` with ICB anchoring (`top-0 bottom-0`, `height: auto` neutralizing the unit, per `decisions/nav.md`) and collapse the nested `overflow-y-auto` pair into one scroll container; input row and footer stay `shrink-0`. Trigger, debounce, `take: 10`, 2-char gate, back-guard, and grant-aware links untouched.
- `components/ui/sheet.tsx` — only if the fix needs a shared `top`-side full-height variant; prefer the local override in `SearchBar` and leave the primitive untouched.
- `android/app/src/main/AndroidManifest.xml` — fallback branch only: `windowSoftInputMode="adjustResize"` on the activity; web code unaffected by this branch.
- `docs/architecture/decisions/search.md` (or the mobile section of `decisions/pwa.md`) — record the observed shell keyboard geometry and which branch won, so the next shell UI task starts from data, not rediscovery.
- No e2e spec changes: soft-keyboard geometry cannot run in CI; the device gates above are the coverage. No new `GET /api/*` reads, so no service-worker rule changes.

## Constraints

- ICB anchoring for full-viewport heights, never viewport units (`decisions/reader.md`, ADR 0044) — the core of this fix, not a style preference.
- Sheet sizing rule: any `top`/`bottom` override must neutralize the unit height in the same style (`height: auto`, `top` + `bottom` size the box — `decisions/nav.md`); do not reintroduce `calc(100dvh - …)` (forbidden there: goes stale across installed-shell transitions).
- Keep overlays at or below the Radix `z-50` ceiling (`decisions/pwa.md`); the current `!z-[52]` pair is out of scope unless the device shows a stacking defect — do not "fix" it opportunistically.
- Search payload invariants stay: `take: 10` overlay cap, 2-char gate via `isSearchQueryValid`, deterministic ordering (`decisions/search.md`).
- Styling standards: semantic tokens only, `start`/`end` logical properties, existing sheet enter/exit transitions within the Motion durations; no JS animation dependency.
- Display-mode/back-guard helpers stay single-sourced (`app/utils/platform.ts`, `useCloseOnBackGesture`); no re-derivation.
- Fix lands from updated `origin/main` in an isolated worktree (`../furqan-<slug>`); the investigation checkout is a stale branch and must not be the implement base.

## What NOT to Do

- No changes to the search data path (`useSearch`, `/api/search/*`, offline index, normalization) — proven healthy by the rendering footer count.
- No `z-index` changes (overlay, content, nav) — the owner confirmed layout consumption, not a stacking defect.
- No `@capacitor/keyboard` plugin or resize-listener JS as the first resort — a native dependency needs its own design; the CSS anchoring + one manifest attribute cover the observed branches.
- No fixed-pixel sheet heights and no `100dvh`/`100svh` replacements for `h-screen` — same stale-unit family, same bug.
- No Playwright soft-keyboard spec — unrunnable in CI; device gates are the coverage, stated explicitly so a later sweep does not file it as a gap.
- No keystore/secret handling of any kind — release signing is unrelated to this fix.
- No touching `[...nextauth]`, middleware matcher, `globPublicPatterns`, or precache sets.

## Decisions Made

- New focused bug plan, not an addendum: no active plan covers search-sheet keyboard geometry. `search-results-page.md` / `fix-search-debounce-lag.md` / `search-foundation.md` are data/paging concerns; `close-overlays-on-back-swipe.md` is back-gesture dismissal (its `useCloseOnBackGesture` wiring is preserved, not modified); `mobile-app-capacitor.md` is the shell-delivery umbrella with no sheet-geometry content.
- No new ADR: the fix applies two standing decisions (reader ICB anchoring, nav sheet sizing) to a new surface; the device-observed outcome gets a paragraph in `decisions/search.md`/`pwa.md`, not a new architectural rule.
- Sweep (3b, 2026-09-27): no e2e asserts soft-keyboard geometry (soft-keyboard terms appear in no search spec; `keyboard.*` hits are Escape/shortcut/arrow keys only) — nothing invalidated. No new `GET /api/*` (no SW `NetworkOnly` concern). No `useSession()`/`navigator.onLine` derivation. "Overlay trigger unchanged" verified by reading `SearchBar.tsx` on `origin/main`.
- Repro baseline established during planning: local `app-release (2)` AAB parses to `versionName 1.9.0` (binary-manifest string-pool read), Sept-25 file to `1.9.3`; a fresh CI dispatch (`Android release bundle`, run `36273919449`, `version-name=1.9.4`) built and its artifact manifest verified as `1.9.4` before this plan was written — the 1.9.0-vs-1.9.4 confusion was a stale default input (`version-name` defaults to `1.9.0`), not a code regression.
- Owner answers baked in: bug from home AND reader; blank consumes layout space; keyboard-closed layout normal; PWA unaffected. Step-3 live walkthrough is carried by the implementer behind the device gates above (precedent: `mobile-app-capacitor.md` POC gates), not pre-verified here.
- No GitHub issue filed with this plan; the implement step files/links it (`issue:` omitted).
- Implemented 2026-09-27: primary ICB-anchoring branch only (`bottom-0 h-auto`, single `fq-scroll-nice` scroller, no other class or logic touched); manifest `windowSoftInputMode` fallback deferred pending the owner device gate. Lint + `tsc --noEmit` clean; no new automated test (className-only change, soft-keyboard geometry unrunnable in CI — the device gates above are the coverage).
- Review (`/review-fq-work`, 5 findings) disposition: fixed `min-h-0` on the results container and neutralized root scrolling (`overflow-visible`, so the results container is the single scroller); the split-file note is covered by the inline comment citing both decisions; the decisions-file paragraph and device-gate evidence stay open until the owner confirms the winning branch on-device (recording either now would assert an unverified outcome).
