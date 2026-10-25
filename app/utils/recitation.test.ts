import { describe, expect, it } from "vitest";
import {
  calculateVerseCutoffMs,
  calculateVerseStartMs,
  calculateBoundaryFadeVolume,
  canSkipToNext,
  canSkipToNextWord,
  canSkipToPrevious,
  canSkipToPreviousWord,
  decideRecitationFollow,
  decideSkipVerse,
  decideSkipWord,
  findActiveVerseTiming,
  getNextPlaybackSpeed,
  offlineDownloadDisplayLabel,
  surahDisplayName,
} from "@/app/utils/recitation";
import type { SurahResult } from "@/app/types";
import type { RecitationDownloadItem } from "@/app/types/recitation";

// Attach/detach follow decision (ADR 0050 / recitation-playback.md Addendum 13).
// getPagePair pairs (1,2), (3,4), … so page 3 is visible at anchor 3 or 4 in
// double view, only at anchor 3 in single view.

describe("decideRecitationFollow", () => {
  const attached = {
    anchor: 3,
    isDouble: false,
    prevRecitedPage: 3,
    prevAnchor: 3,
    isFollowing: true,
  };

  it("does nothing when no session is playing", () => {
    expect(decideRecitationFollow({ ...attached, recitedPage: null })).toEqual({
      action: "none",
    });
  });

  it("attaches when the recited page is visible and follow was off", () => {
    expect(
      decideRecitationFollow({ ...attached, recitedPage: 3, isFollowing: false }),
    ).toEqual({ action: "attach" });
  });

  it("is a no-op when the recited page is visible and follow is already on", () => {
    expect(decideRecitationFollow({ ...attached, recitedPage: 3 })).toEqual({
      action: "none",
    });
  });

  describe("fresh session (prevRecitedPage == null)", () => {
    it("centres on a start page that is already visible via an attach", () => {
      expect(
        decideRecitationFollow({
          recitedPage: 3,
          prevRecitedPage: null,
          anchor: 3,
          prevAnchor: 3,
          isDouble: false,
          isFollowing: false,
        }),
      ).toEqual({ action: "attach" });
    });

    it("pulls the reader to a start page several pages away (play-from-mark)", () => {
      expect(
        decideRecitationFollow({
          recitedPage: 40,
          prevRecitedPage: null,
          anchor: 3,
          prevAnchor: 3,
          isDouble: false,
          isFollowing: false,
        }),
      ).toEqual({ action: "follow", target: 40 });
    });
  });

  it("follows an auto-advance across a page boundary (recited page moved, anchor did not)", () => {
    expect(
      decideRecitationFollow({
        ...attached,
        recitedPage: 4,
        prevRecitedPage: 3,
        anchor: 3,
        prevAnchor: 3,
      }),
    ).toEqual({ action: "follow", target: 4 });
  });

  it("detaches on a clean manual anchor move away from the recited page", () => {
    expect(
      decideRecitationFollow({
        recitedPage: 3,
        prevRecitedPage: 3,
        anchor: 4,
        prevAnchor: 3,
        isDouble: false,
        isFollowing: true,
      }),
    ).toEqual({ action: "detach" });
  });

  it("re-pulls the recited page when the visible window changes under an attached reader", () => {
    // Same anchor, same recited page, but the double-view spread just collapsed
    // to single view (isDouble false now) so page 4 is no longer on screen.
    expect(
      decideRecitationFollow({
        recitedPage: 4,
        prevRecitedPage: 4,
        anchor: 3,
        prevAnchor: 3,
        isDouble: false,
        isFollowing: true,
      }),
    ).toEqual({ action: "follow", target: 4 });
  });

  it("does not follow when detached, even as the recited page auto-advances", () => {
    expect(
      decideRecitationFollow({
        recitedPage: 5,
        prevRecitedPage: 4,
        anchor: 8,
        prevAnchor: 8,
        isDouble: false,
        isFollowing: false,
      }),
    ).toEqual({ action: "none" });
  });

  it("re-attaches when a detached user navigates back onto the recited page", () => {
    expect(
      decideRecitationFollow({
        recitedPage: 5,
        prevRecitedPage: 5,
        anchor: 5,
        prevAnchor: 9,
        isDouble: false,
        isFollowing: false,
      }),
    ).toEqual({ action: "attach" });
  });

  it("treats the recited page as visible on either side of a double-view spread", () => {
    expect(
      decideRecitationFollow({
        recitedPage: 4,
        prevRecitedPage: 4,
        anchor: 3,
        prevAnchor: 3,
        isDouble: true,
        isFollowing: false,
      }),
    ).toEqual({ action: "attach" });
  });

  it("follows to the right page of the target spread in double view", () => {
    expect(
      decideRecitationFollow({
        recitedPage: 5,
        prevRecitedPage: 4,
        anchor: 3,
        prevAnchor: 3,
        isDouble: true,
        isFollowing: true,
      }),
    ).toEqual({ action: "follow", target: 5 });
  });

  it("keeps following (not detaching) when recited page and anchor both moved in one tick", () => {
    // A same-tick coincidence (auto-advance + a manual swipe). detach requires
    // the recited page to be still — since it moved, the reader is treated as
    // tracking and the recited page is pulled back; a genuine swipe repeats and
    // the next tick (recited page still) detaches.
    expect(
      decideRecitationFollow({
        recitedPage: 4,
        prevRecitedPage: 3,
        anchor: 6,
        prevAnchor: 3,
        isDouble: false,
        isFollowing: true,
      }),
    ).toEqual({ action: "follow", target: 4 });
  });
});

