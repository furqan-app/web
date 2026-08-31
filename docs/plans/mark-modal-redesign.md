# Mark Modal Redesign, Distinct Category Icons & Typography Polish

**Type:** feature  
**Date:** 2026-08-30  
**Status:** implemented

## Summary

Redesign the Mark Modal (`app/components/MarkModal.tsx`) and Marker Color Picker (`app/components/MarkerColorPicker.tsx`) to match Furqan's "Reading Desk" design system. The enhancement introduces distinct semantic Lucide icons for each of the 6 mark categories, adds a contextual Surah and Ayah metadata badge to the header, centers scripture in authentic Uthmanic calligraphy with an inline pronunciation button, streamlines quick actions (Play and Tafsir) into tactile pill buttons, fixes the Arabic placeholder alignment bug by binding direction to the active locale, and unifies all action buttons and signed-out states to semantic theme tokens.

## Approach

1. **Contextual In-Flow Header**:
   - Extract Surah number and Ayah number from `markFor.verse_key` via existing `getSurahMeta` (`app/utils/quran-navigation.ts`).
   - Render a contextual header row using `hideDefaultClose` on `DialogContent`: a pill badge (`سورة [الاسم] · آية [الرقم]` / `Surah [Name] · Ayah [N]`) on the start and the `DialogClose` `X` button on the end. This guarantees the close button never collides with the header text or badge across all screen widths and directions.
   - Display the word/verse title in `UthmanicHafs1Ver18` (`font-uthmanic`) with generous line-height and place the word pronunciation audio button (`Volume1`) seamlessly next to it.
   - If author attribution exists (`authorName`), render a subtle author badge.

2. **Quick Actions Row**:
   - Transform "Play from here" and "Tafsir" into sleek, tactile pill buttons (`border border-border/80 bg-card/60 hover:bg-accent active:scale-[0.98]`) with Lucide icons (`Volume2`, `BookOpen`).

3. **Distinct Category Icons in `MarkerColorPicker`**:
   - Update `MARK_CATEGORIES` in `app/constants/marks.ts` to attach a distinct semantic Lucide icon to each category:
     - `forgetting` (`نسيان`) → `RotateCcw`
     - `similar` (`متشابه`) → `Copy`
     - `tashkeel-error` (`خطأ في التشكيل`) → `Type`
     - `tajweed-error` (`خطأ تجويدي`) → `AudioWaveform`
     - `linking` (`تربيط`) → `Link`
     - `other` (`أخرى`) → `Bookmark`
   - Redesign `MarkerColorPicker` cards into a compact 3x2 grid of pill chips with soft pastel color tints, clean typography (`font-tajawal`), smooth active scale feedback, and an emerald ring indicator on selection.

4. **Note Textarea & Action Footer**:
   - Fix placeholder alignment in Arabic by binding explicit direction `dir={getLanguageDirection(locale)}` and `text-start` instead of browser-default `dir="auto"`.
   - Provide character counter `0/500` with subtle styling.
   - Style primary "Save Mark" button with unified emerald (`bg-primary text-primary-foreground`) and "Remove Mark" button with `text-destructive hover:bg-destructive/10`.
   - Update the signed-out prompt card to use semantic tokens, eliminating legacy hardcoded `bg-green-700` classes.

## Decision Tree / Algorithm

```
MarkModal Mount / Open:
│
├── 1. Header Resolution
│   ├── Parse surahId & ayahId from markFor.verse_key
│   ├── Fetch surah metadata (locale-aware: nameArabic / nameSimple)
│   ├── Render in-flow header: [ Surah : Ayah Badge ] <──────> [ DialogClose (X) ]
│   └── Render Scripture Text (Uthmanic font) + (isWord ? WordPronunciationButton : null)
│
├── 2. Quick Actions
│   ├── "Play from here" -> calls play(verse_key) & closes modal
│   └── "Tafsir" -> calls openTafsir(verse_key, snippet) & closes modal
│
├── 3. Category & Notes Section (Authenticated)
│   ├── Render MarkerColorPicker (6 distinct icon pills)
│   ├── Note Textarea:
│   │   ├── Enabled if category chosen && !isOffline
│   │   ├── Direction set explicitly to active locale (RTL for Arabic, LTR for English)
│   │   └── Character counter (comment.length / 500)
│   ├── Save Button:
│   │   ├── Enabled if category chosen && !isOffline
│   │   └── Calls addPageMark, reloads marks, closes modal
│   └── Remove Button:
│       └── Visible only if currentCategory is present; calls deletePageMark
│
└── 4. Unauthenticated State
    └── Render clean prompt card with semantic bg-primary "Sign in" button
```

