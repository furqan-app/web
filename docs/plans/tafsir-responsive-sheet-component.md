# Tafsir: Responsive Sheet Component & Reader Integration (Issues #459 & #460)

**Type:** feature  
**Date:** 2026-08-29  
**Status:** implemented

## Summary

Build and integrate a responsive Tafsir (Quranic commentary) presentation sheet component (`app/components/tafsir/TafsirSheet.tsx`) using Radix/shadcn Sheet primitives that renders as a universal bottom sheet drawer across mobile, tablet, and desktop (`h-[60dvh]`) with centered reading column (`max-w-3xl`) on large displays. Features a global `TafsirContext` (`app/contexts/TafsirContext.tsx`), a "View Tafsir" action inside `MarkModal.tsx`, a clean single-line edition selector dropdown (`TafsirEditionSelect.tsx`) with localStorage persistence, a rich typography renderer (`TafsirContent.tsx`) highlighting authentic Uthmanic Quran quotes (`﴿...﴾`) and references, continuous cross-surah previous/next ayah steppers, bidirectional keyboard arrow stepping (`ArrowLeft`/`ArrowRight`), sleek custom scrollbar (`.fq-scroll-nice`), shimmer loading skeletons, error retry UI, and mobile Android back-gesture dismissal (`useCloseOnBackGesture`). Combines issues #459 and #460 (Epic #457).

## Root Cause / Approach

Commentary viewing requires a dedicated, non-intrusive presentation layer directly accessible from the reader flow when selecting words or verses.

The implementation comprises:
1. **Quran Ayah Navigation Utility (`app/utils/quran-navigation.ts`)**: Pure, synchronous, zero-latency helpers computing next/previous verse keys across all 114 surah boundaries (from 1:1 to 114:6) backed directly by `public/quran/chapters.json`.
2. **Responsive Bottom Drawer Container (`app/components/tafsir/TafsirSheet.tsx`)**:
   - Universal bottom sheet drawer (`side="bottom"`, `h-[60dvh]`, `rounded-t-2xl`, subtle drag handle pill at top).
   - Centered reading container (`max-w-3xl mx-auto w-full`) ensuring optimal line length and visual balance on tablets and desktop monitors.
   - Header with centered Surah name, Ayah number, and authentic 7-word Uthmanic verse snippet, flanked by previous/next stepper buttons.
   - Captures `SheetContent` DOM node as `portalContainer` to avoid Radix focus-trapping bugs with child popovers (ADR 0021 Addendum 5b).
   - Supports keyboard arrow navigation (`ArrowRight` / `ArrowLeft`) with RTL awareness.
   - Resets scroll position to top on Ayah change.
   - Dismissible via backdrop tap, downward drag, keyboard `Escape`, and Android back swipe (`useCloseOnBackGesture`).
   - Manages selected edition with `localStorage` persistence (`fq_tafsir_edition_id`, defaulting to `DEFAULT_TAFSIR_ID = 16` Al-Muyassar).
3. **Global State & Context (`app/contexts/TafsirContext.tsx`)**:
   - `TafsirProvider` mounted at locale layout level in `app/[locale]/layout.tsx`.
   - Manages `isOpen`, `verseKey`, `openTafsir(verseKey, verseText)`, `closeTafsir()`, and `setVerseKey(nextKey)`.
4. **MarkModal Reader Integration (`app/components/MarkModal.tsx`)**:
   - Added a "View Tafsir" action button alongside "Play from here" in a clean 2-column grid.
   - Clicking opens the Tafsir sheet for the active verse key and dismisses MarkModal.
5. **Edition Selector Popover (`app/components/tafsir/TafsirEditionSelect.tsx`)**:
   - Clean, single-line trigger button with `Globe` icon and edition title.
   - Popover menu displaying the 6 curated Arabic tafsir editions (`TAFSIR_EDITIONS`), showing name and author with checkmark indicator.
   - Portaled into the sheet container.
6. **Typographic Commentary Content Renderer (`app/components/tafsir/TafsirContent.tsx`)**:
   - Renders `TafsirSegment[]` from `parseTafsirSegments` with `text-justify` alignment:
     - `quran` segments rendered with `font-uthmanic text-primary` in `﴿...﴾` brackets (ADR 0002).
     - `reference` citations styled in `text-muted-foreground text-xs sm:text-sm`.
     - `text` prose rendered in `IBM Plex Sans Arabic` with comfortable line height (`leading-[2.1]`).
   - Custom discreet scrollbar (`.fq-scroll-nice`) with touch momentum and `overscroll-y-contain`.
   - Shimmer skeleton loading state during fetch.
   - Error state with localized retry button triggering `refetch()`.
   - Empty state when commentary is absent.
7. **Authentic Verse Text API Endpoint (`app/api/quran/verses/[verseKey]/route.ts`)**:
   - Reconstructs verse text from `word.qpc_uthmani_hafs` filtered to `char_type_name === 'word'` to prevent unmapped Unicode stop marker artifacts (`◉`).
   - Backed by TanStack Query hook `useVerseText` cached for 24 hours.

## Decision Tree / Algorithm

### 1. Ayah Stepper Navigation (`getPreviousAyahKey` & `getNextAyahKey`)

