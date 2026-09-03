import { describe, expect, it } from "vitest";
import { decideRecitationFollow } from "@/app/utils/recitation";

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
