# System-wide Eastern Arabic Numerals for ar Locale

**Type:** feature  
**Date:** 2026-07-08  
**Status:** implemented  
**Trello:** https://trello.com/c/RIhNMoYj/61-system-wide-eastern-arabic-numerals-for-ar-locale

## Summary

Roll out `toLocaleNumeral(n, locale)` (already in `app/utils/i18n.ts`, used in `RubList.tsx`) to every component rendering user-visible numbers in the ar locale: page number, juz/hizb indicators, surah number, verse count, search result counts, verse-in-surah number, offline cache progress, font scale display.

## Changes Per File

| File | Numbers converted | `locale` source |
|---|---|---|
| `app/components/QuranSafha.tsx` | `pageMetadata.juz_number`, `hizb_number`, `page` (footer) | add `useLocale()` |
| `app/components/SurahListItem.tsx` | `surah.id`, `surah.verses_count` | already available |
| `app/components/search/SearchQueryResults.tsx` | `chapters.length`, `verses.length`, `Number(verse_key.split(':')[1])` | already available |
| `app/components/SettingsSidebar.tsx` | `cached`, `total` in progress text | already available |
| `app/components/QuranFontScaleControls.tsx` | `quranFontScale` | add `useLocale()` |

`SettingsSidebar` replaces `.replace("{cached}", String(cached))` with `.replace("{cached}", toLocaleNumeral(cached, locale))` (same for `total`).

## Constraints

- Only `toLocaleNumeral` — no other conversion approach.
- User-visible numbers only. Exclude: URL segments, API payloads, data attributes, font glyph codes.
- `surahGlyph` (e.g. `"001"`) passed to `sura_names.ttf` must NOT be converted — it is a font encoding key, not a displayed numeral.
- Do not apply to numbers used only in logic/computation.
