import { describe, expect, it } from "vitest";
import {
  canSkipToNext,
  canSkipToNextWord,
  canSkipToPrevious,
  canSkipToPreviousWord,
  decideRecitationFollow,
  decideSkipVerse,
  decideSkipWord,
  getNextPlaybackSpeed,
} from "@/app/utils/recitation";

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



