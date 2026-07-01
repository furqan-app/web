# Fix: Ayah Font Not Rendering in Search Results and Mark Modal

**Type:** bug  
**Date:** 2026-06-28  
**Revised:** 2026-07-01  
**Status:** implemented (revised)

## Summary

Quran ayah text renders incorrectly in search results. Two separate issues were found and fixed across two sessions.

## Font-Encoding Contract (final)

| Context | Font | Column | Status |
|---|---|---|---|
| Quran page words | `quran-p{n}` (per-page glyph font) | `code_v1` | ✅ Working |
| Search results verse text | `UthmanicHafs1Ver18` | `word.qpc_uthmani_hafs` (joined, filtered) | ✅ Fixed |
| MarkModal word title | `UthmanicHafs1Ver18` | `word.text_uthmani` | ✅ Fixed |
| MarkModal verse title | `UthmanicHafs1Ver18` | `verse.text_uthmani` | ✅ Working |

## Root Causes

### Bug 1 (2026-06-28) — `font-uthmanic` Tailwind class not registered

`tailwind.config.ts` had no `fontFamily` extension → Tailwind emitted no CSS for `font-uthmanic` → system font fallback. Fixed by adding `uthmanic` and `surahnames` to `theme.extend.fontFamily`.

### Bug 2 (2026-06-28) — MarkModal word title used wrong column

`MarkModal.tsx` `getTitle` returned `markFor.qpc_uthmani_hafs` for words. The then-global font (`uthmanic.ttf`) had no PUA glyphs. Fixed by switching to `markFor.text_uthmani`.

### Bug 3 (2026-07-01) — Rub el hizb marker (۞) in `verse.text_uthmani`

`verse.text_uthmani` contains U+06DE (۞ rub el hizb) which neither `uthmanic.ttf` nor `UthmanicHafs1Ver18` can render as a glyph — it appeared as a circle in search results. Fixed by:
1. Replacing `uthmanic.ttf` with `UthmanicHafs1Ver18` (same font as quran.com).
2. Rendering search verse text by joining `word.qpc_uthmani_hafs` filtered to `char_type_name === 'word'` instead of `verse.text_uthmani`.
3. Fetching `Word` relation in the verse search API.

## Constraints

- Never use `verse.text_uthmani` directly in search results — join words instead.
- Never use `code_v1` outside the page route.
- `Verse` has no `qpc_uthmani_hafs` column — verse-level display must use `text_uthmani`.
- Always filter words to `char_type_name === 'word'` when joining for display.
