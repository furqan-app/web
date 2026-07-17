# QuranSafha Header — Surah Name Glyph Font

**Type:** feature  
**Date:** 2026-07-01  
**Status:** implemented

## Summary

Replace the plain-text surah name in the `QuranSafha` header with the calligraphic glyph from `sura_names.ttf`, matching the pattern used in `QuranLine.tsx`.

## Changes — `app/components/QuranSafha.tsx`

- Remove `import { useLocale } from "next-intl"` and `const locale = useLocale()`.
- Replace `const surahName = ...` with `const surahGlyph = \`${pageMetadata.chapter.chapter_number}\`.padStart(3, "0")`.
- Replace text span with: `<span style={{ fontFamily: "var(--surah-names)", fontSize: "1.1rem", lineHeight: 1 }} translate="no">{surahGlyph}</span>`.

## Constraints

- Pass the zero-padded chapter number string (e.g. `"002"`), never Arabic name text — `sura_names.ttf` is a glyph map, not a text font (DECISIONS.md Font System).
- `translate="no"` prevents browser/OS translation of the numeric string.
- No new spacing — header layout is unchanged.
- No color class — glyph inherits `currentColor`.
