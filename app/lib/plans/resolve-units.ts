/**
 * Server-only resolution of Quran structural units to mushaf page ranges
 * (page-canonical engine, D3/ADR 0028). Reads already-seeded Quran data —
 * no schema changes, no cross-domain FK (lookup by scalar values only).
 */

import { quranPrisma } from "@/app/utils/db";

export type PageRange = { startPage: number; endPage: number };

export const getJuzPageRange = async (juzNumber: number): Promise<PageRange | null> => {
  const agg = await quranPrisma.pageMetadata.aggregate({
    where: { juz_number: juzNumber },
    _min: { page_number: true },
    _max: { page_number: true },
  });
  if (agg._min.page_number === null || agg._max.page_number === null) return null;
  return { startPage: agg._min.page_number, endPage: agg._max.page_number };
};

export const getHizbPageRange = async (hizbNumber: number): Promise<PageRange | null> => {
  const agg = await quranPrisma.verse.aggregate({
    where: { hizb_number: hizbNumber },
    _min: { page_number: true },
    _max: { page_number: true },
  });
  if (agg._min.page_number === null || agg._max.page_number === null) return null;
  return { startPage: agg._min.page_number, endPage: agg._max.page_number };
};

export const getRubPageRange = async (rubNumber: number): Promise<PageRange | null> => {
  const rub = await quranPrisma.rub.findUnique({
    where: { rub_number: rubNumber },
    include: {
      startVerse: { select: { page_number: true } },
      endVerse: { select: { page_number: true } },
    },
  });
  if (!rub) return null;
  return {
    startPage: rub.startVerse.page_number,
    endPage: rub.endVerse.page_number,
  };
};
