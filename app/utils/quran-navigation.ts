import chaptersData from "@/public/quran/chapters.json";

export interface SurahMeta {
  id: number;
  nameArabic: string;
  nameSimple: string;
  versesCount: number;
}

interface RawChapterJson {
  id: number;
  name_arabic: string;
  name_simple: string;
  verses_count: number;
  revelation_place: string;
  pages: string;
}

/**
 * Static metadata catalog for the 114 Surahs of the Holy Quran,
 * derived directly from public/quran/chapters.json for zero-drift consistency.
 */
export const SURAHS_META: SurahMeta[] = (chaptersData as RawChapterJson[]).map((c) => ({
  id: c.id,
  nameArabic: c.name_arabic,
  nameSimple: c.name_simple,
  versesCount: c.verses_count,
}));

const SURAHS_MAP = new Map<number, SurahMeta>(
  SURAHS_META.map((s) => [s.id, s])
);

/**
 * Normalizes a verse key string into standard "${surah}:${ayah}" format without zero-padding.
 * Handles inputs like "002:005", "2:5", "2_5", " 2 : 5 ".
 * Returns null if the format is invalid or out of Quran bounds (surahs 1-114).
 */
export function normalizeVerseKey(key: string | null | undefined): string | null {
  if (!key || typeof key !== "string") return null;

  const match = key.trim().match(/^(\d{1,3})\s*[:_]\s*(\d{1,3})$/);
  if (!match) return null;

  const surah = parseInt(match[1], 10);
  const ayah = parseInt(match[2], 10);

  if (Number.isNaN(surah) || Number.isNaN(ayah) || surah < 1 || surah > 114) {
    return null;
  }

  const surahMeta = SURAHS_MAP.get(surah);
  if (!surahMeta || ayah < 1 || ayah > surahMeta.versesCount) {
    return null;
  }

  return `${surah}:${ayah}`;
}

/**
 * Retrieves Surah metadata by Surah number (1-114).
 */
export function getSurahMeta(surahNumber: number): SurahMeta | undefined {
  return SURAHS_MAP.get(surahNumber);
}

/**
 * Retrieves the verse count for a given Surah number (1-114).
 * Returns 0 if the Surah number is invalid.
 */
export function getSurahVerseCount(surahNumber: number): number {
  const meta = getSurahMeta(surahNumber);
  return meta ? meta.versesCount : 0;
}

/**
 * Computes the previous ayah key in continuous Quran order (e.g. 2:1 -> 1:7).
 * Returns null if current is the first ayah of the Quran (1:1).
 */
export function getPreviousAyahKey(currentVerseKey: string | null | undefined): string | null {
  const normalized = normalizeVerseKey(currentVerseKey);
  if (!normalized) return null;

  const [surahStr, ayahStr] = normalized.split(":");
  const surahNum = parseInt(surahStr, 10);
  const ayahNum = parseInt(ayahStr, 10);

  if (Number.isNaN(surahNum) || Number.isNaN(ayahNum) || surahNum < 1 || surahNum > 114) {
    return null;
  }

  // If inside current surah and not first ayah
  if (ayahNum > 1) {
    return `${surahNum}:${ayahNum - 1}`;
  }

  // If first ayah of first surah (1:1), there is no previous
  if (surahNum === 1) {
    return null;
  }

  // Cross previous surah boundary to its last ayah
  const prevSurahMeta = getSurahMeta(surahNum - 1);
  if (!prevSurahMeta) return null;

  return `${prevSurahMeta.id}:${prevSurahMeta.versesCount}`;
}

/**
 * Computes the next ayah key in continuous Quran order (e.g. 1:7 -> 2:1).
 * Returns null if current is the last ayah of the Quran (114:6).
 */
export function getNextAyahKey(currentVerseKey: string | null | undefined): string | null {
  const normalized = normalizeVerseKey(currentVerseKey);
  if (!normalized) return null;

  const [surahStr, ayahStr] = normalized.split(":");
  const surahNum = parseInt(surahStr, 10);
  const ayahNum = parseInt(ayahStr, 10);

  if (Number.isNaN(surahNum) || Number.isNaN(ayahNum) || surahNum < 1 || surahNum > 114) {
    return null;
  }

  const currentSurahMeta = getSurahMeta(surahNum);
  if (!currentSurahMeta) return null;

  // If inside current surah and not last ayah
  if (ayahNum < currentSurahMeta.versesCount) {
    return `${surahNum}:${ayahNum + 1}`;
  }

  // If last ayah of last surah (114:6), there is no next
  if (surahNum === 114) {
    return null;
  }

  // Cross next surah boundary to its first ayah (1)
  return `${surahNum + 1}:1`;
}
