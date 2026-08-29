"use client";

import { useQuery } from "@tanstack/react-query";

interface VerseResponse {
  data?: {
    verse_key: string;
    text_uthmani: string;
  };
}

async function fetchVerseText(verseKey: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(`/api/quran/verses/${encodeURIComponent(verseKey)}`, { signal });
    if (!res.ok) return null;
    const json = (await res.json()) as VerseResponse;
    return json?.data?.text_uthmani ?? null;
  } catch {
    return null;
  }
}

export function useVerseText(verseKey: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["verse-text", verseKey],
    queryFn: ({ signal }) => fetchVerseText(verseKey!, signal),
    enabled: Boolean(verseKey && enabled),
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    networkMode: "always",
  });
}
