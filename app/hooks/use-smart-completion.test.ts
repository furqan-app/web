import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { create, act, type ReactTestRenderer } from "react-test-renderer";
import {
  getOfferCooldownKey,
  isOfferStale,
  useSmartCompletion,
  getTargetVerseKeysForAssignment,
  type ActiveOffer,
  type PlanVerseIndex,
} from "./use-smart-completion";
import type { TodayPlanAssignments } from "@/app/api/plans/today/route";
import type { TrackAssignment } from "@/app/lib/plans/engine";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: 1, name: "test", email: "test@example.com" } },
    status: "authenticated",
  }),
}));

const memorizeAssignment = (overrides?: Partial<TrackAssignment>): TrackAssignment => ({
  trackKey: "memorize",
  activity: "memorize",
  unit: "page",
  rangeStart: 77,
  rangeEnd: 77,
  completed: false,
  ...overrides,
});

const plan = (planId: number, assignments: TrackAssignment[]): TodayPlanAssignments => ({
  planId,
  templateKey: "memorizing-wird",
  name: "plan",
  assignments,
});

const offer = (planId: number, trackKey: string): ActiveOffer => ({
  planId,
  assignment: memorizeAssignment({ trackKey }),
});

describe("getOfferCooldownKey", () => {
  it("is deterministic for the same inputs", () => {
    expect(getOfferCooldownKey(9, "memorize", [77])).toBe(
      getOfferCooldownKey(9, "memorize", [77]),
    );
  });

  it("scopes suppression per page", () => {
    expect(getOfferCooldownKey(9, "memorize", [77])).not.toBe(
      getOfferCooldownKey(9, "memorize", [78]),
    );
  });

  it("scopes suppression per assignment and per plan", () => {
    const base = getOfferCooldownKey(9, "memorize", [77]);
    expect(getOfferCooldownKey(9, "review", [77])).not.toBe(base);
    expect(getOfferCooldownKey(8, "memorize", [77])).not.toBe(base);
  });

  it("handles a null page list without throwing", () => {
    expect(getOfferCooldownKey(9, "memorize", null)).toBe("9:memorize:");
  });
});

describe("isOfferStale", () => {
  it("is never stale when there is no offer", () => {
    const relevant = [plan(9, [memorizeAssignment()])].map((p) => ({
      plan: p,
      assignment: p.assignments[0],
    }));
    expect(isOfferStale(relevant, null)).toBe(false);
  });

  it("keeps the offer while its assignment is still pending", () => {
    const relevant = [
      { plan: plan(9, [memorizeAssignment()]), assignment: memorizeAssignment() },
    ];
    expect(isOfferStale(relevant, offer(9, "memorize"))).toBe(false);
  });

  it("clears the offer once its assignment reads as completed", () => {
    const done = memorizeAssignment({ completed: true });
    const relevant = [{ plan: plan(9, [done]), assignment: done }];
    expect(isOfferStale(relevant, offer(9, "memorize"))).toBe(true);
  });

  it("clears the offer when its assignment left the page scope", () => {
    const relevant = [
      { plan: plan(8, [memorizeAssignment()]), assignment: memorizeAssignment() },
    ];
    expect(isOfferStale(relevant, offer(9, "memorize"))).toBe(true);
  });

  it("does not confuse the same track key on another plan", () => {
    const relevant = [
      { plan: plan(8, [memorizeAssignment()]), assignment: memorizeAssignment() },
    ];
    // Plan 9's offer is stale even though plan 8 has the same track pending.
    expect(isOfferStale(relevant, offer(9, "memorize"))).toBe(true);
    expect(isOfferStale(relevant, offer(8, "memorize"))).toBe(false);
  });
});

const listenAssignment = (overrides?: Partial<TrackAssignment>): TrackAssignment => ({
  trackKey: "listen",
  activity: "listen",
  unit: "verse",
  rangeStart: 1,
  rangeEnd: 3,
  completed: false,
  ...overrides,
});

const mockVerseIndex: PlanVerseIndex = {
  verseKeyOf: (ord: number) => {
    if (ord >= 1 && ord <= 3) return `1:${ord}`;
    if (ord >= 4 && ord <= 6) return `2:${ord - 3}`;
    return undefined;
  },
  pageOf: (ord: number) => {
    if (ord >= 1 && ord <= 3) return 1;
    if (ord >= 4 && ord <= 6) return 2;
    return undefined;
  },
  pageVerseSpan: (page: number) => {
    if (page === 1) return { first: 1, last: 3 };
    if (page === 2) return { first: 4, last: 6 };
    return undefined;
  },
};

describe("getTargetVerseKeysForAssignment", () => {
  it("returns empty array if verseIndex is missing", () => {
    const assignment = listenAssignment({ rangeStart: 1, rangeEnd: 3 });
    expect(getTargetVerseKeysForAssignment(assignment, undefined)).toEqual([]);
  });

  it("resolves verse ordinals to verse keys for verse-unit assignment", () => {
    const assignment = listenAssignment({ unit: "verse", rangeStart: 1, rangeEnd: 3 });
    expect(getTargetVerseKeysForAssignment(assignment, mockVerseIndex)).toEqual([
      "1:1",
      "1:2",
      "1:3",
    ]);
  });

  it("resolves page spans to verse keys for page-unit assignment", () => {
    const assignment = listenAssignment({ unit: "page", rangeStart: 1, rangeEnd: 1 });
    expect(getTargetVerseKeysForAssignment(assignment, mockVerseIndex)).toEqual([
      "1:1",
      "1:2",
      "1:3",
    ]);
  });
});

type SmartCompletionProps = Parameters<typeof useSmartCompletion>[0];

