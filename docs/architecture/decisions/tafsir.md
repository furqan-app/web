# Tafsir — Decisions

Active decisions for tafsir provider & quote normalization. Part of `docs/architecture/decisions/`; always-loaded index is [`../DECISIONS.md`](../DECISIONS.md).

---

## Tafsir: Client-Side Direct QDC Provider & Quote Normalization

**Status:** active

**Decision (2026-08-29):** Quran commentary (Tafsir) is fetched directly from QDC's public API (`https://api.qurancdn.com/api/qdc/tafsirs/...`) on the client using React Query without intermediate Next.js server proxy routes. Text formatting normalizes inconsistent vendor HTML into typed AST segments (`TafsirSegment[]`) and standardizes Quranic quotes into `﴿...﴾` styled with `font-uthmanic`. See [ADR 0048](../adr/0048-client-side-qdc-tafsir-provider.md).

**Rationale:** QDC supports global CORS for public resource fetching. Client-side direct fetching avoids proxy overhead and database bloat while delivering fast caching with 24-hour React Query stale times.

**Constraints:**
- Do not create Next.js API proxy routes for public QDC tafsir endpoints.
- Normalizer must handle empty or null commentary text safely without throwing.
- Text parsing must produce typed segments (`TafsirSegment[]`) for native React rendering and clean sanitized HTML.
- Cache keys must follow `["tafsir", tafsirId, normalizedVerseKey]` where `normalizedVerseKey` is validated and formatted as `${chapter}:${verse}` without zero-padding.