describe("canSkipToPrevious & canSkipToNext", () => {
  it("disables both when idle or missing currentVerseKey", () => {
    expect(canSkipToPrevious(null, "idle")).toBe(false);
    expect(canSkipToPrevious("2:5", "idle")).toBe(false);
    expect(canSkipToPrevious(null, "playing")).toBe(false);

    expect(canSkipToNext(null, "idle")).toBe(false);
    expect(canSkipToNext("2:5", "idle")).toBe(false);
    expect(canSkipToNext(null, "playing")).toBe(false);
  });

  it("disables previous at hard boundary 1:1", () => {
    expect(canSkipToPrevious("1:1", "playing")).toBe(false);
    expect(canSkipToPrevious("1:1", "paused")).toBe(false);
    expect(canSkipToPrevious("1:2", "playing")).toBe(true);
    expect(canSkipToPrevious("2:1", "playing")).toBe(true);
  });

  it("disables next at 114:6", () => {
    expect(canSkipToNext("114:6", "playing")).toBe(false);
    expect(canSkipToNext("114:5", "playing")).toBe(true);
  });

  it("disables next when active stopVerseKey is reached", () => {
    // stop at 1:7
    expect(canSkipToNext("1:7", "playing", "1:7", 1)).toBe(false);
    expect(canSkipToNext("1:6", "playing", "1:7", 1)).toBe(true);
    // same verse number but different chapter
    expect(canSkipToNext("2:7", "playing", "1:7", 1)).toBe(true);
  });
});

describe("decideSkipVerse", () => {
  const fatihaTimings = [
    { verseKey: "1:1", timestampFrom: 0, timestampTo: 3000, segments: [] },
    { verseKey: "1:2", timestampFrom: 3000, timestampTo: 6000, segments: [] },
    { verseKey: "1:3", timestampFrom: 6000, timestampTo: 9000, segments: [] },
    { verseKey: "1:7", timestampFrom: 18000, timestampTo: 21000, segments: [] },
  ];

  it("seeks to next verse within the same chapter", () => {
    const decision = decideSkipVerse("next", "1:1", fatihaTimings, 1);
    expect(decision).toEqual({
      action: "seek-timing",
      targetVerseKey: "1:2",
      timestampFrom: 3000,
    });
  });

  it("seeks to previous verse within the same chapter", () => {
    const decision = decideSkipVerse("prev", "1:3", fatihaTimings, 1);
    expect(decision).toEqual({
      action: "seek-timing",
      targetVerseKey: "1:2",
      timestampFrom: 3000,
    });
  });

  it("chains to next chapter when at chapter end", () => {
    const decision = decideSkipVerse("next", "1:7", fatihaTimings, 1);
    expect(decision).toEqual({
      action: "load-chapter",
      chapterId: 2,
    });
  });

  it("loads previous chapter when at verse 1", () => {
    const decision = decideSkipVerse("prev", "2:1", [{ verseKey: "2:1", timestampFrom: 0, timestampTo: 5000, segments: [] }], 2);
    expect(decision).toEqual({
      action: "load-chapter",
      chapterId: 1,
    });
  });

  it("stops next at stop target", () => {
    const decision = decideSkipVerse("next", "1:7", fatihaTimings, 1, "1:7", 1);
    expect(decision).toEqual({ action: "none" });
  });

  it("stops previous at 1:1", () => {
    const decision = decideSkipVerse("prev", "1:1", fatihaTimings, 1);
    expect(decision).toEqual({ action: "none" });
  });
});

