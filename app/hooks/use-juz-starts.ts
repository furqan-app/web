import { useQuery } from "@tanstack/react-query";

export type JuzStart = { juz: number; verse_key: string; defaultPage: number };

// juz number → start position, generated once from the rubs table by
// scripts/quran-juz-starts/generate.js. verse_key is resolved against the
// active edition's verse-pages map at the call site (ADR 0033); defaultPage
export const fetchJuzStarts = async (): Promise<JuzStart[]> => {
  const r = await fetch("/quran/juz-starts.json");
  if (!r.ok) {
    throw new Error(`Failed to fetch juz-starts: ${r.status} ${r.statusText}`);
  }
  return r.json();
};

export const useJuzStarts = (enabled: boolean) =>
  useQuery({
    queryKey: ["juz-starts"],
    queryFn: fetchJuzStarts,
    staleTime: Infinity,
    enabled,
    // Immutable and SW-cached like verse-pages — fetch even while offline
    // instead of pausing (same rationale as useVersePages).
    networkMode: "always",
  });
