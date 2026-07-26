"use client";

import { useEffect } from "react";
import { getPagePair } from "@/app/utils/quran-pages";
import { useRecitation } from "@/app/contexts/RecitationContext";

type Props = {
  // The pager's current anchor page and whether the double-view spread is active.
  anchor: number;
  isDouble: boolean;
  // Stable navigate callback (the pager's guarded commitTo). Called only when the
  // recited page leaves the visible window.
  onFollow: (target: number) => void;
};

// Isolated recitation-follow subscriber. It — not ReaderPager — consumes the
// RecitationContext, which changes on every recited word (word highlight). Keeping
// the subscription in this null-rendering leaf means the heavy pager tree (panels,
// fonts, strip) never re-renders on a recitation tick; only this leaf does, and it
// renders nothing. When the recited verse's page falls outside the visible window
// (auto-advance across a page boundary, or the user swiping away mid-playback) it
// asks the pager to snap back. Gated on active playback; `onFollow` converges —
// once the page is visible this no-ops. See ADR 0028 (pager owns navigation).
export function RecitationFollow({ anchor, isDouble, onFollow }: Props) {
  const { recitedPage: recitedPageCtx, status } = useRecitation();
  const recitedPage = status === "playing" ? recitedPageCtx : null;

  useEffect(() => {
    if (recitedPage == null) return;
    const { rightPage, leftPage } = getPagePair(anchor);
    const visible = isDouble ? new Set([rightPage, leftPage]) : new Set([anchor]);
    if (visible.has(recitedPage)) return;
    const target = isDouble ? getPagePair(recitedPage).rightPage : recitedPage;
    onFollow(target);
  }, [recitedPage, anchor, isDouble, onFollow]);

  return null;
}