describe("canSkipToPreviousWord & canSkipToNextWord", () => {
  it("disables both when idle or missing currentVerseKey", () => {
    expect(canSkipToPreviousWord(null, "idle")).toBe(false);
    expect(canSkipToPreviousWord("2:5", "idle")).toBe(false);
    expect(canSkipToPreviousWord(null, "playing")).toBe(false);

    expect(canSkipToNextWord(null, "idle")).toBe(false);
    expect(canSkipToNextWord("2:5", "idle")).toBe(false);
    expect(canSkipToNextWord(null, "playing")).toBe(false);
  });

  it("disables previous at hard boundary 1:1 word 1", () => {
    expect(canSkipToPreviousWord("1:1", "playing", 1)).toBe(false);
    expect(canSkipToPreviousWord("1:1", "playing", null)).toBe(false);
    expect(canSkipToPreviousWord("1:1", "playing", 2)).toBe(true);
    expect(canSkipToPreviousWord("1:2", "playing", 1)).toBe(true);
    expect(canSkipToPreviousWord("2:1", "playing", 1)).toBe(true);
  });

  it("disables next at 114:6 last word", () => {
    expect(canSkipToNextWord("114:6", "playing", 6, 6)).toBe(false);
    expect(canSkipToNextWord("114:6", "playing", 5, 6)).toBe(true);
    expect(canSkipToNextWord("114:5", "playing", 3, 3)).toBe(true);
  });

  it("disables next when active stopVerseKey's last word is reached", () => {
    expect(canSkipToNextWord("1:7", "playing", 9, 9, "1:7", 1)).toBe(false);
    expect(canSkipToNextWord("1:7", "playing", 8, 9, "1:7", 1)).toBe(true);
    expect(canSkipToNextWord("1:6", "playing", 5, 5, "1:7", 1)).toBe(true);
    // Same verse number but different chapter
    expect(canSkipToNextWord("2:7", "playing", 9, 9, "1:7", 1)).toBe(true);
  });
});

describe("decideSkipWord", () => {
  const sampleVerseTimings = [
    {
      verseKey: "1:1",
      timestampFrom: 0,
      timestampTo: 4000,
      segments: [
        [1, 0, 1000],
        [2, 1100, 2000],
        [3, 2100, 3000],
        [4, 3100, 4000],
      ] as [number, number, number][],
    },
    {
      verseKey: "1:2",
      timestampFrom: 4500,
      timestampTo: 8000,
      segments: [
        [1, 4500, 5500],
        [2, 5600, 6500],
        [3, 6600, 8000],
      ] as [number, number, number][],
    },
  ];

  it("seeks to next word within the same verse", () => {
    // Currently at word 1 (0ms) -> should seek to word 2 (1100ms)
    const decision = decideSkipWord("next", 500, "1:1", sampleVerseTimings, 1);
    expect(decision).toEqual({
      action: "seek",
      targetVerseKey: "1:1",
      wordIndex: 2,
      timestampMs: 1100,
    });
  });

  it("seeks to previous word within the same verse", () => {
    // Currently at word 3 (2500ms) -> should seek to word 2 (1100ms)
    const decision = decideSkipWord("prev", 2500, "1:1", sampleVerseTimings, 1);
    expect(decision).toEqual({
      action: "seek",
      targetVerseKey: "1:1",
      wordIndex: 2,
      timestampMs: 1100,
    });
  });

  it("crosses verse boundary forward (last word of 1:1 -> first word of 1:2)", () => {
    // At word 4 of 1:1 (3500ms)
    const decision = decideSkipWord("next", 3500, "1:1", sampleVerseTimings, 1);
    expect(decision).toEqual({
      action: "seek",
      targetVerseKey: "1:2",
      wordIndex: 1,
      timestampMs: 4500,
    });
  });

  it("crosses verse boundary backward (first word of 1:2 -> last word of 1:1)", () => {
    // At word 1 of 1:2 (4800ms)
    const decision = decideSkipWord("prev", 4800, "1:2", sampleVerseTimings, 1);
    expect(decision).toEqual({
      action: "seek",
      targetVerseKey: "1:1",
      wordIndex: 4,
      timestampMs: 3100,
    });
  });

  it("prevents stepping back before 1:1 word 1", () => {
    // At word 1 of 1:1 (500ms)
    const decision = decideSkipWord("prev", 500, "1:1", sampleVerseTimings, 1);
    expect(decision).toEqual({ action: "none" });
  });

  it("prevents stepping next past last word of 114:6", () => {
    const nasTimings = [
      {
        verseKey: "114:6",
        timestampFrom: 0,
        timestampTo: 3000,
        segments: [
          [1, 0, 1000],
          [2, 1000, 2000],
          [3, 2000, 3000],
        ] as [number, number, number][],
      },
    ];
    const decision = decideSkipWord("next", 2500, "114:6", nasTimings, 114);
    expect(decision).toEqual({ action: "none" });
  });

  it("prevents stepping next past last word of stopVerseKey", () => {
    const decision = decideSkipWord("next", 7000, "1:2", sampleVerseTimings, 1, "1:2", 1);
    expect(decision).toEqual({ action: "none" });
  });

  it("chains forward to next chapter from last word of chapter", () => {
    const singleVerseTiming = [
      {
        verseKey: "1:7",
        timestampFrom: 0,
        timestampTo: 2000,
        segments: [
          [1, 0, 1000],
          [2, 1000, 2000],
        ] as [number, number, number][],
      },
    ];
    const decision = decideSkipWord("next", 1500, "1:7", singleVerseTiming, 1);
    expect(decision).toEqual({
      action: "load-chapter",
      chapterId: 2,
      target: "first-word",
    });
  });

  it("chains backward to previous chapter from first word of chapter", () => {
    const ch2Timings = [
      {
        verseKey: "2:1",
        timestampFrom: 0,
        timestampTo: 2000,
        segments: [
          [1, 0, 1000],
          [2, 1000, 2000],
        ] as [number, number, number][],
      },
    ];
    const decision = decideSkipWord("prev", 500, "2:1", ch2Timings, 2);
    expect(decision).toEqual({
      action: "load-chapter",
      chapterId: 1,
      target: "last-word",
    });
  });

  it("handles silence gap between words correctly", () => {
    // Between word 1 (end 1000) and word 2 (start 1100), at 1050ms
    const nextDecision = decideSkipWord("next", 1050, "1:1", sampleVerseTimings, 1);
    expect(nextDecision).toEqual({
      action: "seek",
      targetVerseKey: "1:1",
      wordIndex: 2,
      timestampMs: 1100,
    });

    const prevDecision = decideSkipWord("prev", 1050, "1:1", sampleVerseTimings, 1);
    expect(prevDecision).toEqual({
      action: "seek",
      targetVerseKey: "1:1",
      wordIndex: 1,
      timestampMs: 0,
    });
  });
});

