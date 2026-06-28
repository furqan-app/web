# Fix: Ayah Font Not Rendering in Search Results and Mark Modal

**Type:** bug  
**Date:** 2026-06-28  
**Status:** implemented

## Summary

Quran ayah text renders in the wrong font (system fallback) in search results and the mark modal. The root cause is two separate issues: a missing Tailwind fontFamily registration, and a wrong text column being passed to the mark modal title. The global Uthmanic font (`uthmanic.ttf`) is a standard Unicode Arabic font and must only be paired with the `text_uthmani` column.

## Font-Encoding Contract

| Context | Font | Column | Status |
|---|---|---|---|
| Quran page words | `quran-p{n}` (per-page glyph font) | `code_v1` | ✅ Working |
| Search results verse text | `uthmanic.ttf` (standard Unicode) | `text_uthmani` | ❌ Font not applied |
| MarkModal word title | `uthmanic.ttf` (standard Unicode) | `qpc_uthmani_hafs` | ❌ Wrong column |
| MarkModal verse title | `uthmanic.ttf` (standard Unicode) | `text_uthmani` | ✅ Correct column, font applied |

`uthmanic.ttf` covers U+0600–06FF (Arabic) and U+FB50–FDFD (Arabic Presentation Forms-A). It has zero Private Use Area glyphs, so `qpc_uthmani_hafs` and `code_v1` will not render correctly with it.

## Root Cause

### Bug 1 — SearchQueryResults: `font-uthmanic` Tailwind class undefined

`SearchQueryResults.tsx:59` uses `className="... font-uthmanic ..."` but `tailwind.config.ts` has no `fontFamily` extension. Tailwind generates no CSS for unknown utility classes → system font fallback. The text column (`verse.text_uthmani`) is already correct.

### Bug 2 — MarkModal: wrong text column for words

`MarkModal.tsx:38–41` (`getTitle`) returns `markFor.qpc_uthmani_hafs` when `markFor` is a `Word`. The `uthmanic.ttf` font cannot render QPC-encoded text. The font itself IS applied (`var(--uthmanic)` is set on `<body>` via `app/layout.tsx`) — the issue is purely the column. The verse branch already correctly uses `text_uthmani`.

## Files to Change

- `tailwind.config.ts` — Add `fontFamily` extension under `theme.extend`:
  ```ts
  fontFamily: {
    uthmanic: ['var(--uthmanic)'],
    surahnames: ['var(--surah-names)'],
  }
  ```
  This makes `font-uthmanic` and `font-surahnames` valid Tailwind utility classes.

- `app/components/MarkModal.tsx` — In `getTitle`, change:
  ```ts
  // Before
  return markFor.qpc_uthmani_hafs;
  // After
  return markFor.text_uthmani;
  ```
  `WordWithVerse` has both columns; `text_uthmani` is the correct one for `uthmanic.ttf`.

## Constraints

- Do not use `qpc_uthmani_hafs` or `code_v1` with `uthmanic.ttf`.
- Do not use `text_uthmani` with per-page fonts — they use `code_v1`.
- `Verse` model has no `qpc_uthmani_hafs` column, only `text_uthmani` — this is correct.
- The search API (`/api/search/verses`) already selects `text_uthmani` on verses; no API change needed.

## Decisions Made

- `uthmanic.ttf` is confirmed as a standard Unicode Arabic font (covers Arabic U+0600–06FF and Pres Forms-A; no PUA). Always pair it with `text_uthmani`.
- Tailwind font utilities (`font-uthmanic`, `font-surahnames`) must be declared in `tailwind.config.ts` as `var(--uthmanic)` / `var(--surah-names)` — the CSS variables set by `next/font/local` in `app/layout.tsx`.
- Font–column encoding contract formalized in `docs/architecture/adr/0001-font-encoding-contract.md` and `DECISIONS.md`.

## What NOT to Do

- Do not change the search API or add new DB columns.
- Do not touch the per-page font system (`code_v1`, `quran-p{n}`).
- Do not add `font-surahnames` to tailwind without also keeping existing inline `style={{ fontFamily: "var(--surah-names)" }}` usages — both approaches are valid once the Tailwind class exists.
