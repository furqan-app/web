import { useQuery } from "@tanstack/react-query";
import { Verse, Word } from "../types";
import { groupBy } from "../utils/groupBy";

const setPageFont = (page: number) => {
  return fetch(`/fonts/v1/ttf/p${page}.ttf`)
    .then((resp) => resp.arrayBuffer())
    .then((font) => {
      const fontFace = new FontFace(`v1-p${page}`, font);
      document.fonts.add(fontFace);
    });
};

export const fetchPage = async (
  page: string | number
): Promise<Record<string, Array<Word>>> => {
  const [data] = await Promise.all([
    fetch(
      `https://api.qurancdn.com/api/qdc/verses/by_page/${page}?words=true&per_page=all&fields=text_uthmani,chapter_id,hizb_number,text_imlaei_simple&reciter=7&word_translation_language=en&word_fields=verse_key,verse_id,page_number,location,text_uthmani,code_v1,code_v2,code_v4,qpc_uthmani_hafs&mushaf=2&filter_page_words=true`
    ).then((response) => response.json()),
    setPageFont(Number(page)),
  ]);

  console.log("Api called for page:", page);
  return groupBy(
    (data.verses as Array<Verse>).map((v) => v.words).flat(),
    "line_number"
  );
};

export const usePage = (page: string | number) => {
  return useQuery({
    queryKey: ["page", page],
    queryFn: () => fetchPage(page),
    // Cache for ever
    staleTime: Infinity,
  });
};

