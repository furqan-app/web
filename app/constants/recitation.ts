import { RecitationSettings } from "@/app/types/recitation";

export const QDC_BASE_URL = "https://api.qurancdn.com/api/qdc";

export const DEFAULT_RECITATION_SETTINGS: RecitationSettings = {
  reciterId: null,
  stopPoint: "page",
  perAyahRepeatCount: 1,
  rangeRepeatCount: 1,
  playbackSpeed: 1,
  pauseBetweenRepeatsMs: 0,
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
