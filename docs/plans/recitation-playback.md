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

## Addendum 1: Play-from-ayah + player settings

**Date:** 2026-07-10

Adds a "play from here" trigger to `MarkModal` and a settings sheet (reciter, stop point, per-ayah repeat, whole-range repeat, speed, pause-between-repeats) from both `MarkModal` and the player bar's gear icon. Changes `RecitationContext` from "always plays page start to chapter end" to "configurable range with repeat."

### New/changed state (`RecitationContext`)

- `startVerseKey: string` — the verse playback begins at (defaults to current page's first verse for the existing header quick-play button; set to the clicked verse's `verse_key` when triggered from `MarkModal`).
- `stopPoint: "page" | "surah"` — end of the start verse's page, or end of its surah. Replaces the old unconditional "stop at chapter end."
- `perAyahRepeatCount: number` (1–10, or `Infinity`) — each verse in the range plays this many times before advancing.
- `rangeRepeatCount: number` (1–10, or `Infinity`) — the whole start→stop range repeats this many times total.
- `playbackSpeed: number` (0.5–2, step 0.25) — sets `audio.playbackRate`.
- `pauseBetweenRepeatsMs: number` (0–5000) — silence inserted before each repeat (per-ayah or whole-range) via `setTimeout` before seeking/resuming.

All persist to `localStorage` via `app/utils/storage.ts`.

### Updated `timeupdate` algorithm

Replaces the base plan's "End of chapter → stop" row. Page-follow logic is unchanged and runs independently on every tick.

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

### Files to Change (Addendum 1)

- `app/components/MarkModal.tsx` — "Play from here" button (outside Bookmarks/Notes tabs). Resolves verse from `markFor.verse_key`, opens `RecitationSettingsSheet` pre-filled with persisted defaults + this verse as `startVerseKey`, starts playback, closes modal.
- `app/components/RecitationSettingsSheet.tsx` — new. Replaces the base plan's standalone `RecitationReciterPicker` (folded in as one field). Single shadcn `Sheet` for reciter, stop point, repeat counts, speed, pause. Opened from `MarkModal` and `RecitationPlayerBar`'s gear icon.
- `app/components/RecitationPlayerBar.tsx` — add gear icon opening `RecitationSettingsSheet`.
- `app/components/RecitationPlayButton.tsx` — behavior unchanged, now goes through the generalized range/repeat engine.

**Constraints:** Stop point limited to "end of page" or "end of surah" — no custom range picker. Settings remain editable mid-playback. Do not auto-continue past stop once repeats exhausted.

## Addendum 2: Adapter pattern for the QDC integration

**Date:** 2026-07-10

Refactors the two QDC-calling routes to go through a `RecitationProvider` adapter instead of inlining QDC's response shape and `fetch()` calls in the route handlers. Goal: testability and a real seam for a second provider, without building a registry/factory for the single-provider case today.

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

| Condition | Adapter | Route |
|---|---|---|
| Invalid ids | n/a — validated in route before adapter is called | `422` |
| QDC fetch fails | throws `RecitationProviderError` | `502` |
| `audio_files` empty | `getChapterAudio` returns `null` | `404` |
| `reciters` succeeds (even `[]`) | returns `Reciter[]` | `200` |

**Files to Change:**
- `app/lib/recitation/provider.ts` — new. `RecitationProvider` interface + `RecitationProviderError`.
- `app/lib/recitation/qdc-provider.ts` — new. `qdcRecitationProvider`: actual QDC `fetch()`, `QdcReciter`/`QdcAudioFile` DTOs and their mapping, `QDC_BASE_URL`, `{ next: { revalidate: 86400 } }` (moved from `app/constants/recitation.ts`).
- `app/api/quran/recitations/reciters/route.ts` — simplified to `qdcRecitationProvider.getReciters()` in `try/catch`.
- `app/api/quran/recitations/[reciterId]/chapters/[chapterId]/route.ts` — same, keeps id validation.
- `app/constants/recitation.ts` — remove `QDC_BASE_URL`; keep UI constants.

**Constraints:** Server-side only — `RecitationContext`/`recitation-api.ts` unaffected. No registry/factory until a second provider exists. Do not touch `verse-pages/route.ts`.

## Addendum 3: Localize reciter names

**Date:** 2026-07-10

`getReciters()` called QDC with no `language` param — Arabic-locale users saw English reciter names.

**Fix:** Pass `?language=` through the whole call chain. `RecitationContext.tsx` → `useLocale()` → `fetchReciters(locale)` → `recitation-api.ts` appends `?language=` → route reads `language` from `searchParams` (default `"en"`) → `qdcRecitationProvider.getReciters(language)` appends to QDC URL.

Files: `provider.ts` (`language` param), `qdc-provider.ts` (appends to QDC URL), `reciters/route.ts` (reads param), `recitation-api.ts` (appends param), `RecitationContext.tsx` (`useLocale()`). Do not hardcode `"ar"` — must follow actual app locale.

## Addendum 4: Move play button into navbar on mobile

**Date:** 2026-07-14  
**Status:** implemented

### Problem

`ReaderPage.tsx` renders a toolbar row (`<div className="flex items-center gap-2">`) above the Quran spread containing `QuranSafhaViewToggle` and `RecitationPlayButton`. `QuranSafhaViewToggle` is already `hidden lg:flex`, but `RecitationPlayButton` has no responsive hiding — visible at all breakpoints. On mobile, the safha sizing (ADR 0011) is calibrated to fill exactly `100dvh - 56px`. The toolbar row adds vertical space above the spread, pushing the safha below the fold and making the page scrollable.

### Solution

Two-breakpoint split:
- **Mobile (< md):** play button in `Nav`, gated by `isOnPagesRoute` (same gate as the sidebar trigger). Toolbar row becomes `hidden md:flex`.
- **Desktop (md+):** play button stays in the toolbar row alongside `QuranSafhaViewToggle`, unchanged.

### `firstVerseKey` threading

`RecitationPlayButton` currently receives `firstVerseKey` as a prop from `ReaderPage` (a Server Component). The Nav lives above the pages layout and cannot receive it via props. Fix: expose `pageFirstVerseKey`/`setPageFirstVerseKey` on `RecitationContext`. A thin `"use client"` component (`RecitationPageSync`) rendered inside `ReaderPage`'s output calls `setPageFirstVerseKey(firstVerseKey)` in a `useEffect` whenever the page changes. `RecitationPlayButton` falls back to reading `pageFirstVerseKey` from context when no `firstVerseKey` prop is supplied.

### Decision tree

| Breakpoint | Where the play button renders | How `firstVerseKey` is resolved |
|---|---|---|
| < md (mobile) | `Nav`, gated by `isOnPagesRoute`, no prop | reads `pageFirstVerseKey` from `RecitationContext` |
| md+ (desktop) | `ReaderPage` toolbar row | receives `firstVerseKey` as prop (unchanged) |

### Files to Change (Addendum 4)

- `app/contexts/RecitationContext.tsx` — add `pageFirstVerseKey: string | null` state + `setPageFirstVerseKey(key: string | null): void` to context value and provider.
- `app/components/reader/RecitationPageSync.tsx` — new thin `"use client"` component. Props: `firstVerseKey: string | null`. `useEffect` calls `setPageFirstVerseKey(firstVerseKey)` whenever `firstVerseKey` changes. Returns `null`.
- `app/components/reader/ReaderPage.tsx` — render `<RecitationPageSync firstVerseKey={firstVerseKey} />` alongside `FontFaceInjector`. Change toolbar div to `hidden md:flex`.
- `app/components/RecitationPlayButton.tsx` — make `firstVerseKey` prop optional; when absent, read `pageFirstVerseKey` from `useRecitation()` context.
- `app/components/nav/Nav.tsx` — add `<RecitationPlayButton />` (no prop) inside the leading `div`, after the sidebar trigger, gated by `isOnPagesRoute` and `md:hidden`.

### Constraints

- The toolbar row must be `hidden md:flex` — even an empty div can produce a small layout contribution in some browsers.
- Do not remove `firstVerseKey` as a prop from `RecitationPlayButton` — the desktop path still passes it directly.
- `RecitationPageSync` must be a separate `"use client"` leaf, not a hook in `ReaderPage` — `ReaderPage` is `async` and cannot call hooks.

### What NOT to Do (Addendum 4)

- Do not put the play button inside the `QuranSafha` card — any addition to the card's flex children eats from the 15-slot height budget.
- Do not use a floating/fixed button overlaid on the safha — it would obscure Quran text.
- Do not move the button to the toolbar on mobile in the same row — the toolbar div still takes space until it is `hidden md:flex`.

## Addendum 5: Hizb/rub/juz stop points + "no stop" (cross-chapter chaining)

**Date:** 2026-07-16  
**Status:** implemented

