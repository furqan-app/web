import type { RubWithVerses } from "@/app/types/prisma";
import { getStaticRubs } from "@/app/lib/quran/static-data";

/** Load all 240 rub-el-hizb entries sorted by `rub_number` from static JSON. */
export const getRubs = async (): Promise<RubWithVerses[]> => {
  return getStaticRubs();
};
