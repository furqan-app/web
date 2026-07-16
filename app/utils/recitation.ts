import { getPagePair } from "@/app/utils/quran-pages";
import { QURAN_LAST_CHAPTER_ID } from "@/app/constants/recitation";
import { RepeatCount, StopPoint, VerseTiming } from "@/app/types/recitation";
import { WordWithVerse } from "@/app/types/prisma";

export type ChapterEndDecision =
  | { action: "repeat-range" }
  | { action: "chain"; nextChapterId: number }
  | { action: "stop" };

// Decides what should happen once a chapter's audio has fully ended and any
// per-ayah repeat on its last verse is exhausted — the three-way branch from
// docs/plans/recitation-playback.md Addendum 5's chaining decision tree.
// "none" never repeats a range (there's no bounded range to repeat back to —
// the whole-range stepper is hidden for it in the UI, but the engine must
// not trust that alone since a stale rangeRepeatCount from a previous
// stopPoint could still be stored).
export const decideChapterEnd = (
  currentChapterId: number,
  stopChapterId: number | null,
  stopPoint: StopPoint,
  rangeRepeatsDone: number,
  rangeRepeatTarget: number,
): ChapterEndDecision => {
  if (currentChapterId === stopChapterId) {
    if (stopPoint !== "none" && rangeRepeatsDone + 1 < rangeRepeatTarget) {
      return { action: "repeat-range" };
    }
    return { action: "stop" };
  }
  if (currentChapterId < QURAN_LAST_CHAPTER_ID) {
    return { action: "chain", nextChapterId: currentChapterId + 1 };
  }
  return { action: "stop" };
};

export const parseChapterIdFromVerseKey = (verseKey: string): number =>
  Number(verseKey.split(":")[0]);

// RepeatCount stores "infinite" (JSON-safe) instead of Infinity — this
// resolves it back to a comparable number at the point of use.
export const resolveRepeatTarget = (count: RepeatCount): number =>
  count === "infinite" ? Infinity : count;

// Finds the verse whose [timestampFrom, timestampTo) window contains
// currentTimeMs. Falls back to the last verse once playback has moved past
// the final timestamp_to (e.g. the last few ms of the audio file).
export const findActiveVerseTiming = (
  verseTimings: VerseTiming[],
  currentTimeMs: number,
): VerseTiming | undefined => {
  const active = verseTimings.find(
    (vt) => currentTimeMs >= vt.timestampFrom && currentTimeMs < vt.timestampTo,
  );
  if (active) return active;
  return currentTimeMs >= (verseTimings[verseTimings.length - 1]?.timestampTo ?? 0)
    ? verseTimings[verseTimings.length - 1]
    : undefined;
};

// Word-level location (e.g. "2:5:3") for the segment containing
// currentTimeMs, or null if currentTimeMs falls in a gap between segments
// (silence between words).
export const findActiveWordLocation = (
  verseTiming: VerseTiming,
  currentTimeMs: number,
): string | null => {
  const segment = verseTiming.segments.find(
    ([, startMs, endMs]) => currentTimeMs >= startMs && currentTimeMs < endMs,
  );
  return segment ? `${verseTiming.verseKey}:${segment[0]}` : null;
};

// Page ids currently visible in the reader: just the current page in single
// view / forced-single below `lg`, or the whole pair in active double view.
// Mirrors QuranSpread's own `view === "double" && isLgUp` display gate.
export const computeVisiblePageSet = (
  displayedPageId: number,
  isDoubleViewActive: boolean,
): Set<number> => {
  if (!isDoubleViewActive) return new Set([displayedPageId]);
  const { rightPage, leftPage } = getPagePair(displayedPageId);
  return new Set([rightPage, leftPage]);
};

// Extracts the reader base path + currently displayed page id from a
// (locale-stripped) pathname, e.g. "/pages/12" or "/mushaf/abc123/pages/12".
// Returns null when not on a paged reader route (no page-follow target).
export const parseReaderPathname = (
  pathname: string,
): { basePath: string; pageId: number } | null => {
  const match = pathname.match(/^((?:\/mushaf\/[^/]+)?\/pages)\/(\d+)$/);
  if (!match) return null;
  return { basePath: match[1], pageId: Number(match[2]) };
};

// The verse_key of the first word on a page, used as the default start point
// for the header's "listen from here" quick-play button.
export const getFirstVerseKeyOfPage = (
  lines: Record<string, Array<WordWithVerse>>,
): string | null => {
  const lineKeys = Object.keys(lines).sort((a, b) => Number(a) - Number(b));
  for (const key of lineKeys) {
    const firstWord = lines[key][0];
    if (firstWord) return firstWord.verse_key;
  }
  return null;
};
