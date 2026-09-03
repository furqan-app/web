---
title: "Tafsir: Direct QDC Client Provider & Query Hook"
type: feature
date: 2026-08-29
status: implemented
area: tafsir
---

# Tafsir: Direct QDC Client Provider & Query Hook

## Summary

Implement a client-side data provider, static metadata catalog, text formatter / AST segment parser, and TanStack React Query hook (`useTafsir`) to fetch Quranic commentaries directly from the Quran.com QDC API (`https://api.qurancdn.com/api/qdc/tafsirs/...`). Features direct client-side fetching with zero Next.js server proxy overhead, robust quote normalization to `﴿...﴾` styled with `font-uthmanic`, and comprehensive Vitest unit test coverage. Part of Epic #457.

## Root Cause / Approach

Commentary (Tafsir) text is provided externally via the QDC API with open CORS headers (`access-control-allow-origin: *`). Rather than proxying large payloads through Next.js server route handlers or bloating the MySQL database, the client fetches commentaries directly.

The implementation comprises five decoupled modules:
1. **Domain Types (`app/types/tafsir.ts`)**: Models for `TafsirEdition`, `VerseTafsir`, `TafsirSegmentType` (`"text" | "quran" | "reference"`), and `TafsirSegment`.
2. **Edition Catalog (`app/constants/tafsir.ts`)**: Static metadata and author information for 6 major Arabic tafsirs (Al-Muyassar, Al-Sa'di, Ibn Kathir, Al-Baghawi, Al-Tabari, Al-Qurtubi) with `DEFAULT_TAFSIR_ID = 16`.
3. **Provider Layer (`app/lib/tafsir/provider.ts` & `app/lib/tafsir/qdc-provider.ts`)**: `TafsirProvider` interface, custom `TafsirProviderError` with status codes, and `qdcTafsirProvider` implementation with `AbortSignal` support.
4. **Text Formatter & AST Parser (`app/utils/tafsir-formatter.ts`)**: Isomorphic parser extracting Quran quotes from diverse QDC markup variants into `﴿...﴾` segments (`TafsirSegment[]`), plus a safe HTML formatter (`formatTafsirHtml`).
5. **React Query Hook (`app/hooks/use-tafsir.ts`)**: Hook accepting options object `{ tafsirId, verseKey, enabled }` with 24h `staleTime`, 1h `gcTime`, and query key `["tafsir", tafsirId, normalizedVerseKey]`.

## Decision Tree / Algorithm

### Verse Key Normalization
Input string is trimmed and normalized to `${chapter}:${verse}` without leading zeros (e.g. `"002:005"` $\rightarrow$ `"2:5"`). Invalid keys or out-of-range bounds (surah > 114, ayah > 286) return `null`.

### Tafsir Text Normalization & AST Classification

| Source Pattern in QDC HTML | Example Input | Extracted Segment `type` | Normalized Output Text |
|---|---|---|---|
| `<span class="...arabic qpc-hafs...">{...}</span>` | `<span class="arabic qpc-hafs brown">{ بِسْمِ اللَّهِ }</span>` | `quran` | `﴿بِسْمِ اللَّهِ﴾` |
| `<span class="green">(...)</span>` | `<span class="green">(الرَّحْمَنِ)</span>` | `quran` | `﴿الرَّحْمَنِ﴾` |
| `<span class="...arabic qpc-hafs...">(...)</span>` | `<span class="arabic qpc-hafs">( قل هو الله أحد )</span>` | `quran` | `﴿قل هو الله أحد﴾` |
| `<span class="...arabic qpc-hafs...">"..."</span>` | `<span class="arabic qpc-hafs">" اقرأ باسم ربك "</span>` | `quran` | `﴿اقرأ باسم ربك﴾` |
| `<span class="reference">...</span>` | `<span class="reference">[ سورة البقرة : 146 ]</span>` or `[ ص: 132 ]` | `reference` | `[ سورة البقرة : 146 ]` |
| Narrator / Sanad (`blue`) | `<span class="blue">عن أنس قال :</span>` | `text` | Cleaned prose text |
| Hadith / Quote (`red`) | `<span class="red">"نعم"</span>` | `text` | Cleaned prose text |
| Standard paragraph & prose | `<p lang="ar" class="ar ">أي: أبتدئ...</p>` | `text` | Cleaned prose text |
| Null or empty string | `null` / `""` | `[]` | Safe empty array |

## Verified Test Cases

1. **Al-Muyassar (1:1)**:
   - Input: `أبتدئ قراءة القرآن باسم الله مستعينا به، <span class="green">(اللهِ)</span> علم على الرب...`
   - Output: `[{ type: "text", text: "أبتدئ قراءة القرآن باسم الله مستعينا به، " }, { type: "quran", text: "﴿اللهِ﴾" }, { type: "text", text: " علم على الرب..." }]`
2. **Al-Sa'di (1:1)**:
   - Input: `<span class="arabic qpc-hafs brown">{ بِسْمِ اللَّهِ }</span> أي: أبتدئ بكل اسم لله تعالى...`
   - Output: `[{ type: "quran", text: "﴿بِسْمِ اللَّهِ﴾" }, { type: "text", text: " أي: أبتدئ بكل اسم لله تعالى..." }]`
3. **Ibn Kathir (112:1)**:
   - Input: `<span class="blue">عن أنس قال :</span> نزل جبريل... <span class="arabic qpc-hafs">( قل هو الله أحد )</span> يعني : هو الواحد الأحد...`
   - Output: `[{ type: "text", text: "عن أنس قال : نزل جبريل... " }, { type: "quran", text: "﴿قل هو الله أحد﴾" }, { type: "text", text: " يعني : هو الواحد الأحد..." }]`
4. **Al-Tabari Reference (1:1)**:
   - Input: `قوله تعالى <span class="arabic qpc-hafs green">( كما يعرفون أبناءهم )</span> <span class="reference">[ سورة البقرة : 146 ]</span>`
   - Output: `[{ type: "text", text: "قوله تعالى " }, { type: "quran", text: "﴿كما يعرفون أبناءهم﴾" }, { type: "reference", text: "[ سورة البقرة : 146 ]" }]`
5. **Zero-padded Verse Key**:
   - Input: `normalizeVerseKey("002:004")` $\rightarrow$ `"2:4"`.
6. **Null / Empty Input**:
   - Input: `parseTafsirSegments(null)` $\rightarrow$ `[]`.

## Files to Change

- `app/types/tafsir.ts` — [NEW] Domain types for `TafsirEdition`, `VerseTafsir`, `TafsirSegment`, `TafsirSegmentType`
- `app/constants/tafsir.ts` — [NEW] Static catalog of supported Arabic tafsirs with IDs, slugs, and authors
- `app/lib/tafsir/provider.ts` — [NEW] `TafsirProvider` interface & `TafsirProviderError` class
- `app/lib/tafsir/qdc-provider.ts` — [NEW] Client-side QDC fetcher for editions and verse commentaries
- `app/lib/tafsir/qdc-provider.test.ts` — [NEW] Vitest unit tests for provider error handling, HTTP responses, and data mapping
- `app/utils/tafsir-formatter.ts` — [NEW] Isomorphic AST segment parser, verse key normalizer, and HTML sanitizer
- `app/utils/tafsir-formatter.test.ts` — [NEW] Vitest unit tests for text normalization across all 6 tafsir formats
- `app/hooks/use-tafsir.ts` — [NEW] TanStack React Query hook with cache management
- `app/hooks/use-tafsir.test.ts` — [NEW] Vitest unit tests for hook query keys, options, and error states
- `docs/architecture/adr/0048-client-side-qdc-tafsir-provider.md` — [NEW] Architectural decision record
- `docs/architecture/DECISIONS.md` — [MODIFY] Document Tafsir provider and quote normalization decision

## Constraints

- Do not create Next.js API server proxy routes when QDC supports CORS.
- Isomorphic execution: parser must execute safely in both Node.js (Vitest / SSR) and browser environments.
- All extracted Quran quotes must use authentic brackets `﴿...﴾` and render with `font-uthmanic` (ADR 0002).
- Formatter must never throw on `null` or empty commentary texts.

## What NOT to Do

- Do not create `/api/quran/tafsirs/...` Next.js server route handlers.
- Do not store or seed tafsir commentaries in the MySQL `furqan_quran` database.
- Do not build UI drawers or bottom sheets in this issue (reserved for #459).
- Do not output un-sanitized HTML; ensure segment escaping.

## Decisions Made

- Direct client-side fetching via QDC CORS endpoints (ADR 0048).
- Dual output: structured AST segments (`TafsirSegment[]`) for native React rendering + safe HTML formatter.
- Curated static metadata catalog for instant load and offline resilience.
