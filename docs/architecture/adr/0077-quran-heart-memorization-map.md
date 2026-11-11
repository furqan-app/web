# ADR 0077: Quran Heart Memorization Map & Surah-Page Independence

**Date:** 2026-11-04  
**Status:** Accepted

## Context

The Quranic Heart Map ("خريطة الصدر القرآني") in `/plans` provides an interactive 114-surah visual map of a user's memorization state. Multiple surahs frequently share a physical mushaf page, particularly in Juz 30 (e.g., page 604 contains Surahs 112, 113, and 114). A user may memorize one of these surahs without having memorized the others. Furthermore, allowing both surah-level status settings and individual page selections creates synchronization drift if surah status is stored separately from its page data.

## Options Considered

**Option A — Global physical page records (`page_number` 1–604 only)**  
Stores memorization solely as physical mushaf page numbers, but causes bleed across surahs sharing a page (marking Al-Ikhlas automatically marks Al-Falaq and An-Nas).

**Option B — Surah-scoped page records with read-time pure derivation**  
Stores memorization rows scoped by `[user_id, chapter_id, page_number]` in `furqan_app`. Surah status (`mastered`, `needs_review`, `partial`, `unmemorized`) and cell liquid fill percentages are 100% derived from constituent page records at read time.

**Option C — Dual storage of surah status and page selections**  
Stores both a surah-level status column and a page list, but creates state divergence when individual pages are toggled.

## Decision

Adopt Option B — Surah-scoped page records in `furqan_app` with read-time pure derivation of surah status and cell liquid fill levels.

## Consequences

- **+** Accurate per-surah independence: marking a surah on a shared page does not affect neighbouring surahs.
- **+** Single source of truth: surah state, liquid fill percentage, and retention metrics are purely derived from page records, eliminating synchronization discrepancies.
- **+** Preserves the two-database split (ADR 0008): scalar `chapter_id` and `page_number` references only, with no cross-domain foreign keys.
- **-** Maximum of ~1,000 potential rows per user across all surah-page segments, easily handled by composite index `[user_id, chapter_id]`.
- **-** Online-first in v1: writes require an authenticated session in `furqan_app`, with offline local-first sync deferred to future plans offline work.
