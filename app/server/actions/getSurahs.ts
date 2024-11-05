"use server";

import { Surah } from "@/app/types";

export async function getSurahs(language: string): Promise<Surah[]> {
  const data = await fetch(
    `https://api.qurancdn.com/api/qdc/chapters?language=${language}`
  ).then((res) => res.json());
  return data.chapters;
}

