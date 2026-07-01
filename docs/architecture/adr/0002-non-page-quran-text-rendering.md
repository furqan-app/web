# ADR 0002: Encoding for Quran Text Rendered Outside the Page Route

**Date:** 2026-06-28  
**Revised:** 2026-07-01  
**Status:** Accepted (revised)

## Context

Quran words are stored in three encodings in the `words` table:

| Column | Encoding | Available on |
|---|---|---|
| `code_v1` | Glyph-mapped (font-specific, not Unicode) | `Word` only |
| `text_uthmani` | Standard Unicode Arabic | `Word`, `Verse` |
| `qpc_uthmani_hafs` | QPC Hafs encoding (PUA-mapped) | `Word` only |

The per-page fonts (`quran-p{n}`) are designed for `code_v1` and are only loaded on the Quran page route. Outside that route (search results, mark modal, verse previews), a different font must be used.

Two options were considered for non-page rendering:

**Option A — `qpc_uthmani_hafs` + `UthmanicHafs1Ver18`**  
Load the QPC Hafs font globally and use the `qpc_uthmani_hafs` column for word-level display. The font also supports standard Unicode Arabic, so `text_uthmani` can be used where `qpc_uthmani_hafs` is unavailable (i.e. at the `Verse` level).

**Option B — `text_uthmani` + `uthmanic.ttf`**  
Use a generic Unicode Arabic font with the standard Unicode column.

## Decision

Use **Option A**: `qpc_uthmani_hafs` + `UthmanicHafs1Ver18` for word-level display; fall back to `text_uthmani` only when working at the `Verse` level (which has no `qpc_uthmani_hafs` column).

**Revised from original Option B** after discovering that `verse.text_uthmani` contains rub el hizb markers (۞ U+06DE) that `uthmanic.ttf` could not render, causing a visible circle character in search results. `UthmanicHafs1Ver18` (the same font used by quran.com) handles this correctly.

## Consequences

- **+** `UthmanicHafs1Ver18` renders Quranic glyphs with the same quality as the reference quran.com implementation.
- **+** Word-level `qpc_uthmani_hafs` joined with `filter(char_type_name === 'word')` avoids rub el hizb markers entirely.
- **+** `UthmanicHafs1Ver18` also supports standard Unicode Arabic, so `text_uthmani` still works for verse-level fallback.
- **-** `Verse`-level display still uses `text_uthmani` and may show ۞ markers in edge cases — prefer joining words wherever possible.
- **-** `qpc_uthmani_hafs` is only available on `Word`, not `Verse` — verse text in search must be reconstructed by joining words.

## Affected Surfaces (all must follow this rule)

Any component that renders Quran text outside the page route must reconstruct from words. Known surfaces:

| Surface | File | Status |
|---|---|---|
| Search results verse | `app/components/search/SearchQueryResults.tsx` | Fixed 2026-07-01 |
| MarkModal word title | `app/components/MarkModal.tsx` | Fixed 2026-07-01 |
| MarkModal verse title | `app/components/QuranSafha.tsx` (reconstruction) | Fixed 2026-07-01 |
| Rub list start verse | `app/components/RubList.tsx` | Fixed 2026-07-01 |
