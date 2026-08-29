# Functional E2E: Word Marking & Memorization Flow

**Type:** feature  
**Date:** 2026-08-28  
**Status:** implemented  
**GitHub Issue:** [#427](https://github.com/furqan-app/web/issues/427)  
**Parent Epic:** [#421](https://github.com/furqan-app/web/issues/421)  

## Summary

Implement a deterministic behavioral Playwright end-to-end test suite (`e2e/tests/word-marking.spec.ts`) and test authentication fixture helpers (`e2e/helpers/auth.ts`) validating the word and verse memorization flow across desktop and mobile. The suite verifies: (1) signed-out user gating on word selection and the My Marks page, (2) word selection and Mark Modal interaction (`MarkModal.tsx`), (3) audio playback actions (word pronunciation and "Play from here" recitation initiation), (4) modal dismissal mechanisms (close button, backdrop click, Escape key), (5) category selection across all 6 memorization types with character-capped comment input, (6) optimistic DOM highlighting (`QuranWord.tsx`) and database persistence (`/api/quran/pages/[pageId]/marks`) surviving hard reloads, (7) category modification and mark deletion, (8) verse-level marking via ayah end markers (`.fq-ayah-end`), (9) "My Marks" list screen (`MyMarksList.tsx`) with surah grouping, category filtering (desktop pills and mobile dropdown), row navigation, and in-place deletion, (10) mobile touch long-press trigger (`isOverlayMode`), and (11) English (LTR) locale behavior and Tajweed edition mark alignment (ADR 0033).

## Approach

1. **Authentication Helper for E2E Environment**:
   - Provide `authenticateAsUser(context, user?)` in `e2e/helpers/auth.ts` using `next-auth/jwt`'s `encode` to generate signed `next-auth.session-token` cookies with `process.env.NEXTAUTH_SECRET` (`"e2e-test-secret-not-used-in-production"`).
   - Seed a deterministic default user (`id: 1, email: "e2e@test.local", name: "E2E Test User"`) in `scripts/e2e-fixture/setup.js` into `furqan_app_e2e.users`.

2. **Unauthenticated / Signed-out Experience**:
   - Clicking a word on `/ar/pages/1` when signed out opens `MarkModal` displaying the word title in Uthmanic font (`qpc_uthmani_hafs`), "تحديد كلمة" / "Mark word" label, and the "Sign in to mark words and verses" prompt with a visible "Sign in" button. Categories and comment inputs remain hidden.
   - Visiting `/ar/marks` when signed out renders `MarksSignedOutPrompt`.

3. **Word Selection, Audio Actions & Modal Dismissal**:
   - Word clicking on desktop (`!isOverlayMode`) opens `MarkModal`.
   - Audio Pronunciation: clicking the speaker icon (<kbd>Volume1</kbd>) triggers `playWordPronunciation` against `word.audio_url`.
   - "Play From Here": clicking "التشغيل من هنا" (<kbd>Volume2</kbd>) dispatches playback from `markFor.verse_key` via `RecitationContext` and closes the modal.
   - Dismissal lifecycle: clicking <kbd>X</kbd>, clicking the backdrop overlay, or pressing `Escape` closes the dialog without saving.

4. **Mark Category Selection & Comment Input**:
   - Category picker (`MarkerColorPicker`) renders 6 radio options: `forgetting` (red), `similar` (orange), `tashkeel-error` (yellow), `tajweed-error` (purple), `linking` (blue), and `other` (slate).
   - "Save Mark" button is disabled until a category is selected.
   - Selecting a category enables the comment `Textarea` with character counter (`0/500`) and the "Save Mark" button.
   - Submitting a mark executes `POST /api/quran/pages/[pageId]/marks`, invalidates React Query `/marks`, closes the modal, and renders the active category highlight styling (`bg-red-400`) on `[data-fq-word="<location>"]`.

5. **Reload Persistence & Modal Edit Mode**:
   - Hard page reload (`page.reload()`) verifies `[data-fq-word="<location>"]` retains its highlight class before and after hydration.
   - Clicking an already marked word opens `MarkModal` with the category pre-selected, previous comment pre-filled in the textarea, and a destructive "Remove Mark" button visible.

6. **Mark Category Update & Deletion**:
   - Changing the category (e.g., from `forgetting` to `similar`) and saving updates the word's highlight styling from `bg-red-400` to `bg-orange-300`.
   - Clicking "Remove Mark" executes `DELETE /api/quran/pages/[pageId]/marks`, invalidates cache, closes the modal, removes the highlight class from the word, and persists the removal across reloads.

7. **Multiple Marks on Same Page**:
   - Marking multiple words (e.g., `1:1:1` with `forgetting` and `1:1:2` with `linking`) asserts that both words concurrently display their respective independent classes.

8. **Verse-Level Marking**:
   - Clicking an ayah end marker (`.fq-ayah-end` / `word.char_type_name === "end"`) opens `MarkModal` with verse context: header displays "تحديد آية" / "Mark verse", and title displays the verse snippet.
   - Saving persists a mark with `marked_type="verse"` and `marked_id="1:1"`.

9. **"My Marks" List Page (`/ar/marks` & `/en/marks`)**:
   - Displays all marks grouped by Surah (e.g. "الفاتحة").
   - Each row renders category colored chip, Surah & Ayah reference, Uthmanic snippet, comment preview with message icon, and page link.
   - Category filtering: desktop horizontal pills and mobile dropdown menu filter items cleanly; empty categories display `MarksEmptyState` ("No marks in this category yet").
   - Clicking a mark row navigates to `/ar/pages/<page_number>`.
   - Clicking the Trash button removes the mark in-place and updates the list. Deleting the last mark displays the global empty state ("No marks yet").

10. **Mobile Touch Long-Press**:
    - On mobile viewport (`390x844`), a short tap triggers the reader overlay toggle, while a long-press (>=500ms touch duration) opens `MarkModal`.

11. **English Locale & Tajweed Edition Continuity**:
    - English locale (`/en/pages/1` and `/en/marks`) renders LTR layout and English copy ("Mark word", "Choose a category", "My Marks", "Page 1").
    - Switching to Tajweed Mushaf edition (`quranMushafId: 19`) preserves word highlights at their canonical locations (ADR 0033).

## Decision Tree / Test Matrix

| Suite | Test Case | Preconditions & Auth | Actions | Expected Behavioral & DOM Outcome |
|---|---|---|---|---|
| **Unauthenticated Gating** | Word Click & My Marks Signed-Out | Signed-Out, Desktop (`/ar/pages/1`) | 1. Click word `1:1:1`<br>2. Visit `/ar/marks` | 1. MarkModal opens with word title & "سجّل الدخول لتحديد الكلمات والآيات"; category picker hidden.<br>2. `/ar/marks` displays `MarksSignedOutPrompt`. |
| **Modal Lifecycle & Audio** | Dismissal & Playback Actions | Authenticated, Desktop (`/ar/pages/1`) | 1. Click word `1:1:1`<br>2. Test Escape, Backdrop, and X close<br>3. Test "Play from here" button | 1. Modal opens.<br>2. All 3 dismissal mechanisms close dialog.<br>3. "Play from here" starts playback via context and closes modal. |
| **Word Mark Creation & Highlighting** | Save Mark with Category & Comment | Authenticated, Desktop (`/ar/pages/1`) | 1. Click word `1:1:1`<br>2. Select "نسيان" (`forgetting`)<br>3. Fill comment `ملاحظة اختبار`<br>4. Click "حفظ العلامة" | 1. `POST /api/quran/pages/1/marks` succeeds.<br>2. Modal closes.<br>3. Word `[data-fq-word="1:1:1"]` receives `bg-red-400` styling. |
| **Reload Persistence & Edit Mode** | Retain Highlight & Pre-fill Edit Modal | Authenticated, Desktop (`/ar/pages/1`) | 1. `page.reload()`<br>2. Click word `1:1:1` | 1. Word retains `bg-red-400` styling post-reload.<br>2. Modal opens in edit mode with `forgetting` checked, comment pre-filled, and "إزالة العلامة" visible. |
| **Category Mutation & Deletion** | Change Category & Remove Mark | Authenticated, Desktop (`/ar/pages/1`) | 1. Change category to `similar` & Save<br>2. Re-open modal & click "إزالة العلامة" | 1. Word class updates to `bg-orange-300`.<br>2. `DELETE` request succeeds, modal closes, word highlight is removed, and deletion persists after reload. |
| **Concurrent Marks** | Multiple Marks on Same Page | Authenticated, Desktop (`/ar/pages/1`) | 1. Mark `1:1:1` as `forgetting`<br>2. Mark `1:1:2` as `linking` | Both `[data-fq-word="1:1:1"]` and `[data-fq-word="1:1:2"]` display their respective highlight classes simultaneously. |
| **Verse-Level Marking** | Mark Ayah End Symbol | Authenticated, Desktop (`/ar/pages/1`) | Click verse 1:1 end glyph (`.fq-ayah-end`) -> Select `tajweed-error` -> Save | Modal renders "تحديد آية" with verse snippet; persists `marked_type="verse"` mark. |
| **My Marks Screen** | Grouping, Filter, Nav & Delete | Authenticated, Desktop & Mobile (`/ar/marks`) | 1. Navigate to `/ar/marks`<br>2. Filter by category<br>3. Click row link<br>4. Click Trash button | 1. Marks grouped under Surah "الفاتحة".<br>2. Category filters update displayed list / empty states.<br>3. Row click navigates to `/ar/pages/1`.<br>4. Trash button deletes mark in-place. |
| **Mobile Long-Press** | Touch Long-Press Interaction | Authenticated, Mobile (`390x844`, `/ar/pages/1`) | Touch long-press (600ms) on word `1:1:1` | `MarkModal` opens without triggering navigation overlay. |
| **English Locale (LTR)** | English Copy & Direction | Authenticated, Desktop (`/en/pages/1` & `/en/marks`) | 1. Open word modal on `/en/pages/1`<br>2. View `/en/marks` | 1. Modal displays English labels ("Mark word", "Choose a category", "Save Mark").<br>2. My Marks page renders English header and Surah names. |
| **Tajweed Edition Continuity** | Mark Alignment Across Editions | Authenticated, Desktop (`/ar/pages/1`) | Set Mushaf edition to Tajweed (ID 19) via settings/storage | Marked words display highlight styling under Tajweed edition. |

## Verified Test Cases

1. **Signed-Out Gating**:
   - Target: `/ar/pages/1` without auth cookie.
   - Action: Click word `1:1:1`.
   - Assert: Dialog title shows "بِسْمِ", header has "تحديد كلمة", body has text "سجّل الدخول لتحديد الكلمات والآيات" and "تسجيل الدخول" button. No category radio group is rendered.
   - Target: `/ar/marks` without auth cookie.
   - Assert: `main` renders signed-out prompt with sign-in button.

2. **Word Mark Creation & Highlight**:
   - Target: `/ar/pages/1` with authenticated session.
   - Action: Click `[data-fq-word="1:1:1"]` -> Click radio for "نسيان" (`forgetting`) -> Type "ملاحظة حفظ" in comment -> Click "حفظ العلامة".
   - Assert: Dialog closes -> `locator('[data-fq-word="1:1:1"]')` contains class `bg-red-400`.

3. **Hard Reload & Edit Modal Pre-fill**:
   - Action: Trigger `page.reload()` -> `waitForReaderContent(page)`.
   - Assert: `[data-fq-word="1:1:1"]` has class `bg-red-400`.
   - Action: Click `[data-fq-word="1:1:1"]`.
   - Assert: Dialog opens -> radio for `forgetting` is checked (`aria-checked="true"`) -> textarea contains "ملاحظة حفظ" -> "إزالة العلامة" button is visible.

4. **Mark Removal**:
   - Action: Click "إزالة العلامة".
   - Assert: Dialog closes -> `[data-fq-word="1:1:1"]` does not have class `bg-red-400`.
   - Action: `page.reload()`.
   - Assert: `[data-fq-word="1:1:1"]` remains unmarked.

5. **My Marks Verification & Deletion**:
   - Target: `/ar/marks` with active mark on `1:1:1`.
   - Assert: Section heading "الفاتحة" is visible; row displays chip, "الفاتحة - ١", snippet "بِسْمِ", comment "ملاحظة حفظ", and "صفحة ١".
   - Action: Click category filter "متشابه" (`similar`).
   - Assert: Empty category state renders ("لا توجد علامات في هذا التصنيف بعد").
   - Action: Click category filter "الكل" (`all`) -> Click Trash icon on row.
   - Assert: Row is removed in-place -> global empty state renders ("لا توجد علامات بعد").

6. **Mobile Long-Press**:
   - Target: Mobile project (`390x844`), `/ar/pages/1`.
   - Action: Dispatch touchstart on `[data-fq-word="1:1:1"]` -> wait 600ms -> dispatch touchend.
   - Assert: `MarkModal` opens.

## Files to Change

- `docs/plans/functional-e2e-word-marking.md` [NEW] — Task plan specification.
- `e2e/helpers/auth.ts` [NEW] — E2E authentication fixture helpers (`authenticateAsUser`, `clearUserMarks`) generating signed NextAuth session cookies.
- `e2e/helpers/reader.ts` [MODIFY] — Added `longPressWord` touch interaction helper for mobile overlay mode.
- `e2e/tests/word-marking.spec.ts` [NEW] — Complete Playwright functional test suite covering word marking, modal lifecycle, persistence, editing, deletion, verse marking, My Marks page, mobile touch gestures, and i18n.
- `scripts/e2e-fixture/setup.js` [MODIFY] — Seed deterministic default test user in `furqan_app_e2e.users`.

## Constraints

- E2E tests must be strictly functional/behavioral and deterministic against the local e2e fixture environment.
- No visual screenshot pixel diffing.
- Never join Quran and App DBs across boundaries (ADR 0008).
- E2E authentication cookies must strictly use `process.env.NEXTAUTH_SECRET` matching `.env.e2e`.
- Word mark highlight classes must follow `highlight.ts` and `constants/marks.ts` naming conventions (`${category}-mark`).
- Desktop-only flows use `skipNonDesktop`; mobile-specific gestures use `skipNonMobile`.

## What NOT to Do

- Do not bypass API routes by hand-crafting database mutations inside UI test cases when testing user flows.
- Do not use arbitrary timeouts (`page.waitForTimeout`) — use Playwright's state locators (`toBeVisible`, `toBeHidden`, `toHaveClass`, `waitForFunction`).
- Do not perform destructive deletions on the `furqan_quran_e2e` content database.
- Do not hardcode session tokens — compute signed JWTs dynamically via `next-auth/jwt`.

## Decisions Made

- Group tests into clear logical `test.describe` blocks: Unauthenticated Gating, Modal Dismissal & Audio Actions, Word Mark Creation & Highlight, Persistence & Edit Mode, Category Update & Deletion, Concurrent Marks, Verse-Level Marking, My Marks Management, Mobile Long-Press Interaction, and English Locale & Tajweed Edition Continuity.
- Provide a clean auth helper (`e2e/helpers/auth.ts`) so any future E2E test suites (plans, notifications, shared mushaf) can reuse deterministic authenticated session creation.
