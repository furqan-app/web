import { describe, it, expect } from "vitest";
import {
  createPlaybackState,
  recordPlaybackTick,
  recordSeekStart,
  recordSeekEnd,
  recordRepetitionCompleted,
  setPlaybackSpeed,
  isPlaybackCoverageMet,
} from "./playback-detector";

describe("playback-detector", () => {
  const targetVerses = ["2:1", "2:2", "2:3", "2:4", "2:5", "2:6", "2:7", "2:8", "2:9", "2:10"];
  // 10 verses, each 10s -> 100s total duration
  const totalDuration = 100;

  it("satisfies criteria when >= 90% of verses are played through with full duration and 1 pass", () => {
    let state = createPlaybackState({
      targetVerseKeys: targetVerses,
      totalTargetDurationSeconds: totalDuration,
      requiredRepetitions: 1,
      playbackSpeed: 1.0,
    });

    // Play 9 out of 10 verses (90% coverage), each for 9s (out of 10s, 90% > 80% verse threshold)
    for (let i = 0; i < 9; i++) {
      state = recordPlaybackTick(state, targetVerses[i], 10, 9);
    }

    // 9 * 9 = 81s wall clock (< 85s floor of 0.85 * 100 = 85s)
    let result = isPlaybackCoverageMet(state);
    expect(result.isCoverageMet).toBe(true);
    expect(result.coverageFraction).toBe(0.9);
    expect(result.isTimeMet).toBe(false); // 81s < 85s
    expect(result.isMet).toBe(false);

    // Play 5 more seconds on the 9th verse (total wall clock = 86s >= 85s)
    state = recordPlaybackTick(state, targetVerses[8], 10, 5);
    result = isPlaybackCoverageMet(state);
    expect(result.isTimeMet).toBe(true);

    // Repetition not yet completed
    expect(result.isRepetitionsMet).toBe(false);
    expect(result.isMet).toBe(false);

    // Complete the repetition cycle
    state = recordRepetitionCompleted(state);
    result = isPlaybackCoverageMet(state);
    expect(result.isRepetitionsMet).toBe(true);
    expect(result.isMet).toBe(true);
  });

  it("rejects playback when coverage is below 90%", () => {
    let state = createPlaybackState({
      targetVerseKeys: targetVerses,
      totalTargetDurationSeconds: totalDuration,
      requiredRepetitions: 1,
      playbackSpeed: 1.0,
    });

    // Play only 8 out of 10 verses (80% < 90%)
    for (let i = 0; i < 8; i++) {
      state = recordPlaybackTick(state, targetVerses[i], 10, 11);
    }
    state = recordRepetitionCompleted(state);

    const result = isPlaybackCoverageMet(state);
    expect(result.coverageFraction).toBe(0.8);
    expect(result.isCoverageMet).toBe(false);
    expect(result.isMet).toBe(false);
  });

  it("handles seek and skip correctly: skipped verses do not accumulate", () => {
    let state = createPlaybackState({
      targetVerseKeys: targetVerses,
      totalTargetDurationSeconds: totalDuration,
      requiredRepetitions: 1,
    });

    // Play verse 1
    state = recordPlaybackTick(state, targetVerses[0], 10, 10);
    expect(state.verifiedVerseKeys.has(targetVerses[0])).toBe(true);

    // User seeks forward, skipping verses 2, 3, 4, 5, 6, 7, 8, 9
    state = recordSeekStart(state);
    // Ticks during seek are ignored
    state = recordPlaybackTick(state, targetVerses[4], 10, 5);
    state = recordSeekEnd(state);

    // Play verse 10
    state = recordPlaybackTick(state, targetVerses[9], 10, 10);
    state = recordRepetitionCompleted(state);

    const result = isPlaybackCoverageMet(state);
    // Only 2 of 10 verses heard (20% < 90%)
    expect(result.coverageFraction).toBe(0.2);
    expect(result.isMet).toBe(false);
  });

  it("scales the required listening time floor according to playback speed", () => {
    let state = createPlaybackState({
      targetVerseKeys: targetVerses,
      totalTargetDurationSeconds: totalDuration, // 100s
      requiredRepetitions: 1,
      playbackSpeed: 2.0, // 2x speed -> expected duration = 50s, floor = 0.85 * 50 = 42.5s
    });

    // Play all 10 verses at 2x speed for 4.5s each (total wall clock = 45s)
    for (let i = 0; i < 10; i++) {
      // At 2x speed, 4.5s wall clock corresponds to 9s audio duration (90% of 10s)
      state = recordPlaybackTick(state, targetVerses[i], 5, 4.5);
    }
    state = recordRepetitionCompleted(state);

    const result = isPlaybackCoverageMet(state);
    expect(result.isCoverageMet).toBe(true);
    expect(result.isTimeMet).toBe(true); // 45s >= 42.5s floor
    expect(result.isMet).toBe(true);
  });

  it("enforces full K passes for repetition tracks", () => {
    let state = createPlaybackState({
      targetVerseKeys: ["2:1", "2:2"],
      totalTargetDurationSeconds: 20,
      requiredRepetitions: 3, // Husun tahdeer x3
    });

    // Play both verses
    state = recordPlaybackTick(state, "2:1", 10, 9);
    state = recordPlaybackTick(state, "2:2", 10, 9);

    // Pass 1 complete
    state = recordRepetitionCompleted(state);
    expect(isPlaybackCoverageMet(state).isRepetitionsMet).toBe(false);
    expect(isPlaybackCoverageMet(state).isMet).toBe(false);

    // Pass 2 complete
    state = recordRepetitionCompleted(state);
    expect(isPlaybackCoverageMet(state).isRepetitionsMet).toBe(false);
    expect(isPlaybackCoverageMet(state).isMet).toBe(false);

    // Pass 3 complete
    state = recordRepetitionCompleted(state);
    expect(isPlaybackCoverageMet(state).isRepetitionsMet).toBe(true);
    expect(isPlaybackCoverageMet(state).isMet).toBe(true);
  });

  it("updates playback speed multiplier dynamically", () => {
    let state = createPlaybackState({
      targetVerseKeys: ["2:1"],
      totalTargetDurationSeconds: 10,
    });
    expect(state.playbackSpeed).toBe(1.0);

    state = setPlaybackSpeed(state, 1.5);
    expect(state.playbackSpeed).toBe(1.5);

    // Clamps to at least 0.25
    state = setPlaybackSpeed(state, 0.1);
    expect(state.playbackSpeed).toBe(0.25);
  });
});