**Problem (Trello #96):** `stopPoint` only supports `"page"` and `"surah"`. Both `computeStopVerseKey` (`app/utils/recitation.ts`) and the whole playback session are bounded to a single chapter's `verseTimings` (one `fetchChapterAudio(reciterId, chapterId)` call per `play()`). This card asks for `"hizb"`, `"rub"`, and `"juz"` stop points, plus a `"none"` ("no stop" — continuous playback until 114:6 or a manual stop).

**Why this isn't a settings tweak:** a hizb/rub/juz boundary routinely falls in a **later chapter** than where playback started (Juz 1: starts chapter 1, ends `2:141` in chapter 2; Juz 30 spans chapters 78–114). `"none"` obviously needs the same thing. This requires the context to **auto-continue into the next chapter's audio** when the loaded chapter ends — which ADR 0021 explicitly ruled out ("Chapter-end stops playback, no auto-continue into the next surah"). See ADR 0021 Addendum (2026-07-16), which formally supersedes that consequence.

**Bonus fix, same mechanism:** `stopPoint: "page"` has the identical latent bug today — if the page spans two chapters (real example: page 106, `4:176` is chapter 4's last verse, `5:1`–`5:2` start chapter 5), the current code silently stops at the end of the loaded chapter, not the page's true last verse. Fixed as part of this addendum, not separately.

**Also uncovered:** there is currently no `ended`/duration-based end-of-chapter detection at all — only a `timeupdate` listener. Since `findActiveVerseTiming` clamps to the last entry once `currentTimeMs` passes its `timestampTo`, the verse-change detection that normally triggers `stop()`/repeat never fires for the literal last verse of a chapter — meaning `stopPoint: "surah"` reaching the chapter's actual last verse today relies on the browser silently pausing, not on our code calling `stop()`. The new end-of-chapter detection this addendum adds fixes this as a byproduct.

### Decision Tree — stop-verse resolution

| `stopPoint` | Target verse | Requires DB lookup? |
|---|---|---|
| `"surah"` | Last verse of the start verse's own chapter (`verseTimings[verseTimings.length - 1]`) | No — unchanged, synchronous, from already-loaded `verseTimings` |
| `"page"` | Last verse where `page_number` = start verse's `page_number` | Yes |
| `"rub"` | Last verse where `rub_el_hizb_number` = start verse's `rub_el_hizb_number` | Yes |
| `"hizb"` | Last verse where `hizb_number` = start verse's `hizb_number` | Yes |
| `"juz"` | Last verse where `juz_number` = start verse's `juz_number` | Yes |
| `"none"` | Hardcoded `"114:6"` (Quran's last verse — immutable, no query) | No |

All four DB-backed scopes share one new endpoint: `GET /api/quran/verses/[verseKey]/stop-point?scope=page|rub|hizb|juz` → `jsonResponse({ data: { verseKey, chapterId } })`. Server-side: `quranPrisma.verse.findFirst({ where: { verse_key } })` to get the start verse's own `page_number`/`rub_el_hizb_number`/`hizb_number`/`juz_number` depending on `scope`, then `quranPrisma.verse.findFirst({ where: { [scopeField]: value }, orderBy: { id: "desc" } })` for the target. **`Verse.verse_key` is not `@unique` in the schema — always `findFirst`, never `findUnique`** (confirmed by a runtime `PrismaClientValidationError` during investigation).

### Decision Tree — cross-chapter chaining

| Trigger | Condition | Action |
|---|---|---|
| Currently-loaded chapter's audio ends (new `ended`-equivalent detection — see Files to Change) | Current chapter **is** the resolved stop verse's chapter | Run the existing per-ayah/range-repeat-or-stop logic against the stop verse (same logic that already exists, just now reliably triggered) |
| Chapter ends | Current chapter is **before** the stop verse's chapter, next chapter exists (`chapterId + 1 <= 114`) | Fetch chapter `chapterId + 1`'s audio + verse-pages (`fetchChapterAudio`, `fetchChapterVersePages`), replace `verseTimingsRef`/`versePagesRef`/`currentChapterIdRef`, set `audio.src` to the new chapter's URL, `audio.currentTime = 0`, keep playing. `followPage` needs no change — it's verse-key-driven, not chapter-scoped. |
| Chapter ends | No next chapter (`chapterId === 114`) | `stop()` — natural end of Quran |
| Range-repeat exhausts at the stop verse, `startVerseKey`'s chapter ≠ currently-loaded chapter (chained forward since) | — | Fetch `startVerseKey`'s chapter's audio (same pattern as the existing reciter-mid-session-change effect), set `audio.src`, seek to `startVerseKey`'s `timestampFrom`, resume — then continues forward through subsequent chapters exactly as the first pass did |

### Verified Test Cases

1. **Juz 1, start `1:1`:** stop-point endpoint (`scope=juz`) resolves to `{ verseKey: "2:141", chapterId: 2 }`. Chapter 1 (7 verses) plays to its end → not yet chapter 2 → chain to chapter 2 → continues until `2:141` → matches target chapter → stop/repeat logic applies normally.
2. **`"none"` starting mid-book at `2:5`:** target hardcoded `114:6`/chapter 114. Chains through chapters 3, 4, 5, … 114 sequentially as each ends. At `114:6`, no next chapter → `stop()`.
3. **`"page"` crossing a surah boundary, page 106:** start `4:176` (page 106's own first verse — verified live against the running endpoint: `GET /api/quran/verses/4:176/stop-point?scope=page` → `{ verseKey: "5:2", chapterId: 5 }`; page 106 = `4:176` chapter 4, then `5:1`–`5:2` chapter 5). Chapter 4 plays to its end → chains into chapter 5 → stops at `5:2`. Today's code would incorrectly stop at `4:176`.
4. **Juz 1 range-repeat, `rangeRepeat=2`:** start `1:1`, stop `2:141` (chapter 2). Pass 1: chapter 1 → chain to chapter 2 → reach `2:141` → range-repeat not exhausted → seek back to `1:1` → chapter 1 ≠ currently-loaded chapter 2 → reload chapter 1's audio, seek to `1:1`'s `timestampFrom` → replay forward through chapter 2 again → range-repeat exhausted → `stop()`.
5. **Rub, start `2:1`:** `scope=rub` resolves to `{ verseKey: "2:25", chapterId: 2 }` (verified against real DB) — same chapter as start, so this exercises the "no chaining needed, straightforward same-chapter stop" path, same as `"surah"` behaves today.

### Files to Change

- `app/api/quran/verses/[verseKey]/stop-point/route.ts` — new. `GET` with `?scope=page|rub|hizb|juz`. Client must `encodeURIComponent` the verse key (contains `:`) when building the URL.
- `app/utils/recitation-api.ts` (or wherever `fetchChapterAudio`/`fetchChapterVersePages` live) — new `fetchStopPoint(verseKey, scope)` client function.
- `app/types/recitation.ts` — `StopPoint` widens from `"page" | "surah"` to `"page" | "surah" | "rub" | "hizb" | "juz" | "none"`.
- `app/utils/recitation.ts` — `computeStopVerseKey` replaced/supplemented by an async resolution path for the four DB-backed scopes (the `"surah"` sync path is unchanged); add a pure helper for the chaining decision (given current chapter id + stop chapter id, decide: apply-stop-logic / chain-to-next / natural-end).
- `app/contexts/RecitationContext.tsx` — biggest change: add `stopChapterIdRef`; resolve `stopVerseKeyRef` + `stopChapterIdRef` asynchronously in `play()` (and in the stop-point-changed-mid-session effect) via the new endpoint/hardcoded constant per the scope table above; add real end-of-chapter detection (`audio` `"ended"` listener, or a `timeupdate`-based check against `audio.duration`) that runs the chaining decision table; update the range-repeat seek-back path to reload the start verse's chapter's audio when it differs from the currently-loaded chapter.
- `app/components/RecitationSettingsSheet.tsx` — add "End of Rub", "End of Hizb", "End of Juz'", "No stop" to the stop-point `RadioGroup`. Hide/disable "Repeat whole range" when `stopPoint === "none"` (confirmed with user); keep it visible+functional for `"juz"`/`"hizb"`/`"rub"` (confirmed with user).
- i18n keys: `recitation.stopPointRub`, `recitation.stopPointHizb`, `recitation.stopPointJuz`, `recitation.stopPointNone` (new); existing `recitation.stopPointPage`/`recitation.stopPointSurah` unchanged.

### Constraints

- `Verse.verse_key` is not `@unique` — always `findFirst`, never `findUnique`, in the new endpoint and anywhere else a verse is looked up by `verse_key`.
- The new endpoint is DB-only (no QDC call) — unlike the existing recitation routes, it doesn't need the `RecitationProvider` adapter (Addendum 2) at all; it's a plain Prisma query route like `verse-pages/route.ts`.
- `followPage`/page-auto-navigation logic is unchanged — it already keys off `verseKey`, not chapter, so chaining across chapters doesn't require touching it.
- Do not change the `"surah"`/`"page"`(-within-one-chapter case) behavior's user-visible outcome — only fix the cross-chapter latent gap for `"page"`; `"surah"` behavior is unchanged except that `stop()` now reliably fires via code instead of implicitly via the browser pausing.
- Hide "Repeat whole range" in the settings sheet when `stopPoint === "none"` — confirmed with user 2026-07-16.
- Keep "Repeat whole range" available for `"juz"`/`"hizb"`/`"rub"`, including the chapter-reload-on-repeat-seek-back behavior — confirmed with user 2026-07-16.

### What NOT to Do

- Do not scope this to same-chapter-only lookups — that's the exact bug being fixed; every one of the four new scopes must support resolving into a later chapter.
- Do not add a registry/factory for stop-point scopes — a single endpoint with a `scope` query param is sufficient (mirrors the existing single-provider-no-registry decision in Addendum 2).
- Do not silently keep the old "no cross-chapter auto-continue" restriction anywhere in the new code path — it is explicitly superseded (ADR 0021 Addendum 2026-07-16), not layered on top of.
- Do not use `findUnique` for `verse_key` lookups anywhere in this feature.

### Decisions Made

- `"no stop"` = continuous playback through the rest of the Quran until `114:6`, or until manually stopped — confirmed with user 2026-07-16.
- Hide "Repeat whole range" for `stopPoint === "none"` — confirmed with user 2026-07-16.
- Keep "Repeat whole range" for `"juz"` (and by the same reasoning, `"hizb"`/`"rub"`), including cross-chapter reload-on-repeat — confirmed with user 2026-07-16.
- Also fix `"page"` stop point to correctly chain across a surah boundary, using the same new mechanism — confirmed with user 2026-07-16 (surfaced during investigation, not in the original card).
- Add `"hizb"` and `"rub"` stop points alongside `"juz"` — confirmed with user 2026-07-16 (`Verse.hizb_number`/`rub_el_hizb_number` already exist, same mechanism as `"juz"`, no additional architecture).
- See ADR 0021 Addendum (2026-07-16) for the formal supersession of "no cross-chapter auto-continue."

### Implementation Notes (2026-07-16)

- `resolveStopTarget` (the sync-"surah"/hardcoded-"none"/async-fetch-otherwise resolver) lives as a module-level function directly in `app/contexts/RecitationContext.tsx`, not `app/utils/recitation.ts` — it needs `fetchStopPoint` from `app/utils/recitation-api.ts`, and `recitation.ts`'s existing helpers are all pure/sync with no client-fetch dependencies.
- `QURAN_LAST_VERSE_KEY`/`QURAN_LAST_CHAPTER_ID` constants added to `app/constants/recitation.ts` (not in the original Files to Change list, but the natural home for other Quran-structure constants in this feature).
- The stop-point-changed-mid-session effect recomputes relative to `currentVerseKeyRef.current` (falling back to `startVerseKeyRef.current`), not the original session start verse — if playback has already chained past the start verse's chapter/juz/etc., "end of X" should mean the one containing where playback currently is, not one already behind it. Not explicitly discussed with the user beforehand; verified live in the browser during implementation (switched `"page"` → `"juz"` mid-session while chapter 1 was playing near its end — correctly resolved against the current verse `1:7`, not the original `1:1`, and both resolve to the same juz here so the distinction didn't change behavior in that specific run, but the fallback logic is in place for cases where it would).
- Verified live end-to-end in the browser (not just via curl): started playback at `1:1` with `stopPoint: "page"`, switched to `"juz"` mid-session, chapter 1's audio reached its natural end, and the app automatically fetched and started playing chapter 2's audio (`002.mp3`) — confirms `handleChapterEnded` → `chainToNextChapter` fires correctly on a real `HTMLAudioElement` `"ended"` event, not just in the decision-tree design. `followPage` correctly left the page unnavigated since double-page view already showed pages 1–2 together.

### Addendum 5b: Settings sheet UI/UX polish (2026-07-16)

**Status:** implemented

Requested by user after Addendum 5 shipped, in the same task/branch (not a new addendum per the "don't add an addendum while the branch is open" rule — folded into this one).

- **Stop-point selector**: replaced the plain `flex flex-wrap` radio row (6 options, looked cramped) with a `grid grid-cols-2` of pill buttons — each a `label` wrapping a visually-hidden (`sr-only`) `RadioGroupItem` for real radio semantics/keyboard nav, styled via a JS-computed `isSelected` boolean (not CSS `data-state` sibling selectors) since selection state is already known from `settings.stopPoint` in the parent. One icon per option (`FileText`/page, `CircleDot`/rub, `CircleDashed`/hizb, `BookOpen`/juz, `BookMarked`/surah, `Infinity`/none) — lucide-react only, per `docs/design/design-principles.md`.
- **Reciter list → searchable combobox**: replaced the `max-h-48` scrolling `RadioGroup` (14 reciters eating fixed vertical space) with a `Popover` + `Command` (shadcn) combobox — click to open, type to filter, `Check` icon marks the selected reciter. Added `components/ui/command.tsx` and `components/ui/popover.tsx` via `npx shadcn add` (added `cmdk` and `@radix-ui/react-popover` to `package.json`).
- **Section headers**: added a small `text-primary` lucide icon before each section label (`Users`/reciter, `CircleDashed`/stop-at, `Repeat2`/repeats, `Gauge`/speed, `Timer`/pause) via a shared `SectionHeader` helper — consistent with design-principles.md's "accent sparingly but consistently" rule.
- **Grouped surfaces**: `bg-muted p-3 rounded-lg` → `rounded-xl border border-border bg-card p-3`, matching the "secondary surface" treatment in design-principles.md.
- **Bug found and fixed during this work**: nesting a Radix `Popover` inside a Radix `Sheet`/`Dialog` broke keyboard input and scroll inside the Popover (search input couldn't be typed into, list couldn't be scrolled). Root cause: `Popover.Content` portals to `document.body` by default, which is a DOM sibling — not descendant — of the Sheet's own portaled content; Radix's `FocusScope` traps focus by DOM containment, so it kept yanking focus back into the Sheet on every keystroke. Fixed by adding an optional `container` prop to `components/ui/popover.tsx`'s `PopoverContent` (forwarded to `PopoverPrimitive.Portal`), and having `RecitationSettingsSheet` capture its own `SheetContent` DOM node (via a callback ref → `useState`) and pass it as the Popover's portal container — this keeps the Popover a true descendant of the Sheet for focus-trap purposes. **This is a reusable fix on a shared primitive** — any future `Popover` (or likely `DropdownMenu`/`Select`) nested inside a `Dialog`/`Sheet` should do the same. See DECISIONS.md.
- Verified live in the browser with real keyboard input (Playwright `pressSequentially`, not synthetic DOM events) and real scroll (`scrollTop` manipulation) — both confirmed working after the fix.

### Addendum 5c: Opus review fixes (2026-07-16)

**Status:** implemented

An Opus `/review-fq-work` pass before shipping found one critical bug and several quality issues, all fixed in this same branch:

- **Critical**: `scheduleSeek`'s `pauseMs === 0` branch only set `audio.currentTime`, never called `.play()` — harmless when called from `handleTimeUpdate` (audio already playing) but silently stalled playback when called from the new `handleChapterEnded` (audio is paused when the native `"ended"` event fires). Fixed: that branch now always calls `audio.play()` (a no-op if already playing).
- **`"none"` (no-stop) could still range-repeat**: the settings sheet hides the whole-range stepper for `stopPoint: "none"`, but didn't reset a previously-set `rangeRepeatCount`, so a stale value from an earlier session under a different stop point would loop the rest of the Quran forever instead of stopping at `114:6`. Fixed by extracting the chaining decision into a pure `decideChapterEnd` helper (`app/utils/recitation.ts` — this is also the pure helper the original plan asked for and Addendum 5's implementation notes had skipped) that explicitly excludes `"none"` from ever repeating a range.
- **`stop-point/route.ts` scope validation used `in`**, which walks the prototype chain (`?scope=toString` would pass validation and produce a malformed Prisma query). Fixed with `Object.prototype.hasOwnProperty.call`.
- **Duplication risk**: the "fetch chapter audio+pages → update refs → set audio.src/currentTime → play()" sequence was copy-pasted in `chainToNextChapter` and `seekToRangeStart`'s reload path — exactly the kind of divergence that produced the critical bug above. Extracted into a shared `loadChapter(reciterId, chapterId, seekVerseKey?)` helper used by both. (The reciter-mid-session-change effect was deliberately left as its own copy — it has a cancellation-guard + conditional-autoplay shape that doesn't map cleanly onto `loadChapter` without added risk of introducing a race for a rarely-hit path.)
- **Minor**: removed a redundant `currentChapterIdRef.current === stopChapterIdRef.current` check in `handleTimeUpdate`'s `isStopVerse` guard — verse keys are globally unique, so matching `verseKey` alone is sufficient.
- **Minor**: `resolveStopTarget`'s DB-backed scopes (page/rub/hizb/juz) only need `verseKey`, not the chapter-audio fetch — restructured to accept `chapterAudioPromise` so `play()` can run it concurrently with `fetchChapterAudio`/`getVersePages` in the same `Promise.all` instead of sequentially after.
- Addenda 5 and 5b were missing `**Status:** implemented` markers despite being done, inconsistent with Addendum 4's convention — added to both, and to this one.

## Addendum 6: Don't force the settings sheet open on "Play from here" (Trello #94)

**Date:** 2026-07-17
**Status:** implemented

**Problem:** `RecitationPlayButton` (the header quick-play button) already plays immediately using stored/default settings, with no forced settings sheet — see the comment above the reciter-default effect in `RecitationContext.tsx` ("lets the header quick-play button start instantly without forcing the settings sheet open first"). But `MarkModal.playFromHere` (`app/components/MarkModal.tsx`) unconditionally calls `openSettings(markFor.verse_key)` instead of `play(markFor.verse_key)`, forcing the settings sheet open on every "Play from here" click even though settings are already persisted in `localStorage` (`recitationSettings`) and `play()` already has the same "no reciter chosen yet" fallback (`settings.reciterId ?? reciters[0]?.id`) the header button relies on.

**Fix:** `MarkModal.playFromHere` calls `play(markFor.verse_key)` directly (then closes the modal), matching `RecitationPlayButton`'s existing behavior. The gear icon in `RecitationPlayerBar` remains the only way to open the settings sheet from the reader; `openSettings`/`settingsStartVerseKey` are otherwise unchanged (still used by that gear-icon path with no start verse).

**Files to Change:**
- `app/components/MarkModal.tsx` — `playFromHere` calls `play(markFor.verse_key)` instead of `openSettings(markFor.verse_key)`.

**Constraints:**
- Do not change `RecitationPlayButton` — it already has the correct behavior; this addendum brings `MarkModal` in line with it.

**What NOT to Do:**
- None known.

**Decisions Made:**
- "Play from here" auto-plays with currently stored/default settings, same as the header quick-play button — confirmed with user 2026-07-17.

### Implementation Notes (2026-07-17)

- Changing `MarkModal.playFromHere` from `openSettings(markFor.verse_key)` to `play(markFor.verse_key)` meant `settingsStartVerseKey` was never set by any caller anymore — `MarkModal` was the only place that ever passed a start verse to `openSettings`. This made `RecitationSettingsSheet`'s `isStartMode`/`handlePlay`/conditional "Play" CTA (added in Addendum 1, for the exact flow this addendum removes) permanently unreachable. Confirmed with user 2026-07-17 to remove it in the same change rather than leave dead code: `openSettings` narrowed from `(startVerseKey?: string) => void` to `() => void`, `settingsStartVerseKey` state/context field removed entirely, and the CTA block (plus its now-unused `Play` icon import) deleted from `RecitationSettingsSheet.tsx`. `RecitationPlayerBar`'s gear icon (`openSettings()`, no arg) is unaffected.
- `messages/{en,ar}.json`'s `recitation.play` key had no remaining consumer after the CTA was removed — pruned manually from both files (an Opus `/review-fq-work` pass flagged it; `npm run extract-translations` only adds new keys, it doesn't prune orphaned ones).
- Verified live in the browser (Playwright): clicked a word → MarkModal → "Play from here" → playback started directly (player bar showed loading → "Pause"/playing, reciter name, advancing verse key) with no settings sheet ever appearing. Separately confirmed the gear icon on `RecitationPlayerBar` still opens `RecitationSettingsSheet` normally, with no orphaned "Play" button at the bottom.
- Pre-existing, unrelated environment gap found during verification: `cmdk` and `@radix-ui/react-popover` (added to `package.json`/`package-lock.json` by Addendum 5b) were never actually installed into `node_modules`, breaking the dev server (`Module not found`) for anyone whose `node_modules` predates that addendum. Fixed by running `npm install` in the main repo (no manifest changes — packages were already locked, just not installed).

