# Play Audio for Individual Words

**Type:** feature
**Date:** 2026-07-11
**Status:** implemented

## Summary

Let users tap a word's pronunciation-preview button (inside the existing `MarkModal`, which already opens on word tap) to hear that single word's audio clip. `Word.audio_url` already exists in the Quran schema and is populated by the seeder from QDC's per-word API response (e.g. `"wbw/001_001_001.mp3"`) — no schema or seeder changes needed. Playback is client-side only, following the same direct-`<audio>`-to-CDN pattern already established for full-chapter recitation (ADR 0021) — no new API route.

## Approach

`Word.audio_url` is a **relative path**, not a full URL. Confirmed live: `https://audio.qurancdn.com/{word.audio_url}` (e.g. `https://audio.qurancdn.com/wbw/002_253_052.mp3`, matching the example URL already on the Trello card) resolves to a playable MP3 (`200`, `audio/mpeg`). `getPageWords` already fetches all scalar `Word` columns via unrestricted `findMany`/`include` (no `select` narrowing), so `WordWithVerse` already carries `audio_url` — no query changes needed.

**Why this lives inside `MarkModal`, not as a new gesture:** tapping a word is already fully claimed — `QuranWord`'s `onClick` → `QuranSafha`'s `wordClicked` → opens `MarkModal` (signed in) or `SignInModal` (signed out) for that word. There is no free single-tap gesture on a word today. Adding a distinct pronunciation button inside `MarkModal` (word-case only) reuses the existing tap with no new gesture, at the accepted cost that pronunciation preview requires sign-in (same gate as marking already has).

`MarkModal` already has an unrelated "Play from here" button (`Volume2` icon, full-width, opens `RecitationSettingsSheet` and starts continuous **chapter** recitation from that verse via `RecitationContext`). The new word-pronunciation control must be visually and functionally distinct from that — a compact icon near the title, not another full-width button, so the two are not confused.

## Decision Tree / Algorithm

| Condition | Behavior |
|---|---|
| `MarkModal` opened for a word (`isWord === true`, i.e. `markFor` has `location`) and `markFor.audio_url` is non-null | Show a compact speaker-icon "hear pronunciation" control near the title |
| `markFor.audio_url` is null (defensive — shouldn't occur for real word data) | Hide the pronunciation control entirely |
| `MarkModal` opened for a verse-end tap (`isWord === false`) | No pronunciation control — word-only per the card's scope |
| User taps the pronunciation control, `RecitationContext.status === "playing"` | Call `togglePlayPause()` first (pauses chapter recitation; it stays resumable, not stopped), then play the word clip |
| User taps the pronunciation control, recitation not playing (`"idle"` or `"paused"`) | Play the word clip directly, no interaction with `RecitationContext` |
| User taps the pronunciation control again while the word clip is already playing | Restart the clip from the beginning (`audio.currentTime = 0; audio.play()`) |

## Verified Test Cases

- Card's own example word (`002_253_052` → `https://audio.qurancdn.com/wbw/002_253_052.mp3`) confirmed live via `curl -I`: `200`, `content-type: audio/mpeg`.
- Sample word fetched from QDC's page-1 response (`001_001_001`, "بِسْمِ"): `audio_url: "wbw/001_001_001.mp3"` — same relative-path shape, confirmed playable at the same base.
- Chapter recitation's own `audioUrl` (`app/types/recitation.ts`) is already a **full** URL set directly as `audio.src` in `RecitationContext.tsx` (`audio.src = chapterAudio.audioUrl`) — confirms the precedent that this app already plays external CDN audio directly client-side, no proxy. Word audio follows the same shape, just needs the base-URL prefix since QDC's word-level API returns a relative path instead of an absolute one (a QDC API inconsistency, not something to normalize away — just documented).

## Files to Change

- `app/constants/word-audio.ts` — new. `WORD_AUDIO_BASE_URL = "https://audio.qurancdn.com/"` and `getWordAudioUrl(audioUrl: string): string` helper (`${WORD_AUDIO_BASE_URL}${audioUrl}`).
- `app/components/MarkModal.tsx`:
  - Import `useRecitation` (already imported for `openSettings`/`playFromHere`) — also destructure `status`, `togglePlayPause`.
  - Add a `wordAudioRef = useRef<HTMLAudioElement>(null)` and a `playWordAudio()` handler implementing the decision tree above.
  - Render a compact speaker-icon button near the `DialogTitle` (only when `isWord && markFor.audio_url`), plus a hidden `<audio ref={wordAudioRef} src={...} />` (or set `src` imperatively in the handler — match whichever is simpler given the existing `audioRef` pattern in `RecitationContext.tsx`).
  - New translation keys: `markModal.playPronunciation` (e.g. "Hear pronunciation") for the button's `aria-label`/`sr-only` text.

## Constraints

- Do not proxy word audio through a new internal API route — direct client `<audio>` playback of the QDC CDN URL is the established pattern (ADR 0021), and word audio has no timing/segment data to fetch server-side anyway (unlike chapter recitation's verse-timings endpoint).
- Do not reuse `RecitationContext`'s own `audioRef`/`<audio>` element for word playback — that element's state (`timeupdate` handlers, page-follow navigation, repeat/stop-point logic) is complex and chapter-recitation-specific; word playback needs its own independent, simple `<audio>` instance.
- The pronunciation control must be visually distinct from the existing "Play from here" button — do not merge them or reuse its full-width style, to avoid the two being confused (one previews a single word, the other starts continuous chapter playback from that verse).
- Do not add a pronunciation control for the verse-case (`isWord === false`) — out of scope per the card's "individual words" wording.

## What NOT to Do

- Do not introduce a new gesture (long-press/double-tap) for word audio — explicitly ruled out in favor of reusing the existing tap-to-open-`MarkModal` flow.
- Do not make word-audio playback work for signed-out users by bypassing the `MarkModal`/`SignInModal` gate — accepted trade-off, not solved here.
- Do not allow word audio and chapter recitation to play concurrently — always pause chapter recitation first if active.
- Do not seed `audio_url` data separately or add new Prisma models/columns — the field already exists and is already populated by the seeder.

## Decisions Made

- Interaction: pronunciation control lives inside `MarkModal` (word-case only), not a new gesture.
- Signed-out users: no access to word audio (same gate as marking) — accepted trade-off, not addressed in this task.
- Playback conflict with chapter recitation: pause chapter recitation first, always single-audio-at-a-time.
- Repeat-tap behavior: restarts the clip from the beginning.
- No new ADR — this reuses the existing direct-client-CDN-playback pattern from ADR 0021, no new alternatives were evaluated.
