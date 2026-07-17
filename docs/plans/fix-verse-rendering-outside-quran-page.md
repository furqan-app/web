# Fix: Verse Rendering Outside the Quran Page

**Type:** bug  
**Date:** 2026-07-01  
**Status:** implemented

## Root Cause

`verse.text_uthmani` contains Quranic section markers (rub el hizb ۞, sajdah, etc.) that `uthmanic.ttf` cannot render, producing a visible circle character. `uthmanic.ttf` also lacks proper Quranic glyph coverage. Fixed by swapping to `UthmanicHafs1Ver18` globally and replacing `text_uthmani` with word-level `qpc_uthmani_hafs` joins everywhere it's rendered.

## Fixes

### 1. Global font swap (`app/layout.tsx`)

Replace `uthmanic.ttf` with `UthmanicHafs1Ver18.woff2/.ttf` under the same `--uthmanic` CSS variable and `font-uthmanic` Tailwind class. Delete old font file.

### 2. Search results — `app/components/search/SearchQueryResults.tsx`

```tsx
{verse.Word
  .filter(w => w.char_type_name === 'word')
  .map(w => w.qpc_uthmani_hafs)
  .join(' ')}
```

Add `dir="rtl"` to the verse text container. Add `Word: { select: { qpc_uthmani_hafs, char_type_name }, orderBy: { position } }` to the Prisma query in `app/api/search/verses/route.ts` and extend `VerseResult` in `app/types/index.ts`.

### 3. MarkModal verse title — `app/components/MarkModal.tsx` + `QuranSafha.tsx`

When user taps an end-of-verse marker, `QuranSafha` reconstructs display text from `lines` (already in memory — no extra fetch):

```ts
const allWords = Object.values(lines).flat();
const displayText = allWords
  .filter(w => w.verse_key === word.verse_key && w.char_type_name === 'word')
  .map(w => w.qpc_uthmani_hafs)
  .join(' ');
```

Passed as `verseDisplayText?: string` to `MarkModal` (fallback to `text_uthmani` if absent). Also fixed `MarkModal` word title: `markFor.text_uthmani` → `markFor.qpc_uthmani_hafs` for `Word` entries.

### 4. RubList start verse — `app/components/RubList.tsx`

```tsx
{rub.startVerse.Word
  .filter(w => w.char_type_name === 'word')
  .map(w => w.qpc_uthmani_hafs)
  .join(' ')}
```

Extend `startVerse` in `app/types/prisma.ts` and `app/hooks/get-rubs.ts` with `Word: { select: { qpc_uthmani_hafs, char_type_name } }`. Remove now-unused `text_uthmani` from both `startVerse` and `endVerse` selects.

## Constraints

- Never use `verse.text_uthmani` directly in rendered output — always join `word.qpc_uthmani_hafs`.
- Search results (full verse): do NOT filter by `char_type_name` — include all types; `UthmanicHafs1Ver18` renders markers correctly.
- Truncated/title contexts (MarkModal, RubList): filter to `char_type_name === 'word'` to keep strings clean.
- `Verse` has no `qpc_uthmani_hafs` column — always reconstruct from words.
- Never pair `UthmanicHafs1Ver18` with `code_v1` — that column is for per-page glyph fonts only.
- `verseDisplayText` prop is optional — `MarkModal` falls back gracefully.

## Decisions Made

- `UthmanicHafs1Ver18` replaces `uthmanic.ttf` as the global font for all non-page Quranic text (ADR 0002, DECISIONS.md).
- Reconstruction from `lines` preferred over extra DB fetch or extending `WordWithVerse` with siblings.