## Addendum 7: Fix whole-range repeat never actually looping (Trello #121)

**Date:** 2026-07-24
**Status:** implemented

**Problem:** "Repeat whole range" doesn't repeat — playback reaches the end of the range and stops, even with `rangeRepeatCount > 1` and `perAyahRepeatCount` behaving correctly (confirmed with user; per-ayah repeat is not affected).

**Root cause:** `seekToRangeStart`'s same-chapter branch (`app/contexts/RecitationContext.tsx`, the early-return path guarded by `startChapterId === currentChapterIdRef.current`) seeks `audio.currentTime` back to `startVerseKey` via `scheduleSeek`, but never updates `currentVerseKeyRef.current`. That ref is read as `previousVerseKey` on the next `handleTimeUpdate` tick. Left stale at the stop verse, `isStopVerse` (`previousVerseKey === stopVerseKeyRef.current`) evaluates true again on the very next tick — even though the audio has actually jumped back to the range start — so the code re-enters "reached the stop verse" handling instead of resuming forward playback. This burns through `rangeRepeatsDoneRef` almost immediately across a handful of ticks (timeupdate fires several times/second) and calls `stop()`, all within a fraction of a second. The user never sees a visible replay — just a stop right as the range ends.

This only affects the **same-chapter** seek-back path. The cross-chapter reload path (`loadChapter`, used when the range's start verse is in an earlier chapter than the one currently loaded — e.g. mid-chain juz repeat) already sets `currentVerseKeyRef.current = targetVerseKey` (line 334) and is unaffected — which is why the one cross-chapter test case verified in Addendum 5 passed, while the far more common same-chapter case (`"surah"`, or any `"page"`/`"rub"`/`"hizb"`/`"juz"` range that doesn't cross a surah boundary) was silently broken.

**Fix:** In `seekToRangeStart`'s same-chapter branch, once `startTiming` is found, set `currentVerseKeyRef.current = startVerseKey`, call `setCurrentVerseKey(startVerseKey)`, and call `followPage(startVerseKey)` — before calling `scheduleSeek` — mirroring exactly what `loadChapter` already does on the cross-chapter path.

**Verified test case:** `stopPoint: "surah"`, `rangeRepeatCount: 2`, start `1:1` (Al-Fatiha, single chapter, 7 verses). Playback reaches `1:7` (the stop verse) → `isStopVerse` true → range not exhausted → `seekToRangeStart` seeks back to `1:1` and now also sets `currentVerseKeyRef.current = "1:1"`. Next tick: `activeTiming.verseKey` is `1:1` (or wherever playback actually is), `previousVerseKey` is now `"1:1"` too — `isStopVerse` (`"1:1" === "1:7"`) is false, so playback proceeds normally forward through `1:2`, `1:3`, … `1:7` again. On reaching `1:7` the second time, range-repeats exhausted → `stop()`. Matches the confirmed-good per-ayah-repeat behavior pattern (which already updates this ref correctly on every normal verse advance).

**Files to Change:**
- `app/contexts/RecitationContext.tsx` — `seekToRangeStart`'s same-chapter branch: set `currentVerseKeyRef.current`/`setCurrentVerseKey`/`followPage` for `startVerseKey` before `scheduleSeek`.

**Constraints:**
- Do not touch the cross-chapter branch (`loadChapter` call) — it already handles this correctly.
- Do not change `scheduleSeek`, `handleTimeUpdate`, or `decideChapterEnd` — the bug is isolated to the missing ref update in `seekToRangeStart`.

**What NOT to Do:**
- None known.

**Decisions Made:**
- Root-caused and confirmed with user 2026-07-24: bug is isolated to `seekToRangeStart`'s same-chapter branch not updating `currentVerseKeyRef.current`, not a deeper issue in the repeat-count/decision-tree logic itself.

### Implementation Notes (2026-07-24)

