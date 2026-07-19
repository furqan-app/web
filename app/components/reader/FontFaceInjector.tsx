"use client";

import { useQuranTajweed } from "@/app/contexts/QuranTajweedContext";

type Props = {
  pageIds: number[];
};

export function FontFaceInjector({ pageIds }: Props) {
  const { tajweedMode } = useQuranTajweed();

  const baseRules = pageIds
    .map(
      (id) => `
@font-face {
  font-family: 'quran-p${id}';
  src: url('/fonts/v1/ttf/p${id}.ttf') format('truetype');
  font-display: block;
}`
    )
    .join("\n");

  // Shared tajweed-rule color overrides (indices 3–9). Frame slots 10–12 differ
  // per theme to match each card background (Trello #113, ADR 0023 Addendum 13).
  const RULE_OVERRIDES = "3 #E70D8A, 4 #BC7F22, 5 #C4A94D, 6 #029E48, 7 #067497, 8 #0FAEC1, 9 #E70D8A";

  // Only injected (and therefore only fetched) when Tajweed mode is on — the
  // COLRv1 fonts are ~9-10x heavier than the base font. See ADR 0023.
  const tajweedRules = tajweedMode
    ? pageIds
        .map(
          (id) => `
@font-face {
  font-family: 'quran-p${id}-tajweed';
  src: url('/fonts/v4/colrv1/ttf/p${id}.ttf') format('truetype');
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
}`
        )
        .join("\n")
    : "";

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: baseRules + tajweedRules,
      }}
    />
  );
}
