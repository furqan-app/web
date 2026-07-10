# System-wide Eastern Arabic Numerals for ar Locale

**Type:** feature  
**Date:** 2026-07-08  
**Status:** implemented  
**Trello:** https://trello.com/c/RIhNMoYj/61-system-wide-eastern-arabic-numerals-for-ar-locale

## Summary

`toLocaleNumeral(n, locale)` already exists in `app/utils/i18n.ts` and is applied in `RubList.tsx`. This task rolls it out to every other component that renders a user-visible number in the ar locale: page number, juz/hizb indicators, surah number, verse count, search result counts, verse-in-surah number, offline cache progress, and font scale display.

## Approach

Call `toLocaleNumeral(n, locale)` everywhere a number is displayed to the user when `locale === 'ar'`. Two components (`QuranSafha`, `QuranFontScaleControls`) don't currently have `locale` available and need `useLocale()` added. One site (`verse_key.split(':')[1]`) yields a string and needs `Number()` conversion before passing to the utility.

## Files to Change

| File | Numbers to convert | Locale already available? |
|---|---|---|
| `app/components/QuranSafha.tsx` | `pageMetadata.juz_number`, `pageMetadata.hizb_number`, `page` (footer) | No — add `useLocale()` |
| `app/components/SurahListItem.tsx` | `surah.id` (circle badge), `surah.verses_count` | Yes |
| `app/components/search/SearchQueryResults.tsx` | `chapters.length`, `verses.length`, `verse.verse_key.split(':')[1]` | Yes |
| `app/components/SettingsSidebar.tsx` | `cached`, `total` (offline progress text) | Yes |
| `app/components/QuranFontScaleControls.tsx` | `quranFontScale` (1–10 input value) | No — add `useLocale()` |

## Decision Tree

For every number displayed to the user:
- If `locale === 'ar'` → render Eastern Arabic digits (٠١٢٣٤٥٦٧٨٩) via `toLocaleNumeral`
- If `locale !== 'ar'` → render as-is (the utility is a no-op for non-ar locales)

## Concrete Changes

### QuranSafha.tsx
- Add `import { useLocale } from 'next-intl'`
- Add `const locale = useLocale()` inside the component
- Change:
  ```ts
  const juz = `${t("juz", "الجزء")} ${pageMetadata.juz_number}`;
  const hizb = pageMetadata.hizb_position
    ? `${t(pageMetadata.hizb_position, hizbDefaults[...])} ${pageMetadata.hizb_number}`
    : null;
  ```
  To use `toLocaleNumeral(pageMetadata.juz_number, locale)` and `toLocaleNumeral(pageMetadata.hizb_number, locale)`
- Change footer `{page}` to `{toLocaleNumeral(page, locale)}`
- Add `import { toLocaleNumeral } from '@utils/i18n'`

### SurahListItem.tsx
- Change `{surah.id}` → `{toLocaleNumeral(surah.id, locale)}`
- Change `{surah.verses_count}` → `{toLocaleNumeral(surah.verses_count, locale)}`
- Add `import { toLocaleNumeral } from '@utils/i18n'`

### SearchQueryResults.tsx
- Change `({chapters.length})` → `({toLocaleNumeral(chapters.length, locale)})`
- Change `({verses.length})` → `({toLocaleNumeral(verses.length, locale)})`
- Change `verse.verse_key.split(':')[1]` → `toLocaleNumeral(Number(verse.verse_key.split(':')[1]), locale)`
- Add `import { toLocaleNumeral } from '@utils/i18n'`

### SettingsSidebar.tsx
- Change `.replace("{cached}", String(cached)).replace("{total}", String(total))`
  to `.replace("{cached}", toLocaleNumeral(cached, locale)).replace("{total}", toLocaleNumeral(total, locale))`
- Add `import { toLocaleNumeral } from '@utils/i18n'`

### QuranFontScaleControls.tsx
- Add `import { useLocale } from 'next-intl'`
- Add `import { toLocaleNumeral } from '@utils/i18n'`
- Add `const locale = useLocale()` inside the component
- Change `value={quranFontScale}` → `value={toLocaleNumeral(quranFontScale, locale)}`

## Constraints

- Only `toLocaleNumeral` — no other numeral conversion approach.
- Scope is user-visible numbers only: excludes internal IDs in URLs, API payloads, data attributes, and font glyph codes (the zero-padded surah number passed to `sura_names.ttf` is a font encoding, not a displayed numeral — leave it as-is).
- `surahGlyph` in `QuranSafha` (e.g. `"001"`) is passed to the `sura_names.ttf` font — must NOT be converted (it is a font glyph code, not a displayed digit).

## What NOT to Do

- Do not apply `toLocaleNumeral` to font glyph codes (`surahGlyph`, `glyphCode`) — those are passed to `sura_names.ttf` as encoding keys, not rendered as numerals.
- Do not apply to URL segments, data attributes, or API parameters.
- Do not introduce a new numeral utility — `toLocaleNumeral` in `app/utils/i18n.ts` is the canonical one.
- Do not convert numbers used only in logic/computation (e.g. `surah.pages.split('-')[0]` used as a URL segment).

## Decisions Made

- Font scale display (1–10) in `QuranFontScaleControls` is in scope, as the Trello card explicitly lists "font scale display".
