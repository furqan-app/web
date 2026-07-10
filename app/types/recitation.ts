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

export type StopPoint = "page" | "surah";

// A finite count (1-10) or "infinite" — JSON/localStorage-safe stand-in for
// Infinity, which JSON.stringify would otherwise silently turn into null.
export type RepeatCount = number | "infinite";

export type RecitationSettings = {
  reciterId: number | null;
  stopPoint: StopPoint;
  perAyahRepeatCount: RepeatCount;
  rangeRepeatCount: RepeatCount;
  playbackSpeed: number;
  pauseBetweenRepeatsMs: number;
};

export type RecitationStatus = "idle" | "loading" | "playing" | "paused";
