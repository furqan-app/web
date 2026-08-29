import { TafsirEdition, VerseTafsir } from "@/app/types/tafsir";
import { TafsirProvider, TafsirProviderError } from "@/app/lib/tafsir/provider";
import { normalizeVerseKey } from "@/app/utils/tafsir-formatter";
import { getTafsirEdition } from "@/app/constants/tafsir";

const QDC_BASE_URL = "https://api.qurancdn.com/api/qdc";

interface QdcTafsirItem {
  resource_id: number;
  resource_name?: string | null;
  language_id?: number;
  slug?: string;
  translated_name?: { name: string; language_name: string } | null;
  text?: string | null;
}

interface QdcTafsirResponse {
  tafsir?: QdcTafsirItem | null;
}

interface QdcResourceTafsir {
  id: number;
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
  translated_name?: { name: string; language_name: string } | null;
}

interface QdcResourcesResponse {
  tafsirs?: QdcResourceTafsir[];
}

const RTL_LANGUAGES = new Set(["arabic", "urdu", "persian", "kurdish", "hebrew", "ar", "ur", "fa"]);

async function getTafsir(
  tafsirId: number,
  verseKey: string,
  signal?: AbortSignal,
): Promise<VerseTafsir | null> {
  const normalizedKey = normalizeVerseKey(verseKey);
  if (!normalizedKey) {
    throw new TafsirProviderError(`Invalid verse key: "${verseKey}"`, 400);
  }

  const url = `${QDC_BASE_URL}/tafsirs/${tafsirId}/by_ayah/${normalizedKey}`;
  const res = await fetch(url, { signal });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new TafsirProviderError(
      `Failed to fetch tafsir for ${normalizedKey} (edition ${tafsirId}): ${res.statusText}`,
      res.status,
    );
  }

  const data = (await res.json()) as QdcTafsirResponse;
  if (!data?.tafsir) {
    return null;
  }

  const resId = data.tafsir.resource_id ?? tafsirId;
  const knownEdition = getTafsirEdition(resId);

  return {
    tafsirId: resId,
    verseKey: normalizedKey,
    resourceName: data.tafsir.resource_name ?? knownEdition?.name ?? data.tafsir.translated_name?.name ?? "",
    text: data.tafsir.text ?? "",
    languageName: knownEdition?.languageName ?? data.tafsir.translated_name?.language_name,
  };
}

async function getEditions(language = "ar", signal?: AbortSignal): Promise<TafsirEdition[]> {
  const url = `${QDC_BASE_URL}/resources/tafsirs?language=${encodeURIComponent(language)}`;
  const res = await fetch(url, { signal });

  if (!res.ok) {
    throw new TafsirProviderError(
      `Failed to fetch tafsir editions: ${res.statusText}`,
      res.status,
    );
  }

  const data = (await res.json()) as QdcResourcesResponse;
  const tafsirs = data.tafsirs ?? [];

  return tafsirs.map((t) => {
    const langLower = t.language_name.toLowerCase();
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      authorName: t.author_name,
      languageName: t.language_name,
      translatedName: t.translated_name?.name ?? t.name,
      direction: RTL_LANGUAGES.has(langLower) ? "rtl" : "ltr",
    };
  });
}

export const qdcTafsirProvider: TafsirProvider = {
  getTafsir,
  getEditions,
};
