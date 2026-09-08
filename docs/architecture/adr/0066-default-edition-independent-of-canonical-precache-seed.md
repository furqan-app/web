# ADR 0066: The reader's default edition is independent of the canonical, precached, and seeded-words editions

**Date:** 2026-09-07
**Status:** Accepted

## Context

[ADR 0033](./0033-mushaf-edition-owns-word-placement.md) established that a mushaf edition owns its complete word placement, but the seeder, mark canonicalization, and the offline precache were all written when exactly one non-tajweed edition existed and that one id served four roles at once: the edition the reader opens with, the edition `scripts/quran-seed/verses-words.js` fetches (so the only one the `layoutFromSeededWords` shortcut is valid for), the edition `Mark.page_number` is canonicalized against, and the edition [ADR 0014](./0014-pwa-offline-architecture.md)'s consent-gated first-run download caches. Promoting a second, heavier edition (QCF V2, ~95 MB of fonts vs V1's ~47 MB) to the reader default without a destructive `Word` reseed, a mark migration, or inflating the first-run offline budget requires separating those roles. QCF V2 does **not** share QCF V1's page boundaries — it diverges on the same 56 verses / 361 words the tajweed edition already does (`decisions/rendering.md`), so "the boundaries happen to match" is not available as a shortcut.

## Options Considered

**Option A — Move every role to the new default**
Reseed the `Word.page_number`/`Word.line_number` mirror from the new edition, re-canonicalize existing `Mark.page_number`, and point the first-run precache at the new (~97 MB) font set.

**Option B — `DEFAULT_MUSHAF_ID` is a render-time choice only**
Each other role pins to its own named constant; promoting an edition to default touches only `DEFAULT_MUSHAF_ID` plus the additive font/registry/seed work for the new edition.

## Decision

Option B. `DEFAULT_MUSHAF_ID` governs only which edition the reader opens with and which edition edition-blind call sites fall back to. Three roles get their own constants, all currently still `2`:

- **`SEEDED_WORDS_MUSHAF_ID`** (`scripts/quran-seed/mushaf-layout.js`) — the edition `verses-words.js` fetches. `layoutFromSeededWords` is valid for this id and no other; every other layout edition goes through `fetchMushafLayout`.
- **`CANONICAL_PAGE_MUSHAF_ID`** (`app/utils/mushaf-editions.ts`) — the edition every *stored* page number means: plan verse-unit ranges (ADR 0038, `usePlanVerseIndex` / `usePageVerseBounds`) and the `Word.page_number` mark mirror. `Mark.page_number` canonicalization also resolves against this edition (via the per-word `Word.page_number` carried in the static JSON, not a direct constant read).
- **`PRECACHE_MUSHAF_ID`** (`app/constants/offline.ts`) — the edition the first-run gate, the post-install prompt, `OFFLINE_DOWNLOAD_MB`, and the SW reader-HTML-miss probe fall back to.

Marks survive the default moving to a divergent edition because canonicalization never depends on the displayed page: the static page JSON carries each word's `Word.page_number` (the `SEEDED_WORDS_MUSHAF_ID` mirror) as a field separate from the active edition's composition, so `MarkModal` stores `Mark.page_number` against the canonical edition no matter what is on screen, and `useMarks` reads by `marked_id`. The tajweed edition already ships exactly this: `public/quran/pages/19/120.json` lists words with `page_number` both 120 and 121 (their canonical mushaf-2 pages) on one tajweed page, and marks work. QCF V2 is structurally identical. `Word.line_number` needs no thought — no application code reads it (the layout table's line is the only line consumed).

## Consequences

- **+** Promoting an edition to default is a one-constant change plus additive font/registry/seed work — no `Word` reseed, no `Mark` migration, no change to the first-run offline budget or its iOS-quota headroom.
- **+** The seeded-words shortcut is now tied to the thing that actually makes it valid (the fetch param), not to an unrelated id that happened to match.
- **−** "Default edition" and "offline default edition" diverge: a new PWA user's first-run download caches V1; reading V2 offline needs an explicit ~95 MB download from the Settings "Mushaf Layout" list. Surfaced in the gate and Settings copy.
- **−** The reader's footer page number shifts by one on the ~36 pages where the editions disagree when switching between V1 and V2 — correct for two different books, and identical to the existing V1↔tajweed behaviour, but a visible change for a user who switches.
- **−** Four ids that are equal today can silently drift. Each constant carries a comment naming what pins it; `SEEDED_WORDS_MUSHAF_ID` must equal `verses-words.js`'s `mushaf` param, held in lock-step by both files importing the one constant.
- **−** The "no `Mark` migration" property depends on `Word.page_number` staying the `SEEDED_WORDS_MUSHAF_ID` mirror. Moving the canonical mark edition itself (not just the reader default) still requires migrating every stored `Mark.page_number`.
