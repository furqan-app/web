# ADR 0001: Font–Column Encoding Contract for Quran Text

**Date:** 2026-06-28  
**Status:** Accepted  
**Discovered during:** Bug investigation — ayah font not rendering in search results and mark modal

## Context

Quran text is stored in multiple columns in the `words` and `verses` tables, each using a different encoding:

| Column | Encoding | Available on |
|---|---|---|
| `code_v1` | Glyph-mapped codes (font-specific, not Unicode) | `Word` only |
| `text_uthmani` | Standard Unicode Arabic (U+0600–06FF + Pres Forms) | `Word`, `Verse` |
| `qpc_uthmani_hafs` | QPC platform encoding | `Word` only |

Two font families are loaded globally via `next/font/local` in `app/layout.tsx`:
- `--uthmanic` → `app/fonts/hafs/uthmanic/uthmanic.ttf`
- `--surah-names` → `app/fonts/surah/v1/sura_names.ttf`

Per-page fonts are loaded inline in `app/[locale]/pages/[id]/page.tsx`:
- `quran-p{n}` → `/fonts/v1/ttf/p{n}.ttf`

The bug: `uthmanic.ttf` was paired with `qpc_uthmani_hafs` in `MarkModal`, causing garbled/invisible text. Investigation confirmed `uthmanic.ttf` has zero Private Use Area glyphs — it is strictly a standard Unicode font and cannot render `qpc_uthmani_hafs` or `code_v1`.

## Decision

Every font–column pairing is fixed:

| Font | CSS Variable / Class | Column | Context |
|---|---|---|---|
| Per-page font `quran-p{n}` | `font-family: quran-p{n}` | `code_v1` | Quran page words only |
| `uthmanic.ttf` | `var(--uthmanic)` / `font-uthmanic` | `text_uthmani` | Search results, modals, any non-page display of ayah text |
| `sura_names.ttf` | `var(--surah-names)` / `font-surahnames` | `name_arabic` (chapter) | Surah name display |

## Consequences

- Never pair `uthmanic.ttf` with `qpc_uthmani_hafs` or `code_v1`.
- Never use per-page fonts outside the Quran page route.
- `Verse` has no `qpc_uthmani_hafs` column — verse-level text always uses `text_uthmani`.
- When displaying a word outside the page context (e.g. mark modal, search), use `word.text_uthmani`, not `word.qpc_uthmani_hafs` or `word.code_v1`.
- Tailwind utilities `font-uthmanic` and `font-surahnames` must be declared in `tailwind.config.ts`; the CSS variables alone are not enough for Tailwind class usage.