Let `surah` and `ayah` be parsed from `verseKey` (`${surah}:${ayah}`), and `versesCount(surah)` be the total verses of that surah:

| Action | Condition | Output | Button State |
|---|---|---|---|
| **Previous Ayah** | `surah === 1 && ayah === 1` | `null` | **Disabled** (Absolute start of Quran) |
| **Previous Ayah** | `ayah > 1` | `${surah}:${ayah - 1}` | **Enabled** (Step backward within surah) |
| **Previous Ayah** | `ayah === 1 && surah > 1` | `${surah - 1}:${versesCount(surah - 1)}` | **Enabled** (Jump to last ayah of preceding surah) |
| **Next Ayah** | `surah === 114 && ayah === 6` | `null` | **Disabled** (Absolute end of Quran) |
| **Next Ayah** | `ayah < versesCount(surah)` | `${surah}:${ayah + 1}` | **Enabled** (Step forward within surah) |
| **Next Ayah** | `ayah === versesCount(surah) && surah < 114` | `${surah + 1}:1` | **Enabled** (Jump to first ayah of subsequent surah) |

### 2. Viewport & Drawer Layout

| Viewport | Device Class | Sheet `side` | Layout & Dimensions |
|---|---|---|---|
| Universal | Mobile, Tablet & Desktop | `bottom` | Full-width bottom sheet (`w-full h-[60dvh] rounded-t-2xl border-t`), inner content centered at `max-w-3xl mx-auto w-full` |

### 3. Commentary Query & Content State

| State | Condition | UI Rendered |
|---|---|---|
| **Loading** | `isLoading === true` | Multi-line shimmer skeleton cards matching Arabic reading lines |
| **Error** | `isError === true \|\| (data === null && !isLoading)` | Destructive/muted error card with explanation and "Retry" button (`refetch()`) |
| **Empty** | `data && !data.text` | Muted notice ("No commentary available for this verse in the selected edition") |
| **Success** | `data && data.text` | Rich `TafsirSegment[]` elements (`quran` in `font-uthmanic`, `reference` in subtle text, `text` in primary prose with `text-justify`) |

## Verified Test Cases

1. **Al-Fatihah Start (`1:1`)**:
   - `getPreviousAyahKey("1:1")` $\rightarrow$ `null` (Previous button disabled).
   - `getNextAyahKey("1:1")` $\rightarrow$ `"1:2"` (Next button enabled).
2. **Al-Fatihah Boundary (`1:7` $\rightarrow$ `2:1`)**:
   - `getNextAyahKey("1:7")` $\rightarrow$ `"2:1"` (Advances from Al-Fatihah end to Al-Baqarah start).
   - `getPreviousAyahKey("2:1")` $\rightarrow$ `"1:7"` (Moves back from Al-Baqarah start to Al-Fatihah end).
3. **An-Nas End (`114:6`)**:
   - `getNextAyahKey("114:6")` $\rightarrow$ `null` (Next button disabled).
   - `getPreviousAyahKey("114:6")` $\rightarrow$ `"114:5"` (Previous button enabled).
4. **MarkModal Entry Trigger**:
   - Clicking any word/verse in the reader opens `MarkModal`, which displays the "View Tafsir" button.
   - Clicking "View Tafsir" invokes `openTafsir(verseKey)`, closes `MarkModal`, and slides open `TafsirSheet`.
5. **Edition Selection Persistence**:
   - Changing edition to *Tafsir Ibn Kathir (id 14)* updates localStorage and displays selected edition.
   - Invalid stored values are cleaned up automatically.
6. **Universal Centered Bottom Sheet**:
   - Spans full width at viewport bottom with 60% dvh height.
   - Content cleanly centered at `max-w-3xl` reading column on large screens.
7. **Keyboard & Touch Navigation**:
   - `ArrowRight` / `ArrowLeft` keys navigate ayahs with RTL awareness.
   - `Escape` dismisses sheet.

## Files Changed

- `app/utils/quran-navigation.ts` — Synchronous ayah stepping helpers derived from `public/quran/chapters.json`
- `app/utils/quran-navigation.test.ts` — Vitest tests for ayah boundary calculations across all 114 surahs
- `app/utils/tafsir-formatter.ts` — Added `formatVerseSnippet` helper for Uthmanic verse snippets
- `app/api/quran/verses/[verseKey]/route.ts` — Verse text API endpoint with shape validation
- `app/hooks/use-verse-text.ts` — React Query cached hook for authentic Uthmanic verse text
- `app/contexts/TafsirContext.tsx` — Global Tafsir state context with layout-mounted TafsirSheet
- `app/components/tafsir/TafsirSheet.tsx` — Universal bottom sheet container with Radix primitives, steppers, and focus portal
- `app/components/tafsir/TafsirEditionSelect.tsx` — Popover edition selector dropdown
- `app/components/tafsir/TafsirContent.tsx` — Typographic commentary renderer with `text-justify` and `.fq-scroll-nice`
- `app/components/MarkModal.tsx` — Integrated "View Tafsir" action button
- `e2e/tests/tafsir-sheet.spec.ts` — Playwright end-to-end integration tests
