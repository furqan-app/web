import { useQuery } from "@tanstack/react-query";
import { Verse, Word } from "../types";
import { groupBy } from "../utils/groupBy";

export const fetchPageQurancCDN = async (
  page: number
): Promise<Record<string, Array<Word>>> => {
  const data = await fetch(
    `https://api.qurancdn.com/api/qdc/verses/by_page/${page}?words=true&per_page=all&fields=text_uthmani,chapter_id,hizb_number,text_imlaei_simple&reciter=7&word_translation_language=en&word_fields=verse_key,verse_id,page_number,location,text_uthmani,code_v1,code_v2,code_v4,qpc_uthmani_hafs&mushaf=2&filter_page_words=true`
  ).then((response) => response.json());

  return groupBy(
    (data.verses as Array<Verse>).map((v) => v.words).flat(),
    "line_number"
  );
};

export const fetchPageAPI = async (page: number) => {
  return fetch(`http://localhost:3000/api/quran/pages/${page}`).then(
    (response) => response.json()
  );
};

export const usePage = (page: number) => {
  return useQuery({
    queryKey: ["page", page],
    queryFn: () => fetchPageAPI(page),
    staleTime: Infinity,
  });
};

