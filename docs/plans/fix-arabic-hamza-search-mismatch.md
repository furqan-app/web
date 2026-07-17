# Fix: Hamza-Alif Mismatch in Verse Search

**Type:** bug  
**Date:** 2026-07-02  
**Status:** implemented

## Root Cause

`Verse.text_imlaei_simple` is hamza-free (only bare `ا`, never `أ`/`إ`/`آ` — confirmed via direct DB query). A query typed with hamza-alif can never match. Chapter search (`name_arabic` genuinely contains hamza forms) is accepted as-is — see [ADR 0007](../architecture/adr/0007-arabic-search-query-normalization.md).

## Fix

- `app/utils/arabic-search.ts` (new) — `normalizeArabicQuery(query: string)`: replaces `أ`/`إ`/`آ` with `ا`. No diacritic/tatweel stripping (not needed — `text_imlaei_simple` has none).
- `app/api/search/verses/route.ts` — normalize query before Prisma `contains` filter.

## Constraints

- Do not touch `app/api/search/chapters/route.ts` — normalization doesn't apply to `name_arabic`.
- Do not normalize standalone `ء` — only hamza-on-alif forms.
- Keep normalization in a shared util for future reuse.
