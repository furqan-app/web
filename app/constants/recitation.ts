import { RecitationSettings, Riwaya } from "@/app/types/recitation";

export const DEFAULT_RECITATION_SETTINGS: RecitationSettings = {
  reciterId: null,
  stopPoint: "page",
  perAyahRepeatCount: 1,
  rangeRepeatCount: 1,
  playbackSpeed: 1,
  pauseBetweenRepeatsMs: 0,
  riwaya: "hafs",
};

// Maps our Riwaya values to QuranHub's edition narratorIdentifier — see
// docs/plans/recitation-playback.md Addendum 8.
export const RIWAYA_NARRATOR_MAP: Record<Riwaya, string> = {
  hafs: "quran-hafs",
  warsh: "quran-warsh",
  qaloon: "quran-qaloon",
  shoba: "quran-shoba",
  qunbul: "quran-qunbul",
  albazzi: "quran-albazzi",
  aldouri: "quran-aldouri",
  alsoosi: "quran-alsoosi",
};

export const REPEAT_COUNT_MIN = 1;
export const REPEAT_COUNT_MAX = 10;
export const PLAYBACK_SPEED_MIN = 0.5;
export const PLAYBACK_SPEED_MAX = 2;
export const PLAYBACK_SPEED_STEP = 0.25;
export const PAUSE_BETWEEN_REPEATS_MAX_MS = 5000;
export const PAUSE_BETWEEN_REPEATS_STEP_MS = 500;

// Applied via direct DOM classList toggling (see RecitationContext), not
// React className — matches the plain CSS rule in globals.css.
export const RECITATION_HIGHLIGHT_CLASS = "fq-recitation-active-word";

// Quran structure is immutable — the "none" (no stop) stopPoint's target is
// hardcoded rather than queried. See docs/plans/recitation-playback.md
// Addendum 5.
export const QURAN_LAST_VERSE_KEY = "114:6";
export const QURAN_LAST_CHAPTER_ID = 114;
