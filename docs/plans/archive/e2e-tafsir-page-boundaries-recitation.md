---
title: "Complex E2E & Fix: Tafsir Sheet Interplay with Page Boundaries & Recitation"
type: feature
date: 2026-09-02
status: implemented
area: tafsir
issue: 470
---

# Complex E2E & Fix: Tafsir Sheet Interplay with Page Boundaries & Recitation

**GitHub Issue:** [#470](https://github.com/furqan-app/web/issues/470)  
**Parent Epic:** [#466](https://github.com/furqan-app/web/issues/466)  
**Status:** implemented

## Summary

Implements an isolated, null-rendering synchronization leaf (`TafsirReaderSync`) that automatically synchronizes the underlying reader pager with the Tafsir sheet during manual verse stepping across page boundaries, while maintaining complete independence from active recitation playback (recitation auto-advance in the background never hijacks the Tafsir sheet’s selected verse, remounts the sheet, or resets its scroll position). Hardens and verifies this interplay with a comprehensive Playwright behavioral E2E test suite in `e2e/tests/tafsir-sheet.spec.ts` exercising: (1) manual forward and backward verse stepping across page boundaries, (2) double-page spread nuances (facing pages within the same spread vs. crossing spread pair boundaries), (3) background recitation playback and auto-advance across page boundaries while Tafsir remains mounted without flicker or scroll reset, (4) recitation follow detachment on manual Tafsir jumps away from the recited page and automatic re-attachment upon playback catching up, (5) absolute Quran bounds clamping (`1:1` and `114:6`), (6) RTL and LTR keyboard stepping parity, and (7) shared mushaf reader URL integrity (`/mushaf/[grant]/pages/[id]`).

## Root Cause / Approach

### 1. Tafsir Reader Pager Synchronization (`TafsirReaderSync.tsx`)
Currently, `TafsirSheet` manages its active verse key through `TafsirContext`, but has no awareness of the mounted `ReaderPager`. When a user steps across a page boundary (e.g., from `1:7` on Page 1 to `2:1` on Page 2), the sheet updates commentary and header metadata, but the background reader pager remains stranded on the initial page.
- **Approach**: Create `app/components/tafsir/TafsirReaderSync.tsx`, a null-rendering effect leaf matching the established pattern of `LastReadPageSync` and `RecitationFollow`.
- The leaf consumes `useTafsirModal()`, `useReaderPage()`, `useReaderNavigation()`, and `useVersePages(isOpen)`.
- When `isOpen` is true and `verseKey` is present:
  - Resolves `targetPage = versePages[verseKey]` using the active mushaf edition’s cached mapping (`ADR 0033`).
  - Checks if `targetPage` is already visible in the reader (`visiblePages.includes(targetPage)`).
  - If `!visiblePages.includes(targetPage)` and `jumpTo` is available:
    - Calls `jumpTo(targetPage)` to advance the mounted reader pager client-side without full-page reloads, route transitions, or remounts (`ADR 0028`).
- Mount `<TafsirReaderSync />` in `app/[locale]/layout.tsx` alongside `LastReadPageSync` inside `ReaderNavigationProvider`.

### 2. Recitation Playback Independence
Recitation playback runs globally via `RecitationContext` and `RecitationFollow` (`ADR 0056`).
- The Tafsir sheet remains strictly independent from recitation playback: recitation advancing to subsequent verses or crossing page boundaries in the background does NOT mutate `TafsirContext.verseKey`, does NOT re-render `TafsirSheet`, and does NOT reset `TafsirSheet` scroll position.
- If recitation is active on Page 1 and the user steps Tafsir to Page 3:
  - Pager jumps to Page 3.
  - Recitation follow cleanly detaches (`isFollowing` flips to `false` via `decideRecitationFollow` in `RecitationFollow.tsx`), surfacing `RecitationReturnStrip` in the navigation bar.
  - Playback continues uninterrupted on Page 1.
  - When recitation audio eventually catches up and reaches Page 3, or if the user steps Tafsir back to Page 1, `visiblePages.includes(recitedPage)` becomes true and follow automatically re-attaches (`isFollowing = true`).

### 3. Comprehensive E2E Testing Suite (`e2e/tests/tafsir-sheet.spec.ts`)
Expands `e2e/tests/tafsir-sheet.spec.ts` into an exhaustive behavioral test suite covering all interaction vectors:
- **Forward boundary crossing**: Stepping from `1:7` to `2:1` advances the reader from `/ar/pages/1` to `/ar/pages/2` while keeping the sheet open and mounted.
- **Backward boundary crossing**: Stepping from `2:1` to `1:7` moves the reader from `/ar/pages/2` back to `/ar/pages/1`.
- **Double-page spread nuance**: Stepping between `1:7` (right) and `2:1` (left) keeps spread `(1, 2)` without unnecessary pager re-anchoring; stepping from `2:5` (Page 2) to `2:6` (Page 3) jumps to spread `(3, 4)`.
- **Recitation auto-advance while Tafsir is open**: With Tafsir open on `1:7` and scrolled down, mock recitation advances across the page boundary to `2:1`. Pager turns to Page 2 in the background, but Tafsir remains open on `1:7` with its scroll position intact (zero flicker, zero scroll reset).
- **Follow detachment & re-attachment**: Stepping Tafsir away from playing recitation detaches follow (showing return strip in nav); stepping back or playback catching up re-attaches.
- **Bounds clamping**: At `1:1`, previous button is disabled; at `114:6`, next button is disabled. No invalid page navigation occurs.
- **Shared mushaf integrity**: Stepping in Tafsir while reading `/ar/mushaf/[grant]/pages/1` turns page within the grant URL, never leaking to `/pages/2`.
- **RTL & LTR keyboard parity**: `ArrowLeft` / `ArrowRight` step symmetrically in Arabic and English.

## Decision Tree / Algorithm

### Tafsir Sheet, Page Boundaries & Recitation Interaction State Machine

| Trigger / Context | Pre-Condition | Action / Handling | Resulting Reader State | Resulting Tafsir State | Recitation Follow State |
|---|---|---|---|---|---|
| **1. Step within same page** | Tafsir on `1:1`; target `1:2`; Page 1 | `TafsirContext.setVerseKey("1:2")`; Target page 1 in `visiblePages` | Pager stays on Page 1 (no jump) | Updates to `1:2`; scroll resets to top | Unaffected |
| **2. Step crossing page boundary (Forward)** | Tafsir on `1:7` (Page 1); target `2:1` (Page 2); single-page view | `TafsirContext.setVerseKey("2:1")`; Target page 2 NOT in `visiblePages` → calls `jumpTo(2)` | Pager turns to Page 2 (`replaceState` `/pages/2`) | Stays open & mounted; updates to `2:1`; scroll resets to top | If playing on Page 1, follow detaches (`RecitationReturnStrip` appears) |
| **3. Step crossing page boundary (Backward)** | Tafsir on `2:1` (Page 2); target `1:7` (Page 1); single-page view | `TafsirContext.setVerseKey("1:7")`; Target page 1 NOT in `visiblePages` → calls `jumpTo(1)` | Pager turns to Page 1 (`replaceState` `/pages/1`) | Stays open & mounted; updates to `1:7`; scroll resets to top | If playing on Page 2, follow detaches |
| **4. Step within same Double-Page spread** | Tafsir on `1:7` (Page 1); target `2:1` (Page 2); spread `[1, 2]` | Target page 2 already in `visiblePages` → no `jumpTo` | Pager stays on spread `(1, 2)` | Updates to `2:1`; scroll resets to top | Unaffected |
| **5. Step crossing spread boundary** | Tafsir on `2:5` (Page 2); target `2:6` (Page 3); spread `[1, 2]` | Target page 3 NOT in `visiblePages` → calls `jumpTo(3)` | Pager jumps to spread `(3, 4)` | Stays open & mounted; updates to `2:6`; scroll resets to top | Detaches if playing on Page 1/2 |
| **6. Backward step crossing spread boundary** | Tafsir on `2:6` (Page 3); target `2:5` (Page 2); spread `[3, 4]` | Target page 2 NOT in `visiblePages` → calls `jumpTo(2)` | Pager jumps to spread `(1, 2)` | Stays open & mounted; updates to `2:5`; scroll resets to top | Detaches if playing on Page 3/4 |
| **7. Recitation auto-advance across page while Tafsir open** | Recitation playing `1:7` on Page 1; Tafsir open on `1:7` scrolled down; audio reaches `2:1` | `RecitationFollow` triggers `onFollow(2)` → pager `followTo(2)` | Pager turns to Page 2 in background | Stays independent on `1:7`; **no flicker, no scroll reset** | Follow stays attached; playback continues on Page 2 |
| **8. Recitation re-attachment on catch-up** | Recitation playing on Page 1 (detached); Tafsir stepped to Page 3; audio reaches Page 3 | Audio advances to Page 3 (`recitedPage = 3`); `visiblePages.includes(3)` matches | Pager stays on Page 3 | Stays independent on Tafsir verse | Follow re-attaches (`isFollowing = true`, return strip hides) |
| **9. Tafsir closed after stepping** | Stepped Tafsir to `2:1` (pager now on Page 2); user dismisses sheet | Sheet closes (`isOpen = false`) | Pager already at Page 2; `LastReadPageSync` records Page 2 | Sheet closes cleanly | Unaffected |
| **10. Bounds clamping at Quran start** | Tafsir on `1:1`; user clicks Prev or presses back arrow | Previous button disabled (`previousKey === null`); keyboard step no-op | Pager stays on Page 1 (no `jumpTo(0)`) | Remains on `1:1` | Unaffected |
| **11. Bounds clamping at Quran end** | Tafsir on `114:6`; user clicks Next or presses forward arrow | Next button disabled (`nextKey === null`); keyboard step no-op | Pager stays on Page 604 (no `jumpTo(605)`) | Remains on `114:6` | Unaffected |
| **12. Shared Mushaf stepping** | Tafsir open on `/mushaf/[grant]/pages/1`; steps to `2:1` | `jumpTo(2)` runs with shared mushaf `basePath` | Pager jumps to `/mushaf/[grant]/pages/2` | Stays open & mounted on `2:1` | Unaffected |
| **13. Tafsir opened outside reader** | User on `/ar/marks` or `/ar`; opens Tafsir | `jumpTo` is `null` | No-op (no pager mounted) | Opens and functions normally | Unaffected |

## Verified Test Cases

1. **Manual Forward Stepping Across Page Boundary (Single View):**
   - Navigate to `/ar/pages/1`.
   - Open Tafsir on `1:7` (last verse of Page 1).
   - Click "Next Ayah" button (or press `ArrowLeft` in RTL).
   - Assert: Tafsir displays header for `2:1` (Surah Al-Baqarah Ayah 1).
   - Assert: URL updates to `/ar/pages/2`.
   - Assert: Tafsir sheet remains visible and mounted without flickering.

2. **Manual Backward Stepping Across Page Boundary:**
   - Navigate to `/ar/pages/2`.
   - Open Tafsir on `2:1`.
   - Click "Previous Ayah" button (or press `ArrowRight` in RTL).
   - Assert: Tafsir displays header for `1:7`.
   - Assert: URL updates to `/ar/pages/1`.

3. **Double-Page Spread Integrity (Facing Pages vs New Spread):**
   - Set view mode to double-page spread on desktop (`storage.set("quranSafhaView", "double")`).
   - Navigate to `/ar/pages/1` (displays spread 1, 2).
   - Open Tafsir on `1:7` and step to `2:1`.
   - Assert: Tafsir updates to `2:1`; URL remains on spread `(1, 2)` without redundant jump.
   - Step forward to `2:6` (Page 3).
   - Assert: URL updates to `/ar/pages/3` (spread 3, 4).

4. **Recitation Auto-Advance Across Page with Tafsir Open (Zero Reset):**
   - Start recitation playback on Page 1 (`1:7`).
   - Open Tafsir on `1:7` and scroll commentary down 200px.
   - Recitation audio time reaches `2:1` timing.
   - Assert: Underlying pager turns to Page 2.
   - Assert: Tafsir sheet remains open, displays `1:7` (independent), and its scroll container is the same DOM node before and after the auto-advance (held `elementHandle` stays `isConnected` — no remount); scroll-offset preservation is checked only when the commentary actually overflowed.

5. **Recitation Follow Detach and Re-attach:**
   - Start recitation playback on Page 1 (`1:1`).
   - Open Tafsir on `1:1` and step forward to `2:1` (Page 2).
   - Assert: Pager jumps to Page 2; Recitation follow detaches (`RecitationReturnStrip` visible).
   - Step Tafsir backward to `1:7` (Page 1).
   - Assert: Pager returns to Page 1; Recitation follow re-attaches (`RecitationReturnStrip` hidden).

6. **Boundary Clamping:**
   - Open Tafsir on `1:1`: Previous button disabled; keyboard backwards step is inert.
   - Open Tafsir on `114:6`: Next button disabled; keyboard forwards step is inert.

7. **Shared Mushaf Path Preservation:**
   - Authenticate as viewer on `/ar/mushaf/[grant]/pages/1`.
   - Open Tafsir on `1:7` and step to `2:1`.
   - Assert: URL updates to `/ar/mushaf/[grant]/pages/2`, never redirecting to personal `/pages/2`.

8. **RTL and LTR Keyboard Parity:**
   - In `/en/pages/1`: `ArrowRight` steps forward to `1:2`, `ArrowLeft` steps backward.
   - In `/ar/pages/1`: `ArrowLeft` steps forward to `1:2`, `ArrowRight` steps backward.

## Files to Change

### 1. New Component: `app/components/tafsir/TafsirReaderSync.tsx`
- Null-rendering synchronization leaf consuming `useTafsirModal`, `useReaderPage`, `useReaderNavigation`, and `useVersePages`.
- Evaluates active verse page against visible pages and calls `jumpTo(targetPage)` when crossing boundaries.

### 2. Layout Integration: `app/[locale]/layout.tsx`
- Mount `<TafsirReaderSync />` inside `ReaderNavigationProvider` alongside `LastReadPageSync`.

### 3. Decisions Architecture: `docs/architecture/decisions/tafsir.md`
- Record new active decision: `## Tafsir: Reader Pager Synchronization & Recitation Independence`.

### 4. End-to-End Suite: `e2e/tests/tafsir-sheet.spec.ts`
- Comprehensive Playwright test scenarios covering boundary crossings, spread nuances, recitation independence, follow detach/reattach, boundary clamping, and shared mushaf preservation.
- The recitation auto-advance test does not assume `.fq-scroll-nice` overflows: real 2:5 commentary is short, and the reader server-prefetches tafsir so the client `page.route` mock is not reliably the render source. It proves "not reset" primarily by holding an `elementHandle` to the scroll container and asserting it stays `isConnected` across the auto-advance (a sheet remount would detach it and zero the scroll). When the container did overflow, it additionally checks the sheet is still scrolled afterwards (`scrollTop > initialScroll / 2` — tolerant of a few px of reflow from the background pager turn, strict against a reset to top).

## Constraints

- **Single in-reader navigation primitive**: Page boundary jumps from Tafsir MUST use `jumpTo(page)` from `ReaderNavigationContext` (`ADR 0028`). Never use `router.push` or full navigation.
- **Active mushaf edition resolution**: All verse-to-page lookups must resolve through `useVersePages()` (`ADR 0033`). Never assume hardcoded page numbers or fixed verse offsets.
- **Recitation independence**: Tafsir sheet must never follow recitation auto-advance; it stays locked to user manual selection.
- **Spread-aware jumps**: `jumpTo` must NOT be called if the target page is already included in `visiblePages` (e.g. facing page of an active double spread).
- **Overlay z-index ladder**: Tafsir Sheet (`z-50`) > RecitationPlayerBar (`z-40`) > Nav (`z-10`).
- **Focus trap & gesture containment**: Radix `SheetContent` focus containment must remain uninterrupted during background pager turns.
- **E2E must not assume `.fq-scroll-nice` overflows**: it only scrolls when the rendered commentary is long enough, and the rendered commentary is not controlled by the test (short real 2:5 text; reader server-prefetch bypasses the client `page.route` mock). Prove "sheet not remounted / not reset" with an element-identity check (`elementHandle` stays `isConnected`); gate any `scrollTop` offset assertion behind an actual-overflow check.
- **No app-code changes for the #522 flake fix** — `TafsirSheet` / `TafsirReaderSync` behavior is correct; only the test's assumptions were unsound.

## What NOT to Do

- Do NOT subscribe `TafsirSheet` or `TafsirContext` to `RecitationContext`’s timeupdate or word ticks — that causes unwanted commentary hijacking, high-frequency re-renders, and scroll resets.
- Do NOT call `router.push` or mutate `window.location.pathname` directly for page transitions.
- Do NOT call `jumpTo` when `targetPage` is already included in `visiblePages`.
- Do NOT inline pager navigation logic inside `TafsirSheet.tsx` — keep `TafsirSheet` presentationally pure and delegate synchronization to `TafsirReaderSync.tsx`.
- Do NOT hardcode page numbers or assume single-page layout universally.
- Do NOT drop the remount guard in the recitation auto-advance test — keep the element-identity (`isConnected`) check even if the scroll-offset assertion is conditional.
- Do NOT re-add an unconditional `expect(scrollTop).toBeGreaterThan(0)` / `expect.poll` on overflow — the rendered commentary length is not test-controlled, so it will flake again.
- Do NOT add arbitrary `waitForTimeout` sleeps to stabilise scroll timing.
- Do NOT change `.fq-scroll-nice` markup or the sheet layout to force overflow.
- Do NOT lower the Playwright worker count further or special-case CI timing to work around the flake.

## Decisions Made

- Tafsir sheet stays independent from recitation playback: recitation continues in the background, but Tafsir commentary never auto-advances.
- Reader pager turns automatically when manual Tafsir stepping crosses a page boundary not currently visible.
- Stepping away from playing recitation detaches follow; stepping back or playback catching up re-attaches follow.
- E2E proves the Tafsir sheet "was not reset" across a recitation auto-advance by element identity — a held `elementHandle` to `.fq-scroll-nice` stays `isConnected` — not by a scroll-offset value, since the rendered commentary length is not test-controlled.

## Revision History

- **2026-09-03** — Folded Addendum 1 (Issue [#522](https://github.com/furqan-app/web/issues/522), branch `bug/522-tafsir-e2e-scroll-flake`). The recitation auto-advance test's scroll-preservation sub-check (`scrollContainer.scrollTop = 100` then `expect(...).toBeGreaterThan(0)`) was flaky in CI: `.fq-scroll-nice` only scrolls when the rendered commentary overflows, and the rendered commentary is short real 2:5 text — the client `page.route` QDC mock does not reliably feed it because the reader server-prefetches tafsir. So `scrollTop` stayed `0`. Latent until #470 + #471 both reached `main`; #520's worker-cap change shifted timing further. First fix attempt (enlarge the mock body + `expect.poll` for overflow) failed in CI the same way — the mock still wasn't the render source. Final fix (test-only): reverted the mock to its original body; the test now holds an `elementHandle` to the scroll container and asserts it stays `isConnected` across the auto-advance (the real remount guard), and, only when the container did overflow, checks it is still scrolled afterwards with a drift-tolerant bound (`scrollTop > initialScroll / 2`) rather than a pixel-exact one — an earlier ±2px bound was itself flaky (a background pager turn reflows the container ~10px). Local E2E verification was not possible on the author's machine (heavy `next dev` compile of the reader route destabilised it — tracked in [#524](https://github.com/furqan-app/web/issues/524)); CI is the verifier.