function HookHarness(
  props: SmartCompletionProps & {
    onResult?: (r: ReturnType<typeof useSmartCompletion>) => void;
  },
) {
  const result = useSmartCompletion(props);
  props.onResult?.(result);
  return null;
}

describe("useSmartCompletion listening playback detection", () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    mockStore = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStore[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
    });
    vi.stubGlobal("window", {
      addEventListener: () => {},
      removeEventListener: () => {},
      matchMedia: () => ({ matches: false }),
    });
    vi.stubGlobal("document", {
      addEventListener: () => {},
      removeEventListener: () => {},
      visibilityState: "visible",
      hasFocus: () => true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("tracks standard reader recitation and triggers offer when coverage >= 90% without activeOverrideId", () => {
    const listen = listenAssignment({ rangeStart: 1, rangeEnd: 3 });
    const p = plan(1, [listen]);
    const onCheckOff = vi.fn();
    const onStartFlourish = vi.fn();
    let latestResult: ReturnType<typeof useSmartCompletion> | undefined;

    const baseProps = {
      enabled: true,
      visiblePages: [1],
      relevant: [{ plan: p, assignment: listen }],
      recitationStatus: "playing" as const,
      currentVerseKey: "1:1",
      activeOverrideId: null,
      playbackSpeed: 1,
      verseIndex: mockVerseIndex,
      onCheckOff,
      onUncheckOff: vi.fn(),
      onStartFlourish,
    };

    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(
        React.createElement(HookHarness, {
          ...baseProps,
          onResult: (res) => {
            latestResult = res;
          },
        }),
      );
    });

    expect(latestResult?.activeOffer).toBeNull();
    expect(onCheckOff).not.toHaveBeenCalled();

    // Advance to second verse
    act(() => {
      renderer?.update(
        React.createElement(HookHarness, {
          ...baseProps,
          currentVerseKey: "1:2",
          onResult: (res) => {
            latestResult = res;
          },
        }),
      );
    });

    expect(latestResult?.activeOffer).toBeNull();

    // Advance to third (last) verse
    act(() => {
      renderer?.update(
        React.createElement(HookHarness, {
          ...baseProps,
          currentVerseKey: "1:3",
          onResult: (res) => {
            latestResult = res;
          },
        }),
      );
    });

    // Option A (auto-write off): active offer created!
    expect(latestResult?.activeOffer).toEqual({
      planId: 1,
      planName: "plan",
      assignment: listen,
    });
    expect(onCheckOff).not.toHaveBeenCalled();

    renderer?.unmount();
  });

  it("auto-records and flourishes when auto-write is enabled without activeOverrideId", () => {
    mockStore["awradAutoWriteCompletion"] = JSON.stringify({ "1": true });

    const listen = listenAssignment({ rangeStart: 1, rangeEnd: 3 });
    const p = plan(1, [listen]);
    const onCheckOff = vi.fn();
    const onStartFlourish = vi.fn();
    let latestResult: ReturnType<typeof useSmartCompletion> | undefined;

    const baseProps = {
      enabled: true,
      visiblePages: [1],
      relevant: [{ plan: p, assignment: listen }],
      recitationStatus: "playing" as const,
      currentVerseKey: "1:1",
      activeOverrideId: null,
      playbackSpeed: 1,
      verseIndex: mockVerseIndex,
      onCheckOff,
      onUncheckOff: vi.fn(),
      onStartFlourish,
    };

    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(
        React.createElement(HookHarness, {
          ...baseProps,
          onResult: (res) => {
            latestResult = res;
          },
        }),
      );
    });

    act(() => {
      renderer?.update(
        React.createElement(HookHarness, {
          ...baseProps,
          currentVerseKey: "1:2",
          onResult: (res) => {
            latestResult = res;
          },
        }),
      );
    });

    act(() => {
      renderer?.update(
        React.createElement(HookHarness, {
          ...baseProps,
          currentVerseKey: "1:3",
          onResult: (res) => {
            latestResult = res;
          },
        }),
      );
    });

    expect(onCheckOff).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: 1,
        trackKey: "listen",
        rangeStart: 1,
        rangeEnd: 3,
      }),
    );
    expect(onStartFlourish).toHaveBeenCalled();
    expect(latestResult?.autoWriteNotice).toEqual({
      planId: 1,
      trackKey: "listen",
      activity: "listen",
    });

    renderer?.unmount();
  });

  it("does not track playback for verses outside the assignment range", () => {
    const listen = listenAssignment({ rangeStart: 1, rangeEnd: 3 });
    const p = plan(1, [listen]);
    const onCheckOff = vi.fn();
    let latestResult: ReturnType<typeof useSmartCompletion> | undefined;

    const baseProps = {
      enabled: true,
      visiblePages: [1],
      relevant: [{ plan: p, assignment: listen }],
      recitationStatus: "playing" as const,
      currentVerseKey: "2:1", // Verse ordinal 4 (page 2), not in range 1..3
      activeOverrideId: null,
      playbackSpeed: 1,
      verseIndex: mockVerseIndex,
      onCheckOff,
      onUncheckOff: vi.fn(),
      onStartFlourish: vi.fn(),
    };

    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(
        React.createElement(HookHarness, {
          ...baseProps,
          onResult: (res) => {
            latestResult = res;
          },
        }),
      );
    });

    act(() => {
      renderer?.update(
        React.createElement(HookHarness, {
          ...baseProps,
          currentVerseKey: "2:2",
          onResult: (res) => {
            latestResult = res;
          },
        }),
      );
    });

    expect(latestResult?.activeOffer).toBeNull();
    expect(onCheckOff).not.toHaveBeenCalled();

    renderer?.unmount();
  });
});
