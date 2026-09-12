import { describe, it, expect } from "vitest";
import {
  createDwellState,
  setVisibility,
  setActivePages,
  tickDwell,
  isPageDwellMet,
  isAssignmentDwellMet,
  DWELL_CONSTANTS,
} from "./dwell-detector";

describe("dwell-detector", () => {
  it("accumulates dwell time past the 5s bounce threshold", () => {
    let state = createDwellState(0, [2]);

    // Tick 4 seconds: below 5s bounce threshold, nothing committed to page 2 yet
    state = tickDwell(state, 4000);
    expect(state.pageSeconds.get(2) ?? 0).toBe(0);
    expect(isPageDwellMet(state, 2)).toBe(false);

    // Tick to 5 seconds: crosses bounce threshold! Commits all 5 seconds
    state = tickDwell(state, 5000);
    expect(state.pageSeconds.get(2)).toBe(5);

    // Tick to 30 seconds
    state = tickDwell(state, 30000);
    expect(state.pageSeconds.get(2)).toBe(30);
  });

  it("discards visits under 5 seconds (bounce filter)", () => {
    let state = createDwellState(0, [2]);

    // Stay on page 2 for 3 seconds, then flip to page 3
    state = tickDwell(state, 3000);
    state = setActivePages(state, [3], 3000);

    // Page 2 was discarded
    expect(state.pageSeconds.get(2) ?? 0).toBe(0);

    // Stay on page 3 for 10 seconds
    state = tickDwell(state, 13000);
    expect(state.pageSeconds.get(3)).toBe(10);
  });

  it("enforces the 60-second threshold boundary", () => {
    let state = createDwellState(0, [5]);

    // Keep active with interaction every 30s
    state = tickDwell(state, 30000);

    // Tick to 59 seconds: 59s < 60s, isPageDwellMet is false
    state = tickDwell(state, 59000);
    expect(state.pageSeconds.get(5)).toBe(59);
    expect(isPageDwellMet(state, 5)).toBe(false);

    // Tick to 60 seconds: exactly 60s, isPageDwellMet is true
    state = tickDwell(state, 60000);
    expect(state.pageSeconds.get(5)).toBe(60);
    expect(isPageDwellMet(state, 5)).toBe(true);
  });



  it("freezes accumulation when tab is backgrounded (isForeground: false)", () => {
    let state = createDwellState(0, [7]);

    // Active for 20s
    state = tickDwell(state, 20000);
    expect(state.pageSeconds.get(7)).toBe(20);

    // Tab backgrounded at t=20s
    state = setVisibility(state, false, 20000);

    // Tick 30s while hidden (t=50s)
    state = tickDwell(state, 50000);
    expect(state.pageSeconds.get(7)).toBe(20);

    // Tab returned to foreground at t=50s
    state = setVisibility(state, true, 50000);

    // Tick 40s active (t=90s): 20 + 40 = 60s -> met
    state = tickDwell(state, 90000);
    expect(state.pageSeconds.get(7)).toBe(60);
    expect(isPageDwellMet(state, 7)).toBe(true);
  });

  it("preserves committed dwell across page turns", () => {
    let state = createDwellState(0, [20]);

    // Read page 20 for 35 seconds (committed because >= 5s)
    state = tickDwell(state, 35000);
    expect(state.pageSeconds.get(20)).toBe(35);

    // Flip to page 21 and read for 20 seconds
    state = setActivePages(state, [21], 35000);
    state = tickDwell(state, 55000);
    expect(state.pageSeconds.get(21)).toBe(20);

    // Return to page 20: previous 35s is preserved
    state = setActivePages(state, [20], 55000);
    expect(state.pageSeconds.get(20)).toBe(35);

    // Read for 25 more seconds: 35 + 25 = 60s -> met!
    state = tickDwell(state, 80000);
    expect(state.pageSeconds.get(20)).toBe(60);
    expect(isPageDwellMet(state, 20)).toBe(true);
  });

  it("caps single page accumulation at 15 minutes (PAGE_MAX_CAP_SECONDS)", () => {
    let state = createDwellState(0, [15]);

    // Keep active across 20 minutes (interact every 30s)
    for (let t = 30000; t <= 1200000; t += 30000) {
      state = tickDwell(state, t);
    }

    // Must not exceed 900s (15 min)
    expect(state.pageSeconds.get(15)).toBe(DWELL_CONSTANTS.PAGE_MAX_CAP_SECONDS);
  });

  it("requires 100% per-page coverage for multi-page assignments", () => {
    let state = createDwellState(0, [1]);
    const targetPages = [1, 2, 3, 4, 5];

    // Read page 1 actively for 60s (with interaction at 30s)
    state = tickDwell(state, 30000);
    state = tickDwell(state, 60000);
    expect(isPageDwellMet(state, 1)).toBe(true);

    // 1 of 5 pages complete: assignment must NOT be met
    let result = isAssignmentDwellMet(state, targetPages);
    expect(result.isMet).toBe(false);
    expect(result.completedPages).toEqual([1]);
    expect(result.remainingPages).toEqual([2, 3, 4, 5]);
    expect(result.progressFraction).toBe(0.2);

    // Read pages 2, 3, 4 for 60s each
    let t = 60000;
    for (const page of [2, 3, 4]) {
      state = setActivePages(state, [page], t);
      t += 30000;
      state = tickDwell(state, t);
      t += 30000;
      state = tickDwell(state, t);
      expect(isPageDwellMet(state, page)).toBe(true);
    }

    // 4 of 5 pages complete: still NOT met
    result = isAssignmentDwellMet(state, targetPages);
    expect(result.isMet).toBe(false);
    expect(result.remainingPages).toEqual([5]);
    expect(result.progressFraction).toBe(0.8);

    // Complete final page 5
    state = setActivePages(state, [5], t);
    t += 30000;
    state = tickDwell(state, t);
    t += 30000;
    state = tickDwell(state, t);
    expect(isPageDwellMet(state, 5)).toBe(true);

    // Now all 5 pages are complete: assignment IS met!
    result = isAssignmentDwellMet(state, targetPages);
    expect(result.isMet).toBe(true);
    expect(result.completedPages).toEqual([1, 2, 3, 4, 5]);
    expect(result.remainingPages).toEqual([]);
    expect(result.progressFraction).toBe(1.0);
  });

  it("accumulates dwell on both pages of a double-page spread", () => {
    let state = createDwellState(0, [2, 3]);

    state = tickDwell(state, 30000);
    state = tickDwell(state, 60000);

    expect(isPageDwellMet(state, 2)).toBe(true);
    expect(isPageDwellMet(state, 3)).toBe(true);

    const result = isAssignmentDwellMet(state, [2, 3]);
    expect(result.isMet).toBe(true);
  });
});
