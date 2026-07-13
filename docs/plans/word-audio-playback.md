# Play Audio for Individual Words

**Type:** feature  
**Date:** 2026-07-11  
**Status:** implemented

## Summary

Compact speaker-icon button inside `MarkModal` (word-case only) to hear a single word's pronunciation. `Word.audio_url` already exists and is seeder-populated (relative path, e.g. `"wbw/001_001_001.mp3"`); full URL = `https://audio.qurancdn.com/{audio_url}`. No schema or query changes — `getPageWords` already fetches all scalar `Word` columns. Follows the direct-client-CDN-playback pattern from ADR 0021.

## Behavior

| Condition | Action |
|---|---|
| Word tap → `MarkModal`, `audio_url` non-null | Show compact speaker-icon button near title |
| `audio_url` null | Hide button |
| Verse-end tap | No button — word-only feature |
| Tap while chapter recitation playing | `togglePlayPause()` first, then play word clip |
| Tap while recitation idle/paused | Play word clip directly |
| Tap while word clip already playing | Restart from beginning |

## Files Changed

- `app/constants/word-audio.ts` — new: `WORD_AUDIO_BASE_URL = "https://audio.qurancdn.com/"` and `getWordAudioUrl(audioUrl: string)`.
- `app/components/MarkModal.tsx` — `wordAudioRef = useRef<HTMLAudioElement>(null)`, `playWordAudio()` handler, compact speaker-icon button + hidden `<audio>` element (word-case + non-null `audio_url` only). New i18n key: `markModal.playPronunciation`.

## Constraints

- No proxy API route — direct `<audio>` to QDC CDN (ADR 0021 pattern).
- Do not reuse `RecitationContext`'s `audioRef` — word playback needs its own independent `<audio>` instance (chapter recitation has complex state handlers).
- Pronunciation control must be visually distinct from the existing "Play from here" button (full-chapter recitation).
- Always pause chapter recitation before playing word clip — single-audio-at-a-time.
- No verse-case, no signed-out access, no new gesture (tap is already claimed by `MarkModal` open).
