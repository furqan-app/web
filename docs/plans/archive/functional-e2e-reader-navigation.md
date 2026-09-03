---
title: "Functional E2E: Reader Navigation & Page Controls"
type: feature
date: 2026-08-27
status: implemented
area: reader
---

# Functional E2E: Reader Navigation & Page Controls

**GitHub Issue:** [#423](https://github.com/furqan-app/web/issues/423)  
**Parent Epic:** [#421](https://github.com/furqan-app/web/issues/421)  

## Summary

Implement a behavioral Playwright end-to-end test suite (`e2e/tests/reader-navigation.spec.ts`) covering Quran reader navigation mechanics, in-spread page navigation arrows, keyboard arrow controls across both Arabic (RTL) and English (LTR) locales, direct URL deep-linking, desktop double-page spread toggling, and Continue Reading state persistence. Tests run against the full 604-page committed fixture database (`e2e/fixtures/quran-fixture.sql`) via `npm run e2e:test` without visual screenshot comparisons.

## Approach

1. **Shared Reader Test Helpers (`e2e/helpers/reader.ts`)**:
   - `waitForReaderContent(page)`: Positive assertion ensuring all mounted `.fq-quran-safha` elements have painted word rows (`.fq-safha-row`) per [ADR 0022](../../architecture/adr/0022-visual-e2e-testing.md) and [ADR 0034](../../architecture/adr/0034-page-turn-readiness-on-slow-networks.md).
   - `setStoredSafhaView(page, view)`: Sets `localStorage.quranSafhaView` to `'single' | 'double'` and initializes `html[data-safha-view]` before first paint.
   - `swipeReader(page, direction)`: Dispatches touch swipe gestures to exercise mobile touch page turns and snap-backs.

2. **In-Spread Next / Previous Button Navigation (Desktop `md+`)**:
   - In double-page view (desktop default, 1440x900), on `/ar/pages/1` (spread pairs 1 & 2), clicking `Next page` (`aria-label="Next page"`) steps forward by pair to `/ar/pages/3` (spread pairs 3 & 4).
   - In single-page view, on `/ar/pages/1`, clicking `Next page` advances by 1 page to `/ar/pages/2`.
   - Clicking `Previous page` (`aria-label="Previous page"`) steps backward by 1 page (single view) or by pair (double view).
   - Verifies URL updates via client-side `history.replaceState` without full document reload.

3. **Boundary Wrap-Around Navigation**:
   - On `/ar/pages/1`: clicking `Previous page` (or pressing `ArrowRight`) wraps around to the end of the Quran (`/ar/pages/604` in single view, or pair `603–604` / URL `/ar/pages/603` in double view).
   - On `/ar/pages/604` (or pair `603–604`): clicking `Next page` (or pressing `ArrowLeft`) wraps around to Page 1 (URL `/ar/pages/1`).

4. **Mobile Touch Swipe Navigation (Mobile Viewport `390x844`)**:
   - Touch drag / swipe right (Quran RTL forward order): advances from `/ar/pages/1` to `/ar/pages/2`.
   - Touch drag / swipe left (Quran RTL backward order): steps backward from `/ar/pages/2` to `/ar/pages/1`.
   - Sub-threshold swipe (<80px): snaps back to the current page without changing URL or page anchor.
   - Verified that navigation arrows are hidden on mobile (`hidden md:flex`), leaving swipe as the touch reader interaction.
   - Verified that double-spread view is forced to single-page on mobile even if `quranSafhaView="double"` is stored.

5. **Keyboard Arrow Navigation (Desktop, Locale-Invariance & Input Guard)**:
   - On reader pages, physical `ArrowLeft` triggers forward navigation in Quran reading order and `ArrowRight` triggers backward navigation.
   - Explicitly verified across **both** `ar` (RTL) and `en` (LTR) locales to prevent future regressions in LTR mode.
   - Verifies that key events occurring inside input elements (e.g. search box) do not trigger page turns.

6. **Rapid Turn Settling (In-Flight Handoff)**:
   - Rapid consecutive keypresses or arrow clicks exercise `settleInFlight` / `inFlight` handoff (ADR 0028 Addendum), verifying turns don't get dropped or desynchronize the URL from the visible page.

7. **Direct URL Routing, Out-of-Bounds Routes & SSR Jump Gate**:
   - Directly navigating to `/ar/pages/5` or `/en/pages/12` hydrates the correct page.
   - Verifies pre-paint jump gate resolution (the `fq-pending-jump` class is removed from `<html>`), word rows paint, and the footer page numeral matches the targeted page.
   - Navigating to out-of-bounds or invalid page IDs (e.g. `/ar/pages/0`, `/ar/pages/999`, `/ar/pages/invalid`) correctly renders the 404 boundary.

8. **Home Entry Paths & Continue Reading Sync**:
   - Clicking a Surah link on home `/ar` (e.g., Al-Baqarah) navigates directly to its starting page `/ar/pages/2`.
   - Visiting `/ar/pages/7` triggers `LastReadPageSync` to store page 7 in `localStorage.lastReadPage`.
   - Verifies both the navbar `ContinueReadingLink` and the `HomeContinueReadingCard` link target `/ar/pages/7`, and clicking either navigates directly back to `/ar/pages/7`.

9. **Desktop Double-Page Spread Layout Toggling**:
   - Desktop viewport (1440x900): Open Settings sheet (`aria-label="Settings"` / `الإعدادات`) → expand "Page View" section → toggle between "Single page view" and "Double page view".
   - Verifies `document.documentElement` reflects `data-safha-view="single"` / `"double"`, `.fq-safha-partner` visibility updates via CSS, and `localStorage.quranSafhaView` is updated.
   - Verifies step granularity automatically adjusts (single-page step in single view vs pair step in double view).

## Decision Tree / Test Matrix

| Test Suite / Area | Preconditions & Viewport | Actions & Inputs | Expected Behavioral Outcome |
|---|---|---|---|
| **In-Spread Arrows (Double View)** | Desktop (1440x900), `/ar/pages/1`, double view default | Click `Next page` arrow | URL becomes `/ar/pages/3`, facing pages 3 & 4 rendered with word rows, no full page reload. |
| **In-Spread Arrows (Single View)** | Desktop (1440x900), `/ar/pages/1`, single view configured | Click `Next page` arrow | URL becomes `/ar/pages/2`, single page 2 rendered. Clicking `Previous page` returns to `/ar/pages/1`. |
| **Boundary Wrap (Page 1 Backward)** | Desktop (1440x900), `/ar/pages/1`, single view | Click `Previous page` arrow | Wraps to `/ar/pages/604`, page 604 rendered. |
| **Boundary Wrap (Page 604 Forward)** | Desktop (1440x900), `/ar/pages/604`, single view | Click `Next page` arrow | Wraps to `/ar/pages/1`, page 1 rendered. |
| **Mobile Touch Swipe (Forward)** | Mobile (390x844), `/ar/pages/1` | Swipe right (>80px drag) | URL updates to `/ar/pages/2`, page 2 word rows rendered. |
| **Mobile Touch Swipe (Backward)** | Mobile (390x844), `/ar/pages/2` | Swipe left (>80px drag) | URL updates to `/ar/pages/1`, page 1 word rows rendered. |
| **Mobile Touch Snap-Back** | Mobile (390x844), `/ar/pages/1` | Small swipe right (30px drag) | Strip snaps back to rest (-100%), URL remains `/ar/pages/1`. |
| **Mobile Single-Page Invariant** | Mobile (390x844), `/ar/pages/2`, stored view "double" | Inspect DOM | Only single page 2 rendered (no partner spread), navigation arrows hidden. |
| **Keyboard Navigation (Arabic RTL)** | Desktop (1440x900), `/ar/pages/1` | Press `ArrowLeft` | Forward step in Quran order: URL updates to `/ar/pages/3` (double view) or `/ar/pages/2` (single view). Pressing `ArrowRight` steps back to `/ar/pages/1`. |
| **Keyboard Navigation (English LTR)** | Desktop (1440x900), `/en/pages/1` | Press `ArrowLeft` | Forward step in Quran order: URL updates to `/en/pages/3` (double view) or `/en/pages/2` (single view). Pressing `ArrowRight` steps back to `/en/pages/1`. |
| **Keyboard Navigation (Input Guard)** | Desktop (1440x900), `/ar` with search modal open | Focus search input, press `ArrowLeft` | Cursor moves inside input; reader does not trigger page turn. |
| **Rapid Turn Settling** | Desktop (1440x900), `/ar/pages/1`, single view | Press `ArrowLeft` 3 times rapidly | `settleInFlight` lands each step cleanly, final URL is `/ar/pages/4` with page 4 content. |
| **Home Surah List Navigation** | Desktop & Mobile, `/ar` | Click Al-Baqarah surah link | Navigates to `/ar/pages/2`, page 2 content rendered. |
| **Direct URL Routing** | Desktop & Mobile, direct `goto` to `/ar/pages/5` | Page load | `fq-pending-jump` removed, page 5 content rendered, footer numeral reflects 5. |
| **Invalid Page Route (404)** | Desktop & Mobile, direct `goto` to `/ar/pages/999` | Page load | Renders 404 not-found page cleanly. |
| **Spread Toggle (Settings Sheet)** | Desktop (1440x900), `/ar/pages/2` | Open Settings → Page View → Single view | `data-safha-view="single"`, partner safha hidden, `localStorage.quranSafhaView="single"`. Selecting Double view restores partner card. |
| **Continue Reading Link** | Desktop (1440x900) & Mobile (390x844) | Visit `/ar/pages/7`, go to `/ar`, click Continue Reading | `localStorage.lastReadPage` is 7, navbar link targets `/ar/pages/7`, clicking link navigates directly to `/ar/pages/7`. |

## Verified Test Cases

- **Double-Spread Step**: On `/ar/pages/1` in double mode, click Next arrow → page URL becomes `/ar/pages/3`, `QuranSafha` renders pages 3 and 4 with word rows.
- **Single-Page Step**: On `/ar/pages/1` in single mode, click Next arrow → page URL becomes `/ar/pages/2`, `QuranSafha` renders page 2 with word rows.
- **Wrap Around**: On `/ar/pages/1` (single view), clicking Prev arrow navigates to `/ar/pages/604`. On `/ar/pages/604`, clicking Next arrow navigates to `/ar/pages/1`.
- **RTL & LTR Keyboard Invariance**:
  - `page.goto("/ar/pages/1")` → `page.keyboard.press("ArrowLeft")` → URL updates to `/ar/pages/3` (or `/ar/pages/2`).
  - `page.goto("/en/pages/1")` → `page.keyboard.press("ArrowLeft")` → URL updates to `/en/pages/3` (or `/en/pages/2`).
- **Rapid Navigation**: On `/ar/pages/1` (single view), 3 rapid `ArrowLeft` presses advance to `/ar/pages/4`.
- **Home Surah Navigation**: From `/ar`, clicking Al-Baqarah navigates to `/ar/pages/2`.
- **Invalid Page 404**: `page.goto("/ar/pages/999")` renders the not-found view.
- **Direct Deep-Link**: `page.goto("/ar/pages/5")` → `waitForReaderContent(page)` resolves, URL is `/ar/pages/5`, page 5 lines visible.
- **View Toggle**: On `/ar/pages/2`, opening settings and selecting Single page view sets `data-safha-view="single"` on `<html>` and hides `.fq-safha-partner`.
- **Continue Reading Flow**: Navigating to page 7 updates `localStorage.lastReadPage = 7`; on `/ar`, clicking navbar Continue Reading link lands on `/ar/pages/7`.

## Files to Change

- `e2e/helpers/reader.ts` [NEW] — Reusable E2E test helpers (`waitForReaderContent`, `setStoredSafhaView`, `swipeReader`).
- `e2e/tests/reader-navigation.spec.ts` [NEW] — Behavioral test suite covering in-spread arrows, wrap-around navigation, mobile gestures, keyboard navigation across `ar`/`en`, rapid settling, home entry links, direct URL routing, 404 handling, spread toggle, and continue reading flow.

## Constraints

- Tests must use resilient locators (`getByRole`, accessible names, `data-` attributes) rather than fragile CSS class selectors where possible.
- Content readiness checks must use positive assertions (`waitForReaderContent` checking `.fq-safha-row` presence within `.fq-quran-safha`) rather than checking absence of skeletons, per [ADR 0022](../../architecture/adr/0022-visual-e2e-testing.md) and [ADR 0034](../../architecture/adr/0034-page-turn-readiness-on-slow-networks.md).
- No visual screenshot diffing (`toHaveScreenshot()`) or baseline image comparisons.
- Must execute against the dedicated e2e database fixture (`compose.e2e.yml` / `e2e:setup`) on ports 3309/3310, never dev DBs (3307/3308).

## What NOT to Do

- Do not modify production reader components (`ReaderPager`, `QuranSpread`, `QuranSafha`) for testing convenience.
- Do not test `/pages/vertical` — explicitly out of scope per user confirmation.
- Do not reintroduce `toHaveScreenshot()` or visual diff baselines.
- Do not use `page.waitForTimeout()` arbitrary sleeps in place of deterministic content or state assertions.
- Do not restrict keyboard arrow navigation testing to only Arabic — both `ar` and `en` must be exercised.

## Decisions Made

- Test keyboard arrow navigation for both Arabic and English locales to guard against accidental inversion in LTR.
- Include boundary wrap-around tests (p1 <-> p604) and rapid keypress in-flight settling.
- Include home surah list navigation and invalid page 404 tests.
- Exclude `/pages/vertical` from the test suite per user direction.
- Structure test helpers in `e2e/helpers/reader.ts` for reuse across sibling functional test suites.
- Test double-page spread behavior at desktop viewport (1280x800) and verify single-page behavior on mobile viewport (390x844).