- Verified live in the browser (Playwright) against the dev server, not just by reading the code: set `recitationSettings` in `localStorage` to `{ stopPoint: "surah", rangeRepeatCount: 2, perAyahRepeatCount: 1 }`, started playback at `1:1` (Al-Fatiha, page 1), and seeked near the end of the chapter's audio to reach the natural `"ended"` event quickly. Temporarily added `console.log` calls in `handleChapterEnded` to observe the decision live, confirmed the fix, then removed them before committing — no debug logging shipped.
- Console output confirmed the exact fix behavior: first `"ended"` → `{action: "repeat-range"}` (`rangeRepeatsDone: 0 → 1`), audio audibly restarted from the beginning and played the whole range forward again; second `"ended"` → `{action: "stop"}` (`rangeRepeatsDone: 1`, target `2`, exhausted). Before the fix, the same setup stopped after the first pass.
- This worktree needed `app/generated/{quran-client,app-client}` symlinked from the main repo (git-ignored build artifact, per the Database Split decision) since it isn't regenerated automatically when a worktree is created — the dev server otherwise 500s with `Module not found: Can't resolve '@/app/generated/quran-client'`.

## Addendum 8: Fix stale router.push bullet in DECISIONS.md (Trello #147)

**Date:** 2026-07-26
**Status:** implemented

**Problem:** `docs/architecture/DECISIONS.md`'s "Recitation Playback" section had an internal contradiction. The main Decision paragraph correctly says `RecitationContext` "no longer navigates directly" and that "the old `router.push`-from-context path was removed" when ADR 0028's persistent pager shipped. But the Constraints bullet list right below it still said: "Auto-advance always navigates by exact target page number (`router.push(`${basePath}/${versePageNumber}`)`) — never by the locale-flipped `next`/`prev` href logic." That bullet predates ADR 0028 and was never updated when the `router.push` path was removed in favor of `RecitationFollow` + the pager's `followTo`/`commitTo`.

**Root cause:** Documentation drift — ADR 0028's "Implementation notes (2026-07-24/25)" section already describes the correct current mechanism, but the DECISIONS.md summary's Constraints bullet was never revised to match.

**Confirmed via code read:** `grep -n "router.push" app/contexts/RecitationContext.tsx app/components/reader/RecitationFollow.tsx` returns nothing. `RecitationContext` only tracks/publishes `recitedPage` (the recited verse's page number); `RecitationFollow` (a null-rendering leaf) watches it and, when the recited page leaves the pager's visible window, calls `onFollow(target)` — the pager's `followTo` → `commitTo` (per ADR 0028).

**Fix:** Rewrote the stale Constraints bullet in `docs/architecture/DECISIONS.md`'s "Recitation Playback" section to describe the current `RecitationFollow` → `followTo`/`commitTo` mechanism, citing ADR 0021 and ADR 0028 instead of the removed `router.push` call.

**Files to Change:**
- `docs/architecture/DECISIONS.md` — rewrite the stale "Auto-advance always navigates by exact target page number (`router.push(...)`)" Constraints bullet in the Recitation Playback section.

**Constraints:**
- Docs-only change — no code touched.

**What NOT to Do:**
- None known.

**Decisions Made:**
- Confirmed with user 2026-07-26: no `router.push` remains anywhere in the recitation auto-advance path; the bullet was corrected to reference `RecitationFollow`/`followTo`/`commitTo` and ADR 0021/0028 instead.

### Implementation Notes (2026-07-26)

- `grep -n "router.push" app/contexts/RecitationContext.tsx app/components/reader/RecitationFollow.tsx` returns nothing, confirming the bullet's `router.push` claim was stale.
- Checked the rest of `DECISIONS.md` for other stray `router.push` references: lines 352–395 (the "Reader Page Navigation" section, `QuranSwipeNav`) are unrelated and still accurate — that component genuinely still uses `router.push` for its own swipe-commit path, distinct from recitation auto-advance.
- No dev server needed — docs-only change, no `app/`/`components/`/`lib/`/`prisma/` paths touched.

## Addendum 9: Custom "stop at" point — page or verse, independent of the launch verse (Trello #158)

**Date:** 2026-07-30
**Status:** implemented

### Problem

`stopPoint` (`page`/`surah`/`rub`/`hizb`/`juz`/`none`) always derives the end of playback from a **scope containing the start verse** — "end of this page," "end of this surah," etc. There is no way to pick an arbitrary, independent end point: e.g. "play until page 8" while starting on page 3, or "play until verse 4:10" regardless of what scope that falls in.

### Scope decisions (confirmed with user)

- Added **alongside** the existing five stop points, not a replacement.
- The end point can be **either** a page number or a surah:ayah verse reference (user's choice per range, not fixed to one unit).
- **Start stays exactly as today** — whatever verse launched playback (header quick-play's page-first-verse, or MarkModal's "play from here" clicked verse). There is no new "from" picker. This was a deliberate simplification after considering a full from+to picker: the other five stop points never carry a "from" either (they only ever redefine where an already-started session stops), and giving custom an independent "from" would have required either a separate "Play range" entry point divorced from the existing quick-play/MarkModal flows, or making a stored "from" silently override MarkModal's "play from here" semantics — both rejected.
- Entry is manual number/dropdown inputs in the settings sheet — no click-to-pick-from-the-page flow, fully self-contained in the sheet.
- Verse input is a searchable surah dropdown (mirrors the existing reciter combobox) + a numeric ayah input, not a free-text `"2:5"` field.
- **The picker must make an invalid (before-start) range unreachable in the UI**, not merely validate it after entry. Since MarkModal's "play from here" no longer opens the settings sheet at all (Addendum 6 — it calls `play()` directly), the only place this picker is ever configured is the gear icon on `RecitationPlayerBar`, so the picker is floored against whatever `RecitationContext` already knows as "the relevant verse right now": `currentVerseKey` if a session is actively playing, else `pageFirstVerseKey` (current page's first verse — same default the header quick-play button uses). The one residual gap — configuring custom relative to page N via the gear icon, then separately starting playback elsewhere on an earlier page M via a MarkModal click — is **accepted as out of scope**, no play-time guard. It requires a deliberate multi-step detour, not an accident.

### Data model

- `StopPoint` (`app/types/recitation.ts`) widens to `"page" | "surah" | "rub" | "hizb" | "juz" | "none" | "custom"`.
- New type: `RangePoint = { type: "page"; page: number } | { type: "verse"; surah: number; ayah: number }`.
- Settings gain `rangeTo: RangePoint | null` (persisted via `localStorage`, same as every other recitation setting). No `rangeFrom` — see above.

### New endpoint

`GET /api/quran/pages/[pageId]/bounds` → `jsonResponse({ data: { lastVerseKey, lastChapterId } })`. Mirrors the existing `verses/[verseKey]/stop-point` route's pattern exactly: `quranPrisma.verse.findFirst({ where: { page_number: pageId }, orderBy: { id: "desc" } })` — `findFirst`, never `findUnique` (`Verse.verse_key`/`page_number` are not `@unique`). Only returns the **last** verse of the page (what "to" needs) — no `firstVerseKey`, since nothing in this addendum resolves a "from" from a page.

### Decision tree — resolving the custom stop target

| `rangeTo.type` | Resolution | DB call? |
|---|---|---|
| `"verse"` | `verseKey = ${rangeTo.surah}:${rangeTo.ayah}`, `chapterId = rangeTo.surah` | No |
| `"page"` | `pages/[rangeTo.page]/bounds` → `{ lastVerseKey, lastChapterId }` | Yes |

Plugged into `resolveStopTarget` (`app/contexts/RecitationContext.tsx`) as a new `stopPoint === "custom"` branch, alongside the existing `"surah"` (sync) and DB-scoped (`page`/`rub`/`hizb`/`juz`, via `fetchStopPoint`) branches. Used unchanged by both `play()`'s initial resolution and the existing mid-session stop-point-changed effect. Everything downstream — cross-chapter chaining (`decideChapterEnd`/`chainToNextChapter`), per-ayah repeat, whole-range repeat (stays visible for `"custom"`, same reasoning as `"juz"`/`"hizb"`/`"rub"` — it's a bounded range, not `"none"`), speed, pause — is reused with zero changes.

### Decision tree — constraining the "to" picker (UI only, no DB calls)

Reference verse = `currentVerseKey ?? pageFirstVerseKey` (both already live in `RecitationContext`; `pageFirstVerseKey` added in Addendum 4). Reference page = `recitedPage ?? currentPageNumber` (`recitedPage` already published per Addendum 8's confirmed mechanism; `currentPageNumber` is a new plain-number field alongside `pageFirstVerseKey`, since a verse key alone doesn't carry its page number without a lookup — see Files to Change).

| "to" input | Constraint | Source |
|---|---|---|
| Page number | `min = ` reference page | `recitedPage ?? currentPageNumber`, no lookup |
| Surah dropdown | Excludes any surah `<` reference verse's surah | Parsed from `currentVerseKey ?? pageFirstVerseKey` |
| Ayah number | If selected surah `===` reference verse's surah: `min = ` reference verse's ayah number. Else: capped only by the selected surah's own `verses_count` | Same parse; `verses_count` from `public/quran/chapters.json` |

Both constraints re-run whenever the reference (current verse/page) changes, so a stale "to" from an earlier session doesn't silently become invalid — the picker's bounds are always live.

### Verified test cases

1. **Page → page spanning a surah boundary:** playing page 106 (Addendum 5's known case: `4:176` chapter 4, `5:1`–`5:2` chapter 5). User opens gear icon, selects "Custom point," picker floors at page 106. Sets "to" = page 108. `pages/108/bounds` resolves to some `{lastVerseKey, lastChapterId}` in chapter 5 or later. Since target chapter > current chapter (4), `chainToNextChapter` fires exactly as the existing page-stop cross-surah fix already handles — no new chaining logic needed, just a different (larger) target.
2. **Verse → verse spanning chapters:** start `1:1` (Al-Fatiha). Gear icon floors surah dropdown at 1, ayah at 1. User picks surah 3, ayah 5 → `rangeTo = {type: "verse", surah: 3, ayah: 5}`. Resolved synchronously (no DB call): `stopVerseKey = "3:5"`, `stopChapterId = 3`. Chapter 1 ends → chains to 2 → chains to 3 → reaches `3:5` → stop/repeat logic applies normally, same as the existing juz cross-chapter case.
3. **Page-type "to" while idle on a different page:** nothing playing, viewing page 50. Opens gear icon, picks "Custom point," "to" picker floors page-number input at 50 (from `currentPageNumber`, no lookup) and surah dropdown at whatever `pageFirstVerseKey`'s surah is. Sets "to" = page 52, closes sheet. Later, presses the header quick-play button on page 50 → `play()` starts at page 50's first verse, `resolveStopTarget` resolves `"custom"` → `pages/52/bounds` → stop target is page 52's last verse. Matches what was configured; no drift because both the picker's floor and the actual play start used the same `pageFirstVerseKey`.

### Files to Change

- `app/types/recitation.ts` — `StopPoint` widens with `"custom"`; new `RangePoint` type; settings type gains `rangeTo: RangePoint | null`.
- `app/api/quran/pages/[pageId]/bounds/route.ts` — new. `GET`, returns `{ lastVerseKey, lastChapterId }` for the given page, `findFirst`/`orderBy: { id: "desc" }`, `jsonResponse()` envelope, per `docs/standards/api-conventions.md`.
- `app/utils/recitation-api.ts` — new `fetchPageBounds(pageId: number): Promise<{ lastVerseKey: string; lastChapterId: number }>`.
- `app/contexts/RecitationContext.tsx` — `resolveStopTarget` gains the `"custom"` branch (table above); add `currentPageNumber: number | null` state + `setCurrentPageNumber` alongside the existing `pageFirstVerseKey`/`setPageFirstVerseKey` (Addendum 4); default/persist `rangeTo` in the settings object exactly like every other recitation setting.
- `app/components/reader/RecitationPageSync.tsx` — extend props to also pass the current page's plain number (`pageId`, already known to `ReaderPage`, a Server Component, as a route param) alongside `firstVerseKey`; call `setCurrentPageNumber` in the same `useEffect`.
- `app/components/reader/ReaderPage.tsx` — pass the page number prop to `RecitationPageSync`.
- `app/components/RecitationSettingsSheet.tsx` — add `"custom"` as a 7th `STOP_POINT_OPTIONS` tile (new icon, e.g. `MapPin`); commits immediately on select via `updateSettings({ stopPoint: "custom" })`, same as the other six. When `settings.stopPoint === "custom"`, render an inline "to" picker below the grid: a page/verse type toggle, then either a numeric page input or a surah combobox (reusing the `ReciterCombobox` pattern, sourced from `public/quran/chapters.json`) + ayah number input — bounds per the constraint table above. Any change calls `updateSettings({ rangeTo: {...} })` live.
- `app/contexts/RecitationContext.tsx` (or a small new client-side loader) — fetch `public/quran/chapters.json` once, exposed via context alongside `reciters`, for the surah dropdown's names + `verses_count` caps.
- i18n keys: `recitation.stopPointCustom`, plus labels for the "to" picker (page/verse toggle, page number placeholder, surah/ayah labels).

### Constraints

- Do not give `"custom"` a "from" input or a separate "Play range" entry point — start is always whatever launched playback, unchanged from every other stop point.
- `"custom"` commits to `settings.stopPoint` immediately on radio selection, same as the other six — do not gate it behind a separate confirm/apply action.
- `pages/[pageId]/bounds` returns only `lastVerseKey`/`lastChapterId` — do not add `firstVerseKey`/`firstChapterId` "for symmetry"; nothing in this addendum needs them.
- The "to" picker's bounds must be re-derived from live context state (`currentVerseKey ?? pageFirstVerseKey`, `recitedPage ?? currentPageNumber`) on every render where the sheet is open, not captured once — a stale floor from an earlier session must not persist.
- Do not add a play-time guard for the accepted residual gap (custom "to" configured relative to one page/verse, then playback actually starts elsewhere via a MarkModal click) — confirmed out of scope.
- Whole-range repeat stays visible for `"custom"` (only hidden for `"none"`) — no change to that existing condition.

### What NOT to Do

- Do not replace the existing `page`/`surah`/`rub`/`hizb`/`juz`/`none` stop points — `"custom"` is additive.
- Do not resolve "to" via client-side approximation (e.g. inferring a verse's page from `chapters.json`'s per-surah page range) where an exact DB lookup is cheap and available — the `pages/[pageId]/bounds` endpoint exists specifically to keep the picker's page-type resolution exact.
- Do not let MarkModal's "play from here" open the settings sheet or otherwise interact with `rangeTo` — that flow is unchanged from Addendum 6.
- Do not use `findUnique` for `verse_key`/`page_number` lookups in the new endpoint.

### Decisions Made

- Custom range is additive to the existing six stop points — confirmed 2026-07-30.
- Either page or verse, independently choosable for the "to" point — confirmed 2026-07-30.
- No independent "from" picker — start stays whatever launched playback; custom only ever defines "to" — confirmed 2026-07-30, after weighing and rejecting a full from+to picker (see Problem/Scope decisions above for the rejected alternatives and why).
- Manual number/dropdown inputs, no click-to-pick-from-the-page flow — confirmed 2026-07-30.
- Surah dropdown + ayah number for verse input, not a free-text `"surah:ayah"` field — confirmed 2026-07-30.
- "To" picker must make an invalid (before-start) range unreachable by construction, floored against live `RecitationContext` state — confirmed 2026-07-30.
- The one residual gap (gear-icon-configured custom range vs. a later MarkModal click elsewhere) is accepted out of scope, no play-time guard — confirmed 2026-07-30.

### Implementation Notes (2026-07-30)

- `RecitationPageSync` is rendered by `ReaderPager.tsx`, not `ReaderPage.tsx` — the plan's "Files to Change" named `ReaderPage.tsx` per Addendum 4's original wording, but the persistent-pager refactor (ADR 0028) moved that render call into `ReaderPager` afterward. `pageNumber` is `ReaderPager`'s existing `anchor`/`pageNumber` local, threaded through as a new `RecitationPageSync` prop alongside the existing `firstVerseKey` — no new state derivation needed.
- `resolveStopTarget`'s `"custom"` branch, when `rangeTo` is `null` (stopPoint switched to `"custom"` but the picker was never opened/interacted with), falls back to `"surah"` behavior (end of the start verse's own chapter) rather than resolving to nothing — a defensive default not explicitly specified in the plan, added so an unconfigured "custom" selection degrades gracefully instead of erroring.
- `CustomRangePicker` seeds `rangeTo` to a live default the moment the sheet renders it (`useEffect` — see "the picker's bounds are always live" constraint) rather than waiting for the user's first interaction, so the two are never out of sync: what's displayed always matches what `resolveStopTarget` will actually use, even if the user closes the sheet without touching the picker.
- Reused `MUSHAF_LAST_PAGE` (`app/constants/plans.ts`) for the page input's upper bound instead of a new constant — same value (604) already established for the plans feature.
- Verified via `npm run lint` (clean) and `npx tsc --noEmit` (clean, no errors) in the worktree, plus live in a real browser (Playwright against the dev server, after starting the local `quran-db`/`app-db` containers): opened the settings sheet on `/en/pages/2`, selected "Custom point" — the page-type "to" input defaulted to `2` (the current page, i.e. `pageFirstVerseKey`-derived floor); switched to "Verse" — surah defaulted to "Al-Baqarah" (surah 2) with ayah `1`, and opening the surah dropdown confirmed Al-Fatiha (surah 1) is excluded from the list (floored below `referenceSurah`). Also verified the new `GET /api/quran/pages/[pageId]/bounds` endpoint directly: a real page (`5`) returns `{lastVerseKey: "2:29", lastChapterId: 2}`; an out-of-range page (`9999`) returns `404`; a non-numeric id (`abc`) returns `422`.
- Initially, number inputs in `CustomRangePicker` clamped on every keystroke (`onChange`), which fought typing mid-entry (e.g. typing "12" with a floor of 5 snapped to "5" after the first digit). Fixed by buffering both the page and ayah inputs as local raw-text state, clamping/committing only on blur (or Enter) — verified live: typing "150" showed the unclamped intermediate value at every keystroke, then committed to `150` (in range) on blur; typing "999" (above Al-Baqarah's 286-verse ceiling) likewise showed unclamped while typing, then clamped to `286` only on blur.
- **Critical bug found via `/review-fq-work` (Opus) before shipping, fixed same session:** a persisted `rangeTo` can resolve to a chapter *behind* wherever a session actually starts — not just via the already-accepted "residual gap" (gear-icon-configured range vs. a later MarkModal click elsewhere), but via the much more common flow of configuring custom while viewing one page, then later quick-playing from a different, later page (`rangeTo` survives in `localStorage` across navigations; the picker only re-derives its *floor* while the sheet is open, it doesn't invalidate an already-stored value). Without a guard, `decideChapterEnd`'s "chain to next chapter" branch never finds a chapter match (the stop chapter is already behind) and plays straight through to `114:6` instead of ever stopping. **Fix:** `resolveStopTarget`'s `"custom"` branch now compares the resolved target's `chapterId` against the actual start chapter; if the target is behind, it falls back to `"surah"` behavior (end of the start verse's own chapter) — the same fallback already used for an unconfigured `rangeTo`, now shared via one `resolveSurahFallback` helper instead of duplicated. Verified live: seeded `rangeTo: {type: "page", page: 1}` (chapter 1) via `localStorage`, navigated to page 300 (chapter 18, Al-Kahf), pressed quick-play — audio loaded chapter 18 (not chapter 1, and no error/hang), confirming the fallback engaged rather than the stale target being used as-is.
- Other findings from the same review pass (ayah-ceiling collapsing to floor before `chapters` loads, `fetchChapters` lacking response validation, the corrective effect not capping `rangeTo.page` at `MUSHAF_LAST_PAGE`, missing `try/catch` around the mid-session recompute, `SurahCombobox`/`ReciterCombobox` duplication, and a few naming/placement nits) were reported but **not fixed in this pass** — scoped out as non-critical by the user; left for a follow-up task if picked up later.
- **`main` landed ADR 0033 (multi-mushaf editions) while this branch was open, requiring re-threading before merging — resolved same session, before opening the PR.**

## Addendum 10: Stop recitation when leaving the reader (Trello #152)

**Date:** 2026-08-02  
**Status:** ~~implemented~~ **superseded 2026-09-01 by Addendum 13 / [ADR 0050](../architecture/adr/0050-recitation-global-playback-and-detachable-follow.md)** — the hard stop is removed, playback is app-wide again, and the bar-overlap this addendum reacted to is handled by making the "return to recitation" surface a second row of the nav (`RecitationReturnStrip`): it toggles with the nav overlay on mobile/tablet and pushes content down elsewhere, never floating over it. Everything below is retained for history; the "hard stop, not pause" contract and the "Do not call `togglePlayPause()` instead of `stop()`" guidance no longer apply.

### Problem

When the user plays recitation on a reader page (`/pages/[id]` or `/mushaf/[grant]/pages/[id]`) then navigates to any non-reader route (e.g. `/mushaf` hub), the recitation continues playing and the `RecitationPlayerBar` appears as a fixed bottom bar on the destination page. The bar has no bottom-padding counterpart on non-reader pages, so it overlaps page content.

The original design (ADR 0021) explicitly allowed "background mini-player" behavior — recitation surviving route changes. This addendum supersedes that behavior. **Hard stop on route leave is the new contract.**

### Root Cause

`RecitationPlayerBar` is mounted in the locale layout (above all routes) and renders whenever `status !== "idle"`, regardless of pathname. No stop signal is sent on navigation away from the reader.

### Fix

Add a `useEffect` in `RecitationPlayerBar` **before the early return** (React rules: hooks must not appear after conditional returns). The effect watches `isOnReaderRoute` and calls `stop()` whenever it transitions to `false` while not idle:

```tsx
useEffect(() => {
  if (!isOnReaderRoute && !isIdle) stop();
}, [isOnReaderRoute, isIdle, stop]);
```

- `isOnReaderRoute` and `isIdle` are already computed just above this line — no new state.
- `stop()` is stable (memoized via `useCallback` in `RecitationContext`).
- `isIdle` in the dep array: when `stop()` fires it sets status to "idle", re-running the effect — the `!isIdle` guard makes that re-run a no-op.
- On initial render when the user lands directly on a non-reader page and recitation is already idle: `isIdle` is true, guard skips the call — no spurious stop.

### Updated Decision Tree Row

| Condition | Action (before) | Action (after) |
|---|---|---|
| User navigates away from the reader entirely | Keep playing in background mini-player | **Hard stop** — `stop()` called, bar disappears |

All other rows in the original decision tree are unchanged.

### Files to Change

- `app/components/RecitationPlayerBar.tsx` — add the `useEffect` above the early-return guard (line 41).

### What NOT to Do

- Do not put the stop logic in `RecitationContext` directly (it has no knowledge of routing; route-awareness belongs at the component boundary).
- Do not patch non-reader pages with bottom padding as an alternative fix — the bar should not appear on those pages at all during an active session.
- Do not call `togglePlayPause()` (pause) instead of `stop()` — hard stop was confirmed (Trello #152 discussion, 2026-08-02).

### Decisions Made

- Hard stop (not pause) when leaving the reader — confirmed 2026-08-02.

## Addendum 11: Word-level highlight lands on the wrong DOM copy (Trello #182)

**Date:** 2026-08-03
**Status:** implemented

### Problem

Reported: word tracking "has a lot of issues — sometimes it works, sometimes not; sometimes I open a
recitation, close it and open it again and I lose the tracking."

Three distinct user-visible symptoms, all reproduced live against the dev server (`reactStrictMode:
false`, so none of this is a StrictMode artefact):

1. Tracking is simply absent — audio plays, no word lights up.
2. A word lights up once and then **freezes** there while the recitation moves on.
3. A stale highlight survives Stop, and is still lit alongside the next session's highlight.

### Root Cause

**The reader mounts the same mushaf page more than once at the same time, and the highlight registry
can only remember one element per word.**

`getPagePair(N)` returns `(2⌈N/2⌉−1, 2⌈N/2⌉)`, so `pair(N)` and `pair(N±1)` overlap. In the
single-page layout the pager's three panels (`[next][current][prev]`, ADR 0028) therefore render the
same page in two of them simultaneously. `QuranSpread` always mounts both members of a pair; the
non-current member is hidden by `.fq-spread .fq-safha-partner { display: none }` — display is
CSS-gated rather than JS-gated precisely so it is correct at first paint (ADR 0013 Addendum 4), which
means the hidden copy is fully mounted and registers its word refs like any other.

`RecitationContext`'s `wordRefRegistry` is a `Map<location, HTMLElement>` — one element per location.
Every copy registers under the same key, so the last to attach wins, and which one that is depends on
mount/commit history rather than on which copy is visible.

Two further defects compound it:

- `registerWordRef(location, null)` deletes unconditionally, with no element-identity check. A
  departing panel wipes entries owned by a *surviving* panel — and survivors are `memo`'d and
  **moved** by the keyed window (the load-bearing piece of ADR 0028's no-flicker recenter), so they
  never re-render and never re-register. Those words go dark permanently.
- Both `applyWordHighlight` and `clearHighlight` remove the class *via the registry*. Once the entry
  no longer points at the element that was lit, the class is never removed — the orphan survives
  verse changes, `stop()`, and the next `play()`.

Observed on `/en/pages/3` in the effective single-page layout, mid-playback:

| Panel | Page | State | Highlight |
|---|---|---|---|
| 0 (next) | 3 | `display:none` partner | **live highlight, advancing** |
| 0 (next) | 4 | visible | — |
| 1 (current) | 3 | **visible** | frozen orphan, never updates or clears |
| 1 (current) | 4 | `display:none` partner | — |
| 2 (prev) | 1 | `display:none` partner | — |
| 2 (prev) | 2 | visible | — |

Sampled 3s apart, the hidden copy advanced ﯤ → ﯣ while the visible copy stayed on ﭰ. After pressing
Stop the orphan was still lit; after pressing Listen again there were two lit words on screen.

There is no clean "odd pages work, even pages don't" rule — an earlier code-reading predicted one and
live observation falsified it. The winner is order-dependent, which is exactly why the symptom reads
as intermittent.

### Fix — address highlight targets by attribute, not by registry

Delete the registry. `QuranWord` renders `data-fq-word={word.location}`; the highlighter resolves
targets with `document.querySelectorAll` at the moment it applies the class, and toggles the class on
**every** match. Duplicates and hidden partner copies both receive it, which is harmless — the hidden
one is `display:none` — and the visible one is always correct by construction. There is no
bookkeeping left to go stale, so all three symptoms become structurally impossible rather than fixed
case by case.

Two consequences worth stating: `QuranWord`'s only use of `useRecitation()` was `registerWordRef`, so
it stops consuming the context entirely — roughly 600 word components no longer subscribe to a
context that ticks per recited word, which is what the DOM-based approach was always supposed to
achieve. And the query root is `document`: `RecitationContext` is mounted in the locale layout above
the reader and holds no reader container ref, and the query runs only when the active word *changes*
(~2–4×/second), not on every `timeupdate` tick.

### Decision Tree — applying the highlight

`applyWordHighlight(next)`:

| Condition | Action |
|---|---|
| `next === activeWordLocationRef.current` | no-op (unchanged early return) |
| previous location non-null | query `[data-fq-word="<prev>"]`, remove the class from every match |
| `next` non-null | query `[data-fq-word="<next>"]`, add the class to every match |
| — | set `activeWordLocationRef.current = next` |

`clearHighlight()` follows the same removal path and sets the ref to `null`. `location` values are
`\d+:\d+:\d+` produced by our own static page JSON and sit inside a quoted attribute selector, so the
colons need no escaping.

### Decision Tree — segment resolution

| Layer | Rule | Why there |
|---|---|---|
| `qdc-provider.ts` | Type the wire `segments` as `number[][]` and drop any entry that is not exactly three numbers while mapping to `VerseTiming` | Addendum 2 made the provider the single place QDC's shape is normalized. `VerseSegment` then stays an honest 3-tuple downstream instead of lying about the wire data. |
| `handleTimeUpdate` call site | When `findActiveWordLocation` returns `null`, leave the current highlight in place instead of clearing it | One rule covers both failure modes below. Only `stop()`/`clearHighlight()` clears. |

QDC really does serve malformed segments — confirmed live: reciter 2 surah 2 has 7 two-element
entries, reciter 7 has `[30, 2466306]` at 2:114 and `[50, 6204868]` at 2:255, reciter 161 has a
one-element `[610700]` at 18:31. Destructured as `[, startMs, endMs]` the end is `undefined`, every
comparison is false, and that word silently never lights.

The hold-last rule fixes two things at once: genuine inter-word gaps (89 in surah 2 alone for reciter
7) and verse-boundary skew. Segment times cross verse windows — 2:2's first segment starts at 7595
while its own `timestamp_from` is 7650 — and because `findActiveVerseTiming` picks the verse first
and `findActiveWordLocation` then searches only that verse's segments, roughly 55 ms at every verse
transition matches nothing and blanks the highlight.

Note that all 14 selectable reciters do ship word segments; an earlier concern that some do not was
checked and is wrong (reciter 11 lacks them but is not in the app's list).

### Verified Test Cases

Cases 1–3 are observed on the current code; the "after" column is what the fix must produce.

| # | Case | Observed today | Required after |
|---|---|---|---|
| 1 | `/en/pages/3`, single-page layout, playing | live highlight on page 3's hidden copy in the next panel; visible copy frozen | highlight on every copy, so the visible one tracks |
| 2 | Same session, sampled 3s apart | hidden copy ﯤ→ﯣ, visible copy stuck on ﭰ | both advance together |
| 3 | Press Stop, then Listen again | orphan still lit after Stop; two lit words after replay | Stop clears every copy; replay lights exactly the recited word |
| 4 | Double-page spread, land directly on it | refs for the spread's pages wiped by the `isLgUp` false→true re-key | unaffected — no registry to wipe |
| 5 | Follow-navigation crosses a page boundary mid-playback | new page dark until something re-registers | lit on the next word change; no registration timing at all |
| 6 | Verse boundary 2:1→2:2, reciter 7 | ~55 ms blank at every verse transition | highlight holds through the gap |
| 7 | Malformed segment (reciter 7, 2:114 word 30) | word never lights, highlight clears | segment dropped at the provider; previous word holds |
| 8 | Mushaf edition switch mid-playback (2 ↔ 19) | refs point at torn-down DOM | query resolves against whatever is mounted |

### Files to Change

- `app/components/QuranWord.tsx` — render `data-fq-word={word.location}` on the word `div`. Remove
  `useRecitation()`, `wordRefCallback`, and the `ref` prop; the component keeps `"use client"` for its
  event handlers and `useSearchParams`.
- `app/contexts/RecitationContext.tsx` — delete `wordRefRegistry` and `registerWordRef` (and its
  context-type field). Rewrite `applyWordHighlight`/`clearHighlight` per the table above. Delete the
  `currentWordLocation` state and its context field, keeping `activeWordLocationRef` as the internal
  source of truth. In `handleTimeUpdate`, only call `applyWordHighlight` when
  `findActiveWordLocation` returns a location.
- `app/lib/recitation/qdc-provider.ts` — widen the wire DTO's `segments` to `number[][]` and filter to
  three-number tuples when mapping.
- `app/constants/recitation.ts` — update the comment above `RECITATION_HIGHLIGHT_CLASS` to describe the
  attribute-query mechanism.
- `app/globals.css` — update the comment above `.fq-recitation-active-word` for the same reason. No
  rule changes.
- `docs/architecture/adr/0021-recitation-playback.md` — Addendum superseding the ref-registry mechanism.
- `docs/architecture/DECISIONS.md` — rewrite the highlight-mechanism constraint under Recitation
  Playback; add the duplicate-mount invariant under Reader Navigation — Persistent Client Pager.

`app/utils/recitation.ts` is deliberately **not** changed: with the provider filtering malformed
segments, `findActiveWordLocation` is already correct and double-guarding it would re-introduce the
dishonest-type problem the provider fix removes.

### Constraints

- `currentWordLocation` is removed because it has no consumers — verify with a grep before deleting
  rather than trusting this line, and if one has appeared since, convert it rather than dropping it.
- Do not reintroduce any per-word React state on the provider. Its `setState` rebuilds the context
  object ~4×/second, re-rendering every consumer including the whole word tree — the exact cost the
  DOM-based highlight exists to avoid (ADR 0021 Consequences, and the Recitation Playback constraint
  in DECISIONS.md).
- Toggle the class on **every** match, never on "the first" or "the visible" one. Picking a winner is
  the bug; not needing a winner is the fix.
- Keep the `next === activeWordLocationRef.current` early return — without it the DOM query would run
  on every tick instead of only on word changes.
- The attribute must be `data-fq-word`, carrying `word.location` verbatim, on every `QuranWord`
  including end-of-verse markers — the previous registry registered all of them and QDC's segment
  numbering assumes that.
- Do not change the pager's three-panel window or the CSS partner gating to remove the duplicate
  mount. The window size is fixed by ADR 0028 ("the mounted panel window stays at three") and the
  CSS-driven display gate by ADR 0013 Addendum 4 (correct at first paint). Duplicate mounting is a
  property the highlight must tolerate, not a defect to remove.

### What NOT to Do

- Do not keep the `Map` and store a `Set<HTMLElement>` per location instead. It works, but it keeps a
  bookkeeping invariant that can drift again, needs `QuranWord` to hold its own element ref (React 18
  ref callbacks receive `null` on cleanup and cannot return a cleanup function), and leaves the word
  tree subscribed to the context. Considered and rejected 2026-08-03.
- Do not dedupe the render so a page mounts once — see the ADR 0028/0013 constraint above.
- Do not scope the highlight query to a reader container. `RecitationContext` sits above the reader in
  the locale layout and has no such ref; adding that plumbing buys nothing at 2–4 queries/second.
- Do not switch the highlight to `requestAnimationFrame` in this task. `timeupdate`'s ~4 Hz does mean
  late transitions and skipped sub-250 ms words, but it drives verse advance, repeat and stop as well,
  so splitting the clock needs its own verification pass. Deferred to a follow-up ticket — re-evaluate
  once this fix is in.
- Do not treat "some reciters have no word timings" as in scope. It was investigated and is false for
  all 14 selectable reciters.

### Decisions Made

- Scope is the registry fix, segment robustness, and the `currentWordLocation` deletion; rAF is
  deferred — confirmed with user 2026-08-03.
- Mechanism is the `data-fq-word` attribute query rather than a `Set`-valued registry — confirmed with
  user 2026-08-03, on the grounds that it removes the bug class instead of an instance and drops the
  word tree's context subscription as a side effect.
- Root cause confirmed by live observation, not code reading alone — an earlier code-derived
  prediction that failures follow page parity was falsified in the browser and must not be repeated in
  the implementation or the tests.

### Implementation Notes (2026-08-03)

- The duplicate mount was confirmed straight from the DOM rather than inferred: on `/en/pages/3`,
  `document.querySelectorAll('[data-fq-word="2:6:1"]')` returns **2** elements out of 637 tagged
  words. That is the premise the whole fix rests on, and it is now checkable in one line.
- `setWordHighlightClass(location, on)` is a module-level function in `RecitationContext.tsx`, not a
  `useCallback` — it closes over nothing, so keeping it out of the component avoids a needless
  identity. `applyWordHighlight` narrowed from `(string | null)` to `(string)`, since the caller now
  guards the null case to implement hold-last.
- Verified live against the worktree dev server, sampling the DOM ~1×/second during real playback
  (reciter Mishari al-`Afasy, surah 2, `stopPoint: "surah"`):
  - **Both copies track in lockstep.** `2:7:7 → 2:7:8 → 2:7:9 → 2:7:10 → 2:7:11 → 2:7:12 → 2:8:1 →
    2:8:2 → 2:8:3`, with the visible copy lit at every sample. Before the fix the hidden copy
    advanced alone while the visible one sat frozen.
  - **No verse-boundary blink.** The `2:7:12 → 2:8:1` transition showed exactly two lit elements at
    every sample and never zero — the hold-last rule covering the ~55 ms of segment/verse skew.
  - **Stop clears completely.** Zero elements carry the class after Stop; before, the frozen orphan
    survived it.
  - **Replay lights exactly one word.** No accumulation across sessions; before, replay left the old
    orphan lit alongside the new highlight.
  - **Page 4 (an even page, structurally dead before) tracks**, confirmed visually as well as in the
    DOM — the highlight sits on ظُلُمَٰتٍ in verse 2:17.
