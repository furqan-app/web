---
title: Play Audio for Individual Words
type: feature
date: 2026-07-11
status: implemented
area: recitation
---

# Play Audio for Individual Words

## Summary

Compact speaker-icon button inside `MarkModal` (word-case only) to hear a single word's pronunciation. `Word.audio_url` already exists and is seeder-populated (relative path, e.g. `"wbw/001_001_001.mp3"`); full URL = `https://audio.qurancdn.com/{audio_url}`. No schema or query changes — `getPageWords` already fetches all scalar `Word` columns. Follows the direct-client-CDN-playback pattern from ADR 0021.

A seed-time correction is part of this feature: for verses where QDC fuses a Rub-el-hizb (۞) or waqf mark into a word's text, the seeded `Word.audio_url` file number drifts ahead of the real-word ordinal, so word-tap plays the next word's clip. The seeder rewrites the trailing file number to `String(position).padStart(3,"0")` for every `char_type_name === "word"` row with a non-null `audio_url` — see the Decision Tree and ADR 0009 Addendum (2026-07-15).

## Behavior

| Condition | Action |
|---|---|
| Word tap → `MarkModal`, `audio_url` non-null | Show compact speaker-icon button near title |
| `audio_url` null | Hide button |
| Verse-end tap | No button — word-only feature |
| Tap while chapter recitation playing | `togglePlayPause()` first, then play word clip |
| Tap while recitation idle/paused | Play word clip directly |
| Tap while word clip already playing | Restart from beginning |

## Decision Tree — seed-time `audio_url` offset correction

For verses where QDC fuses a Rub-el-hizb mark (۞) or a waqf/pause mark (ۖ ۗ ۘ ۙ ۚ ۛ) into a word's `text_uthmani` (e.g. `"۞ فَخَلَفَ"` at 19:59 word 1), the seeded `Word.audio_url` file number is wrong — tapping the first real word plays the *next* word's clip. `Word.char_type_name` only ever holds `"word"` or `"end"` (QDC never gives these marks their own row), and `Word.position` stays a correct 1-indexed per-verse ordinal over real words — but `audio_url`'s trailing file number comes from QDC's internal audio-track numbering, which *does* count fused marks, so it drifts ahead of `position` from the first mark onward.

| Condition | Action |
|---|---|
| `char_type_name === "word"`, `audio_url` non-null | Rewrite the trailing `NNN.mp3` number to `String(position).padStart(3, "0")` |
| `char_type_name === "end"`, or `audio_url` null | Leave `audio_url` untouched |

No mark-detection or regex needed — `position` is already the correct real-word ordinal, so forcing the file number to match it is sufficient. Cross-checked against a full fused-mark cumulative-offset derivation across every verse in the DB: the two agree everywhere except 2:181 word 10, where QDC's raw data has an inconsistent gap that isn't a real audio shift — there `= position` is the safer no-op.

## Files Changed

- `app/constants/word-audio.ts` — new: `WORD_AUDIO_BASE_URL = "https://audio.qurancdn.com/"` and `getWordAudioUrl(audioUrl: string)`.
- `app/components/MarkModal.tsx` — `wordAudioRef = useRef<HTMLAudioElement>(null)`, `playWordAudio()` handler, compact speaker-icon button + hidden `<audio>` element (word-case + non-null `audio_url` only). New i18n key: `markModal.playPronunciation`.
- `scripts/quran-seed/verses-words.js` — when building each word's `audio_url` (was line 66, `audio_url: word.audio_url`), apply the offset correction above before pushing into the `words` array. Requires a full re-seed (`npm run seed:quran -- --force`) to take effect; a prior render-time attempt (commit `6cc306b`, reverted) keyed on `char_type_name !== "word"` and was a no-op.

## Constraints

- No proxy API route — direct `<audio>` to QDC CDN (ADR 0021 pattern).
- Do not reuse `RecitationContext`'s `audioRef` — word playback needs its own independent `<audio>` instance (chapter recitation has complex state handlers).
- Pronunciation control must be visually distinct from the existing "Play from here" button (full-chapter recitation).
- Always pause chapter recitation before playing word clip — single-audio-at-a-time.
- No verse-case, no signed-out access, no new gesture (tap is already claimed by `MarkModal` open).
- The `audio_url` offset fix lives at **seed time**, not render time — it corrects the data at the source for every consumer of `Word.audio_url`. Applying it requires a destructive full re-seed; confirm with the user before running, per the seeding workflow rules.
- All `audio_url` file numbers use 3-digit zero-padding (`String(n).padStart(3, "0")`) — confirmed across all 77,430 `char_type_name === "word"` rows (2 have null `audio_url`).

## What NOT to Do

- Do not detect Rub-el-hizb/waqf marks via `char_type_name` — that field never carries a mark type; it's always `"word"` or `"end"` (this is what made `6cc306b` a no-op).
- Do not implement offset correction by parsing/counting embedded mark characters in `text_uthmani` at click time or seed time — the `audio_url number := position` rule is provably equivalent (and safer on the one known QDC data inconsistency) with far less surface area. See ADR 0009 Addendum (2026-07-15).
- Do not apply the correction to `char_type_name === "end"` rows — they have no `audio_url` and aren't part of word-tap playback.

## Decisions Made

- The `audio_url` correction happens in the seeder (`scripts/quran-seed/verses-words.js`), not in `QuranSafha.tsx`/`wordClicked` — confirmed with user 2026-07-15.
- See [ADR 0009](../architecture/adr/0009-reproducible-quran-seeder.md) Addendum (2026-07-15) for the encoded data contract this establishes.

## Revision History

- 2026-07-15 — folded Addendum (Trello #114): seed-time `audio_url` offset correction for verses with fused Rub/waqf marks; establishes the ADR 0009 Addendum data contract.
