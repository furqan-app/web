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

---

## Tafsir: Reader Pager Synchronization & Recitation Independence

**Status:** active

**Decision (2026-09-02):** When the Tafsir sheet is open and the active verse changes (via steppers or keyboard arrow navigation), a null-rendering effect leaf (`TafsirReaderSync`, mounted in `app/[locale]/layout.tsx` alongside `LastReadPageSync`) resolves the verse's target page through the active mushaf edition (`useVersePages`). If that target page is not already rendered on screen (`visiblePages`), it advances the mounted reader pager client-side via `jumpTo(targetPage)` (`ADR 0028`), maintaining in-reader URL synchronization without route reloads. Meanwhile, the Tafsir sheet remains strictly independent of background recitation playback: recitation auto-advancing across page boundaries turns the background reader pager without mutating the Tafsir sheet's selected verse, remounting the sheet, or resetting its commentary scroll position (`ADR 0056`).

**Rationale:** Users reading commentary often step continuously across surah or page boundaries; keeping the underlying mushaf aligned prevents context dislocation upon closing the sheet. Isolating commentary selection from global recitation auto-advance allows users to study commentary on a specific verse while audio continues on its own timeline.

**Constraints:**
- Page turns from Tafsir must use `jumpTo(page)` from `ReaderNavigationContext` (`ADR 0028`). Never use `router.push` or full navigation.
- Verse-to-page resolution must query `useVersePages()` through the active mushaf edition (`ADR 0033`).
- In double-page view, `jumpTo` must not be called when `targetPage` is already rendered in `visiblePages`.
- Tafsir sheet must never subscribe to recitation ticks or mutate its active verse based on recitation auto-advance.