- `npx tsc --noEmit` and `npm run lint` both clean.
- Out-of-scope doc drift fixed in passing, in a sentence already being rewritten:
  `COMPONENTS.md`'s `RecitationContext` entry still described page auto-advance as `router.push`.
  Addendum 8 corrected exactly that claim in `DECISIONS.md` but missed this file; it now names
  `recitedPage` → `RecitationFollow` → `followTo`/`commitTo` per ADR 0028.

---

## Addendum 12: Controlled Recitation & Range Repeat UX (Issues #390–#394)

**Date:** 2026-08-25
**Status:** ready-to-implement
**Type:** feature
**GitHub:** epic #390; children #391, #392, #393, #394

Four coordinated changes to controlled recitation practice:

1. **#391 — Quick per-ayah repeat cycle button** on the player bar & rail.
2. **#392 — Draft state + explicit "Apply / Start" action** in the settings sheet.
3. **#393 — Symmetrical "Start from" scope + dual range picker** in the sheet. Blocked by #392.
4. **#394 — Range-progress badge on the player bar.** MarkModal is explicitly NOT touched (user decision 2026-08-25 — the issue's original MarkModal scope was dropped). Blocked by #392/#393.

Implementation order follows the dependency chain: #391 and #392 first (independent), then #393, then #394.

