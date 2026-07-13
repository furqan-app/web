# Fix: Ayah Font Not Rendering in Search Results and Mark Modal

**Type:** bug  
**Date:** 2026-06-28 / revised 2026-07-01  
**Status:** implemented

## Font-Encoding Contract (final)

| Context | Font | Column |
|---|---|---|
| Quran page words | `quran-p{n}` (per-page glyph font) | `code_v1` |
| Search results verse text | `UthmanicHafs1Ver18` | `word.qpc_uthmani_hafs` (joined, filtered) |
| MarkModal word title | `UthmanicHafs1Ver18` | `word.text_uthmani` |
| MarkModal verse title | `UthmanicHafs1Ver18` | `verse.text_uthmani` |

## Three Bugs Fixed

**Bug 1 (2026-06-28):** `font-uthmanic` Tailwind class not registered — `tailwind.config.ts` had no `fontFamily` extension. Fixed by adding `uthmanic` and `surahnames` to `theme.extend.fontFamily`.

**Bug 2 (2026-06-28):** `MarkModal` word title used `markFor.qpc_uthmani_hafs` with `uthmanic.ttf` (no PUA glyphs). Fixed by switching to `markFor.text_uthmani`.

**Bug 3 (2026-07-01):** `verse.text_uthmani` contains U+06DE (۞ rub el hizb) which neither font can render — appeared as a circle in search results. Fixed by replacing `uthmanic.ttf` with `UthmanicHafs1Ver18` globally and joining `word.qpc_uthmani_hafs` filtered to `char_type_name === 'word'` for search verse text.

## Constraints

- Never use `verse.text_uthmani` directly in search results — join words instead.
- Never use `code_v1` outside the page route.
- `Verse` has no `qpc_uthmani_hafs` column — verse-level display must use `text_uthmani`.
- Always filter words to `char_type_name === 'word'` when joining for display.