describe("getNextPlaybackSpeed", () => {
  it("cycles through presets in order and wraps back to min after max", () => {
    expect(getNextPlaybackSpeed(0.5)).toBe(0.75);
    expect(getNextPlaybackSpeed(0.75)).toBe(1);
    expect(getNextPlaybackSpeed(1)).toBe(1.25);
    expect(getNextPlaybackSpeed(1.25)).toBe(1.5);
    expect(getNextPlaybackSpeed(1.5)).toBe(1.75);
    expect(getNextPlaybackSpeed(1.75)).toBe(2);
    expect(getNextPlaybackSpeed(2)).toBe(0.5);
  });

  it("resets to 1 when current speed is not a standard preset", () => {
    expect(getNextPlaybackSpeed(0.9)).toBe(1);
    expect(getNextPlaybackSpeed(1.15)).toBe(1);
    expect(getNextPlaybackSpeed(3)).toBe(1);
  });
});

describe("findActiveVerseTiming", () => {
  const normalTimings = [
    {
      verseKey: "2:1",
      timestampFrom: 0,
      timestampTo: 5000,
      segments: [],
    },
    {
      verseKey: "2:2",
      timestampFrom: 5000,
      timestampTo: 10000,
      segments: [],
    },
  ];

  it("resolves active verse within normal non-overlapping windows", () => {
    expect(findActiveVerseTiming(normalTimings, 2500)?.verseKey).toBe("2:1");
    expect(findActiveVerseTiming(normalTimings, 5000)?.verseKey).toBe("2:2");
    expect(findActiveVerseTiming(normalTimings, 7500)?.verseKey).toBe("2:2");
  });

  it("resolves to the newer verse when adjacent timings overlap (#695)", () => {
    // Overlapping timings simulating QDC data for reciter 10 (Sa'ud Ash-Shuraim),
    // where verse 2:5 ends at 40613ms while verse 2:6 starts at 40604ms (~9ms overlap).
    const overlappingTimings = [
      {
        verseKey: "2:5",
        timestampFrom: 30000,
        timestampTo: 40613,
        segments: [],
      },
      {
        verseKey: "2:6",
        timestampFrom: 40604,
        timestampTo: 55000,
        segments: [],
      },
    ];

    // Before verse 2:6 starts: resolves to 2:5
    expect(findActiveVerseTiming(overlappingTimings, 40600)?.verseKey).toBe("2:5");

    // At exact start of verse 2:6 (40604ms): must resolve to 2:6, not 2:5
    expect(findActiveVerseTiming(overlappingTimings, 40604)?.verseKey).toBe("2:6");

    // Inside the overlap window (40610ms): must resolve to 2:6, not 2:5
    expect(findActiveVerseTiming(overlappingTimings, 40610)?.verseKey).toBe("2:6");

    // After verse 2:5's timestampTo (40620ms): resolves to 2:6
    expect(findActiveVerseTiming(overlappingTimings, 40620)?.verseKey).toBe("2:6");
  });

  it("falls back to the last verse when currentTimeMs exceeds the last timestampTo", () => {
    expect(findActiveVerseTiming(normalTimings, 12000)?.verseKey).toBe("2:2");
  });

  it("returns undefined when currentTimeMs is before the first verse timestampFrom", () => {
    const delayedTimings = [
      {
        verseKey: "2:1",
        timestampFrom: 1000,
        timestampTo: 5000,
        segments: [],
      },
    ];
    expect(findActiveVerseTiming(delayedTimings, 500)).toBeUndefined();
  });

  it("resolves to next verse early when its first segment starts before timestampFrom", () => {
    const timings = [
      {
        verseKey: "1:1",
        timestampFrom: 0,
        timestampTo: 6090,
        segments: [[1, 0, 5840]] as [number, number, number][],
      },
      {
        verseKey: "1:2",
        timestampFrom: 6090,
        timestampTo: 11680,
        segments: [[1, 6025, 7025]] as [number, number, number][],
      },
    ];
    // At 6025ms, 1:2 first segment has started (even though timestampFrom is 6090ms)
    expect(findActiveVerseTiming(timings, 6025)?.verseKey).toBe("1:2");
    expect(findActiveVerseTiming(timings, 6050)?.verseKey).toBe("1:2");
    expect(findActiveVerseTiming(timings, 6000)?.verseKey).toBe("1:1");
  });
});

