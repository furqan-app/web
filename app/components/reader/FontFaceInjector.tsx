"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
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

// Moves `ids` to the front of `ref`'s kept list (most-recently-used), capped at
// MAX_KEPT, and returns the sorted result. Two independent LRUs are needed here
// (tajweed's keyed <style> ids vs. the registry's base-font ids) because they
// can legitimately diverge — see the baseFontIds prop doc below.
function updateLru(ref: MutableRefObject<number[]>, ids: number[]): number[] {
  let kept = ref.current;
  for (const id of ids) {
    kept = kept.filter((x) => x !== id);
    kept.unshift(id);
  }
  if (kept.length > MAX_KEPT) kept = kept.slice(0, MAX_KEPT);
  ref.current = kept;
  return [...kept].sort((a, b) => a - b);
}

export function FontFaceInjector({ pageIds, baseFontIds }: Props) {
  const { tajweedMode } = useQuranTajweed();

  // Tajweed keyed <style> ids — pure CSS declaration, safe to over-list with
  // the pair-expanded pageIds (browsers never fetch an unrendered @font-face).
  const keptRef = useRef<number[]>([]);
  const injectedIds = updateLru(keptRef, pageIds);

  // Base-font registry ids (ADR 0029) — ensurePageFonts's face.load() is
  // eager, so this must only include ids the caller has confirmed are actually
  // visible (baseFontIds excludes an invisible spread partner on single-page
  // views; see ADR 0029's Addendum). Tracked as its own LRU, independent of the
  // tajweed one above, since the two lists can diverge.
  const baseKeptRef = useRef<number[]>([]);
  const baseInjectedIds = updateLru(baseKeptRef, baseFontIds);
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
