"use client";

import { useEffect, useRef } from "react";
import { useQuranTajweed } from "@/app/contexts/QuranTajweedContext";
import { ensurePageFonts } from "@/app/utils/page-font-registry";

type Props = {
  pageIds: number[];
};

// How many recently-used page fonts to keep tajweed <style> elements mounted
// for. The persistent pager (ADR 0028) shifts a small window across pages; if
// a page's element unmounted the moment it left the window, swiping back would
// re-download the tajweed font — a brief not-ready state on every revisit. This
// LRU mirrors the shared registry's cap (see page-font-registry.ts / ADR 0029).
const MAX_KEPT = 24;

export function FontFaceInjector({ pageIds }: Props) {
  const { tajweedMode } = useQuranTajweed();

  // LRU of page ids we've kept — current window first, capped at MAX_KEPT.
  const keptRef = useRef<number[]>([]);
  let kept = keptRef.current;
  for (const id of pageIds) {
    kept = kept.filter((x) => x !== id);
    kept.unshift(id);
  }
  if (kept.length > MAX_KEPT) kept = kept.slice(0, MAX_KEPT);
  keptRef.current = kept;
  const injectedIds = [...kept].sort((a, b) => a - b);
  const injectedIdsKey = injectedIds.join(",");

  // Base page fonts go through the immutable registry (ADR 0029) — never a
  // <style> rewrite, so a commit never resets an already-loaded face.
  useEffect(() => {
    ensurePageFonts(injectedIds);
    // injectedIds is a new array each render; the joined key is the real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectedIdsKey]);

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
