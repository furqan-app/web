---
title: "Complex E2E & Fix: Deep Links, Highlight Parameter Lifecycle & View Mode Transitions"
type: feature
date: 2026-09-02
status: implemented
area: reader
issue: 471
---

# Complex E2E & Fix: Deep Links, Highlight Parameter Lifecycle & View Mode Transitions

**GitHub Issue:** [#471](https://github.com/furqan-app/web/issues/471)
**Parent Epic:** [#466](https://github.com/furqan-app/web/issues/466)

## Summary

Implement a deterministic behavioral Playwright end-to-end test suite (`e2e/tests/deep-links-view-modes.spec.ts`) and verify/harden deep links, query parameter lifecycle (`?highlight=S:A`), and desktop Single vs. Double spread view mode transitions. The implementation verifies: (1) direct deep-link entry with highlight parameters (`?highlight=S:A` and `?highlight-type=selection`), (2) in-app search navigation stamping `?highlight=S:A&highlight-type=search`, (3) Ayah Picker surah/ayah jumps with instant pager swap and highlight stamping, (4) highlight sanitization and cleanup upon subsequent page turns (via in-spread navigation arrows, keyboard arrow navigation in RTL/LTR, and mobile touch swipe gestures) through `ReaderPager`'s bare `history.replaceState`, (5) double-spread facing page highlight isolation (verifying words on either the right or left page of a pair highlight independently), (6) live view mode switching in Settings between Single and Double page views while preserving active highlights and page anchor, and (7) browser history back-stack preservation across deep links and subsequent page turns. Vertical scrolling (`/pages/vertical`) is kept strictly out of scope per user confirmation.

## Root Cause / Approach

### 1. Highlight Deep Links and Styling Lifecycle

- **Entry Points:** Users land on reader pages with verse highlights through three paths:
  1. Direct URL navigation (e.g. bookmarks or shared links: `/[locale]/pages/[id]?highlight=S:A&highlight-type=selection`).
  2. Search bar results (`SearchQueryResults.tsx` uses `<Link href={highlight.addToUrl(...)}>` which navigates to `/pages/[id]?highlight=S:A&highlight-type=search`).
  3. Sidebar Ayah Picker (`AyahPicker.tsx` calls `jumpTo(page)` then stamps `?highlight=S:A&highlight-type=search` onto the URL via `window.history.replaceState`).
- **Rendering:** In `QuranWord.tsx`, words read `useSearchParams()` via `highlight.getHighlightedVerseKey(searchParams)` and `highlight.getHighlightType(searchParams)`. If `word.verse_key === highlightedVerseKey`, the component applies the corresponding color class (`bg-gray-900/10 dark:bg-cyan-600/30` for `search`; `bg-blue-200/70 dark:bg-blue-500/30` for `selection`).
- **Cleanup on Page Turns:** `ReaderPager.tsx` owns all in-reader navigation (`commitTo` and `jumpTo`). When a user flips pages (by clicking the in-spread arrow, pressing keyboard `ArrowLeft`/`ArrowRight`, or performing a touch swipe), `commitTo` calls `window.history.replaceState(null, "", `${basePath}/${target}`)`. This writes a bare URL without search parameters, naturally cleansing `?highlight=`. When the user navigates away and later returns to the original page, the URL remains bare and the highlight is not resurrected.

### 2. View Mode Transitions (Single Page vs. Double Spread)

- Desktop supports toggling between Single page view (`"single"`) and Double page spread (`"double"`, default) via `QuranSafhaViewContext` and `QuranSafhaViewToggle` in the Settings sheet.
- The display gate is CSS-driven (`:root[data-safha-view="double"] .fq-spread` at `@media(min-width:1024px)`) per ADR 0013 Addendum 4.
- In Double spread mode:
  - Facing pairs `(1, 2), (3, 4)...` are rendered together.
  - A highlight targeting a verse on the right page (e.g. Page 1, verse `1:2`) highlights only on Page 1.
  - A highlight targeting a verse on the left page (e.g. Page 2, verse `2:1`) highlights only on Page 2.
  - Turning the page advances by pair (`±2`).
- In Single page mode:
  - Only the active page is displayed; the partner page is hidden (`display: none`).
  - Turning the page advances by single page (`±1`).
- Toggling between view modes while a highlight is active retains the highlight on the active page and correctly mounts/hides the partner page.
- Mobile viewports (under `md`) strictly enforce single-page view regardless of stored preferences.

### 3. Browser History Back-Stack

- Navigating from the homepage (`/[locale]`) to a reader page via search pushes a single history entry (`/[locale]/pages/1?highlight=1:2`).
- Subsequent page turns inside `ReaderPager` use `history.replaceState`, avoiding unneeded history stack entries.
- Clicking the browser Back button (`page.goBack()`) returns directly to the originating route (`/[locale]`) without getting trapped in intermediate page turns.

## Decision Tree / Algorithm

### Deep Link & View Mode State Matrix

| Interaction / Flow | Setup & Viewport | Trigger / Action | Expected System Behavior & Assertions |
|---|---|---|---|
| **Direct Deep Link (`selection`)** | Desktop / Mobile (`/ar/pages/1?highlight=1:2&highlight-type=selection`) | Direct URL load | Words matching `data-fq-word="1:2:*"` have selection highlight class (`bg-blue-200/70` / `dark:bg-blue-500/30`); other verses have no highlight. |
| **Search Result Deep Link (`search`)** | Desktop (`/ar`) | Search "الحمد لله" → click verse 1:2 result | Navigates to `/ar/pages/1?highlight=1:2&highlight-type=search`; dialog closes; verse 1:2 words have search highlight class (`bg-gray-900/10` / `dark:bg-cyan-600/30`). |
| **Ayah Picker Jump + Highlight** | Desktop / Mobile on `/ar/pages/1` | Open Sidebar → Ayah Picker tab → pick Surah 2 (Al-Baqarah) Ayah 1 | Jumps to Page 2; URL is stamped with `?highlight=2:1&highlight-type=search`; sidebar closes; verse 2:1 words on Page 2 are highlighted. |
| **Page Turn Cleans Highlight (Single View)** | Desktop single view on `/ar/pages/1?highlight=1:2` | Click `Next page` arrow | Advances to `/ar/pages/2`; URL `?highlight=` query param is stripped (`/ar/pages/2`); stepping back to Page 1 leaves verse 1:2 unhighlighted. |
| **Page Turn Cleans Highlight (Double Spread)** | Desktop double view default on `/ar/pages/1?highlight=1:2` | Click `Next page` arrow | Advances by pair to `/ar/pages/3`; URL is bare `/ar/pages/3`; stepping back via `Previous page` to `/ar/pages/1` shows facing pair 1 & 2 with no highlight on verse 1:2. |
| **Facing Partner Page Highlight (Double Spread)** | Desktop double view default (`/ar/pages/2?highlight=2:1`) | Direct load or Ayah Picker jump | Facing pair 1 & 2 renders; left page (Page 2) words for verse 2:1 are highlighted; right page (Page 1) words remain unhighlighted. |
| **Mobile Touch Swipe Cleans Highlight** | Mobile (390x844) on `/ar/pages/1?highlight=1:2` | Swipe right (forward in RTL) | URL updates to `/ar/pages/2` with query params stripped; swiping left back to Page 1 leaves verse 1:2 unhighlighted. |
| **View Mode Toggle with Active Highlight** | Desktop on `/ar/pages/2?highlight=2:1` | Settings sheet → switch Page View between Single and Double | `data-safha-view` toggles; active page stays Page 2; verse 2:1 remains highlighted; facing partner page appears/disappears as expected. |
| **Browser History Back Preservation** | Desktop, `/ar` → Search link to `/ar/pages/1?highlight=1:2` → Page turn to `/ar/pages/2` | Click browser Back button (`page.goBack()`) | Navigates cleanly back to `/ar` (because in-reader page turns use `history.replaceState`, keeping the history stack unpolluted). |

## Verified Test Cases

1. **Direct Deep Link with Selection Highlight:**
   - Navigate directly to `/ar/pages/1?highlight=1:2&highlight-type=selection`.
   - Wait for reader content: `.fq-safha-row` present within `.fq-quran-safha`.
   - Assert: Words in verse 1:2 carry `.bg-blue-200\/70, .dark\:bg-blue-500\/30`.
   - Assert: Words in verse 1:1 have NO highlight class.

2. **Search Result Selection & Highlight:**
   - Load `/ar`, trigger search dialog via Cmd+K or navbar search button.
   - Fill "الحمد لله", click result for 1:2.
   - Assert: Search sheet closes.
   - Assert: URL matches `/\/ar\/pages\/1\?.*highlight=1(%3A|:)2/`.
   - Assert: Words in verse 1:2 carry `.bg-gray-900\/10, .dark\:bg-cyan-600\/30`.

3. **Ayah Picker Navigation & Highlight:**
   - Load `/ar/pages/1`, open sidebar via trigger, switch to Ayah Picker tab.
   - Select Surah 2 (Al-Baqarah) Ayah 1.
   - Assert: Sheet closes, URL updates to `/ar/pages/2?highlight=2:1&highlight-type=search`.
   - Assert: Words in verse 2:1 on Page 2 carry highlight class.

4. **Page Turn Clears Highlight (Single-Page Mode):**
   - Configure stored view `single` via `setStoredSafhaView(page, "single")`.
   - Navigate to `/ar/pages/1?highlight=1:2`.
   - Assert highlight is present on verse 1:2.
   - Click `Next page` arrow in active center panel -> URL becomes `/ar/pages/2` (no query params).
   - Click `Previous page` arrow -> URL becomes `/ar/pages/1` (bare).
   - Assert: Words in verse 1:2 NO LONGER carry highlight class.

5. **Page Turn Clears Highlight (Double-Spread Mode):**
   - Default double-spread mode on desktop.
   - Navigate to `/ar/pages/1?highlight=1:2`.
   - Assert highlight is present on verse 1:2 (on right page 1 of pair 1-2).
   - Click `Next page` arrow -> advances by pair to `/ar/pages/3`.
   - Click `Previous page` arrow -> returns to `/ar/pages/1`.
   - Assert: Words in verse 1:2 on Page 1 NO LONGER carry highlight class.

6. **Left Partner Page Highlight in Double Spread:**
   - Navigate to `/ar/pages/2?highlight=2:1` on desktop double view.
   - Assert: Facing pair 1 & 2 is mounted.
   - Assert: Verse 2:1 words on left page (Page 2) are highlighted.
   - Assert: Verse 1:7 words on right page (Page 1) are NOT highlighted.
   - Step forward by pair to `/ar/pages/3` and back to `/ar/pages/1`.
   - Assert: Verse 2:1 on Page 2 is NO LONGER highlighted.

7. **Mobile Swipe Clears Highlight:**
   - Mobile viewport (390x844), load `/ar/pages/1?highlight=1:2`.
   - Verify verse 1:2 is highlighted.
   - Swipe right (dx > 80px) -> URL becomes `/ar/pages/2`.
   - Swipe left (dx < -80px) -> URL becomes `/ar/pages/1`.
   - Assert: Verse 1:2 is NO LONGER highlighted.

8. **View Mode Toggling Retains Highlight State:**
   - Desktop viewport, navigate to `/ar/pages/2?highlight=2:1`.
   - Open Settings sheet -> expand "Page View" -> select "Single page view".
   - Assert: `html[data-safha-view="single"]`, partner page hidden.
   - Assert: Verse 2:1 on Page 2 REMAINS highlighted.
   - Open Settings sheet -> select "Double page view".
   - Assert: `html[data-safha-view="double"]`, partner page visible.
   - Assert: Verse 2:1 on Page 2 REMAINS highlighted.

9. **Browser History Back Navigation Preservation:**
   - Start at `/ar`.
   - Open search -> search "الحمد لله" -> click verse 1:2 result -> lands on `/ar/pages/1?highlight=1:2...`.
   - Advance page to `/ar/pages/2` via click arrow.
   - Click browser Back button (`page.goBack()`).
   - Assert: Navigates cleanly back to `/ar` without intermediate history loops.

## Files to Change

### E2E Tests

- `e2e/tests/deep-links-view-modes.spec.ts` [NEW] — comprehensive behavioral E2E suite covering:
  - Deep-link rendering (`search` vs `selection` types).
  - Search result navigation and highlight arrival.
  - Ayah Picker navigation and highlight arrival.
  - Highlight parameter clearing on page turns (single view, double spread, mobile touch swipe).
  - Facing partner page highlight isolation in double spread.
  - View mode toggling with active highlights.
  - History back-stack preservation.

### Code Fixes / Hardening (if uncovered during testing)

- `app/components/reader/ReaderPager.tsx` — verify that all page navigation triggers (`commitTo`, `jumpTo`) cleanly write bare URLs without leaving orphaned query params.
- `app/components/QuranWord.tsx` — verify reactive re-rendering when query params are cleared.

## Constraints

- Single/double spread contract: [ADR 0013](../../architecture/adr/0013-mushaf-double-page-spread.md) and [ADR 0054](../../architecture/adr/0054-reader-size-contracts-and-tablet-double-view.md). The single-vs-double display gate is CSS-driven (`data-safha-view`), not JS hook.
- Persistent client pager: [ADR 0028](../../architecture/adr/0028-reader-persistent-pager.md). Navigation within the reader happens via `commitTo` and `window.history.replaceState`. `router.push` must never be reintroduced for in-reader page changes.
- Content readiness checks: must use positive assertions (`waitForReaderContent` checking `.fq-safha-row` inside `.fq-quran-safha`) rather than checking absence of skeletons, per [ADR 0022](../../architecture/adr/0022-visual-e2e-testing.md) and [ADR 0034](../../architecture/adr/0034-page-turn-readiness-on-slow-networks.md).
- Dedicated E2E database: tests execute against `compose.e2e.yml` databases on ports 3309/3310, never dev databases.

## What NOT to Do

- Do NOT test or wire up `/pages/vertical` — explicitly kept out of scope per user direction.
- Do NOT switch `ReaderPager` navigation from `history.replaceState` to `router.push`/`replace` — ADR 0028 persistent pager requires `replaceState`.
- Do NOT use arbitrary timeouts (`page.waitForTimeout`); use deterministic state and DOM assertions.
- Do NOT use visual screenshot comparison (`toHaveScreenshot()`).
- Do NOT hardcode colors in tests; verify against established theme utility classes (`bg-gray-900/10`, `dark:bg-cyan-600/30`, `bg-blue-200/70`, `dark:bg-blue-500/30`).

## Decisions Made

- Kept vertical scrolling (`/pages/vertical`) out of scope per user confirmation.
- Created dedicated test file `e2e/tests/deep-links-view-modes.spec.ts` for clean modular separation from baseline reader navigation tests.
- Reused helper functions from `e2e/helpers/reader.ts` (`waitForReaderContent`, `setStoredSafhaView`, `swipeReader`, `getActivePanel`, `skipNonDesktop`, `skipNonMobile`).
