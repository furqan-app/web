"use client";

import { useEffect, useRef } from "react";
import { decideRecitationFollow } from "@/app/utils/recitation";
import { useRecitation } from "@/app/contexts/RecitationContext";

type Props = {
  // The pager's current anchor page and whether the double-view spread is active.
  anchor: number;
  isDouble: boolean;
  // Stable navigate callback (the pager's guarded commitTo). Called only when an
  // auto-advance moves the recited page out of the visible window while attached.
  onFollow: (target: number) => void;
};

// Isolated recitation-follow subscriber and the sole decider of the attach/detach
// follow state (ADR 0050). It — not ReaderPager — consumes the RecitationContext,
// which changes on every recited verse; keeping the subscription in this
// null-rendering leaf means the heavy pager tree never re-renders on a recitation
// tick, and ReaderPager stays entirely unaware of recitation.
//
// Two states, held in RecitationContext as `isFollowing`:
//   attached — the reader is showing the recited page; auto-advance across a page
//              boundary pulls the visible window forward (onFollow → pager).
//   detached — the user navigated away from the recited page on purpose, or left
//              the reader route; the reader stays put and RecitationReturnPanel
//              offers a way back.
//
// The whole transition decision is the pure `decideRecitationFollow` (see
// docs/plans/recitation-playback.md Addendum 13); this component only diffs the
// previous recitedPage/anchor via refs and applies the result.
export function RecitationFollow({ anchor, isDouble, onFollow }: Props) {
  const { recitedPage: recitedPageCtx, status, isFollowing, setIsFollowing } = useRecitation();
  const recitedPage = status === "idle" ? null : recitedPageCtx;

  const prevRecitedPage = useRef<number | null>(null);
  const prevAnchor = useRef(anchor);

  useEffect(() => {
    const decision = decideRecitationFollow({
      recitedPage,
      anchor,
      isDouble,
      prevRecitedPage: prevRecitedPage.current,
      prevAnchor: prevAnchor.current,
      isFollowing,
    });

    // `prevAnchor` always advances; `prevRecitedPage` does NOT advance on a
    // "follow" — onFollow can be dropped mid drag/commit (ReaderPager.followTo),
    // and the stale ref is what makes the next tick retry until it lands.
    prevAnchor.current = anchor;
    if (decision.action !== "follow") prevRecitedPage.current = recitedPage;

    switch (decision.action) {
      case "attach":
        setIsFollowing(true);
        break;
      case "detach":
        setIsFollowing(false);
        break;
      case "follow":
        setIsFollowing(true);
        onFollow(decision.target);
        break;
      case "none":
        break;
    }
  }, [recitedPage, anchor, isDouble, isFollowing, setIsFollowing, onFollow]);

  // Leaving the reader entirely is a detach — RecitationReturnPanel becomes the
  // only recitation surface until the user returns.
  useEffect(() => () => setIsFollowing(false), [setIsFollowing]);

  return null;
}
