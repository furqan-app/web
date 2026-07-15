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

## Addendum (2026-07-15): Fix audio offset for verses with fused Rub/waqf marks

**Bug (Trello #114):** For verses where QDC fuses a Rub-el-hizb mark (۞) or a waqf/pause mark (ۖ ۗ ۘ ۙ ۚ ۛ) into a word's `text_uthmani` (e.g. `"۞ فَخَلَفَ"` at 19:59 word 1), the seeded `Word.audio_url` points at the wrong CDN file — tapping the first real word of the verse plays the *next* word's clip instead.

**Root cause:** `Word.char_type_name` only ever takes `"word"` or `"end"` — QDC's `words[]` API never gives these marks their own row; it fuses them into the adjacent word's text. `Word.position` is still correctly sequential per verse across real words only (1-indexed, `"end"` always last). But `audio_url`'s trailing file number comes from QDC's *internal audio-track numbering*, which does count fused marks as their own track — so in any verse with a mark, the number silently drifts ahead of `position` starting at that mark.

A prior attempt (commit `6cc306b`, reverted) tried to detect this via `char_type_name !== "word"`, which never matches anything (see root cause above) — it was a complete no-op that shipped without fixing the bug.

### Decision Tree

| Row | Condition | Action |
|---|---|---|
| `char_type_name === "word"`, `audio_url` non-null | always | Rewrite the trailing `NNN.mp3` number to `String(position).padStart(3, "0")` |
| `char_type_name === "end"`, or `audio_url` null | always | Leave `audio_url` untouched |

No mark-detection/regex logic needed — `position` alone is already the correct real-word ordinal per verse, so forcing the file number to match it is sufficient.

### Verified Test Cases

Validated against the full currently-seeded DB (6,236 verses / 47,572 `char_type_name === "word"` rows with a non-null `audio_url`):

| Verse | Word (position) | Raw `audio_url` number | Corrected (`= position`) |
|---|---|---|---|
| 2:26 (Rub mark, 5 waqf marks through the verse) | 1..39 | drifts +1 at pos 1, +2 at pos 12, +3 at pos 20, +4 at pos 29, +5 at pos 35 | always equals `position` |
| 2:44 (Rub mark only) | 1 | `002` | `001` |
| 19:59 (Rub mark only) | 1 | `002` | `001` |

Cross-checked the simple `= position` rule against a full mark-detection derivation (classifying fused Rub/waqf/sajdah Unicode codepoints as prefix/suffix per word and running a cumulative offset) across every verse in the DB: the two approaches agree on all but one row (2:181, word 10), where QDC's own raw data has an inconsistent gap that doesn't actually correspond to a real audio shift — there, `= position` gives the safer answer (a no-op, matching the already-correct raw value) while the mark-detection approach would have wrongly changed it. This confirms `= position` is not just simpler but strictly more robust.

### Files to Change

- `scripts/quran-seed/verses-words.js` — when building each word's `audio_url` (currently line 66, `audio_url: word.audio_url`), apply the correction above before pushing into the `words` array.

### Constraints

- Fix lives at **seed time**, not render time — corrects the data at the source for every future consumer of `Word.audio_url`, not just `wordClicked` in `QuranSafha.tsx`.
- Requires a full Quran DB re-seed (`npm run seed:quran -- --force`) to take effect locally; production picks it up on its next seed run. This is a destructive DB operation — confirm with the user before running it, per the project's seeding workflow rules.
- All observed `audio_url` file numbers use 3-digit zero-padding (`String(n).padStart(3, "0")`) — confirmed across all 77,430 `char_type_name === "word"` rows in the DB (2 have null `audio_url`).

### What NOT to Do

- Do not detect Rub-el-hizb/waqf marks via `char_type_name` — that field never carries a mark type; it's always `"word"` or `"end"` (this is what made `6cc306b` a no-op).
- Do not implement offset correction by parsing/counting embedded mark characters in `text_uthmani` at click time or seed time — the simpler `audio_url number := position` rule is provably equivalent (and safer on the one known QDC data inconsistency) with far less surface area. See ADR 0009 Addendum (2026-07-15).
- Do not apply the correction to `char_type_name === "end"` rows — they have no `audio_url` and aren't part of word-tap playback.

### Decisions Made

- Correction happens in the seeder (`scripts/quran-seed/verses-words.js`), not in `QuranSafha.tsx`/`wordClicked` — confirmed with user 2026-07-15.
- See [ADR 0009](../architecture/adr/0009-reproducible-quran-seeder.md) Addendum (2026-07-15) for the encoded data contract this establishes.