## Verified Test Cases

| Case | Scenario | Expected Behavior |
|---|---|---|
| **Case 1: Word Mark (Unmarked, Signed-In)** | Clicking an unmarked word (e.g. 4:10 word 3) | Header shows `سورة النساء · آية ١٠` badge and `X` at opposite edge. Word displayed in Uthmanic font with audio button. Category picker has 6 distinct icon pills. Textarea disabled with placeholder `اختر تصنيفاً لإضافة تعليق` aligned to the right in Arabic. Save button disabled. |
| **Case 2: Verse Mark (Unmarked, Signed-In)** | Selecting a full verse for marking | Header shows `سورة [الاسم] · آية [الرقم]`. Full verse text displayed in Uthmanic font. No pronunciation button. Category picker and actions identical to Case 1. |
| **Case 3: Existing Mark Edit** | Opening a word/verse already marked as `نسيان` with note "راجع المتشابه" | `نسيان` pill pre-selected with emerald ring and red accent. Textarea pre-filled with comment, counter shows `14/500`. Save button active. Remove button visible in red/destructive styling. |
| **Case 4: Category Selection & Commenting** | User clicks `متشابه` (`Copy` icon) | `متشابه` gets active emerald ring. Note textarea immediately enables with active placeholder `أضف تعليقاً (اختياري)...`. Save button becomes enabled. |
| **Case 5: Signed-Out Visitor** | Unauthenticated user clicks word | Scripture and Quick Actions (Tafsir & Play) work normally. Categories replaced by clean card with `bg-primary` "Sign in" button. |
| **Case 6: Offline Visitor** | PWA is offline | Categories and inputs are disabled with a clean warning notice (`markModal.offlineNotice`). |
| **Case 7: RTL & LTR Language Toggle** | Switching between Arabic (RTL) and English (LTR) | Header mirrors properly (`X` on end, badge on start). Textarea placeholder aligns to right in Arabic and left in English. |

## Files to Change

- `app/constants/marks.ts` — Add distinct Lucide icon references and types for `MARK_CATEGORIES`.
- `app/components/MarkerColorPicker.tsx` — Redesign into a sleek 3x2 pill grid with distinct icons, active emerald rings, and theme token classes.
- `app/components/MarkModal.tsx` — Add Surah/Ayah header badge, in-flow header layout with `hideDefaultClose`, fix textarea RTL placeholder alignment, style quick action pills, unified primary/destructive buttons, and theme signed-out card.
- `messages/ar.json` & `messages/en.json` — Add/verify any needed i18n labels for header context or category cues.
- `e2e/tests/word-marking.spec.ts` / unit tests — Verify mark modal tests pass with new selectors and markup.

## Constraints

- **Header Collision Prevention**: `DialogContent` must specify `hideDefaultClose` and render `DialogClose` in-flow within the header flex container.
- **RTL/LTR Placeholder Alignment**: Note textarea must use `dir={getLanguageDirection(locale)}` and `text-start` to avoid browser `dir="auto"` fallback bugs on empty inputs.
- **Semantic Theme Tokens**: Use only semantic theme tokens (`bg-primary`, `text-primary-foreground`, `text-destructive`, `border-border`, `bg-card`, etc.). No hardcoded hex values or raw color utilities (e.g. eliminate `bg-green-700`).
- **Radix Accessibility**: Maintain `DialogTitle` and `DialogDescription` components to satisfy Radix accessibility contracts.
- **PWA Back Gesture**: Preserve `useCloseOnBackGesture(isOpen, close)`.
- **Font Contract**: Use `font-tajawal` for UI chrome/badges, `font-uthmanic` (`UthmanicHafs1Ver18`) for word and verse scripture display.

## What NOT to Do

- Do not alter backend database schemas, Prisma models, or API endpoints (`/api/quran/pages/[pageId]/marks`).
- Do not use `dir="auto"` on the textarea — it causes LTR placeholder orientation in empty Arabic inputs.
- Do not use absolute positioning for the header close button — it causes overlapping with long surah names on small mobile screens.
- Do not add custom CSS keyframes when standard Tailwind transitions suffice.

## Decisions Made

- Unified 6 distinct semantic Lucide icons across the 6 mark categories: `RotateCcw` (نسيان), `Copy` (متشابه), `Type` (تشكيل), `AudioWaveform` (تجويد), `Link` (تربيط), `Bookmark` (أخرى).
- Header badge displays `[Surah Name] · Ayah [N]` using `getSurahMeta` and `toLocaleNumeral` for numbers in Arabic.
- MarkModal actions use a clean unified card appearance without heavy nested `bg-muted` gray boxes.