// Offline download display label (#767): re-derived at render time so legacy
// English-labelled entries and locale switches display correctly.
describe("offlineDownloadDisplayLabel", () => {
  const chapters: SurahResult[] = [
    { id: 1, name_arabic: "الفاتحة", name_simple: "Al-Fatihah", verses_count: 7, revelation_place: "makkah", pages: "1-1" },
    { id: 2, name_arabic: "البقرة", name_simple: "Al-Baqarah", verses_count: 286, revelation_place: "madinah", pages: "2-49" },
  ];
  const surahItem: Pick<RecitationDownloadItem, "kind" | "key" | "label"> = {
    kind: "surah",
    key: 1,
    label: "Mishari Rashid al-`Afasy · Al-Fatihah",
  };
  const juzItem: Pick<RecitationDownloadItem, "kind" | "key" | "label"> = {
    kind: "juz",
    key: 1,
    label: "Mishari Rashid al-`Afasy · Juz 1",
  };

  it("renders the Arabic surah name for the ar locale", () => {
    expect(
      offlineDownloadDisplayLabel(surahItem, {
        chapters,
        reciterName: "مشاري راشد العفاسي",
        juzWord: "جزء",
        locale: "ar",
      }),
    ).toBe("مشاري راشد العفاسي · الفاتحة");
  });

  it("renders the simple surah name for the en locale", () => {
    expect(
      offlineDownloadDisplayLabel(surahItem, {
        chapters,
        reciterName: "Mishari Rashid al-`Afasy",
        juzWord: "Juz",
        locale: "en",
      }),
    ).toBe("Mishari Rashid al-`Afasy · Al-Fatihah");
  });

  it("localizes the juz word and numerals per locale", () => {
    expect(
      offlineDownloadDisplayLabel(juzItem, {
        chapters,
        reciterName: "مشاري راشد العفاسي",
        juzWord: "جزء",
        locale: "ar",
      }),
    ).toBe("مشاري راشد العفاسي · جزء ١");
    expect(
      offlineDownloadDisplayLabel(juzItem, {
        chapters,
        reciterName: "Mishari Rashid al-`Afasy",
        juzWord: "Juz",
        locale: "en",
      }),
    ).toBe("Mishari Rashid al-`Afasy · Juz 1");
  });

  it("recomputes a legacy English label when viewed in ar", () => {
    expect(
      offlineDownloadDisplayLabel(
        { kind: "surah", key: 2, label: "Mishari Rashid al-`Afasy · Al-Baqarah" },
        { chapters, reciterName: "مشاري راشد العفاسي", juzWord: "جزء", locale: "ar" },
      ),
    ).toBe("مشاري راشد العفاسي · البقرة");
  });

  it("falls back to the stored label when the chapter is unknown", () => {
    expect(
      offlineDownloadDisplayLabel(
        { kind: "surah", key: 999, label: "Mishari Rashid al-`Afasy · Al-Fatihah" },
        { chapters, reciterName: "مشاري راشد العفاسي", juzWord: "جزء", locale: "ar" },
      ),
    ).toBe("Mishari Rashid al-`Afasy · Al-Fatihah");
  });

  it("falls back to the stored label when the reciter is unresolved", () => {
    expect(
      offlineDownloadDisplayLabel(surahItem, {
        chapters,
        reciterName: undefined,
        juzWord: "جزء",
        locale: "ar",
      }),
    ).toBe(surahItem.label);
  });

  it("falls back to the stored label for an out-of-range juz key", () => {
    for (const key of [0, 31]) {
      expect(
        offlineDownloadDisplayLabel(
          { kind: "juz", key, label: "Mishari Rashid al-`Afasy · Juz 1" },
          { chapters, reciterName: "مشاري راشد العفاسي", juzWord: "جزء", locale: "ar" },
        ),
      ).toBe("Mishari Rashid al-`Afasy · Juz 1");
    }
  });
});