### Decisions confirmed with user (2026-08-25)

| # | Decision |
|---|---|
| D1 | #391 cycle order: `1 → 2 → 3 → ∞ → 1`. Tap mid-verse affects the **current verse**: reset `perAyahRepeatsDoneRef` only, **no seek** — the in-flight playthrough counts as repetition 1 of the new count. Idle tap just persists the setting. Allowed during override sessions (per-ayah repeat stays user-owned under an override). |
| D2 | Draft covers everything *inside* the sheet. The two reciter triggers on `RecitationPlayerBar` itself stay instant-commit (outside the sheet, backed by the existing mid-session reciter-reload effect). Bar quick-play always starts at the current page's first verse and never consumes a stored start point. |
| D3 | Mid-session Apply commits everything shown **including Start From**: seek to the drafted start verse, reset repeat counters, continue forward. |
| D4 | Start From is **per-session, derived on every open, never persisted**: preset = Current Verse while playing/paused, Current Page while idle. No new localStorage key. |
| D5 | Preset resolution: Current Verse → reference verse key (sync); Beginning of Surah → parse surah, ayah 1 (sync); Current Page → `fetchPageBounds().firstVerseKey` (endpoint already returns it); Beginning of Rub' → needs the reference verse's rub's first verse (**new endpoint support** — existing stop-point route resolves only last verses). Custom mirrors `CustomRangePicker`'s inputs with no floor (a start may be 1:1). |
| D6 | Start ≤ End enforced by **mutual push-apart**, never an error state or disabled Apply: editing Start past End raises End; lowering End below Start lowers Start. Applies to custom inputs live; presets validated at selection time with the same push applied. Equality allowed (single-verse practice window). Start 1:1 + Stop "none" (114:6) legal. |
| D7 | ~~#394 badge is **bar-only**… shows verse index/length + per-ayah repeat counter/target…~~ **Removed 2026-09-01 (Addendum 13)** — it duplicated a verse number next to the new location label. |

### Explicit supersessions

