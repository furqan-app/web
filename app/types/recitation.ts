export type Reciter = {
  id: number;
  name: string;
  translatedName: string;
  style: string | null;
};

// [wordIndex, startMs, endMs] — startMs/endMs are absolute chapter-timeline
// milliseconds (same axis as VerseTiming.timestampFrom/timestampTo), not
// relative to the verse's own start. Confirmed against a live QDC response:
// verse 1:2's segments start at 6025ms, below its own timestamp_from (6090).
export type VerseSegment = [wordIndex: number, startMs: number, endMs: number];

export type VerseTiming = {
  verseKey: string;
  timestampFrom: number;
  timestampTo: number;
  segments: VerseSegment[];
};

export type ChapterAudio = {
  audioUrl: string;
  durationMs: number;
  verseTimings: VerseTiming[];
};

export type StopPoint = "page" | "surah" | "rub" | "hizb" | "juz" | "none" | "custom";

// An explicit end point for stopPoint "custom" — either a mushaf page number
// or a surah:ayah verse reference. See docs/plans/recitation-playback.md
// Addendum 9. There is no equivalent "from" type: the start verse is always
// whatever launched playback (unchanged from every other stop point).
export type RangePoint = { type: "page"; page: number } | { type: "verse"; surah: number; ayah: number };

// A finite count (1-10) or "infinite" — JSON/localStorage-safe stand-in for
// Infinity, which JSON.stringify would otherwise silently turn into null.
export type RepeatCount = number | "infinite";

export type RecitationSettings = {
  reciterId: number | null;
  stopPoint: StopPoint;
  rangeTo: RangePoint | null;
  perAyahRepeatCount: RepeatCount;
  rangeRepeatCount: RepeatCount;
  playbackSpeed: number;
  pauseBetweenRepeatsMs: number;
};

export type RecitationStatus = "idle" | "loading" | "playing" | "paused";

// An explicit, caller-supplied playback range that bypasses
// settings.stopPoint / resolveStopTarget entirely (listening-wird inline
// playback — see docs/plans/listening-wird-inline-playback.md). `id` is a
// stable identity for whatever launched the session, so a UI surface can
// tell "this is my session" apart from any other session that merely
// happens to be reciting inside the same pages. `label` is the
// human-readable form shown by RecitationSettingsSheet.
export type PlaybackOverride = {
  stopVerseKey: string;
  stopChapterId: number;
  rangeRepeatCount: number;
  id: string;
  label: string;
};

// The publicly observable part of an active PlaybackOverride.
export type ActiveOverride = Pick<PlaybackOverride, "id" | "label">;
