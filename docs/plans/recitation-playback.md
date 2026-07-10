# Add Quran Recitation Playback with Reciter Selection

**Type:** feature
**Date:** 2026-07-10
**Status:** implemented

## Summary

Users can listen to full-Quran recitations while reading along on the page. A reciter picker (backed by QDC's live full reciter list) lets users choose from all available reciters. Playback starts from a "listen" entry point on the reader, plays continuously through a chapter's audio, auto-advances the reader across page navigations as the recitation crosses page boundaries, and highlights the exact word currently being recited (word-level, karaoke-style). Playback continues in the background (via a persistent bottom player bar) even if the user navigates away from the reader entirely. See [ADR 0021](../architecture/adr/0021-recitation-playback.md) for the architectural decision behind proxying QDC at runtime and driving navigation from the audio timeline.

## Approach

QDC (`api.qurancdn.com`) serves one audio file per chapter with per-verse and per-word (`segments`) millisecond timing data — confirmed live:
- `GET /api/qdc/audio/reciters` → list of reciters (`id`, `name`, `translated_name`, `style`, `qirat`)
- `GET /api/qdc/audio/reciters/{reciterId}/audio_files?chapter={chapterId}&segments=true` → `{ audio_files: [{ id, chapter_id, audio_url, duration, verse_timings: [{ verse_key, timestamp_from, timestamp_to, segments: [[word_index, start_ms, end_ms], ...] }] }] }`

We proxy both through new internal API routes (our `jsonResponse()` envelope), never call QDC from the client directly. A new `RecitationContext`, mounted once in `app/[locale]/layout.tsx` (same level as `SidebarContext`), owns the `<audio>` element, selected reciter (persisted to `localStorage`, mirroring `QuranFontScaleContext`), play/pause state, and the current chapter's verse timings. It survives all client-side navigation because it's mounted above the reader's route tree — this is what makes both page auto-advance and background playback (after leaving the reader) work through the same mechanism.

## Decision Tree / Algorithm

**Page-follow logic** (fires on every `<audio>` `timeupdate` tick during playback):

| Condition | Action |
|---|---|
| Recited word's `verse_key`/word-index unchanged since last tick | No-op |
| Recited word moves within the same verse | Update word-highlight only (DOM ref registry, not React re-render — see Constraints) |
| Recited verse's `page_number` is in the visible page set (single view: `{currentPageId}`; double view: `{rightPageId, leftPageId}` via `getPagePair(currentPageId)`) | Update highlight only, no navigation |
| Recited verse's `page_number` is **not** in the visible set | `router.push(`${basePath}/${versePageNumber}`)` — works unmodified for single/double view since `/pages/[id]` already derives the correct pair from either member id |
| End of current chapter's audio file reached | Stop playback, reset player to idle state (no auto-continue into next surah) |
| User manually navigates (arrows/swipe/sidebar) while playing | No effect on audio — it keeps playing on its own timeline; the next `timeupdate` tick may auto-navigate again once the recited verse leaves the manually-viewed page |
| User navigates away from the reader entirely (any non-`/pages`, non-`/mushaf/[grant]/pages` route) | Playback keeps running in the background bottom player bar; highlighting has no DOM target until the user returns to a reader page — inert, not an error |

**Reader coverage:** both the self reader (`/pages/[id]`) and the shared-access grant reader (`/mushaf/[grant]/pages/[id]`) get the "listen" entry point and playback, since both render through the shared `ReaderPage`/`QuranSpread`/`QuranSafha` component tree.

## Verified Test Cases

- **Al-Fatiha (all 7 ayahs on page 1):** Press play on page 1 → `verse_timings` fetched once for chapter 1 → every tick's verse page_number is `1`, in the visible set `{1}` → highlight-only updates. At verse 1:7's end, chapter audio ends → stop, reset. No navigation ever fires.
- **Al-Baqarah (starts page 2), single-page view:** Press play on page 2 (chapter 2) → verses on page 2 highlight-only. Once the current verse's `page_number` becomes `3` (outside `{2}`) → `router.push(basePath/3)`. Reader re-renders via RSC nav; the `<audio>` element (above the route tree) is untouched and keeps playing. Repeats forward page by page.
- **Al-Baqarah, double-page view, pair (2,3):** Visible set is `{2,3}` (`getPagePair(2)`). The `page_number: 3` tick does **not** navigate (3 already visible). Navigation only fires once the verse reaches page 4, jumping straight to the (4,5) pair via `router.push(basePath/4)`.

## Files to Change

- `app/api/quran/recitations/reciters/route.ts` — new. Proxies `GET /api/qdc/audio/reciters`, returns `jsonResponse({ data: reciters })`.
- `app/api/quran/recitations/[reciterId]/chapters/[chapterId]/route.ts` — new. Proxies `GET /api/qdc/audio/reciters/{reciterId}/audio_files?chapter={chapterId}&segments=true`, returns `jsonResponse({ data: { audioUrl, durationMs, verseTimings } })`.
- `app/api/quran/chapters/[chapterId]/verse-pages/route.ts` — new. Returns `{ [verse_key]: page_number }` for every verse in the chapter (via `quranPrisma.verse.findMany({ where: { chapter_id }, select: { verse_key: true, page_number: true } })`) — lets the context resolve "which page is this verse on" without a query per tick.
- `app/contexts/RecitationContext.tsx` — new. Owns `<audio>` element, selected reciter (persisted via `app/utils/storage.ts`, same pattern as `QuranFontScaleContext`), play/pause/current chapter/current verse-verse-key/current word-location state, the `timeupdate` handler implementing the page-follow algorithm above, and the DOM ref registry for word highlighting.
- `app/[locale]/layout.tsx` — mount `RecitationProvider` alongside the existing `SidebarContext`/theme providers.
- `app/components/reader/ReaderPage.tsx` — add the "listen" entry point once in the toolbar row alongside `QuranSafhaViewToggle` (not inside `QuranSafha`, so it renders exactly once regardless of single/double view).
- `app/components/RecitationPlayButton.tsx` — new. Opens the reciter picker (first use) or starts/pauses playback for the current chapter; reads `basePath`/`grantId` context from `ReaderPage` to know where to navigate.
- `app/components/RecitationReciterPicker.tsx` — new. Sheet/dialog (shadcn) listing all reciters from the live QDC list.
- `app/components/RecitationPlayerBar.tsx` — new. Fixed bottom bar, rendered app-wide (mounted in `app/[locale]/layout.tsx`), visible whenever `RecitationContext` has an active/paused session. Shows play/pause, reciter name, surah/ayah progress.
- `app/components/QuranWord.tsx` — add `data-location={word.location}` (or a ref-registration callback into `RecitationContext`) so the highlight mechanism has a stable DOM target per word.
- `app/utils/quran-pages.ts` — reuse existing `getPagePair` for the visible-set check; no changes expected, just consumed by `RecitationContext`.

## Constraints

- QDC becomes a **runtime** dependency (previously build/seed-time only) — see ADR 0021 Consequences.
- Word-level highlight updates must use a direct DOM ref registry, not React state driving re-renders through `QuranSafha`/`QuranLine`/`QuranWord` — `timeupdate` fires ~4×/second; re-rendering the full word tree at that rate is a real perf risk on longer pages.
- Auto-advance must navigate by exact target page number, never through `ReaderPage.tsx`'s `getNavigationHref`/`getPairNavigationHref` (those encode locale-flipped *visual* swipe direction, not reading-order page sequence — reading order is always `page_number` ascending).
- Do not pause or otherwise sync playback to manual page navigation — explicitly decided against; audio always runs on its own timeline.
- Do not add cross-chapter auto-continue at end of a surah's audio — stop and reset instead.
- Recitation UI/context must not assume it's only reachable from the self-reader route tree — it must also work under `/mushaf/[grant]/pages/[id]`.
- Follow existing context pattern exactly (`"use client"`, `createContext`, provider with `useState`/`useEffect` hydration from `storage.get/set`, a `useRecitation()` hook that throws outside the provider) — see `QuranFontScaleContext`/`QuranSafhaViewContext`/`SidebarContext`.
- New API routes must use `jsonResponse()` and live under `app/api/quran/...`, per `docs/standards/api-conventions.md`.

## What NOT to Do

- Do not seed audio files or timing data into `furqan_quran` or add new Prisma models for this — QDC is proxied live (Option C in ADR 0021), not ingested (Option A, rejected for this pass).
- Do not call QDC directly from client components — always through the new proxy routes (Option B in ADR 0021, rejected).
- Do not scope the reciter list to a hardcoded curated few (e.g. just the 3 named in the card) — the full live QDC list was explicitly chosen.
- Do not implement ayah-only (verse-level) highlighting as the final state — word-level was explicitly chosen over the card's literal "ayah" wording.
- Do not stop/pause playback when the user leaves the reader route entirely — background playback via the persistent bottom bar was explicitly chosen.
- Do not gate the "listen" button per-`QuranSafha`-card (would duplicate in double-page view) — it lives once in `ReaderPage`'s toolbar row.
- Do not build this only for the self reader — the shared-access grant reader (`/mushaf/[grant]/pages/[id]`) must get it too.

## Decisions Made

- Audio/timing source: QDC API, proxied through new internal routes (not seeded, not called directly from client).
- Playback scope: continuous, chapter-spanning, auto-advances pages.
- Highlight granularity: word-level (karaoke-style), not just ayah-level.
- Reciter list: full live QDC list, not a curated fixed subset.
- Reader coverage: both self reader and shared-access grant reader.
- Nav-away behavior: playback continues in the background via a persistent bottom player bar.
- Player UI: "listen" entry point in `ReaderPage`'s toolbar row (next to `QuranSafhaViewToggle`) + a fixed bottom player bar mounted app-wide.
- Chapter-end behavior: stop, no auto-continue into next surah.
- Manual-nav-during-playback behavior: audio is not paused/synced; it drives navigation independently.

## Addendum 1: Play-from-ayah + player settings (repeat, stop point, speed)

**Date:** 2026-07-10

Adds a "play from here" trigger to `MarkModal` and a settings sheet (reciter, stop point, per-ayah repeat, whole-range repeat, playback speed, pause-between-repeats) reachable both from `MarkModal` and from a gear icon on the bottom player bar. This changes `RecitationContext` from "always plays from page start to chapter end" to "plays a configurable range, with repeat."

### New/changed state (`RecitationContext`)

- `startVerseKey: string` — the verse playback begins at (defaults to current page's first verse for the existing header quick-play button; set to the clicked verse's `verse_key` when triggered from `MarkModal`).
- `stopPoint: "page" | "surah"` — end of the start verse's page, or end of its surah. Replaces the old unconditional "stop at chapter end."
- `perAyahRepeatCount: number` (1–10, or `Infinity`) — each verse in the range plays this many times before advancing.
- `rangeRepeatCount: number` (1–10, or `Infinity`) — the whole start→stop range repeats this many times total.
- `playbackSpeed: number` (0.5–2, step 0.25) — sets `audio.playbackRate`.
- `pauseBetweenRepeatsMs: number` (0–5000) — silence inserted before each repeat (per-ayah or whole-range) via `setTimeout` before seeking/resuming.

All of the above (including reciter) persist to `localStorage` via `app/utils/storage.ts`, same pattern as the rest of the context.

### Updated `timeupdate` algorithm

Replaces the base plan's "End of current chapter's audio file reached → stop" row. Page-follow (visible-set/`router.push`) logic from the base plan is unchanged and runs independently on every tick.

| Condition | Action |
|---|---|
| Current verse's `timestamp_to` reached, per-ayah repeats not yet exhausted | After `pauseBetweenRepeatsMs` (if >0), seek `audio.currentTime = verse.timestamp_from`, replay same verse, increment ayah-repeat counter |
| Per-ayah repeats exhausted, current verse is not the stop-scope's last verse (page's or surah's last verse, per `stopPoint`) | Let audio continue naturally into the next verse; reset ayah-repeat counter |
| Per-ayah repeats exhausted, current verse is the stop-scope's last verse, range-repeats not yet exhausted | After `pauseBetweenRepeatsMs` (if >0), seek back to `startVerseKey`'s `timestamp_from`, reset ayah-repeat counter, increment range-repeat counter, replay the whole range |
| Per-ayah repeats exhausted, at stop-scope's last verse, range-repeats exhausted | Stop playback, reset to idle |

### Verified test case

Click ayah 2:5 in `MarkModal` on a page spanning 2:1–2:8, with `stopPoint=page`, `perAyahRepeat=3`, `rangeRepeat=2`, `speed=1x`, `pause=0`:
1. 2:5×3 → 2:6×3 → 2:7×3 → 2:8×3 (page's last verse; per-ayah done; range pass 1 of 2 done)
2. `rangeRepeat=2` not exhausted → seek back to 2:5, repeat the whole 2:5→2:8 sequence (×3 each) again
3. After range pass 2 → range-repeats exhausted → stop

### Additional Files to Change

- `app/components/MarkModal.tsx` — add a "Play from here" button (outside the existing Bookmarks/Notes tabs, since it applies regardless of tab). Resolves the target verse from `markFor` (word case: `markFor.verse_key`; verse case: `markFor.verse_key` directly), opens `RecitationSettingsSheet` pre-filled with persisted defaults and this verse as `startVerseKey`, then starts playback and closes the modal.
- `app/components/RecitationSettingsSheet.tsx` — new. Replaces the standalone `RecitationReciterPicker` from the base plan (folded in as one field of this sheet) — a single settings surface (shadcn `Sheet`) for reciter, stop point, per-ayah repeat, range repeat, speed, pause-between-repeats. Opened from `MarkModal`'s new button and from a gear icon on `RecitationPlayerBar`.
- `app/components/RecitationPlayerBar.tsx` — add a settings (gear) icon that opens `RecitationSettingsSheet` for mid-playback edits.
- `app/components/RecitationPlayButton.tsx` (header quick-play) — unaffected in behavior (still starts at current page's first verse, `stopPoint`/repeat defaults apply), but now goes through the same generalized range/repeat engine instead of a special-cased "play to chapter end" path.

### Additional Constraints

- `RecitationReciterPicker` from the base plan's Files to Change is superseded — do not build it as a separate component; reciter selection is one field inside `RecitationSettingsSheet`.
- Per-ayah/range repeat counts support an explicit `Infinity` ("∞") option — the UI must let the user stop playback manually at any time regardless of remaining repeat count (the existing play/pause control on the bottom bar already covers this, no new stop affordance needed).
- `stopPoint` defaults must not break the base plan's existing behavior when playback starts from the header quick-play button (i.e. default `stopPoint` should still result in the previously-verified page/chapter-boundary walk-throughs unless the user has explicitly changed settings).

### What NOT to Do (Addendum 1)

- Do not build a separate arbitrary end-ayah picker — stop point is limited to "end of page" or "end of surah," not a custom verse-range picker (explicitly ruled out in favor of the simpler two-option scope).
- Do not implement auto-continue past the stop point once repeats are exhausted — explicitly ruled out; terminal state is always "stop."
- Do not lock settings once playback starts — they must remain editable mid-playback via the bottom player bar's gear icon.

## Addendum 2: Adapter pattern for the QDC integration

**Date:** 2026-07-10

Refactors the two routes that call QDC directly (`app/api/quran/recitations/reciters/route.ts` and `app/api/quran/recitations/[reciterId]/chapters/[chapterId]/route.ts`) to go through a `RecitationProvider` adapter instead of inlining QDC's response shape and `fetch()` calls in the route handlers. Goal is both testability/isolation (routes and any future caller don't need to know QDC's JSON shape) and a real seam for a second audio provider later, without building a registry/factory for a single-provider case today.

### Interface

```ts
// app/lib/recitation/provider.ts
interface RecitationProvider {
  getReciters(): Promise<Reciter[]>;
  getChapterAudio(reciterId: number, chapterId: number): Promise<ChapterAudio | null>;
}

export class RecitationProviderError extends Error {}
```

`Reciter` and `ChapterAudio` are the existing domain types already in `app/types/recitation.ts` — unchanged.

### Decision Tree / Algorithm

| Condition | Adapter (`qdc-provider.ts`) | Route |
|---|---|---|
| `reciterId`/`chapterId` not integers | n/a — validated before the adapter is called | `422` (unchanged — param validation stays in the route) |
| QDC fetch fails (network error or non-2xx) | throws `RecitationProviderError` | `catch` → `502` |
| QDC `audio_files` fetch succeeds but the array is empty | `getChapterAudio` returns `null` | `null` → `404` |
| QDC `reciters` fetch succeeds (even an empty array) | returns `Reciter[]` (possibly `[]`) | `200` with that data — an empty list is valid, not a 404 |

### Verified Test Cases

- **`reciters/route.ts`:** becomes `try { const data = await qdcRecitationProvider.getReciters(); return jsonResponse({ data }); } catch { return jsonResponse({ code: 502, message: "Failed to fetch reciters" }); }`. The inline `QdcReciter` type and the QDC `fetch()`/mapping move entirely into `qdc-provider.ts`.
- **`[reciterId]/chapters/[chapterId]/route.ts`:** keeps its existing `422` id validation (adapter is never called with invalid ids), then wraps `qdcRecitationProvider.getChapterAudio(reciterId, chapterId)` in `try/catch` — `null` result → `404 "No audio found for this reciter/chapter"`, thrown `RecitationProviderError` → `502 "Failed to fetch chapter audio"`.
- **`verse-pages/route.ts`:** untouched — it queries `quranPrisma` directly, never calls QDC, so it's outside this adapter's scope.

### Files to Change

- `app/lib/recitation/provider.ts` — new. `RecitationProvider` interface + `RecitationProviderError` class.
- `app/lib/recitation/qdc-provider.ts` — new. `qdcRecitationProvider: RecitationProvider` — the actual QDC `fetch()` calls (moved from the two routes), the inline `QdcReciter`/`QdcAudioFile` DTO types and their mapping to `Reciter`/`ChapterAudio` (moved from the two routes), `QDC_BASE_URL`, and the `{ next: { revalidate: 86400 } }` cache config (both moved from `app/constants/recitation.ts`, since they're QDC-specific implementation details, not general recitation constants).
- `app/api/quran/recitations/reciters/route.ts` — simplified to call `qdcRecitationProvider.getReciters()` inside a `try/catch`; no more QDC-shape knowledge.
- `app/api/quran/recitations/[reciterId]/chapters/[chapterId]/route.ts` — simplified to call `qdcRecitationProvider.getChapterAudio()` inside a `try/catch`; keeps its existing id validation.
- `app/constants/recitation.ts` — remove `QDC_BASE_URL` (moved into `qdc-provider.ts`); UI-facing constants (`DEFAULT_RECITATION_SETTINGS`, repeat/speed bounds, `RECITATION_HIGHLIGHT_CLASS`) stay.

### Constraints

- `RecitationContext.tsx` and `app/utils/recitation-api.ts` (the client-side fetch wrapper hitting our own `/api/quran/recitations/...` routes) are unaffected — this refactor is server-side only, behind the existing route boundary. No client-visible behavior change.
- Keep the `try/catch` + typed-error convention (matches `docs/standards/api-conventions.md`'s existing pattern of catching specific error types, e.g. `Prisma.NotFoundError` → `404`) — do not introduce a Result-type/discriminated-union return convention, which isn't used elsewhere in the codebase.
- No registry, factory, or provider-selection config — `qdcRecitationProvider` is the only implementation and is imported directly by both routes. Do not build multi-provider plumbing until a second provider actually exists.

### What NOT to Do (Addendum 2)

- Do not touch `verse-pages/route.ts` — it's a DB query, not a QDC integration, and is out of scope for this adapter.
- Do not build a provider registry/factory for provider selection — explicitly out of scope until a second provider is real.
- Do not change the client-side `RecitationContext`/`recitation-api.ts` — this refactor is confined to the two server route handlers and the new `app/lib/recitation/` files.
