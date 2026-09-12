import { describe, it, expect } from "vitest";
import {
  getOfferCooldownKey,
  isOfferStale,
  type ActiveOffer,
} from "./use-smart-completion";
import type { TodayPlanAssignments } from "@/app/api/plans/today/route";
import type { TrackAssignment } from "@/app/lib/plans/engine";

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
