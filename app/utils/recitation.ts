import { QURAN_LAST_CHAPTER_ID } from "@/app/constants/recitation";
import { RepeatCount, VerseTiming } from "@/app/types/recitation";
import { WordWithVerse } from "@/app/types/prisma";
import type { SurahResult } from "@/app/types";
import { getPagePair } from "@/app/utils/quran-pages";
import { toLocaleNumeral } from "@/app/utils/i18n";

export type ChapterEndDecision =
  | { action: "repeat-range" }
  | { action: "chain"; nextChapterId: number }
  | { action: "stop" };

// Decides what should happen once a chapter's audio has fully ended and any
// per-ayah repeat on its last verse is exhausted — the three-way branch from
// docs/plans/recitation-playback.md Addendum 5's chaining decision tree.
// `isRepeatableRange` is false exactly when playback has no bounded range to
// repeat back to: settings.stopPoint === "none" with no play() override
// active. An explicit play() override (a wird's page range, see
// docs/plans/listening-wird-inline-playback.md) always IS a bounded range
// regardless of what the user's persisted stopPoint happens to say — the
// caller computes this, not this function, since only the caller knows
// whether an override is live.
export const decideChapterEnd = (
  currentChapterId: number,
  stopChapterId: number | null,
  isRepeatableRange: boolean,
  rangeRepeatsDone: number,
  rangeRepeatTarget: number,
): ChapterEndDecision => {
  if (currentChapterId === stopChapterId) {
    if (isRepeatableRange && rangeRepeatsDone + 1 < rangeRepeatTarget) {
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

// ── Attach/detach follow (ADR 0050) ─────────────────────────────────────────
// The RecitationFollow leaf's whole decision, as a pure function so it can be
// tested exhaustively without a DOM (the codebase's unit tests never render).
// The leaf feeds it the current + previous recitedPage/anchor and the current
// isFollowing, and acts on the result:
//   none   — do nothing
//   attach — setIsFollowing(true)                    (reader is on the recited page)
//   detach — setIsFollowing(false)                   (user navigated away by hand)
//   follow — setIsFollowing(true) + onFollow(target) (pull the recited page into view)
//
// Convergence note: the leaf must NOT advance its `prevRecitedPage` ref on a
// "follow" result — `onFollow` (ReaderPager.followTo) silently drops the request
// while a drag/commit is in flight, so a stale `prevRecitedPage` is what lets the
// next tick retry. `prevAnchor` always advances. See docs/plans/recitation-playback.md
// Addendum 13 for the transition table.

export type RecitationFollowInput = {
  // null when no session is playing.
  recitedPage: number | null;
  anchor: number;
  isDouble: boolean;
  prevRecitedPage: number | null;
  prevAnchor: number;
  isFollowing: boolean;
};

export type RecitationFollowDecision =
  | { action: "none" }
  | { action: "attach" }
  | { action: "detach" }
  | { action: "follow"; target: number };

export const decideRecitationFollow = ({
  recitedPage,
  anchor,
  isDouble,
  prevRecitedPage,
  prevAnchor,
  isFollowing,
}: RecitationFollowInput): RecitationFollowDecision => {
  if (recitedPage == null) return { action: "none" };

  const { rightPage, leftPage } = getPagePair(anchor);
  const visible = isDouble ? [rightPage, leftPage] : [anchor];
  const followTarget = isDouble ? getPagePair(recitedPage).rightPage : recitedPage;

  if (visible.includes(recitedPage)) {
    // On the recited page (returned to it, or swiped back onto it) — attach.
    return isFollowing ? { action: "none" } : { action: "attach" };
  }

  const recitedPageMoved = recitedPage !== prevRecitedPage;
  const anchorMoved = anchor !== prevAnchor;

  // Fresh session (idle → playing) whose start page isn't the one on screen —
  // e.g. "play from here" on a mark several pages away. Centre on it, and the
  // subsequent visible-window tick attaches.
  if (prevRecitedPage == null) return { action: "follow", target: followTarget };

  if (isFollowing) {
    // A clean manual anchor move away from the recited page (swipe / arrows /
    // sidebar jump) — the recited page did not move, only the reader did. Detach.
    if (anchorMoved && !recitedPageMoved) return { action: "detach" };
    // Otherwise the reader is still tracking: auto-advance moved the recited page
    // across a boundary, or the visible window changed under us (double-view
    // toggle, breakpoint cross). Pull the recited page back into view.
    return { action: "follow", target: followTarget };
  }

  // Detached — the return panel owns the way back; nothing snaps.
  return { action: "none" };
};

// ── Recited-verse label ─────────────────────────────────────────────────────
// The player bar and RecitationReturnStrip both show *where* playback is. A bare
// "7:145" is opaque; this resolves it to localized, pre-formatted parts for the
// `recitation.recitedVerseLabel` ICU string ("آية {ayah} سورة {surah} صفحة {page}").
// Returns null when the verse key / page / surah list isn't resolvable yet —
// callers fall back to the bare verse key.
export const recitedVerseLabelParts = (
  verseKey: string | null,
  page: number | null,
  chapters: SurahResult[],
  locale: string,
): { ayah: string; surah: string; page: string } | null => {
  if (!verseKey || page == null) return null;
  const [surahId, ayah] = verseKey.split(":").map(Number);
  const chapter = chapters.find((c) => c.id === surahId);
  if (!chapter || !ayah) return null;
  return {
    ayah: toLocaleNumeral(ayah, locale),
    surah: locale === "ar" ? chapter.name_arabic : chapter.name_simple,
    page: toLocaleNumeral(page, locale),
  };
};

// The verse_key of the first word on a page, used as the default start point
// for the voice panel's play-current-Safha button.
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
