# Functional E2E: Search & Discovery Flows

**Type:** feature  
**Date:** 2026-08-27  
**Status:** implemented  
**GitHub Issue:** [#424](https://github.com/furqan-app/web/issues/424)  
**Parent Epic:** [#421](https://github.com/furqan-app/web/issues/421)  

## Summary

Implement a comprehensive behavioral Playwright end-to-end test suite (`e2e/tests/search.spec.ts`) covering Quran search and discovery journeys across Desktop (1440×900) and Mobile (390×844) viewports in both Arabic (`ar`, RTL) and English (`en`, LTR) locales. In addition to testing existing search capabilities (Arabic/English names, verse text, Hamza normalization, debounce states, result navigation, ayah highlighting, and result limits), implement global `Cmd+K` / `Ctrl+K` keyboard shortcut support in `SearchBar.tsx` and extend `/api/search/chapters` to support numeric surah search (both Western `18` and Eastern Arabic `١٨` numerals).

## Root Cause / Approach

1. **Global Keyboard Shortcut (`app/components/search/SearchBar.tsx`)**:
   - Add a global `keydown` event listener on `window` in `SearchBar.tsx` that intercepts `(e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"`.
   - Protects against auto-repeat key events (`if (e.repeat) return;`).
   - Prevents default browser handling (`e.preventDefault()`) and toggles the search sheet open/closed (`setOpen(prev => !prev)`).
   - Configures `onOpenAutoFocus` on `SheetContent` to focus the search input upon opening.

2. **Numeric Surah Search (`app/api/search/chapters/route.ts`)**:
   - Parse incoming query strings to detect if the query represents an integer from `1` to `114` (normalizing Eastern Arabic digits `٠-٩` and `۰-۹` to Western digits `0-9` via `app/utils/arabic-search.ts`).
   - If numeric, append `{ id: parsedNumber }` to the Prisma `findMany` `OR` conditions alongside `name_arabic` and `name_simple`.
   - Allows users to search for surahs directly by chapter number (e.g. typing `"18"` or `"١٨"` returns Surah Al-Kahf).

3. **Localized Routing & Highlights (`app/components/search/SearchQueryResults.tsx` & `app/utils/highlight.ts`)**:
   - Switched `SearchQueryResults.tsx` to use `Link` from `@/i18n/routing` for seamless client-side transitions across locales and shared grant paths.
   - Updated `highlight.addToUrl` to return relative search paths rather than absolute URLs with origin.

4. **Behavioral Playwright E2E Suite (`e2e/tests/search.spec.ts`)**:
   - **Triggers & Dismissal**:
     - Desktop: Pressing `Meta+k` or `Control+k` opens the search overlay with auto-focused input; pressing `Escape` or clicking the `Close search` button closes it.
     - Mobile & Desktop: Clicking the navbar search button (`aria-label` matching `search.placeholder`) opens the search overlay.
   - **Query Lifecycle & States**:
     - **Idle State**: Inputs with `< 2` characters render the idle view (`search.idleTitle` / `search.idleHint`).
     - **Loading State**: Displays spinner (`search.loading`) during debounce and network fetching.
     - **No Results State**: Non-matching queries (e.g. `"xyznonexistent"`) render empty state (`search.noResults` / `search.noResultsHint`).
     - **Query Reset**: Clearing input or deleting text back to empty immediately restores the idle state without stale results.
     - **Rapid Typing**: Rapid sequential typing settles on the final debounced term without race conditions or flashing.
   - **Search Query Types & Capping**:
     - **Arabic Surah Name**: Searching `"البقرة"` returns Surah Al-Baqarah under `Surahs (1)`.
     - **English Surah Name**: Searching `"Fatihah"` returns Surah Al-Fatihah.
     - **Numeric Surah Number**: Searching `"18"` or `"١٨"` returns Surah Al-Kahf.
     - **Verse Text & Hamza Normalization**: Searching `"إياك"` and `"اياك"` returns matching verse results for Al-Fatihah (1:5) via `text_imlaei_simple` Hamza normalization (ADR 0007).
     - **Result Cap**: Searching common terms like `"الله"` returns at most 10 verses (`take: 10`) ordered by `id: asc`.
   - **Navigation & Highlight Verification**:
     - **Chapter Navigation**: Clicking a chapter result (e.g. Al-Baqarah) navigates to `/ar/pages/2`, closes the search overlay, and waits for reader content (`waitForReaderContent`).
     - **Verse Navigation & Highlighting**: Clicking a verse result (e.g. 1:2) navigates to `/{locale}/pages/1?highlight=1:2&highlight-type=search`, closes the search overlay, and asserts that words for verse `1:2` (`[data-fq-word^="1:2:"]`) carry the search highlight class (`bg-gray-900/10` or `dark:bg-cyan-600/30`).
   - **Responsive & Shared Context**:
     - Full mobile viewport verification (390×844) ensuring smooth full-screen overlay interaction and navigation.
     - Reader base path preservation (`useReaderBasePath`).

## Decision Tree / Test Matrix

| Test Suite / Area | Viewport & Locale | Input / Action | Expected Behavioral Outcome |
|---|---|---|---|
| **Keyboard Shortcut Trigger** | Desktop (1280x800), `/ar` | Press `Meta+k` (or `Control+k`) | Search `<Sheet>` opens, search input is auto-focused. |
| **Keyboard Shortcut Toggle** | Desktop (1280x800), search open | Press `Meta+k` (or `Control+k`) | Search `<Sheet>` closes, focus returns to page. |
| **Navbar Button Trigger** | Desktop & Mobile, `/ar` and `/en` | Click navbar search button | Search `<Sheet>` opens, search input is auto-focused. |
| **Dismiss via Escape** | Desktop & Mobile, search open | Press `Escape` | Search `<Sheet>` closes cleanly. |
| **Dismiss via Header Close Button** | Desktop & Mobile, search open | Click `Close search` button | Search `<Sheet>` closes cleanly. |
| **Idle State (<2 chars)** | Desktop & Mobile, search open | Query empty or 1 character | Displays idle state ("Search the Quran" / "ابحث في القرآن") with hint. |
| **Loading / Debounce State** | Desktop & Mobile, search open | Type `"الفاتحة"` | During 500ms debounce / API fetch, displays loading spinner ("Searching…" / "جارٍ البحث…"). |
| **No Results State** | Desktop & Mobile, search open | Type `"xyznonexistent"` | Displays empty state ("Nothing found" / "لا توجد نتائج") with suggestion hint. |
| **Query Reset to Idle** | Desktop & Mobile, search open | Type `"البقرة"`, then clear input | Immediately resets back to idle state without showing stale results or "Nothing found". |
| **Rapid Typing Settling** | Desktop, search open | Rapidly type `"الف"` → `"الفات"` → `"الفاتحة"` | Cleanly settles on debounced query results for Al-Fatihah without flickering. |
| **Chapter Search (Arabic)** | `/ar`, search open | Query `"البقرة"` | Renders `Surahs (1)` heading and Al-Baqarah link. |
| **Chapter Search (English)** | `/en`, search open | Query `"Fatihah"` | Renders `Surahs (1)` heading and Al-Fatihah link. |
| **Chapter Search (Western Number)** | `/ar` & `/en`, search open | Query `"18"` | Renders `Surahs (1)` heading and Al-Kahf link. |
| **Chapter Search (Eastern Number)** | `/ar`, search open | Query `"١٨"` | Renders `Surahs (1)` heading and Al-Kahf link. |
| **Verse Search (Arabic Text)** | `/ar`, search open | Query `"الحمد لله"` | Renders matching verses under `Verses (N)`. |
| **Verse Search (Hamza Normalization)** | `/ar`, search open | Query `"الاخلاص"` and `"الإخلاص"` | Both queries return Surah Al-Ikhlas verses identically. |
| **Search Result Cap (10 Max)** | `/ar`, search open | Query `"الله"` | Result count is capped at 10 items, ordered by `id: asc`. |
| **Chapter Result Navigation** | Search open with `"البقرة"` | Click Al-Baqarah result | Search closes, URL becomes `/ar/pages/2`, Page 2 content renders. |
| **Verse Result Navigation & Highlighting** | Search open with `"الحمد لله"` | Click 1:2 verse result | Search closes, URL becomes `/ar/pages/1?highlight=1:2&highlight-type=search`, Page 1 renders, and verse 1:2 words carry search highlight class. |
| **Mobile Search Experience** | Mobile (390x844), `/ar` | Open search, type `"يس"`, click Ya-Sin | Search takes full screen, clicking result navigates to `/ar/pages/440`, sheet closes cleanly. |

## Verified Test Cases

1. **Shortcut Open & Close**:
   - `page.keyboard.press("Control+k")` → `expect(page.getByRole("dialog")).toBeVisible()`.
   - `page.keyboard.press("Control+k")` → `expect(page.getByRole("dialog")).toBeHidden()`.
2. **Navbar Button Open**:
   - `page.getByRole("button", { name: /search/i }).click()` → dialog opens with auto-focused input.
3. **Empty / Idle State**:
   - Initial open → idle icon and text visible; no result headings visible.
4. **No Results State**:
   - Query `"zzznonexistent"` → `expect(page.getByText(/Nothing found|لا توجد نتائج/)).toBeVisible()`.
5. **Debounce & Reset**:
   - Fill `"البقرة"` → results appear.
   - Clear input → `expect(page.getByText(/Search the Quran|ابحث في القرآن/)).toBeVisible()`.
6. **Arabic & English Chapter Queries**:
   - Query `"البقرة"` on `/ar` → contains Al-Baqarah.
   - Query `"Fatihah"` on `/en` → contains Al-Fatihah.
7. **Numeric Chapter Queries**:
   - Query `"18"` → contains Al-Kahf.
   - Query `"١٨"` → contains Al-Kahf.
8. **Hamza Normalization**:
   - Query `"الاخلاص"` → matches Surah 112.
   - Query `"الإخلاص"` → matches Surah 112.
9. **Result Cap**:
   - Query `"الله"` → `expect(page.locator("a[href*='/pages/']")).toHaveCount(10)` under verses section.
10. **Direct Navigation & Highlighting**:
    - Query `"الحمد لله"` → click verse 1:2 link.
    - Page navigates to `/ar/pages/1?highlight=1:2&highlight-type=search`.
    - Reader renders word rows.
    - Words matching `data-fq-word="1:2:*"` have the highlight class.

## Files to Change

- `app/components/search/SearchBar.tsx` — add global `keydown` listener for `Cmd+K` / `Ctrl+K` shortcut toggling and `onOpenAutoFocus`.
- `app/components/search/SearchQueryResults.tsx` — use `Link` from `@/i18n/routing` for relative localized paths.
- `app/utils/arabic-search.ts` — export `normalizeDigits` helper for Eastern and Extended Arabic numerals.
- `app/api/search/chapters/route.ts` — add numeric ID parsing using `normalizeDigits` to match chapter by ID.
- `app/utils/highlight.ts` — return relative URL strings from `highlight.addToUrl`.
- `e2e/tests/search.spec.ts` [NEW] — Playwright behavioral test suite for search and discovery flows.
- `docs/plans/functional-e2e-search.md` [NEW] — this plan document.
- `docs/architecture/DECISIONS.md` — document keyboard shortcut and numeric chapter search invariants under `## Search`.
- `docs/architecture/COMPONENTS.md` — document SearchBar shortcut in component catalogue.

## Constraints

- Test suite must use positive assertions and accessible locators (`getByRole`, `getByPlaceholder`, `getByText`).
- No visual screenshot diffs or baseline PNG files.
- Must execute against the dedicated E2E database containers (`compose.e2e.yml` on ports 3309/3310 via `npm run e2e:test`).
- Debounced queries must wait on deterministic content states (e.g. `getByRole("link")` or result heading visibility), not arbitrary `page.waitForTimeout()` sleeps.
- Keyboard shortcut `Cmd+K` / `Ctrl+K` must work reliably across macOS, Linux, and Windows test runners.

## What NOT to Do

- Do not introduce visual screenshot comparisons (`toHaveScreenshot`).
- Do not use arbitrary fixed timeouts (`page.waitForTimeout(1000)`) in place of locator-driven assertions.
- Do not break the `take: 10` API cap or alter the standard JSON response format.
- Do not restrict search testing to a single locale (both `ar` and `en` must be validated).

## Decisions Made

- Added `Cmd+K` / `Ctrl+K` global keyboard shortcut to `SearchBar.tsx` to satisfy issue requirements and enhance keyboard-centric desktop discovery.
- Extended `/api/search/chapters` to support numeric queries (both Western `18` and Eastern `١٨` numerals) so users can jump to surahs by number.
- Replaced `next/link` with `@/i18n/routing` `Link` in `SearchQueryResults.tsx` to ensure smooth client-side transitions without full-page navigation.
- Tested both Chapter navigation and Verse navigation with live URL query param assertion and DOM word highlight assertion.
- Maintained clean separation of test suites into logical describes (Triggers, Query States, Search Variations, Navigation & Highlighting, Mobile Experience).
