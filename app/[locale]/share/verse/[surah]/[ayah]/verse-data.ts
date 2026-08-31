import "server-only";

import { cache } from "react";

import { quranPrisma } from "@/app/utils/db";
import { getSurahMeta, normalizeVerseKey } from "@/app/utils/quran-navigation";
import { toVersePlainText } from "@/app/utils/share-verse";

export type ShareVerseData = {
  verseKey: string;
  surahNum: number;
  ayahNum: number;
  pageNumber: number;
  surahNameArabic: string;
  surahNameSimple: string;
  // verse.text_uthmani normalised for plain-text use (og:description). Same
  // transform the share payload uses — see toVersePlainText.
  plainText: string;
};

/**
 * Resolves everything the /share/verse route needs for a {surah}/{ayah} pair,
 * or null when the pair is out of Quran bounds or has no stored verse.
 * `cache()`-wrapped so `generateMetadata` and the page component share one query.
 */
export const getShareVerseData = cache(
  async (surah: number, ayah: number): Promise<ShareVerseData | null> => {
    const verseKey = normalizeVerseKey(`${surah}:${ayah}`);
    if (!verseKey) return null;

    const surahMeta = getSurahMeta(surah);
    if (!surahMeta) return null;

    const verse = await quranPrisma.verse.findFirst({
      where: { verse_key: verseKey },
      select: { text_uthmani: true, page_number: true },
    });
    if (!verse) return null;

    return {
      verseKey,
      surahNum: surah,
      ayahNum: ayah,
      pageNumber: verse.page_number,
      surahNameArabic: surahMeta.nameArabic,
      surahNameSimple: surahMeta.nameSimple,
      plainText: toVersePlainText(verse.text_uthmani),
    };
  },
);
