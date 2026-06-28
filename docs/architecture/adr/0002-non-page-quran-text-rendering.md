# ADR 0002: Encoding for Quran Text Rendered Outside the Page Route

**Date:** 2026-06-28
**Status:** Accepted

## Context

Quran words are stored in three encodings in the `words` table:

| Column | Encoding | Available on |
|---|---|---|
| `code_v1` | Glyph-mapped (font-specific, not Unicode) | `Word` only |
| `text_uthmani` | Standard Unicode Arabic | `Word`, `Verse` |
| `qpc_uthmani_hafs` | QPC platform encoding (PUA-mapped) | `Word` only |

The per-page fonts (`quran-p{n}`) are designed for `code_v1` and are only loaded on the Quran page route. Outside that route (search results, mark modal, verse previews), a different font must be used.

Two options were considered for non-page rendering:

**Option A — `qpc_uthmani_hafs` + a QPC-compatible font**
Load an additional font that can render QPC's Private Use Area mappings wherever Quran text appears outside the page.

**Option B — `text_uthmani` + `uthmanic.ttf`**
Use the standard Unicode column with the globally-loaded `uthmanic.ttf`, which is already available via `var(--uthmanic)`.

## Decision

Use **Option B**: `text_uthmani` column with `uthmanic.ttf` (`var(--uthmanic)` / `font-uthmanic`) for all non-page Quran text rendering.

## Consequences

- **+** No additional font assets to load — `uthmanic.ttf` is already global.
- **+** `text_uthmani` is available on both `Word` and `Verse`, making verse-level display straightforward.
- **+** Standard Unicode means the text is copy-pasteable and accessible.
- **-** Visual style differs from the page rendering (per-page fonts produce the Uthmani mushaf appearance; `uthmanic.ttf` is a separate typeface).
- **-** `qpc_uthmani_hafs` must never be used outside the page route — it requires a font that is not globally loaded.