describe("surahDisplayName", () => {
  const chapter = { name_arabic: "الفاتحة", name_simple: "Al-Fatihah" };

  it("returns the Arabic name for the ar locale", () => {
    expect(surahDisplayName(chapter, "ar")).toBe("الفاتحة");
  });

  it("returns the simple name for any other locale", () => {
    expect(surahDisplayName(chapter, "en")).toBe("Al-Fatihah");
  });
});

describe("calculateVerseCutoffMs (#791)", () => {
  const v1 = {
    verseKey: "1:1",
    timestampFrom: 0,
    timestampTo: 6090,
    segments: [
      [1, 0, 580],
      [2, 580, 1409],
      [3, 1409, 2502],
      [4, 2502, 5840],
    ] as [number, number, number][],
  };

  const v2 = {
    verseKey: "1:2",
    timestampFrom: 6090,
    timestampTo: 11680,
    segments: [
      [1, 6025, 7025],
      [2, 7025, 7885],
      [3, 7885, 8515],
      [4, 8515, 11550],
    ] as [number, number, number][],
  };

  it("calculates cutoff preserving natural pause and cutting 25ms before next vocal sound", () => {
    // v2 earliest vocal sound starts at 6025ms. Safe cutoff = 6025 - 25 = 6000ms.
    // v1 last word ends at 5840ms. 6000 >= 5840, so 6000ms is returned.
    expect(calculateVerseCutoffMs(v1, v2)).toBe(6000);
  });

  it("floors at lastWordEnd when the pause between verses is tighter than the safety margin", () => {
    const tightV1 = {
      verseKey: "2:1",
      timestampFrom: 0,
      timestampTo: 5010,
      segments: [[1, 0, 5000]] as [number, number, number][],
    };
    const tightV2 = {
      verseKey: "2:2",
      timestampFrom: 5010,
      timestampTo: 10000,
      segments: [[1, 5010, 6000]] as [number, number, number][],
    };
    // Next vocal start is 5010. 5010 - 25 = 4985ms, which is before last word end (5000ms).
    // Must floor at 5000ms to avoid clipping the end of the current verse.
    expect(calculateVerseCutoffMs(tightV1, tightV2)).toBe(5000);
  });

  it("handles next verse without segments by falling back to timestampFrom", () => {
    const v2NoSegments = {
      verseKey: "1:2",
      timestampFrom: 6000,
      timestampTo: 11000,
      segments: [],
    };
    // Next vocal start = 6000. Cutoff = 6000 - 25 = 5975ms.
    expect(calculateVerseCutoffMs(v1, v2NoSegments)).toBe(5975);
  });

  it("handles current verse without segments by using timestampFrom as floor", () => {
    const v1NoSegments = {
      verseKey: "1:1",
      timestampFrom: 1000,
      timestampTo: 6090,
      segments: [],
    };
    // Next vocal start = 6025. Cutoff = 6025 - 25 = 6000ms.
    expect(calculateVerseCutoffMs(v1NoSegments, v2)).toBe(6000);
  });

  it("returns timestampTo for the final verse of a chapter to preserve natural reverb and breath", () => {
    expect(calculateVerseCutoffMs(v1, undefined)).toBe(6090);
  });

  it("returns timestampTo for the final verse of a chapter without segments", () => {
    const vLastNoSegments = {
      verseKey: "114:6",
      timestampFrom: 20000,
      timestampTo: 25000,
      segments: [],
    };
    expect(calculateVerseCutoffMs(vLastNoSegments, undefined)).toBe(25000);
  });

  it("respects a custom safety margin parameter", () => {
    // Custom safety margin of 100ms: 6025 - 100 = 5925ms.
    expect(calculateVerseCutoffMs(v1, v2, 100)).toBe(5925);
  });

  it("ignores next verse segment start when it equals or precedes current verse last word end", () => {
    // Mishari Surah 100:1 (last word ends at 2865ms, to=3290ms).
    // Surah 100:2 has timestampFrom=3290ms, but QDC segment[0][1] was recorded as 2865ms.
    // Must ignore 2865ms and use 3290ms - 25ms = 3265ms, preserving the full natural pause.
    const mishari100v1 = {
      verseKey: "100:1",
      timestampFrom: 0,
      timestampTo: 3290,
      segments: [
        [1, 0, 1840],
        [2, 1840, 2865],
      ] as [number, number, number][],
    };
    const mishari100v2 = {
      verseKey: "100:2",
      timestampFrom: 3290,
      timestampTo: 6560,
      segments: [
        [1, 2865, 4675],
        [2, 4675, 5650],
      ] as [number, number, number][],
    };

    expect(calculateVerseCutoffMs(mishari100v1, mishari100v2)).toBe(3265);
  });

  it("ignores next verse segment start when skew before timestampFrom exceeds 100ms", () => {
    // Mishari Surah 100:2 (last word ends at 5650ms, to=6560ms).
    // Surah 100:3 has timestampFrom=6560ms, but QDC segment[0][1] was recorded as 6075ms (skew = 485ms > 100ms).
    // Must ignore 6075ms and use 6560ms - 25ms = 6535ms, preserving the full breath.
    const mishari100v2 = {
      verseKey: "100:2",
      timestampFrom: 3290,
      timestampTo: 6560,
      segments: [
        [1, 2865, 4675],
        [2, 4675, 5650],
      ] as [number, number, number][],
    };
    const mishari100v3 = {
      verseKey: "100:3",
      timestampFrom: 6560,
      timestampTo: 9640,
      segments: [
        [1, 6075, 7755],
        [2, 7755, 8790],
      ] as [number, number, number][],
    };

    expect(calculateVerseCutoffMs(mishari100v2, mishari100v3)).toBe(6535);
  });

  it("calculates natural cutoff for fast continuous recitation (Yasser Al-Dossari Surah 100:1)", () => {
    // Yasser 100:1 (last word ends at 2810ms, next verse starts at 2900ms in QDC metadata).
    // Effective boundary = min(2810, 2900) = 2810ms.
    // Safe cutoff = 2810 - 25 = 2785ms.
    // In audio reality, 100:2 begins at 2800ms while 100:1 ends at 2480ms.
    // 2785ms lands squarely in the silence gap, completely eliminating audio bleed into 100:2 (#791).
    const yasser100v1 = {
      verseKey: "100:1",
      timestampFrom: 80,
      timestampTo: 2810,
      segments: [
        [1, 0, 1340],
        [2, 1480, 2810],
      ] as [number, number, number][],
    };
    const yasser100v2 = {
      verseKey: "100:2",
      timestampFrom: 2900,
      timestampTo: 5150,
      segments: [
        [1, 2900, 4190],
        [2, 4190, 5150],
      ] as [number, number, number][],
    };

    expect(calculateVerseCutoffMs(yasser100v1, yasser100v2)).toBe(2785);
  });

  it("strictly enforces trust-heuristic boundaries: skew at 100ms vs 101ms", () => {
    // Current verse ends at 1000ms
    const cur = {
      verseKey: "1:1",
      timestampFrom: 0,
      timestampTo: 1000,
      segments: [[1, 0, 1000]] as [number, number, number][],
    };
    // Next verse with skew exactly 100ms: from 2000, first segment 1900. (1900 > 1000 + 50)
    const nxt100 = {
      verseKey: "1:2",
      timestampFrom: 2000,
      timestampTo: 3000,
      segments: [[1, 1900, 2500]] as [number, number, number][],
    };
    // Next verse with skew 101ms: from 2000, first segment 1899.
    const nxt101 = {
      verseKey: "1:2",
      timestampFrom: 2000,
      timestampTo: 3000,
      segments: [[1, 1899, 2500]] as [number, number, number][],
    };

    // Skew 100ms is trusted: boundary = min(1000, 1900) = 1000ms. Safe cutoff = 1000 - 25 = 975ms.
    expect(calculateVerseCutoffMs(cur, nxt100)).toBe(975);

    // Skew 101ms is not trusted: boundary = min(1000, 2000) = 1000ms. Cutoff = 975ms.
    expect(calculateVerseCutoffMs(cur, nxt101)).toBe(975);
  });

  it("strictly enforces trust-heuristic boundaries: gap vs lastWordEnd + 50ms", () => {
    // Current verse last word ends at 1000ms, timestampTo = 2000ms
    const cur = {
      verseKey: "1:1",
      timestampFrom: 0,
      timestampTo: 2000,
      segments: [[1, 0, 1000]] as [number, number, number][],
    };
    // Gap exactly 50ms (first segment at 1050ms, from at 1100ms): not > 50, so untrusted.
    const nxt50 = {
      verseKey: "1:2",
      timestampFrom: 1100,
      timestampTo: 3000,
      segments: [[1, 1050, 2500]] as [number, number, number][],
    };
    // Gap 51ms (first segment at 1051ms, from at 1100ms): > 50, so trusted.
    const nxt51 = {
      verseKey: "1:2",
      timestampFrom: 1100,
      timestampTo: 3000,
      segments: [[1, 1051, 2500]] as [number, number, number][],
    };

    // nxt50 untrusted: uses timestampFrom 1100. boundary = min(2000, 1100) = 1100. cutoff = 1100 - 25 = 1075ms.
    expect(calculateVerseCutoffMs(cur, nxt50)).toBe(1075);

    // nxt51 trusted: uses firstWordStart 1051. boundary = min(2000, 1051) = 1051. cutoff = 1051 - 25 = 1026ms.
    expect(calculateVerseCutoffMs(cur, nxt51)).toBe(1026);
  });

  it("strictly floors at currentTiming.timestampFrom even if boundary is earlier", () => {
    const corruptCur = {
      verseKey: "1:1",
      timestampFrom: 5000,
      timestampTo: 4000, // corrupt data where to < from
      segments: [],
    };
    const nxt = {
      verseKey: "1:2",
      timestampFrom: 4500,
      timestampTo: 8000,
      segments: [],
    };
    expect(calculateVerseCutoffMs(corruptCur, nxt)).toBe(5000);
  });
});

