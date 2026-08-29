# Functional E2E: Settings & Preferences Persistence

**Type:** feature  
**Date:** 2026-08-28  
**Status:** implemented  
**GitHub Issue:** [#426](https://github.com/furqan-app/web/issues/426)  
**Parent Epic:** [#421](https://github.com/furqan-app/web/issues/421)  

## Summary

Implement a deterministic behavioral Playwright end-to-end test suite (`e2e/tests/settings-persistence.spec.ts`) validating the reader Settings sheet drawer (`SettingsSidebar.tsx`), drawer open/close lifecycle and dismissal mechanisms across desktop and mobile, theme switching (Light, Gold/Sepia, Dark) with DOM class application (`<html>`) and `localStorage` persistence, desktop Quran font size presets (`small` 26px, `medium` 28px, `large` 30px per ADR 0038) and `--fq-desktop-word` CSS property application on the reader, Mushaf layout edition selection (Default ID 2 vs Tajweed ID 19 per ADR 0033 and `mushaf-editions.ts`), page view mode toggle (`single` vs `double` with `<html data-safha-view="...">`), mobile/tablet device wake-lock toggle (`keepScreenAwake`), and language switching with bi-directional (RTL/LTR) sheet layout across 7 test suites (13 test cases, 26 browser project runs across Desktop and Mobile).

## Approach

1. **Drawer Open / Close Lifecycle & Dismissal**:
   - Verify the Nav-mounted settings trigger button (`aria-label="Settings"` / `aria-label="الإعدادات"`) opens the `Sheet` drawer (`role="dialog"`).
   - Exercise all 3 dismissal mechanisms and verify the drawer closes completely:
     1. Close button (`SheetClose` X icon).
     2. Backdrop overlay click (`[data-radix-dialog-overlay]`).
     3. Keyboard `Escape` press (desktop).

2. **Theme Switching & Storage Persistence**:
   - `ThemeToggle` renders 3 options in a radiogroup: `light`, `gold`, `dark`.
   - Clicking `gold`: `<html>` has class `theme-gold` (no `dark`, `theme-dark`, `theme-light`), `localStorage.getItem("theme")` is `"\"gold\""`, and the gold radio is `aria-checked="true"`.
   - Clicking `dark`: `<html>` has classes `dark` and `theme-dark`, `localStorage.getItem("theme")` is `"\"dark\""`, and the dark radio is `aria-checked="true"`.
   - Clicking `light`: `<html>` has class `theme-light`, `localStorage.getItem("theme")` is `"\"light\""`, and the light radio is `aria-checked="true"`.
   - **Reload Persistence**: Set theme to `dark`, trigger `page.reload()`, and verify `<html>` immediately renders `dark theme-dark` classes before and after hydration, with the dark radio checked upon re-opening Settings.

3. **Desktop Quran Font Size Presets (ADR 0038)**:
   - `DesktopQuranFontSizeControls` (desktop-only) provides semantic presets: `small` (26px, default), `medium` (28px), and `large` (30px).
   - Expanding the accordion and selecting `medium`:
     - Updates `localStorage.getItem("desktopQuranFontSize")` to `"\"medium\""`.
     - Active radio checkmark moves to `medium`.
     - `.fq-quran-safha` word scale CSS variable `--fq-desktop-word` reflects `28px`.
   - Selecting `large`:
     - Updates `localStorage` to `"\"large\""`.
     - `--fq-desktop-word` reflects `30px`.
   - Selecting `small`:
     - Updates `localStorage` to `"\"small\""`.
     - `--fq-desktop-word` reflects `26px`.
   - **Reload Persistence**: Set preset to `large`, reload page, and assert `localStorage` and `--fq-desktop-word` remain `30px`.

4. **Mushaf Layout Edition (Default vs Tajweed)**:
   - `MushafLayoutSection` displays available mushaf editions (`DEFAULT_MUSHAF_ID = 2`, `TAJWEED_MUSHAF_ID = 19`).
   - Expanding accordion and selecting Tajweed:
     - Updates `localStorage.getItem("quranMushafId")` to `19`.
     - Tajweed row radio checkmark is active.
   - Selecting Default:
     - Updates `localStorage.getItem("quranMushafId")` to `2`.
     - Default row radio checkmark is active.
   - **Reload Persistence**: Set edition to `19`, reload page, and verify `localStorage` preserves `19` and Tajweed remains active.

5. **Page View Mode (Single vs Double on Desktop)**:
   - `QuranSafhaViewToggle` controls single vs double spread rendering on desktop.
   - Selecting `Single page view`:
     - Updates `localStorage.getItem("quranSafhaView")` to `"\"single\""`.
     - Updates `document.documentElement` attribute `data-safha-view="single"`.
   - Selecting `Double page view`:
     - Updates `localStorage.getItem("quranSafhaView")` to `"\"double\""`.
     - Updates `document.documentElement` attribute `data-safha-view="double"`.
   - **Reload Persistence**: Set single view, reload page, and assert `data-safha-view="single"` is preserved.

6. **Device Setting: Keep Screen Awake (Mobile/Tablet)**:
   - On mobile/tablet viewports, the `#keep-screen-awake-switch` toggle is visible in the "Device & Recitation" section.
   - Toggling the switch updates `localStorage.getItem("keepScreenAwake")` to `false` and `true`.
   - Preserves state across `page.reload()`.

7. **Language Switcher & Bi-Directional Layout (RTL vs LTR)**:
   - On Arabic (`/ar/pages/1`): Sheet opens from left (`dir="rtl"`), renders Arabic headings and labels ("القراءة", "المظهر", "الإعدادات").
   - Expanding Language accordion and selecting English navigates to `/en/pages/1`.
   - On English (`/en/pages/1`): Sheet opens from right (`dir="ltr mechanical"`), renders English headings and labels ("Reading", "Appearance", "Settings").

## Decision Tree / Test Matrix

| Category / Suite | Test Case | Preconditions & Viewport | Actions | Expected Behavioral & Storage Outcome |
|---|---|---|---|---|
| **Drawer Lifecycle** | Open & Close via X Button | Desktop (`1440x900`) & Mobile (`390x844`), `/ar/pages/1` | Click Navbar Settings button -> Click Header `X` button | Sheet drawer opens (`role="dialog"` visible, header with title & description renders) -> Sheet closes completely. |
| | Close via Backdrop Overlay | Desktop & Mobile, `/ar/pages/1` | Open Settings -> Click backdrop overlay (`[data-radix-dialog-overlay]`) | Sheet closes immediately. |
| | Close via Escape Key | Desktop, `/ar/pages/1` | Open Settings -> Press `Escape` key | Sheet closes immediately. |
| **Theme Switching & Persistence** | Toggle Light, Gold, Dark | Desktop & Mobile, `/ar/pages/1` | 1. Click "ذهبي" (Gold)<br>2. Click "داكن" (Dark)<br>3. Click "فاتح" (Light) | 1. `<html>` gets `theme-gold` class; `localStorage.getItem("theme") === '"gold"'`<br>2. `<html>` gets `dark theme-dark` classes; `localStorage.getItem("theme") === '"dark"'`<br>3. `<html>` gets `theme-light` class; `localStorage.getItem("theme") === '"light"'` |
| | Theme Persistence on Reload | Desktop, `/ar/pages/1` | Set theme to `dark` -> `page.reload()` | `<html>` retains `dark theme-dark` classes; opening Settings shows Dark radio `aria-checked="true"`. |
| **Desktop Font Size Presets (ADR 0038)** | Adjust Presets (Small 26px, Medium 28px, Large 30px) | Desktop, `/ar/pages/1` | Expand Font Size accordion -> Select `medium`, then `large`, then `small` | `localStorage.getItem("desktopQuranFontSize")` updates to `"medium"`, `"large"`, `"small"`; `.fq-quran-safha` inline style `--fq-desktop-word` dynamically reflects `28px`, `30px`, `26px`. |
| | Font Size Persistence on Reload | Desktop, `/ar/pages/1` | Set preset to `large` -> `page.reload()` | `localStorage` retains `"large"`; `--fq-desktop-word` on safha remains `30px`. |
| **Mushaf Edition Mode** | Toggle Tajweed vs Default Edition | Desktop & Mobile, `/ar/pages/1` | Expand Mushaf Layout accordion -> Click `Tajweed` (ID 19), then click `Default` (ID 2) | 1. `localStorage.getItem("quranMushafId") === "19"`, Tajweed row radio checked.<br>2. `localStorage.getItem("quranMushafId") === "2"`, Default row radio checked. |
| | Mushaf Edition Persistence on Reload | Desktop, `/ar/pages/1` | Select `Tajweed` -> `page.reload()` | `localStorage` retains `quranMushafId: 19`; Tajweed row remains selected. |
| **Page View Mode** | Toggle Single vs Double Page View | Desktop, `/ar/pages/1` | Expand Page View accordion -> Click `Single page view`, then `Double page view` | 1. `html[data-safha-view="single"]`, `localStorage.getItem("quranSafhaView") === '"single"'`<br>2. `html[data-safha-view="double"]`, `localStorage.getItem("quranSafhaView") === '"double"'` |
| | Page View Persistence on Reload | Desktop, `/ar/pages/1` | Select `Single page view` -> `page.reload()` | `html[data-safha-view="single"]` and `localStorage` are preserved after reload. |
| **Keep Screen Awake** | Toggle Wake Lock Switch | Mobile (`390x844`), `/ar/pages/1` | Toggle `#keep-screen-awake-switch` OFF then ON | `localStorage.getItem("keepScreenAwake")` toggles `false` then `true`; switch state updates. |
| **Language & Direction** | Locale Switch & RTL/LTR Sheet Alignment | Desktop & Mobile, `/ar/pages/1` | Expand Language accordion -> Click `English`, then switch back to `العربية` | 1. Navigates to `/en/pages/1`; Sheet updates to `dir="ltr"`, English titles/labels displayed.<br>2. Navigates back to `/ar/pages/1`; Sheet updates to `dir="rtl"`, Arabic labels displayed. |

## Verified Test Cases

1. **Theme Switching**:
   - Precondition: Default theme `light`.
   - Action: Click Gold swatch in settings -> Check `document.documentElement.className` contains `theme-gold` and `localStorage.theme === '"gold"'`.
   - Action: Click Dark swatch -> Check `document.documentElement.className` contains `dark` and `theme-dark` and `localStorage.theme === '"dark"'`.
   - Action: Reload page -> `dark` and `theme-dark` remain applied immediately on `<html>`.

2. **Font Size Adjustment**:
   - Precondition: Default desktop size `small` (26px).
   - Action: Click Medium (`متوسط (٢٨)`) -> `localStorage.desktopQuranFontSize === '"medium"'`, `.fq-quran-safha` element contains `--fq-desktop-word: 28px`.
   - Action: Click Large (`كبير (٣٠)`) -> `localStorage.desktopQuranFontSize === '"large"'`, `.fq-quran-safha` contains `--fq-desktop-word: 30px`.
   - Action: Reload page -> `--fq-desktop-word: 30px` is maintained on `.fq-quran-safha`.

3. **Mushaf Edition Toggle**:
   - Precondition: Default Mushaf ID 2.
   - Action: Click Tajweed edition row -> `localStorage.quranMushafId === "19"`, row displays checked radio indicator.
   - Action: Reload page -> `localStorage.quranMushafId === "19"`, Tajweed remains active.

4. **Page View Mode**:
   - Precondition: Default double view.
   - Action: Select Single page view -> `html[data-safha-view="single"]`, `localStorage.quranSafhaView === '"single"'`.
   - Action: Reload page -> `html[data-safha-view="single"]` persists.

## Files to Change

- `docs/plans/functional-e2e-settings-persistence.md` [NEW] — Task plan specification.
- `e2e/tests/settings-persistence.spec.ts` [NEW] — New Playwright functional test suite covering settings lifecycle, themes, font presets, mushaf editions, page view, keep screen awake, language, and persistence.
- `e2e/helpers/reader.ts` [MODIFY] — Add helper functions if needed for opening settings drawer or querying preferences.

## Constraints

- E2E tests must be strictly functional/behavioral and deterministic against the local fixture environment.
- No visual screenshot pixel diffing (out of scope).
- Presets must follow ADR 0038 (`desktopQuranFontSize` values: `small`, `medium`, `large`).
- Theme, font size, view, and wake lock values stored in `localStorage` must match `app/utils/storage.ts` JSON serialization (`JSON.stringify(val)`).
- Desktop-only settings (`DesktopQuranFontSizeControls`, `QuranSafhaViewToggle`) must skip execution under the `mobile` project using `skipNonDesktop`.
- Mobile/Tablet settings (`KeepScreenAwake`) must skip execution under `desktop` using `skipNonMobile`.

## What NOT to Do

- Do not use pixel screenshot comparisons or visual snapshot assertions.
- Do not mutate or bypass `storage.ts` serialization contracts.
- Do not add arbitrary timeouts or non-deterministic waits — use Playwright's `waitForFunction`, `toBeVisible`, or content assertions.
- Do not perform destructive database mutations during tests.

## Decisions Made

- Group tests into clear logical `test.describe` blocks matching the settings taxonomy: Drawer Lifecycle, Theme Switching & Persistence, Desktop Quran Font Size Presets (ADR 0038), Mushaf Layout Edition, Page View Mode, Keep Screen Awake, and Language / Direction.
- Use `page.reload()` within persistence test cases to ensure full end-to-end browser session survival across hard reloads.
