// Non-Hafs riwayat, sourced from QuranHub — see docs/plans/recitation-playback.md
// Addendum 8. "hafs" stays on the existing QDC-backed engine.
export type Riwaya =
  | "hafs"
  | "warsh"
  | "qaloon"
  | "shoba"
  | "qunbul"
  | "albazzi"
  | "aldouri"
  | "alsoosi";

// id is always a string — QDC's numeric reciter ids are stringified at the
// provider boundary (qdc-provider.ts) so QDC and QuranHub reciters share one
// type/one list/one RecitationSettings.reciterId field, instead of a
// parallel id + list per provider. See Addendum 8.
export type Reciter = {
  id: string;
  name: string;
  translatedName: string;
  style: string | null;
  riwaya: Riwaya;
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

// One riwaya verse's independent audio file (0-based in its own file — no
// shared timeline, unlike VerseTiming/ChapterAudio above). See ADR 0021
// Addendum (2026-07-27) for why this isn't forced into the ChapterAudio shape.
export type RiwayaVerseAudio = {
  verseKey: string;
  audioUrl: string;
  page: number;
};

export type RiwayaChapterAudio = {
  verses: RiwayaVerseAudio[];
};

export type StopPoint = "page" | "surah" | "rub" | "hizb" | "juz" | "none";

// A finite count (1-10) or "infinite" — JSON/localStorage-safe stand-in for
// Infinity, which JSON.stringify would otherwise silently turn into null.
export type RepeatCount = number | "infinite";

export type RecitationSettings = {
  reciterId: string | null;
  stopPoint: StopPoint;
  perAyahRepeatCount: RepeatCount;
  rangeRepeatCount: RepeatCount;
  playbackSpeed: number;
  pauseBetweenRepeatsMs: number;
  riwaya: Riwaya;
};

export type RecitationStatus = "idle" | "loading" | "playing" | "paused";
