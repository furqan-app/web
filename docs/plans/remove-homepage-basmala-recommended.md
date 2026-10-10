---
title: Remove Homepage Basmala Overline and Recommended Surahs Section
type: feature
date: 2026-10-10
status: implemented
area: theming
---

# Remove Homepage Basmala Overline and Recommended Surahs Section

## Summary

The home page (`app/[locale]/page.tsx`) loses two elements: the basmala overline above the hero title and the entire Recommended Surahs pill strip. Everything else — title, tagline, continue-reading card, search field, and the 114-surah grid — renders exactly as today, in both locales and at every breakpoint.

## Root Cause / Approach

User-requested simplification, not a bug. The basmala line is the `home.overline` message rendered by `HomeHero`; the strip is `HomeRecommendedSurahs` rendered by `HomeSearchSection` in the idle (non-filtering) state only. Both are leaf UI with no downstream consumers: nothing imports the overline key except `HomeHero`, nothing imports `HomeRecommendedSurahs` except `HomeSearchSection`, and no route or breakpoint depends on either for navigation (every recommended surah stays reachable through the surah grid, the sidebar, and direct page routes). Removal is therefore pure deletion across four source files plus the two message catalogues and one e2e spec that asserts the strip exists.

## Decision Tree / Algorithm

No branching logic — the hero is unconditional and the change is deletion-only:

- `HomeHero` renders title + tagline only; the overline block goes away.
- `HomeSearchSection` idle state renders continue-reading card + search only; the recommended strip (and its import) goes away, and the file is deleted.
- Filtering behaviour is unchanged: an active query still hides the continue-reading card and lets results own the page.

## Verified Test Cases

Simple task per `docs/workflow/plan-task.md` §3 (one obvious place, no branching, fully visible from reading the code): the change was stated in one sentence and the user confirmed ("اه", 2026-10-10) — title/tagline/search/grid stay, basmala line + recommended strip go. Walkthrough of the resulting states:

- Idle `/ar` and `/en`, mobile + desktop: title, tagline, continue-reading card (when history exists), search field, 114 surah cards; no overline, no pill strip.
- Active query: identical to today minus the strip (continue-reading still hides; grid filters as before); clearing restores the idle state above.

## Files to Change

- `app/components/home/HomeHero.tsx` — delete the overline block (the `fq-overline` div rendering `t("overline")`); title, rule marks, and tagline untouched.
- `app/components/home/HomeRecommendedSurahs.tsx` — delete the file (sole importer is `HomeSearchSection`).
- `app/components/home/HomeSearchSection.tsx` — remove the `HomeRecommendedSurahs` import and its idle-state render; update the header comment that names "recommended chips".
- `messages/ar.json` — remove the now-unused `home.overline` and `home.recommendedSurahs` keys.
- `messages/en.json` — same two keys, preserving ar/en parity.
- `e2e/tests/home-nav-search.spec.ts` — drop the recommended-region assertions (idle-state visibility check and the hidden-during-query check); retitle the "hides continue-reading and recommended cards" test to continue-reading only. The 114-card and filtering assertions stay.
- `docs/architecture/COMPONENTS.md` — Zone: home: `HomeHero` line loses "overline"; `HomeSearchSection` line loses "+ recommended"; remove the `HomeRecommendedSurahs` line.

## Constraints

- ar/en key parity holds: both catalogues lose exactly the same two `home.*` keys.
- The root-level empty `overline` / `recommendedSurahs` placeholder keys (the `""` entries) are NOT touched — they belong to `docs/plans/arabic-translation-quality-fixes.md`.
- Title, tagline, `HomeContinueReadingCard`, `HomeSearch`/grid, and `getSurahs()` data flow are untouched; no SW, API, or reader changes (home issues no `/api/*` GET on load).
- The e2e spec update ships in the same change — CI runs Playwright on every PR and the current spec asserts the strip.
- Semantic tokens only; no new styling. The removed emerald overline/pill accents leave no orphan CSS (`.fq-overline`, `.fq-rule-mark` keep their other consumers).

## What NOT to Do

- Do not remove or rewrite the hero title, tagline, search field, continue-reading card, or surah grid.
- Do not add replacement hero content, a new strip, or a redirect for the removed pills.
- Do not touch the reader, nav, sidebar, SW (`app/sw.ts`), or any API route.
- Do not re-derive the nav or hero from the archived `design-migration/home-page-enhancement.md` (archive is history, never context).
- Do not "simplify" the now-query-only `isFiltering` gate in `HomeSearchSection` into `HomeSearch` — the client boundary stays as is.

## Decisions Made

- New plan file rather than an addendum on `home-page-design-fixes.md` (implemented): the recommended strip was never in that plan's scope, and the basmala overline was added after it by the design migration. Reopening a finished plan would misrepresent its history.
- Unused `home.overline` / `home.recommendedSurahs` keys are deleted (not left dead), following the `home.badge` precedent in `home-page-design-fixes.md`.
- Sweep (§3b) findings: one existing test asserts the removed behaviour (`home-nav-search.spec.ts`, 3 spots — included above); the `offline-pwa.spec.ts` basmala hit is mark seed data for word 1:1:1, unrelated; no vitest spec references either component; no test asserts the overline text; every recommended surah stays reachable via grid/sidebar/direct routes, so no breakpoint or route loses access.
