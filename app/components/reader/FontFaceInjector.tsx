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
}
@font-palette-values --Dark {
  font-family: 'quran-p${id}-tajweed';
  base-palette: 1;
}
@font-palette-values --Gold {
  font-family: 'quran-p${id}-tajweed';
  base-palette: 2;
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
