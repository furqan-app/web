# ADR 0078: Build-Time Static Quran Indexes Directly from QDC APIs Without MySQL

**Date:** 2026-11-15
**Status:** Accepted

## Context

`furqan_quran` (MySQL on port 3307, accessed via `quranPrisma`) was introduced to hold immutable Quran text, chapters, rubs, and per-edition word placements ([ADR 0008](./0008-quran-app-database-split.md), [ADR 0009](./0009-reproducible-quran-seeder.md), [ADR 0033](./0033-mushaf-edition-owns-word-placement.md)), while the reader, offline search, surah list, and reciter list progressively moved to committed static JSON under `public/quran/`. However, four active generators (`quran-json`, `quran-chapters`, `quran-search-index`, `quran-juz-starts`) still query `furqan_quran` MySQL instead of fetching directly from QDC, and several server routes/hooks (`get-rubs`, `resolve-units`, `/api/marks` enrichment, `/share/verse`, `/api/quran/verses/[verseKey]`, `/api/quran/verses/[verseKey]/stop-point`, `/api/quran/pages/[pageId]/bounds`, `/api/quran/juz/[juzNumber]/bounds`) still read from `quranPrisma`. Running a second MySQL instance adds operational overhead in local dev, CI, and Hostinger deployment, and prevents standalone services (such as the upcoming ASR alignment service in Epic #225) from consuming self-contained Quran data, while mobile PWA and Capacitor clients must not suffer any precache or memory increase and future multi-riwayah support (e.g. Warsh, Qaloon) must remain cleanly extensible.

## Options Considered

**Option A — Keep MySQL `furqan_quran` or ship SQLite alongside Next.js**
Keeps relational queries intact, but preserves multi-DB operational overhead (local containers, Hostinger connections, native bindings for SQLite) and prevents direct browser/PWA reuse of the same asset format.

**Option B — Unified DB-free QDC static JSON pipeline with server-only vs client-precached split**
Fetches once from QDC into memory, validates layouts and byte-parity, atomically emits all existing client assets plus four compact server/service JSON indexes (`page-bounds/{mushafId}.json`, `rubs.json`, `verses.json`, `words.json`), and keeps the new server indexes out of `globPublicPatterns` and `app/sw.ts` precache manifests.

## Decision

Adopt **Option B**:

1. **Unified DB-free generator pipeline:** Build `scripts/quran-static/generate.js` (invoked via `npm run generate:quran`, with optional `--only=<target>` and `--verify-existing` flags, and existing `scripts/quran-{json,chapters,search-index,juz-starts}/generate.js` delegating to it without `quranPrisma`). Port the QDC fetch, retry, `correctAudioUrl`, `validateLayout`, and derivation logic from `scripts/quran-seed/` (`chapters.js`, `verses-words.js`, `mushaf-layout.js`, `derive.js`) into self-contained helpers inside `scripts/quran-static/generate.js` in memory (so `scripts/quran-seed/` can be removed cleanly in `#751`) and write outputs atomically via two-phase temp staging, rename, and destination rollback only after full 604-page and 3-edition validation succeeds.
2. **Preserve existing outputs byte-identically and add 4 server/service indexes:**
   - Existing outputs kept byte-identical to current committed JSON: `chapters.json`, `juz-starts.json`, `search-index.json`, `pages/{mushafId}/{page}.json`, and `verse-pages/{mushafId}.json` (including deterministic `pageMetadata.id` offsets: mushaf `2` → `1..604`, mushaf `19` → `605..1208`, mushaf `1` → `1209..1812`).
   - `public/quran/page-bounds/{mushafId}.json` — per-edition map (`"1"`..`"604"`) of `{ firstVerseKey, lastVerseKey, lastChapterId, verses }` for mushaf IDs `1`, `2`, `19` (~97 KB/edition).
   - `public/quran/rubs.json` — array of all 240 rubs matching `RubWithVerses` (`id`, `rub_number`, integer `Verse.id` `verse_mapping_start`/`verse_mapping_end`, `verses_count`, `rubVerseMappings`, `startVerse: { verse_key, page_number, Word: [{ qpc_uthmani_hafs, char_type_name }] }`, `endVerse: { verse_key, chapter_id, page_number }`, ~367 KB).
   - `public/quran/verses.json` — object keyed by `verse_key` for all 6,236 verses: `{ id, verse_number, chapter_id, page_number, juz_number, hizb_number, rub_el_hizb_number, text_uthmani, words_uthmani_hafs }`.
   - `public/quran/words.json` — object keyed by word `location` (`"surah:ayah:pos"` for `char_type_name === "word"`) carrying `{ u: text_uthmani, h: qpc_uthmani_hafs }` for `/api/marks` word-mark enrichment and the Epic #225 ASR service.
3. **Zero client precache / mobile memory growth:** Keep `globPublicPatterns` in `next.config.mjs` and `app/sw.ts` precache rules untouched so `page-bounds/*.json`, `rubs.json`, `verses.json`, and `words.json` are never precached onto mobile PWA or Capacitor clients.
4. **Edition vs riwayah separation:** Maintain edition-scoped indexes by `{mushafId}` (`pages`, `verse-pages`, `page-bounds`) separately from riwayah-scoped content/divisions (`chapters`, `juz-starts`, `search-index`, `rubs`, `verses`, `words`, currently Hafs Kufi), and tag `MUSHAF_EDITIONS` entries with `riwayah` when app-side consumers adopt the cutover (#749/#750) so future riwayat (e.g. Warsh, Qaloon) slot in without breaking existing layouts.

## Consequences

- **+** Eliminates `furqan_quran` MySQL dependency from static asset generation and unblocks DB-free SSR/API cutovers (#749, #750) and final DB retirement (#751).
- **+** Single in-memory QDC fetch pass generates all indexes consistently and verifies byte-for-byte parity against committed outputs.
- **+** Zero increase in PWA / Capacitor storage or client memory usage (`words.json`, `verses.json`, `rubs.json`, `page-bounds/*.json` stay server/service-only).
- **+** Supplies clean standard Uthmani word text alongside `qpc_uthmani_hafs` in `words.json` for Epic #225 ASR alignment.
- **-** Full regeneration depends on QDC network availability (mitigated by per-page retries and atomic temp-file swaps after full validation).
- **-** Server memory will hold the parsed JSON indexes (~367 KB `rubs.json`, ~3.6 MB `verses.json`, ~4.4 MB `words.json`, ~97 KB/edition `page-bounds/*.json`, plus JS object overhead once parsed) when #749/#750 cut over (negligible for Node SSR, documented so future fields are kept slim).