describe("calculateBoundaryFadeVolume (#791)", () => {
  // Micro-fade window is default 25ms immediately before cutoffMs.
  // Smoothly ramps down to 0 to prevent speaker click/pop without swallowing spoken words.
  it("reaches full volume before the fade window opens", () => {
    expect(calculateBoundaryFadeVolume(2850, 2880)).toBe(1);
    expect(calculateBoundaryFadeVolume(0, 2880)).toBe(1);
  });

  it("fades linearly to zero across the 25ms micro-fade window", () => {
    expect(calculateBoundaryFadeVolume(2867.5, 2880)).toBeCloseTo(0.5);
    expect(calculateBoundaryFadeVolume(2877.5, 2880)).toBeCloseTo(0.1);
  });

  it("returns 0 at and after the cutoff", () => {
    expect(calculateBoundaryFadeVolume(2880, 2880)).toBe(0);
    expect(calculateBoundaryFadeVolume(2900, 2880)).toBe(0);
  });

  it("respects a custom fade duration", () => {
    expect(calculateBoundaryFadeVolume(2950, 3000, 100)).toBeCloseTo(0.5);
    expect(calculateBoundaryFadeVolume(2900, 3000, 100)).toBe(1);
    expect(calculateBoundaryFadeVolume(3000, 3000, 100)).toBe(0);
  });
});

