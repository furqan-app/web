"use client";

import { useEffect, useState } from "react";
import { useQuranTajweed } from "@/app/contexts/QuranTajweedContext";
import { ensurePageFonts } from "@/app/utils/page-font-registry";

type Props = {
  pageIds: number[];
  baseFontIds: number[];
};

// How many recently-used page ids to keep mounted/registered. The persistent
// pager (ADR 0028) shifts a small window across pages; if a page's tajweed
// element unmounted (or its registry face evicted) the moment it left the
// window, swiping back would re-download it — a brief not-ready state on every
// revisit. Mirrors the shared registry's own cap (page-font-registry.ts).
const MAX_KEPT = 24;

// Pure LRU step: moves `ids` to the front of `prevKept` (most-recently-used),
// capped at MAX_KEPT. No side effects — safe to call from render.
function nextKept(prevKept: number[], ids: number[]): number[] {
  let kept = prevKept;
  for (const id of ids) {
    kept = kept.filter((x) => x !== id);
    kept.unshift(id);
  }
  return kept.length > MAX_KEPT ? kept.slice(0, MAX_KEPT) : kept;
}

// Tracks a rolling LRU of `ids` across renders and returns it sorted ascending.
// Uses React's "adjust state during render" pattern instead of a mutated ref:
// comparing `ids` against the previously-seen signature and calling `setState`
// synchronously in the render body (not in an effect) when it differs. React
// re-renders immediately with the fresh state before committing, so there is
// no extra render pass and no flash of the stale list — and, unlike a ref
// write, a render that never commits (a Suspense retry, an interrupted
// transition) never leaves the tracked list mutated. Two independent LRUs are
// needed here (tajweed's keyed <style> ids vs. the registry's base-font ids)
// because they can legitimately diverge — see the baseFontIds prop doc below.
function useLruIds(ids: number[]): number[] {
  const idsKey = ids.join(",");
  const [tracked, setTracked] = useState(() => {
    const kept = nextKept([], ids);
    return { key: idsKey, kept, sorted: [...kept].sort((a, b) => a - b) };
  });

  if (tracked.key !== idsKey) {
    const kept = nextKept(tracked.kept, ids);
    const sorted = [...kept].sort((a, b) => a - b);
    setTracked({ key: idsKey, kept, sorted });
    return sorted;
  }

  return tracked.sorted;
}

export function FontFaceInjector({ pageIds, baseFontIds }: Props) {
  const { tajweedMode } = useQuranTajweed();

  // Tajweed keyed <style> ids — pure CSS declaration, safe to over-list with
  // the pair-expanded pageIds (browsers never fetch an unrendered @font-face).
  const injectedIds = useLruIds(pageIds);

  // Base-font registry ids (ADR 0029) — ensurePageFonts's face.load() is
  // eager, so this must only include ids the caller has confirmed are actually
  // visible (baseFontIds excludes an invisible spread partner on single-page
  // views; see ADR 0029's Addendum). Tracked as its own LRU, independent of the
  // tajweed one above, since the two lists can diverge.
  const baseInjectedIds = useLruIds(baseFontIds);
  const baseInjectedIdsKey = baseInjectedIds.join(",");

  useEffect(() => {
    ensurePageFonts(baseInjectedIds);
    // baseInjectedIds is a new array each render; the joined key is the real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseInjectedIdsKey]);

  // Shared tajweed-rule color overrides (indices 3–9). Frame slots 10–12 differ
  // per theme to match each card background (Trello #113, ADR 0023 Addendum 13).
  const RULE_OVERRIDES = "3 #E70D8A, 4 #BC7F22, 5 #C4A94D, 6 #029E48, 7 #067497, 8 #0FAEC1, 9 #E70D8A";

  // Tajweed stays CSS — @font-palette-values has no FontFace-API equivalent —
  // but as one keyed <style> per page id, content static after mount. React
  // mounts/unmounts whole elements on LRU change and never rewrites a live
  // sheet, so committing never resets a sibling page's tajweed face either.
  // Only injected (and therefore only fetched) when Tajweed mode is on — the
  // COLRv1 fonts are ~9-10x heavier than the base font. See ADR 0023.
  if (!tajweedMode) return null;

  return (
    <>
      {injectedIds.map((id) => (
        <style
          key={id}
          dangerouslySetInnerHTML={{
            __html: `
@font-face {
  font-family: 'quran-p${id}-tajweed';
  src: url('/fonts/v4/colrv1/woff2/p${id}.woff2') format('woff2');
  font-display: block;
}
@font-palette-values --Light {
  font-family: 'quran-p${id}-tajweed';
  base-palette: 0;
  override-colors: ${RULE_OVERRIDES}, 10 #ffffff, 11 #ffffff, 12 #ffffff;
}
@font-palette-values --Dark {
  font-family: 'quran-p${id}-tajweed';
  base-palette: 1;
  override-colors: 3 #F556B0, 4 #E1AB5B, 5 #D9C78C, 6 #20DF76, 7 #26ACD9, 8 #3FD3E4, 9 #F556B0, 10 #192533, 11 #192533, 12 #192533;
}
@font-palette-values --Gold {
  font-family: 'quran-p${id}-tajweed';
  base-palette: 2;
  override-colors: ${RULE_OVERRIDES}, 10 #faf9f4, 11 #faf9f4, 12 #faf9f4;
}`,
          }}
        />
      ))}
    </>
  );
}
