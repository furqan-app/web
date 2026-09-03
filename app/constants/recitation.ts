import { RecitationSettings } from "@/app/types/recitation";

export const DEFAULT_RECITATION_SETTINGS: RecitationSettings = {
  reciterId: null,
  stopPoint: "page",
  rangeTo: null,
  perAyahRepeatCount: 1,
  rangeRepeatCount: 1,
  playbackSpeed: 1,
  pauseBetweenRepeatsMs: 0,
};

export const REPEAT_COUNT_MIN = 1;
// Shared ceiling for BOTH repeat steppers (per-ayah + whole-range) and the
// player-bar cycle button — #393 follow-up (2026-08-26): bar and sheet must
// agree on one model: 1..5, then ∞.
export const REPEAT_COUNT_MAX = 5;
export const PLAYBACK_SPEED_MIN = 0.5;
export const PLAYBACK_SPEED_MAX = 2;
export const PLAYBACK_SPEED_STEP = 0.25;
export const PAUSE_BETWEEN_REPEATS_MAX_MS = 5000;
export const PAUSE_BETWEEN_REPEATS_STEP_MS = 500;

// Applied via direct DOM classList toggling, not React className — matches the
// plain CSS rule in globals.css. RecitationContext resolves the elements to
// toggle by querying `[data-fq-word="<location>"]` and toggles EVERY match: the
// reader mounts the same page in more than one panel, so a location maps to
// several live nodes (ADR 0021's 2026-08-03 addendum).
export const RECITATION_HIGHLIGHT_CLASS = "fq-recitation-active-word";

// Quran structure is immutable — the "none" (no stop) stopPoint's target is
// hardcoded rather than queried. See docs/plans/recitation-playback.md
// Addendum 5.
export const QURAN_LAST_VERSE_KEY = "114:6";
export const QURAN_LAST_CHAPTER_ID = 114;