describe("calculateVerseStartMs (#791)", () => {
  it("uses early first word start if it begins slightly before timestampFrom (within 150ms)", () => {
    // Al-Fatiha 1:2: timestampFrom is 6090, but first word starts at 6025 (65ms skew).
    const v2 = {
      verseKey: "1:2",
      timestampFrom: 6090,
      timestampTo: 11680,
      segments: [
        [1, 6025, 7025],
        [2, 7025, 7885],
      ] as [number, number, number][],
    };
    expect(calculateVerseStartMs(v2)).toBe(6025);

    // Yasser Al-Adiyat 100:1: timestampFrom is 80, but first word starts at 0 (80ms skew).
    const yasser100v1 = {
      verseKey: "100:1",
      timestampFrom: 80,
      timestampTo: 2810,
      segments: [
        [1, 0, 1340],
        [2, 1480, 2810],
      ] as [number, number, number][],
    };
    expect(calculateVerseStartMs(yasser100v1)).toBe(0);
  });

  it("uses timestampFrom when first word starts after or at timestampFrom", () => {
    const v = {
      verseKey: "2:1",
      timestampFrom: 5000,
      timestampTo: 8000,
      segments: [[1, 5100, 6000]] as [number, number, number][],
    };
    expect(calculateVerseStartMs(v)).toBe(5000);
  });

  it("uses timestampFrom when segments are empty", () => {
    const v = {
      verseKey: "2:1",
      timestampFrom: 5000,
      timestampTo: 8000,
      segments: [],
    };
    expect(calculateVerseStartMs(v)).toBe(5000);
  });

  it("falls back to timestampFrom when first word segment is excessively early (skew > 150ms)", () => {
    const v = {
      verseKey: "100:2",
      timestampFrom: 3290,
      timestampTo: 6560,
      segments: [[1, 2865, 4675]] as [number, number, number][],
    };
    expect(calculateVerseStartMs(v)).toBe(3290);
  });

  it("strictly enforces the 150ms skew boundary: 150ms vs 151ms", () => {
    const v150 = {
      verseKey: "1:1",
      timestampFrom: 1000,
      timestampTo: 2000,
      segments: [[1, 850, 1500]] as [number, number, number][],
    };
    const v151 = {
      verseKey: "1:1",
      timestampFrom: 1000,
      timestampTo: 2000,
      segments: [[1, 849, 1500]] as [number, number, number][],
    };
    // 1000 - 850 = 150ms: trusted
    expect(calculateVerseStartMs(v150)).toBe(850);
    // 1000 - 849 = 151ms: untrusted
    expect(calculateVerseStartMs(v151)).toBe(1000);
  });
});

