---
title: Complex E2E & Fix — Locale Switching & Bi-Directional Reader Navigation
type: feature
date: 2026-09-06
status: implemented
area: nav
issue: 474
---

# Complex E2E & Fix — Locale Switching & Bi-Directional Reader Navigation

## Summary

Cover issue #474 (part of epic #466): harden `ar` (RTL, default) ↔ `en` (LTR) switching mid-reader-journey with a Playwright behavioral spec plus one small fix — `LanguageToggle` currently drops the query string on switch. Arrow-key semantics stay locale-independent (Quran page order is fixed), and playing recitation is expected to stop cleanly on switch (provider remounts with the locale layout).

## Root Cause / Approach

Two behaviors, one bug + one confirmation:

1. **Bug (fix):** `LanguageToggle.switchTo` pushes only `pathname` from next-intl's `usePathname()`, which excludes the query string — `?highlight=…` and view params are lost on `ar ↔ en` switch while the page number survives. Fix by appending `window.location.search` read at click time (next-intl 3.x exposes no `useSearchParams`; a `next/navigation` hook would force a Suspense/CSR bailout on the statically generated pages).
2. **Confirmation (test-only):** `ReaderPager` arrows are deliberately locale-independent (`ReaderPager.tsx:527-555`, no `isRTL` branch — physical-left always steps forward). Issue #474's text describes locale-inverting arrows; that text is wrong and the code is right. The spec locks the code behavior in both locales, including across a live switch.
3. **Confirmation (test-only):** `RecitationProvider` sits inside `app/[locale]/layout.tsx`, so a locale switch remounts it and playback ends. Preserving audio would mean lifting the provider above the locale layout — explicitly out of scope. The spec asserts playback stops cleanly (no orphan audio, no crash, bar returns to idle).

New spec `e2e/tests/locale-switching.spec.ts` reuses `e2e/helpers/reader` (`waitForReaderContent`, `getActivePanel`) and existing `ar`/`en` patterns from `reader-navigation.spec.ts`.

## Decision Tree / Algorithm

| # | Condition | Expected |
|---|---|---|
| 1 | On `/ar/pages/X`, switch to `en` (and back) | URL becomes `/en/pages/X` (same X); same facing pair renders in double view |
| 2 | Switch with `?highlight=<word>` (+ view params) present | Query string preserved through the toggle fix |
| 3 | After switch | Root layout `dir` flips `rtl ↔ ltr`; Quran rows stay right-to-left via locale compensation (`flex-row` in `ar`, `flex-row-reverse` in `en` — `QuranLine.tsx`), spread mirrors via `flex-row-reverse` (`QuranSpread.tsx`) |
| 4 | `ArrowLeft` / `ArrowRight` in `ar` AND in `en` | `ArrowLeft` = forward step, `ArrowRight` = backward step, both locales (no inversion) |
| 5 | Recitation playing during switch | Playback stops, no orphan `<audio>`, player bar idle, no exception |
| 6 | Sidebar / navbar after switch | Mirrored via existing CSS only; no JS-hook positioning added |
| 7 | Font loading across switch re-renders | New immutable font units only; never mutate a live `@font-face` `<style>` (ADR 0029) |

## Verified Test Cases

Walked through with the user (no external data needed — behavior-only E2E):

- `/ar/pages/5` → switch → `/en/pages/5`, same content; switch back → `/ar/pages/5`.
- `/ar/pages/12?highlight=2:255` → switch → query intact on `/en/pages/12?highlight=2:255`.
- `dir="rtl"` on `/ar/pages/1`, `dir="ltr"` on `/en/pages/1`; mushaf rows keep right-to-left reading order in both (row class `flex-row` in `ar`, `flex-row-reverse` in `en`; first word renders rightmost).
- `ArrowLeft` on `/en/pages/1` advances (forward), `ArrowRight` returns — mirrors the existing `reader-navigation.spec.ts:117-127` assertion, extended across a live switch.
- Start recitation on `/ar/pages/2`, switch to `en` → audio ended, bar idle, page usable.

## Files to Change

- `app/components/LanguageToggle.tsx` — preserve query on locale push (append click-time `window.location.search` when non-empty); nothing else changes in the component.
- `e2e/tests/locale-switching.spec.ts` (new) — the five cases above: page preservation both directions, query preservation, `dir` flip + Quran `rtl`, arrows both locales + across switch, recitation clean-stop.
- `docs/plans/INDEX.md` (generated) — regenerate via `gen-plans-index.sh`, stage with the plan.

## Constraints

- Default locale is `ar` (RTL); `ar.json` coverage is load-bearing, `en` supplementary (decisions/i18n.md, standards/i18n.md).
- Never mutate a live `<style>` carrying `@font-face` — fonts only as new immutable units (ADR 0029).
- `commitTo` stays the only in-reader navigation primitive — the locale switch itself is a genuine cross-locale route change via next-intl `router.push`, not an in-reader step, so it is exempt by nature.
- All 604 pages stay statically generated; user state stays client-only.
- Out of scope: Daily Awrad / `/plans`, translation copy/dictionary coverage (per #474).
- New spec runs against the production-build E2E path (`e2e:serve`), never `next dev`.

## What NOT to Do

- Do not invert arrow keys by locale — issue #474's inversion text is superseded by this plan; Quran order is fixed regardless of UI language.
- Do not lift `RecitationProvider` above the locale layout to preserve audio — clean reset is the specified behavior.
- Do not add JS-hook-gated (`matchMedia`) positioning for sidebar/navbar mirroring — CSS `@media`/logical properties only (ADR 0043).
- Do not touch the font registry update path or the slim page-JSON content pipeline.
- Do not assert translation string contents — layout direction and navigation behavior only.

## Decisions Made

- Arrow semantics: keep locale-independent (user-confirmed); #474's inversion sentence is treated as a spec-text error, corrected here rather than in code.
- Audio: accept clean reset on switch (user-confirmed); no provider move.
- Query params: fix the toggle to preserve them (user-confirmed) — the only production code change in this plan.
- No ADR: nothing here sets a new architectural invariant (arrow rule already documented at `ReaderPager.tsx:527-533` + `arrow-controls-desktop.md`; audio reset follows existing layout nesting; toggle fix is a bugfix).
- Step-3b sweep (2026-09-06): `reader-navigation.spec.ts:117-127` already asserts locale-independent arrows on `/en` — the new spec extends, not invalidates, it. `settings-persistence.spec.ts:405` (`div[dir='ltr']`) means new `dir` locators must be scoped to avoid strict-mode violations. `LanguageToggle` is used only in `SettingsSidebar` — no other caller depends on the query-dropping behavior. No SW `NetworkOnly` or offline-signal concerns: locale navigations ride existing precache rules.
