# QuranSafha Header — Surah Name Glyph Font

**Type:** feature  
**Date:** 2026-07-01  
**Status:** implemented

## Summary

The surah title in the `QuranSafha` page header currently renders a plain text string (`"سورة البقرة"`) assembled from `chapter.name_arabic` / `name_simple`. It should instead render the calligraphic glyph from `sura_names.ttf` (CSS var `--surah-names`), using the zero-padded chapter number as text content — exactly matching the pattern already used for surah headings inside `QuranLine.tsx`.

## Approach

1. Replace `surahName` (text string) with `surahGlyph` (zero-padded `chapter_number`).
2. Apply `fontFamily: "var(--surah-names)"` inline on the span, with `translate="no"` to prevent browser/OS translation of the numeric string.
3. Remove the now-unused `useLocale` import and `locale` variable (they were only used to select `name_arabic` vs `name_simple`).
4. Size: match the visual weight of the existing text — `fontSize: "1.1rem"` with `lineHeight: 1` is a reasonable starting point; can be tuned visually after implementation.

## Files to Change

- `app/components/QuranSafha.tsx`
  - Remove `import { useLocale } from "next-intl"` and `const locale = useLocale()`
  - Replace `const surahName = ...` with `const surahGlyph = \`${pageMetadata.chapter.chapter_number}\`.padStart(3, "0")`
  - Replace the `<span className="text-sm font-bold text-foreground">{surahName}</span>` with a span using `style={{ fontFamily: "var(--surah-names)", fontSize: "1.1rem", lineHeight: 1 }}` and `translate="no"`, rendering `{surahGlyph}`

## Constraints

- **Font encoding:** pass the zero-padded chapter number string (e.g. `"002"`), never Arabic name text — the font is a glyph map, not a text font. (DECISIONS.md → Font System → Font–Column Encoding Contract)
- **No new spacing:** do not add `vh`-derived or `px` vertical spacing; the header layout is unchanged (DECISIONS.md → Quran Safha Viewport Fit).
- **No hardcoded colors:** the glyph inherits `currentColor`; do not add a color class. Let the theme handle it.

## Decisions Made

- Font size set to `1.1rem` inline (not a Tailwind class) to avoid safelist concerns; the glyph font does not participate in the `FONT_V1` scale.
- `translate="no"` added to prevent any browser or OS translation layer misinterpreting the numeric string.
