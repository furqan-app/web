# Functional E2E: Sidebar Drawer & Navigation Tabs

**Type:** feature  
**Date:** 2026-08-27  
**Status:** implemented  
**GitHub Issue:** [#425](https://github.com/furqan-app/web/issues/425)  
**Parent Epic:** [#421](https://github.com/furqan-app/web/issues/421)  

## Summary

Implement a comprehensive behavioral Playwright end-to-end test suite (`e2e/tests/sidebar-navigation.spec.ts`) covering the reader navigation sidebar drawer (`Sidebar.tsx`), Nav-mounted trigger lifecycle (`Nav.tsx`), navigation tabs (Surahs list and Rubs list with Juz grouping), active item highlighting and automatic scroll-into-view, item selection and client-side page jumps, multi-surah page disambiguation pinning, same-page click dismissal, and bi-directional RTL/LTR drawer behavior. Tests execute deterministically against the committed fixture database without visual screenshot diffing.

## Approach

1. **Trigger Presence & Route Lifecycle**:
   - Verify that the Nav-mounted sidebar trigger button (`aria-label="Open navigation"` / `aria-label="Close navigation"`) is rendered on reader routes (`/ar/pages/1`, `/en/pages/1`) across desktop and mobile viewports.
   - Verify that the trigger is absent on non-reader routes (`/ar`, `/en`).
   - Verify the desktop trigger renders surah name, `Juz • Hizb` metadata, and chevron, while the mobile trigger renders the single-line calligraphic capsule.

2. **Drawer Open / Close Lifecycle**:
   - Clicking the Nav trigger opens the `Sheet` drawer (`role="dialog"`), setting `aria-expanded="true"`.
   - Exercise all 4 dismissal mechanisms and verify the drawer closes completely:
     1. Close button (`SheetClose` X icon).
     2. Backdrop overlay click (`.fixed.inset-0` / `data-radix-dialog-overlay`).
     3. Keyboard `Escape` press.
     4. Navigation item selection.

3. **Tab Switching & List Content**:
   - Default tab on open is `surahs`, displaying `SurahList` with 114 surahs.
   - Clicking the `rubs` tab trigger (`t("rubs")` / `أرباع` / `Rubs`) switches active tab to `RubList`, displaying Juz section headings ("Juz 1", "Juz 2", etc.) and rub items with Hizb circular milestone markers, start verse Uthmanic text, and starting page numbers.
   - Clicking `surahs` switches back to `SurahList`.

4. **Active Item Highlighting & Auto-Scroll**:
   - On `/ar/pages/1`, verify Surah 1 (Al-Fatihah, `data-surah-id="1"`) and Rub 1 (`data-rub-id="1"`) have active highlighting.
   - On `/ar/pages/50` (Surah Aal-Imran), verify opening the sidebar highlights Surah 3 (`data-surah-id="3"`) and automatically scrolls it into view.
   - On `/ar/pages/5` (Rub 2), verify opening the sidebar and switching to the rubs tab highlights Rub 2 (`data-rub-id="2"`).

5. **Selection, Navigation & Disambiguation Pinning**:
   - **Surah Jump**: On `/ar/pages/1`, clicking Surah 2 (Al-Baqarah) closes the drawer, updates the URL to `/ar/pages/2`, renders page 2 content, and updates the Nav trigger to Al-Baqarah.
   - **Rub Jump**: On `/ar/pages/1`, switching to rubs tab and clicking Rub 2 (starts 2:26 on page 5) closes the drawer, updates URL to `/ar/pages/5`, renders page 5 content, and updates Nav trigger to `Juz 1 • Hizb 1`.
   - **Same-Page Click**: On `/ar/pages/2`, clicking Surah 2 closes the drawer immediately without full reload.
   - **Multi-Surah Page Pinning**: On `/ar/pages/604` (hosts Surahs 112, 113, 114), clicking Surah 114 (An-Nas) closes the drawer, stays on `/ar/pages/604`, and updates the Nav trigger to display Surah 114 via `pinnedSurahId`.

6. **Locale & Bi-Directionality (RTL vs LTR)**:
   - In `ar` (RTL): Drawer slides in from the right (`side="right"`), renders Arabic calligraphic glyphs, Eastern Arabic numerals (`١`, `٢`), and Arabic tab labels ("السور", "الأرباع").
   - In `en` (LTR): Drawer slides in from the left (`side="left"`), renders English transliterated names ("Al-Fatihah"), Western numerals, and English tab labels ("Surahs", "Rubs"), jumping to `/en/pages/...`.

## Decision Tree / Test Matrix

| Category / Suite | Test Case | Preconditions & Viewport | Actions | Expected Behavioral Outcome |
|---|---|---|---|---|
| **Trigger Availability** | Reader Route Trigger Presence | Desktop (`1440x900`) & Mobile (`390x844`), `/ar/pages/1` | Inspect navbar | Trigger button visible with active Surah (Al-Fatihah) + `Juz 1 • Hizb 1`, `aria-label="Open navigation"`, `aria-expanded="false"`. |
| | Non-Reader Route Absence | Desktop & Mobile, `/ar` (Home) | Inspect navbar | Sidebar trigger button is NOT rendered. |
| **Drawer Lifecycle** | Open via Trigger & Close via X Button | Desktop, `/ar/pages/1` | Click Nav trigger, then click `X` button | Sheet opens (`dialog` visible, `aria-expanded="true"`), then closes completely (`aria-expanded="false"`). |
| | Close via Backdrop Click | Desktop, `/ar/pages/1` | Open sidebar, click backdrop overlay | Sheet closes immediately. |
| | Close via Escape Key | Desktop, `/ar/pages/1` | Open sidebar, press `Escape` | Sheet closes immediately. |
| **Navigation Tabs** | Tab Switching (Surahs <-> Rubs) | Desktop, `/ar/pages/1` | Open sidebar, click `rubs` tab, then click `surahs` tab | Default displays `SurahList`; switching to `rubs` displays `RubList` with Juz group headers and Hizb markers; switching back restores `SurahList`. |
| **Active Item & Scroll** | Active Surah & Auto-Scroll | Desktop, `/ar/pages/50` (Surah Aal-Imran) | Open sidebar on page 50 | Surah 3 (`data-surah-id="3"`) is active and scrolled into view. |
| | Active Rub Highlighting | Desktop, `/ar/pages/5` (Rub 2) | Open sidebar, switch to `rubs` tab | Rub 2 (`data-rub-id="2"`) has active highlighting (`bg-primary/10`). |
| **Navigation Mechanics** | Surah Item Jump | Desktop & Mobile, `/ar/pages/1` | Open sidebar -> Click Surah 2 (Al-Baqarah) | Drawer closes, URL updates to `/ar/pages/2`, page 2 word rows render, Nav trigger updates to Al-Baqarah. |
| | Rub Item Jump | Desktop & Mobile, `/ar/pages/1` | Open sidebar -> Switch to `rubs` -> Click Rub 2 | Drawer closes, URL updates to `/ar/pages/5`, page 5 word rows render, Nav trigger updates to `Juz 1 • Hizb 1`. |
| | Same-Page Click Dismissal | Desktop, `/ar/pages/2` | Open sidebar -> Click Surah 2 | Drawer closes immediately, URL remains `/ar/pages/2`. |
| | Multi-Surah Page Pinning | Desktop, `/ar/pages/604` (Surahs 112, 113, 114) | Open sidebar -> Click Surah 114 (An-Nas) | Drawer closes, URL stays `/ar/pages/604`, Nav trigger displays Surah 114 (An-Nas). |
| **Locale & Bi-Directionality** | Arabic (RTL) | Desktop, `/ar/pages/1` | Open sidebar | Drawer opens from right, Arabic calligraphic glyphs, Eastern Arabic numerals, Arabic tab labels. |
| | English (LTR) | Desktop, `/en/pages/1` | Open sidebar | Drawer opens from left, English names, Western numerals, English tab labels, jumps to `/en/pages/...`. |

## Verified Test Cases

- **Trigger Presence**: On `/ar/pages/1`, `button[aria-label="Open navigation"]` is visible; on `/ar`, the button is not rendered.
- **Drawer Lifecycle**: Trigger click opens `role="dialog"`; clicking `SheetClose` / pressing `Escape` / clicking backdrop closes `dialog`.
- **Tab Switching**: Toggling between "Surahs" and "Rubs" alternates visibility between `SurahList` and `RubList`.
- **Scroll & Active Highlighting**: Opening on `/ar/pages/50` highlights and centers Surah 3 (`data-surah-id="3"`). On `/ar/pages/5`, Rub 2 is highlighted.
- **Surah Navigation**: From `/ar/pages/1`, selecting Surah 2 closes the drawer and navigates to `/ar/pages/2`.
- **Rub Navigation**: From `/ar/pages/1`, selecting Rub 2 in Rubs tab closes the drawer and navigates to `/ar/pages/5`.
- **Same-Page Click**: On `/ar/pages/2`, clicking Surah 2 closes drawer without navigating away.
- **Disambiguation Pinning**: On `/ar/pages/604`, clicking Surah 114 closes drawer and updates Nav trigger to Surah 114.
- **RTL & LTR**: `/ar/pages/1` opens from right with Arabic content; `/en/pages/1` opens from left with English transliterations.

## Files to Change

- `e2e/tests/sidebar-navigation.spec.ts` [NEW] — Complete behavioral Playwright E2E suite covering trigger visibility, drawer lifecycle, tabs, active item highlighting, auto-scroll, navigation jumps, multi-surah pinning, same-page click dismissal, and RTL/LTR support.

## Constraints

- Use resilient semantic locators (`getByRole`, accessible labels, `data-` attributes) rather than fragile CSS classes where possible.
- Content readiness assertions must use positive assertions (`waitForReaderContent(page)`) checking rendered `.fq-safha-row` elements.
- No visual screenshot diffing (`toHaveScreenshot()`) or baseline comparisons.
- All tests must run against the dedicated e2e database fixture (`compose.e2e.yml` / `e2e:setup`), never touching dev databases.

## What NOT to Do

- Do not modify production application components (`Sidebar.tsx`, `Nav.tsx`, `SidebarContext.tsx`) for testing convenience.
- Do not use arbitrary `page.waitForTimeout()` sleeps in place of deterministic state assertions.
- Do not test settings drawer or auth menu — explicitly out of scope for this suite.

## Decisions Made

- Group test suites by logical behavioral domains (Trigger Availability, Drawer Lifecycle, Tabs & Scrolling, Navigation & Pinning, Locale & Bi-Directionality).
- Leverage existing `waitForReaderContent`, `skipNonDesktop`, and `skipNonMobile` helpers from `e2e/helpers/reader.ts`.
- Verify same-page click dismissal and multi-surah page disambiguation pinning as explicit behavioral assertions.
