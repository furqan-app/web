import { useQuery } from "@tanstack/react-query";
import { UseTafsirOptions, VerseTafsir } from "@/app/types/tafsir";
import { qdcTafsirProvider } from "@/app/lib/tafsir/qdc-provider";
import { normalizeVerseKey } from "@/app/utils/tafsir-formatter";

export const tafsirQueryKey = (tafsirId: number, verseKey?: string | null) => {
  const normalized = normalizeVerseKey(verseKey);
  return ["tafsir", tafsirId, normalized] as const;
};

export const fetchTafsir = async (
  tafsirId: number,
  verseKey: string,
  signal?: AbortSignal,
): Promise<VerseTafsir | null> => {
  return qdcTafsirProvider.getTafsir(tafsirId, verseKey, signal);
};

export const useTafsir = ({
  tafsirId,
  verseKey,
  enabled = true,
}: UseTafsirOptions) => {
  const normalizedKey = normalizeVerseKey(verseKey);

  return useQuery({
    queryKey: tafsirQueryKey(tafsirId, normalizedKey),
    queryFn: ({ signal }) => {
      if (!normalizedKey) return Promise.resolve(null);
      return fetchTafsir(tafsirId, normalizedKey, signal);
    },
    enabled: Boolean(normalizedKey) && enabled,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 60 * 60 * 1000, // 1 hour memory garbage collection
    // Enable fetching through service worker cache even when offline
    networkMode: "always",
  });
};
