# Fix: Verse Rendering Outside the Quran Page

**Type:** bug  
**Date:** 2026-07-01  
**Status:** implemented

## Summary

Quran verse text displayed outside the Quran page route (search results, MarkModal) rendered incorrectly in two ways: the wrong font was used (`uthmanic.ttf` which lacks full glyph coverage), and `verse.text_uthmani` was used directly, which contains rub el hizb markers (۞ U+06DE) the font cannot render — producing a visible circle character. Both contexts were fixed.

## Root Cause

`verse.text_uthmani` is a verbatim DB column that includes Quranic section markers (rub el hizb ۞, sajdah, etc.) not covered by `uthmanic.ttf`. Additionally, `uthmanic.ttf` is a standard Unicode Arabic font not optimised for Quranic rendering — replaced with `UthmanicHafs1Ver18` (the same font used by quran.com).

## Fixes Applied

### 1. Global font swap (`app/layout.tsx`)

Replaced `uthmanic.ttf` with `UthmanicHafs1Ver18.woff2/.ttf` under the same `--uthmanic` CSS variable and `font-uthmanic` Tailwind class. The old font file was deleted.

### 2. Search results — `app/components/search/SearchQueryResults.tsx`

Replaced `{verse.text_uthmani}` with words joined from `verse.Word`:

```tsx
{verse.Word
  .filter(w => w.char_type_name === 'word')
  .map(w => w.qpc_uthmani_hafs)
  .join(' ')}
```

Also added `dir="rtl"` to the verse text container.

Supporting changes:
- **`app/api/search/verses/route.ts`** — added `Word: { select: { qpc_uthmani_hafs, char_type_name }, orderBy: { position } }` to the Prisma query
- **`app/types/index.ts`** — added `Word: { qpc_uthmani_hafs, char_type_name }[]` to `VerseResult`

### 3. MarkModal verse title — `app/components/MarkModal.tsx` + `app/components/QuranSafha.tsx`

When a user taps an end-of-verse marker, `QuranSafha` reconstructs the verse display text from the `lines` data already in memory (no additional fetch):

```ts
const allWords = Object.values(lines).flat();
const displayText = allWords
  .filter(w => w.verse_key === word.verse_key && w.char_type_name === 'word')
  .map(w => w.qpc_uthmani_hafs)
  .join(' ');
```

This is passed as `verseDisplayText?: string` to `MarkModal`, which uses it in `getTitle` with fallback to `verse.text_uthmani`.

Also fixed `MarkModal` word title: changed from `markFor.text_uthmani` to `markFor.qpc_uthmani_hafs` for `Word` entries.

### 4. Rub list start verse — `app/components/RubList.tsx`

Replace `rub.startVerse.text_uthmani` (line 41) with word-join reconstruction:

```tsx
{rub.startVerse.Word
  .filter(w => w.char_type_name === 'word')
  .map(w => w.qpc_uthmani_hafs)
  .join(' ')}
```

Supporting changes:
- **`app/types/prisma.ts`** — add `Word: { select: { qpc_uthmani_hafs, char_type_name } }` to `startVerse` in `RubWithVerses`
- **`app/hooks/get-rubs.ts`** — add the same `Word` select to `startVerse` in the Prisma query
- Only extend `startVerse` — `endVerse` is not rendered in the UI, leave it unchanged

## Constraints

- Never use `verse.text_uthmani` directly in rendered output — always join `word.qpc_uthmani_hafs`.
- For full verse display (search results): do **not** filter by `char_type_name` — include all word types; `UthmanicHafs1Ver18` renders markers (۞, end markers) correctly.
- For truncated/title contexts (MarkModal): filter to `char_type_name === 'word'` to keep the short string clean.
- Never pair `UthmanicHafs1Ver18` with `code_v1` — that column is for per-page glyph fonts only.
- `Verse` has no `qpc_uthmani_hafs` column — verse text must always be reconstructed from its words.
- Reconstruction from `lines` (already in memory) is preferred over DB fetch or extending `WordWithVerse` to include sibling words.
- Always filter `char_type_name === 'word'` — exclude `"end"`, `"rub-el-hizb"`, and other marker types.
- The `verseDisplayText` prop is optional so `MarkModal` remains usable without it (graceful fallback to `text_uthmani`).

## Decisions Made

- `UthmanicHafs1Ver18` replaces `uthmanic.ttf` as the global font for all non-page Quranic text. Documented in ADR 0002 and DECISIONS.md.
- Word-level `qpc_uthmani_hafs` is the correct column for `UthmanicHafs1Ver18`. `text_uthmani` is fallback-only for verse-level contexts where words are unavailable.
- `verseDisplayText` prop on `MarkModal` keeps reconstruction logic in `QuranSafha` where `lines` is available, keeping `MarkModal` a pure display component.
