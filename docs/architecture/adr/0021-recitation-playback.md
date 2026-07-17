# ADR 0021: Recitation playback via runtime QDC proxy, driven by a global audio-timeline navigator

**Date:** 2026-07-10
**Status:** Accepted

## Context

The card asks for full-Quran recitation playback with reciter selection and current-ayah (word-level, per follow-up scoping) highlighting. QDC (Quran.com's public API, already used at build time by the seeder for text) serves audio as **one file per chapter**, with per-verse and per-word millisecond timing segments — not per-page clips, and not data we currently store. A surah's audio therefore spans many of our page routes, and continuous playback needs to auto-advance the reader across page navigations without interrupting the `<audio>` element, while also surviving navigation away from the reader entirely (background mini-player).

## Options Considered

**Option A — Seed audio + timing data into `furqan_quran` at build time**
Download reciter audio and ingest QDC's timing segments into a new table via the existing seeder pipeline (ADR 0009), so runtime playback never calls an external API. Matches the "Quran content is immutable, pre-computed" philosophy of the Static Generation Strategy decision, but is large new scope (storage, multi-reciter seeding, ~15+ reciters × 114 chapters of timing data) for a first version, and audio files themselves would still need external hosting/CDN — we would not actually store the audio locally, only its metadata.

**Option B — Client fetches QDC directly at runtime**
No new backend code; the browser calls `api.qurancdn.com` directly for reciters, audio URLs, and timings. Fastest to build, but couples the frontend to QDC's exact response shape/CORS/uptime with no server-side buffer, and breaks the app's `jsonResponse()` API envelope convention (API Response Shape decision) for this feature only.

**Option C — Proxy QDC through new internal API routes, fetched live per session (chosen)**
New routes under `app/api/quran/recitations/...` call QDC server-side at request time and return data in our standard envelope. No schema changes, no seeding pipeline, and a single place to add caching/fallback later if QDC becomes unreliable.

## Decision

Option C. QDC becomes a **runtime** dependency (previously build/seed-time only) via a thin server-side proxy. A new `RecitationContext`, mounted once in `app/[locale]/layout.tsx` (same level as `SidebarContext`), owns the `<audio>` element, the selected reciter, and the current chapter's verse timings. On every `timeupdate` tick it derives the currently-recited verse/word and:
- updates word-level highlighting via a direct DOM ref registry (not React re-renders down the QuranSafha tree, to avoid re-rendering the full word list 4×/second — see Constraints),
- calls `router.push` to the recited verse's page **only when that page isn't already in the currently-visible page set** (single view: the current page; double view: the current pair, via `getPagePair`) — reusing the existing `/pages/[id]` route's own pair-derivation, no new route shape needed.

Because the context lives above the reader's route tree, the `<audio>` element is never unmounted by page or even route navigation — this is what makes both "auto-advance across pages" and "keep playing after leaving the reader" (both confirmed requirements) work with the same mechanism.

## Consequences

- **+** No schema/seeding changes — ships without touching `furqan_quran` or its build-time invariants.
- **+** One proxy layer means QDC's response shape is normalized once, not scattered across client call sites; also the natural place to add response caching if QDC rate-limits or is slow.
- **+** Reusing `/pages/[id]`'s existing pair-derivation for audio-driven navigation means zero new routing logic — the same URL a user would manually navigate to is what the player pushes to.
- **-** Recitation now has a hard runtime dependency on QDC's uptime/CORS/API stability — a build-time-only dependency (the seeder) does not carry this risk; if QDC is down, playback (not just re-seeding) breaks.
- **-** Timing/segment data is re-fetched every time a chapter starts playing (not cached across sessions) — acceptable for v1, revisit if usage shows this is a real cost or latency issue.
- **-** The direct-DOM-ref highlight mechanism is an exception to this codebase's otherwise-React-state-driven highlight pattern (`highlight.ts`'s URL-param approach) — justified only by the 4×/second update frequency; do not copy this pattern for anything lower-frequency.

## Addendum (2026-07-16): Supersedes "no cross-chapter auto-continue" — general chaining added

**This addendum supersedes the original decision's "Chapter-end stops playback (no auto-continue into the next surah)" consequence and its matching Consequences bullet.** Trello #96 asked for "end of Juz'"/hizb/rub stop points and a "no stop" (continuous-until-Quran-end) mode. Both require playback to continue past the boundary of the currently-loaded chapter's audio, since a juz/hizb/rub boundary — and obviously "no stop" — routinely falls in a **later chapter** than where playback started (e.g. Juz 1 starts in chapter 1, ends at 2:141 in chapter 2; Juz 30 spans chapters 78–114).

**New mechanism:** `RecitationContext` now resolves a `stopVerseKey` + the **chapter it belongs to** up front (previously `computeStopVerseKey` was bounded to the single loaded chapter's `verseTimings` and could never point outside it). When the currently-loaded chapter's audio reaches its end and the resolved stop verse's chapter hasn't been reached yet, the context fetches the next chapter's audio (`chapterId + 1`) and continues — chaining through as many chapters as needed. This also happens to fix a latent gap in the pre-existing code: since there was no `ended`/duration-based end-of-chapter detection at all (only `timeupdate`, which stops changing verse once it clamps to the last entry), `stopPoint: "surah"` reaching the chapter's literal last verse never actually triggered `stop()` via code — it relied on the browser silently pausing. The new end-of-chapter detection fixes this as a side effect of building the chaining mechanism, not as separate scope.

**Also fixed as a byproduct:** `stopPoint: "page"` previously could never correctly stop at a page's true last verse when that page spans two chapters (e.g. page 106: `4:176` chapter 4, `5:1`–`5:2` chapter 5) — it silently stopped at the end of the loaded chapter instead. Now correctly chains into the next chapter.

See `docs/plans/recitation-playback.md` Addendum 5 for the full decision tree, the new `/api/quran/verses/[verseKey]/stop-point` endpoint, and range-repeat-across-chapters handling.