- **Addendum 9's "no independent 'from' picker"** (confirmed 2026-07-30) is superseded for the settings-sheet path only: the sheet gains a Start From picker. The underlying principle survives everywhere else — bar quick-play and MarkModal "Play from here" still start wherever they launch; a stored start never overrides a launch position (nothing is stored — D4 makes this structural).
- **Addendum 9's "displayed value always matches what `resolveStopTarget` will use"** invariant is deliberately broken inside the open sheet by the draft model (#392): between opening and Apply, displayed ≠ committed. Addendum 9's play-time guard (`resolveStopTarget`'s behind-chapter fallback) becomes more important, not less — it must keep working unchanged.
- **Addendum 6 removed `openSettings(startVerseKey)` as dead code.** It is NOT reintroduced — MarkModal keeps its single instant-play button (user decision above).

### #391 — Repeat cycle button

**Placement:** `fq-rail-utils` zone of `RecitationPlayerBar`, left of the settings gear (bar form) / stacked above it (rail form). Visible whenever the bar renders (both idle-on-reader and playing) — pre-setting repeats before pressing play is the point.

**Behavior:** click cycles `settings.perAyahRepeatCount` through `1 → 2 → 3 → ∞ → 1` via `updateSettings({ perAyahRepeatCount })`.

Decision tree:

| State | Tap action |
|---|---|
| Idle | Persist setting only (same code path — `updateSettings`; no session exists to affect) |
| Playing/paused, mid-verse | `updateSettings(...)` **plus** context-exposed `resetPerAyahRepeat()`: sets `perAyahRepeatsDoneRef.current = 0`. No seek, no counter bump on the in-flight pass (it counts as rep 1) |
| Override session active | Same as playing — per-ayah repeat is not part of the override contract |

**Indicator:** the button shows its current value — numeral `2`/`3`, `∞` glyph, or a dimmed `1×`-style rest state — with distinct active styling when > 1. Full i18n tooltip/aria-label ("Repeat each ayah: 2 times", Arabic mirrored) in `messages/{en,ar}.json`. CSS: reuse `.fq-chrome-btn`; rail needs no new zone (joins existing `fq-rail-utils`). Rail layout invariant untouched (ADR 0021 / Desktop Reading Group constraints — one more icon in the existing utilities stack).

### #392 — Draft state & Apply/Start

`RecitationSettingsSheet` refactors from direct `updateSettings` per control to:

- `const [draft, setDraft] = useState<RecitationSettings>` — initialized from committed `settings` each time the sheet **opens** (key the Sheet content on `isSettingsOpen` or re-seed via effect on open).
- Every control reads/writes the draft. Nothing touches global state or localStorage until commit.
- **Sticky footer** (outside the scroll area, pinned bottom of the sheet):
  - status idle → primary button "Start Recitation" / ابدأ التلاوة: commits draft (`updateSettings(draft)`), then `play(resolvedStartVerseKey)` using the drafted Start From (D5/D6 resolution).
  - status loading/playing/paused → primary button "Apply Changes" / تطبيق التغييرات: commits draft; the existing mid-session effects handle stop-target re-resolution, reciter reload, speed. Additionally, if the drafted Start From differs from the current position (D3): seek to the drafted start verse via a new context method (reuse `seekToRangeStart`'s mechanics but targeting the drafted key; reset both repeat counters), without stopping playback.
  - Secondary close action (existing header X / back gesture) **discards the draft** — `useCloseOnBackGesture(isSettingsOpen, closeSettings)` contract preserved (ADR 0043); Radix portal-container ref contract for inner Popovers preserved (Addendum 5b).
- Reciter field inside the sheet joins the draft: changing it in the sheet does NOT reload audio until Apply (differs from today). The bar's reciter triggers remain instant (D2).
- The `activeOverride` read-only banner and its disable-gating of Stop-at/whole-range controls carry over unchanged (gating now applies to draft writes).

### #393 — Start From picker

Sheet section inserted directly **above** "Stop at" so the pair reads as one range unit.

**Presets** (pill grid mirroring STOP_POINT_OPTIONS styling):

| Preset | Resolves to | Cost |
|---|---|---|
| Current Verse (default) | `currentVerseKey ?? pageFirstVerseKey` | sync |
| Current Page | page's first verse | `fetchPageBounds(page).firstVerseKey` |
| Start of Surah | `${refSurah}:1` | sync |
| Start of Rub' | first verse of ref verse's rub | new endpoint (below) |
| Custom | page input OR surah combobox + ayah input (mirror `CustomRangePicker`) | sync/`fetchPageBounds` |

**New endpoint:** extend `GET /api/quran/verses/[verseKey]/stop-point` with `?scope=rub-start` (or a sibling `rub-first` param) returning the FIRST verse of that rub instead of the last — `findFirst({ orderBy: { id: "asc" } })` on the verse's own `rub_el_hizb_number`. Same route pattern; `findFirst`, never `findUnique`; edition-independent like rub/hizb/juz (text division).

**Reference derivation (per open, D4):** playing/paused → `currentVerseKey` (+ `recitedPage`); idle → `pageFirstVerseKey` (+ `currentPageNumber`). Never persisted.

**Mutual push-apart (D6):** the drafted range is `{start: RangePoint, end: RangePoint}` compared as ordered verse keys (resolve both to comparable form synchronously where possible; page-type points resolve via `fetchPageBounds` — cache the resolution per draft edit). Editing any input pushes the opposing side so `start ≤ end` always holds; equality allowed. The existing End picker's floor switches from live-reference to drafted-start.

**Cross-surah ranges:** engine unchanged (`decideChapterEnd`/`chainToNextChapter` already chain; custom stop already resolves cross-chapter). Only the UI floor logic reverses as above.

**Idle "Start Recitation":** resolves the drafted start (Custom Page → `fetchPageBounds().firstVerseKey`; presets as the table above) then calls `play(resolvedKey)`. If resolution fails (offline, bad page), fall back to `pageFirstVerseKey` and surface nothing fancy — mirror `play()`'s existing failure path.

### #394 — Progress badge

> **Removed 2026-09-01 (Addendum 13, user decision).** The `الآية ١/٦` badge read as a
> second, conflicting verse number next to the new `آية … سورة … صفحة …` location label on
> the bar, and it was the only consumer of `rangeProgress` / `perAyahProgress`. The two
> state pairs, `publishRangeProgress`, every `setPerAyahProgress` call, the context-type
> fields, the `rangeProgress*` i18n keys, and the badge markup are all deleted.
> `perAyahRepeatsDoneRef` / `rangeRepeatsDoneRef` and `resolveRepeatTarget` stay — they
> drive the actual repeat engine, not the badge.

- ~~`RecitationContext` publishes two new state pairs, set ONLY where the refs already mutate (verse-transition branch of `handleTimeUpdate`, per-ayah repeat branch, `seekToRangeStart`, `loadChapter`, `stop`/`play` resets):~~
  - `rangeProgress: { currentIndex: number; length: number } | null`
  - `perAyahProgress: { done: number; target: number } | null`
- Computed once per `play()` from `verseTimingsRef` (index of `startVerseKey` → index of resolved `stopVerseKey` within the loaded chapter, plus cross-chapter accumulation when chaining — length = total verses spanned, matching how `decideChapterEnd` walks chapters).
- Badge markup in `RecitationPlayerBar`'s info block, under the verse-key line: `"Ayah {i}/{n} • Repeat {d}/{t}"`, tabular-nums, muted; hidden when `status === "idle"` or `rangeProgress == null` (covers `stopPoint: "none"` — no bounded range — and overrides are shown normally since they ARE bounded ranges). Bar-only; the rail hides `.fq-recitation-info` wholesale already.
- i18n keys with numeric interpolation, ar + en.

### Files to Change

- `app/components/RecitationPlayerBar.tsx` — #391 cycle button (utils zone); #394 badge in info block.
- `app/components/RecitationSettingsSheet.tsx` — #392 draft refactor + sticky footer CTA; #393 Start From section + push-apart logic.
- `app/contexts/RecitationContext.tsx` — #391 `resetPerAyahRepeat()`; #392 apply-time seek-to-drafted-start method; #393 start-point resolution helpers consumed by the sheet; #394 progress state publication.
- `app/api/quran/verses/[verseKey]/stop-point/route.ts` — #393 rub-first-verse scope.
- `app/utils/recitation-api.ts` — fetch wrapper for the new scope.
- `app/globals.css` — minor: active-state styling for the cycle button indicator; sticky-footer layout class for the sheet (or plain Tailwind in component — prefer Tailwind, add CSS only if the rail demands it).
- `messages/en.json`, `messages/ar.json` — all new keys (cycle tooltips ×4 states, Start section labels + presets ×5, Apply/Start CTAs ×2, badge format strings).
- `docs/architecture/DECISIONS.md` — Recitation Playback section: record the Addendum 9 supersession (sheet-only Start From picker, draft model breaking display==committed inside the open sheet) at implementation time.

### Constraints

- The ~4Hz constraint holds: progress state updates only on verse/repeat changes, never per tick; highlight mechanism (ADR 0021 2026-08-03 addendum) untouched.
- `useCloseOnBackGesture` (ADR 0043) and the Popover-in-Sheet portal container (Addendum 5b / popover.tsx `container` prop) contracts preserved through the sheet refactor.
- Rail invariants (Desktop Reading Group): the new button joins `fq-rail-utils`; no zone restructuring, no width change, no `!important` battles beyond the file's established patterns.
- `findFirst` (never `findUnique`) for all verse_key/page_number lookups in the extended endpoint.
- Draft discard on close must leave localStorage byte-identical when nothing was applied.
- Override semantics unchanged: overrides still bypass resolveStopTarget; sheet gating during overrides applies to draft edits exactly as it did to direct edits.

### What NOT to Do

- Do NOT touch `MarkModal` — no second recitation button there (explicitly dropped from #394, user 2026-08-25). No reintroduction of `openSettings(startVerseKey)`.
- Do NOT persist Start From anywhere — no localStorage key, no merge into `RecitationSettings` storage shape.
- Do NOT make the bar's reciter triggers draft-based or remove them.
- Do NOT let bar quick-play consume a stored/drafted start point — it always plays `pageFirstVerseKey`.
- Do NOT validate ranges with error states or a disabled Apply — mutual push-apart only (D6).
- Do NOT restart audio or seek when committing a draft whose Start From equals the current position (Apply should be a no-op audibly when nothing moved).
- Do NOT show the badge on the rail or when unbounded (`stopPoint: "none"`).
- Do NOT revive the deleted `recitation.play` i18n key pattern carelessly — new keys get used immediately by their components; prune-or-use is checked at review.

### Verified test cases (agreed interactively 2026-08-25)

1. Playing v5 of ×2 on pass 1, tap ×3 → counter resets; pass counts as 1/3; two more passes follow. (D1)
2. Tap ∞ mid-loop from ×3 → finishes current pass, loops forever. (D1)
3. Tap ∞→1 mid-loop → finishes pass, advances normally. (D1)
4. Idle tap → persists only; next play uses it. (D1)
5. Open sheet idle p20 (start=Current Page, stop=End of page) → Start plays p20 first→last verse. 
6. Playing 3:15, open sheet → start preset reads Current Verse (3:15). (D4)
7. Start=Start-of-Surah in s3, end unchanged unless pushed invalid. (D6)
8. Custom end 5:5 with start 2:10 → chains 2→3→4→5, stops 5:5. (engine unchanged)
9. Set custom start past drafted end → end auto-raises. (D6)
10. Playing 2:100, draft start 2:255, Apply → seeks, counters reset, continues. (D3)
11. Draft edits, dismiss via back gesture/X → committed settings byte-identical, playback untouched. (D2/Constraints)
12. ~~Range 2:10–2:27 at 2:12 pass 2/3 → badge "Ayah 3/18 • Repeat 2/3".~~ Badge removed (Addendum 13).
13. ~~`stopPoint: "none"` playing → no badge. Rail → no badge.~~ Badge removed (Addendum 13).

## Addendum 13: Global playback + detachable follow + return panel (Issue #467)

**Status:** implemented (branch `feature/467-recitation-global-playback`). Supersedes
Addendum 10 (ADR 0021's 2026-08-02 hard-stop) per user decision 2026-08-30. New
[ADR 0050](../architecture/adr/0050-recitation-global-playback-and-detachable-follow.md).

### Problem

Two behaviors from the original recitation design were judged wrong in practice and both
are reversed here:

1. **Hard stop on route leave (Addendum 10 / ADR 0021 2026-08-02).** Leaving any `/pages/`
   route kills playback. A user who taps Marks / Home / a notification mid-recitation loses
   their place and the audio. The fix that motivated the hard stop (Trello #152 — the
   full-width `RecitationPlayerBar` had no bottom-padding counterpart on non-reader pages and
   overlapped their content) is addressed differently here: the way back to a detached
   recitation is **a second row of the nav** (`RecitationReturnStrip`). On mobile/tablet it
   toggles with the nav overlay; on desktop and every non-reader route it pushes content
   down. It never floats over content.

2. **Forced follow-snap on manual navigation (DECISIONS.md "Recitation Playback", the
   "swiping away while playing snaps back" bullet).** While playing, the `RecitationFollow`
   leaf pulls the visible window back to the recited page on *every* anchor change, so the
   user cannot swipe/jump elsewhere to check a reference without being yanked back within a
   frame. The deliberately-deferred trade-off noted in that same bullet ("change the follow
   to trigger only when `recitedPage` advances, not on every anchor change") is now taken.

### Behavior

Playback has one lifecycle for the whole app: it starts, and it ends only when the user
stops it, it finishes its range, or a hard error kills it. Navigation — page swipe, arrows,
keyboard, sidebar/search jump, top-level route switch, closing the reader — never stops it.

**Follow is a two-state attach/detach machine**, owned by `RecitationContext` as a single
`isFollowing: boolean`:

- **Attached** (`isFollowing === true`): the reader is showing the recited page and tracks
  it. Auto-advance across a page boundary pulls the visible window forward (unchanged
  `onFollow` → pager `followTo`). This is the state after the leaf sees the recited page in
  the visible window, and after the user returns to it.
- **Detached** (`isFollowing === false`): the user has navigated away from the recited page
  on purpose, has left the reader route, or started the session off-reader entirely. The
  reader does **not** snap back. Audio keeps playing on its own timeline. The **return
  panel** appears.

Transitions, all decided inside the `RecitationFollow` leaf via the pure
`decideRecitationFollow` (no `ReaderPager` change — the pager must not subscribe to a context
that ticks per recited verse):

| From | Trigger | To |
|---|---|---|
| any | recited page is in the visible window (returned, or swiped back onto it) | attached |
| fresh session, start page not on screen (`prevRecitedPage == null`) | — | `onFollow` pulls the reader to it, then attaches |
| attached | `recitedPage` moved, anchor did not (auto-advance crossed a boundary) | stays attached, `onFollow` fires |
| attached | visible window changed under the reader (double-view toggle, breakpoint) | stays attached, `onFollow` fires |
| attached | anchor moved, `recitedPage` did not (a clean manual navigation) | detached |
| attached | `RecitationFollow` unmounts (left the reader route) | detached |
| — | `stop()` / a failed `play()` | `isFollowing` reset `false`; panel gone because `status === "idle"` |

The leaf distinguishes "auto-advance moved the recited page" from "user moved the anchor" by
diffing the previous `recitedPage` / `anchor` against the current via refs — the same values
it already receives as props / context.

### The "return to recited page" affordance — `RecitationReturnStrip`

The way back to a detached recitation must **never float over content** (design-principles:
"chrome reserves space, never overlaps the mushaf"). It is **a second row of the nav** — a
new client component `RecitationReturnStrip`, rendered as the last child inside `<nav>`
(`app/components/nav/Nav.tsx`), consuming `useRecitation()` / `useReaderNavigation()` itself
so `Nav` doesn't re-render per recited verse.

- **Renders iff** `status !== "idle" && !isFollowing && recitedPage != null`. One surface,
  every route.
- **Being a flow child of `<nav>`** is what makes it correct everywhere:
  - **mobile/tablet reader** — the nav is a `position: fixed` overlay that hides with
    `transform: translateY(-100%)` (its own height). A taller nav still hides completely, so
    the strip **toggles with the chrome** exactly like the rest of the nav — visible only
    when the reader chrome is revealed, floating over the mushaf header band then, gone while
    reading. (This is the behaviour the user asked for.)
  - **desktop reader + every non-reader route** — the nav is `relative` in flow, so the
    strip **pushes content down**; it never covers it.
- **`--fq-nav-extra`**: while mounted, the strip adds `.fq-recitation-strip-open` to `<html>`
  (effect + cleanup). `:root { --fq-nav-extra: 0px }` → `2.75rem` when open. The desktop
  reader's flow `min-height` (`.fq-reader-outer` at `@media (min-width: 1367px)`,
  `calc(100dvh - 70px - var(--fq-nav-extra))`) and non-reader `<main>`
  (`calc(100dvh - 3.5rem - var(--fq-nav-extra))`) subtract it, so a short page stays exactly
  one screen — no sliver of scroll. Mobile/tablet reader is `position: fixed` and ignores it.
- **Content:** the **Return** link is the only text — `RotateCcw` + one combined string
  `recitation.returnToRecitedVerse` = `العودة إلى صفحة {page} · سورة {surah} · آية {ayah}`,
  `text-[10px]`, `truncate`, `--primary` accent — plus a play/pause button (`togglePlayPause`,
  shown while `playing`/`paused`) and a `fq-chrome-btn` **Stop**. Falls back to
  `recitation.returnToRecitedPage` ("back to page {page}") until `chapters` resolves.
  Inherits the nav's `.fq-chrome-bar` face; its own hairline is a Tailwind `border-t`.
- **Return** → `<Link href={/pages/{recitedPage}}>` + the `jumpTo`-handoff-on-click
  (`ContinueReadingLink` shape): reader mounted → `jumpTo(recitedPage)` (client-side, grant
  reader too); reader unmounted → the `<Link>` navigates. Accepted limitation, identical to
  `ContinueReadingLink`: an off-reader return lands on the **self** reader `/pages/…`.

### Recited-verse label + badge removal

- New pure helper `recitedVerseLabelParts(verseKey, page, chapters, locale)` in
  `app/utils/recitation.ts` → `{ ayah, surah, page }` (pre-localized via `toLocaleNumeral`;
  surah = `name_arabic` for `ar`, `name_simple` otherwise), or `null` until resolvable.
- `RecitationPlayerBar`'s bare `currentVerseKey` line (and the strip's, folded into the
  Return link above) becomes `recitation.recitedVerseLabel` =
  `آية {ayah} سورة {surah} صفحة {page}`, dropped to `text-[10px]`. Both components now read
  `recitedPage` + `chapters` from context.
- **The #394 range-progress badge is removed** (see Addendum 12's struck section):
  `rangeProgress` / `perAyahProgress` state + `publishRangeProgress` + every
  `setPerAyahProgress` call + the context-type fields + `formatRangeProgress` +
  `recitation.rangeProgress*` keys, all deleted. It duplicated a verse number next to the
  new label. The repeat *engine* (`perAyahRepeatsDoneRef`, `rangeRepeatsDoneRef`,
  `resolveRepeatTarget`) is untouched.

### `RecitationContext` changes

- New state `isFollowing` (init `false`) + stable `setIsFollowing`, added to the context
  value. `stop()` and the `play()` failure path reset it `false`. **`play()` does NOT force
  it `true`** — only `RecitationFollow` (reader-mounted) may attach. A session started
  off-reader (a listening wird from `/plans`, an offline download from Settings) therefore
  stays detached, so `RecitationReturnPanel` is the surface that can stop it or jump into the
  reader. (An earlier draft force-attached in `play()`, which left an off-reader session with
  *no* UI at all — worse than the old hard stop.)
- `play()` resolves and publishes `recitedPage` **synchronously at session start**
  (`const page = versePages[verseKey]; if (page != null) setRecitedPage(page)` right after
  `versePagesRef.current = versePages`). Today `recitedPage` stays `null` until the first
  verse *boundary* (the mount-time `[mushafId, getVersePages]` effect doesn't re-run on
  `play`, and the first `timeupdate` tick is the same verse so it skips `updateRecitedPage`).
  The panel and the leaf both need a correct `recitedPage` from the first frame of playback.

### `RecitationFollow` changes

Thin wrapper over `decideRecitationFollow` (`app/utils/recitation.ts`) — the whole decision
is that pure function so it is exhaustively unit-tested without a DOM. The leaf holds
`prevRecitedPage` / `prevAnchor` refs and applies the result:

- `prevAnchor` advances every run; **`prevRecitedPage` does not advance on a `follow`** —
  `onFollow` (`ReaderPager.followTo`) silently drops the request during a drag/commit, and a
  stale `prevRecitedPage` is what makes the next tick retry until it lands.
- `attach` / `follow` → `setIsFollowing(true)` (the `follow` case also fires `onFollow`);
  `detach` → `setIsFollowing(false)`.
- A `prevRecitedPage == null` (fresh session) whose start page isn't on screen resolves to
  `follow`, so "play from here" on a far mark still pulls the reader — without `play()`
  needing to force-attach.
- `follow` also covers "the visible window changed under an attached reader" (double-view
  toggle, breakpoint cross) — nothing moved but the recited page dropped out of view.
- Mount-cleanup `useEffect(() => () => setIsFollowing(false), [setIsFollowing])` — leaving
  the reader is a detach.

### `RecitationPlayerBar` changes

- **Delete** the hard-stop `useEffect` (`if (!isOnReaderRoute && !isIdle) stop()`).
- Render gate → reader routes only (`if (!isOnReaderRoute) return null;` then
  `if (isIdle && !pageFirstVerseKey) return null;`). Drop the now-dead `isOnReaderRoute`
  branches. Nothing else — the bar does not carry the return affordance (an earlier
  iteration put it in `fq-rail-utils`; the user found it too easy to miss).
- Update the top-of-file comment block.

### Files to Change

- `app/contexts/RecitationContext.tsx` — `isFollowing` state + setter + context value;
  `play()` publishes `recitedPage` synchronously (does NOT force `isFollowing` — only the
  leaf attaches); `stop()` + the `play()` failure path reset `isFollowing`. **Deletes** the
  #394 `rangeProgress` / `perAyahProgress` state, `publishRangeProgress`, every
  `setPerAyahProgress` call, and the two context-type fields.
- `app/components/reader/RecitationFollow.tsx` — attach/detach machine (thin wrapper over
  `decideRecitationFollow`; keeps `prevRecitedPage` stale on a `follow`; unmount → detach).
- `app/components/RecitationPlayerBar.tsx` — remove hard stop; reader-route-only render gate;
  drop dead `isOnReaderRoute` branches; verse-key line → `recitedVerseLabel` at `text-[10px]`;
  **delete** the #394 progress badge + `formatRangeProgress`; comments.
- `app/components/recitation/RecitationReturnStrip.tsx` — **new**; the second nav row
  (Return link carrying the combined `returnToRecitedVerse` string + play/pause + Stop),
  toggles `.fq-recitation-strip-open` on `<html>` while mounted.
- `app/components/nav/Nav.tsx` — render `<RecitationReturnStrip />` as the last child of `<nav>`.
- `app/utils/recitation.ts` — `decideRecitationFollow` **and** `recitedVerseLabelParts`
  helpers (+ `app/utils/recitation.test.ts`).
- `app/hooks/use-is-reader-route.ts` — **new**; extracted the `pathname.includes("/pages/")`
  predicate (now render-decision-load-bearing per ADR 0050). Migrated `RecitationPlayerBar`,
  `Nav`, `PlansWidget` onto it too.
- `app/components/reader/ReaderPager.tsx` — `followTo` comment only (now attached-follow-only,
  and the retry story changed).
- `app/globals.css` — `--fq-nav-extra` (0 → 2.75rem under `:root.fq-recitation-strip-open`);
  subtract it in the desktop-reader `.fq-reader-outer` `min-height` and the non-reader
  `main` `min-height` so a short page stays exactly one screen. Strip styling is Tailwind on
  the component (it inherits the nav's `.fq-chrome-bar` face).
- `app/[locale]/layout.tsx` — no new mount (the strip is inside `<Nav />`).
- `e2e/tests/recitation-lifecycle.spec.ts` — **new**; the lifecycle suite (route-leave,
  page-away, return, stop, pause/resume; a mobile overlay-toggle case; recitation APIs + a
  silent-WAV data URI stubbed via `page.route`).
- `messages/en.json`, `messages/ar.json` — **added** `recitation.recitedVerseLabel`,
  `recitation.returnToRecitedVerse` (+ existing `returnToRecitedPage` as fallback);
  **removed** `recitation.rangeProgressAyah` / `rangeProgressRepeat`. Strip controls reuse
  `recitation.stop` / `pause` / `resume`.
- `docs/architecture/DECISIONS.md` — Recitation Playback section: rewrite the "swiping away
  snaps back" and "hard-stops when the user navigates away" bullets to the attach/detach +
  global-playback model; link ADR 0050.
- `docs/architecture/adr/0021-recitation-playback.md` — Addendum noting Addendum 10's
  hard stop is itself superseded by ADR 0050.
- `docs/plans/recitation-playback.md` — this addendum + a supersession banner on Addendum 10.

### Constraints

- **`ReaderPager` gains no `useRecitation()` call** — the ~4Hz / per-verse re-render
  firewall (ADR 0028, DECISIONS.md) holds. All new follow logic lives in the leaf.
- Highlight mechanism (ADR 0021 2026-08-03 addendum), font-readiness gating, and the
  no-flicker recenter are untouched.
- `onFollow` still routed through the pager's guarded `followTo`/`commitTo` — navigation
  stays owned by the pager (ADR 0028). The leaf never navigates directly.
- Auto-advance follow across page boundaries while attached is **unchanged** from today.
- Edition switch mid-playback (`jumpTo` from an edition toggle): the anchor and the
  re-resolved `recitedPage` update in separate renders. If the anchor lands first the leaf
  briefly reads a clean anchor move → `detach`, flashing the return strip for a frame or two
  before the `recitedPage` update re-attaches. Self-healing; accepted (the switch is rare and
  the end state is correct).
- Practice-config reset on `stop()` unchanged; `isFollowing` is session state, not persisted.

### What NOT to Do

- Do **not** add follow/detach state to `ReaderPager` or make it consume `RecitationContext`.
- Do **not** pause audio on any navigation — playback runs on its own timeline (unchanged
  standing decision).
- Do **not** show the full `RecitationPlayerBar` off-reader.
- Do **not** let any recitation surface float over content. The return strip is a nav row —
  it toggles with the overlay on mobile/tablet, pushes content elsewhere. No fixed element
  that isn't backed by reserved space.
- Do **not** put the return affordance in `RecitationPlayerBar` (an earlier iteration did;
  too easy to miss, and hidden with the bar on mobile/tablet).
- Do **not** make `Nav` itself consume `useRecitation()` — the strip subcomponent does, so a
  per-verse `currentVerseKey` change re-renders only the strip.
- Do **not** persist `isFollowing`.
- Do **not** reintroduce a per-word context subscription anywhere.

### Known follow-ups (not this task)

- The `<Link href={/pages/N}> + onClick → jumpTo(N)` client-handoff pattern is duplicated in
  ~5 places (`ContinueReadingLink`, `SurahListItem`, `RubList`, `AyahPicker`, this strip).
  Worth extracting a shared `<ReaderJumpLink>` — out of scope here.
- `followTo` still silently drops a follow issued mid drag/commit; the stale-`prevRecitedPage`
  retry covers the common case but a follow lost right before a sub-threshold drag-return can
  leave the reader a page behind (no pill, playback fine) until the next page boundary.
  Making `followTo` report back / self-retry is the real fix.

### Verified test cases

1. **Route leave keeps playback.** Play on p1 → tap a top-level nav item (Home/Marks) →
   audio still playing (not paused), player bar gone, the return strip is a second nav row
   with "back to page 1".
2. **Return from off-route.** From (1), tap Return → lands on `/pages/1`, reader mounts,
   strip gone, follow attached.
3. **Page away in reader → no snap.** Play on p1 (stopPoint "page") → Next arrow → still on
   p2 after 1s (no yank), the return strip appears under the nav → tap Return → back on p1,
   attached.
4. **Sidebar jump away → no snap.** Same as (3) via a surah/rub jump instead of the arrow.
5. **Auto-advance still follows while attached.** Play mid-page-2 with stopPoint "surah",
   cross into p3 → reader view advances to p3, no return strip.
6. **Stop.** From a detached state → tap Stop in the strip → audio stops, strip gone.
7. **Play from a mark on another page still pulls the reader** (regression) — `play("N:…")`
   where N's page ≠ current → reader navigates to it (attached, `onFollow`).
8. **Return re-attaches, then auto-advance resumes following** — detach on p5 while
   reciting p2, tap Return → on p2 attached → cross to p3 → follows.
9. **Off-reader session start is controllable.** Start a listening wird from `/plans` → go
   to Home → strip visible (never auto-attached), Stop and Return both work.
10. **Paused is not a dead end.** Pause from the strip → strip stays, play button resumes.
11. **Nothing floats over content.** Non-reader route with the strip up, a short page stays
    exactly one screen (`--fq-nav-extra`); a long page's last row is never covered.
12. **Mobile/tablet reader: the strip toggles with the nav overlay.** Detached, chrome
    revealed → strip on screen; dismiss the overlay → strip slides off with the nav; reveal
    again → back.
