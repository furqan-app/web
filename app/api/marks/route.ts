import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { appPrisma, quranPrisma } from "@/app/utils/db";
import { extractUser } from "@/app/api/request";
import { VERSE_SNIPPET_WORD_LIMIT } from "@/app/constants/marks";

export type MarkListItem = {
  color: string;
  marked_type: string;
  marked_id: string;
  page_number: number;
  chapter_name_simple: string;
  chapter_name_arabic: string;
  verse_number: number;
  snippet: string;
};

const buildVerseSnippet = (words: Array<{ qpc_uthmani_hafs: string }>) => {
  const displayWords = words.map((w) => w.qpc_uthmani_hafs);
  return displayWords.length > VERSE_SNIPPET_WORD_LIMIT
    ? `${displayWords.slice(0, VERSE_SNIPPET_WORD_LIMIT).join(" ")} ...`
    : displayWords.join(" ");
};

/**
 * This request is protected by the global middleware in middleware.ts
 */
export async function GET(request: NextRequest) {
  const user = extractUser(request);

  if (!user) {
    return jsonResponse({ code: 401, message: "Unauthorized" });
  }

  const marks = await appPrisma.mark.findMany({
    where: { to_user: user.id, mark_type: "color" },
    orderBy: { page_number: "asc" },
  });

  const wordMarks = marks.filter((m) => m.marked_type === "word");
  const verseMarks = marks.filter((m) => m.marked_type === "verse");

  const [words, verses] = await Promise.all([
    wordMarks.length
      ? quranPrisma.word.findMany({
          where: { location: { in: wordMarks.map((m) => m.marked_id) } },
          include: { verse: { include: { chapter: true } } },
        })
      : Promise.resolve([]),
    verseMarks.length
      ? quranPrisma.verse.findMany({
          where: { verse_key: { in: verseMarks.map((m) => m.marked_id) } },
          include: {
            chapter: true,
            Word: {
              where: { char_type_name: "word" },
              orderBy: { position: "asc" },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const wordByLocation = new Map(words.map((w) => [w.location, w]));
  const verseByKey = new Map(verses.map((v) => [v.verse_key, v]));

  const items: Array<MarkListItem> = marks.flatMap((mark) => {
    if (mark.marked_type === "word") {
      const word = wordByLocation.get(mark.marked_id);
      if (!word) return [];

      return [
        {
          color: mark.mark_value,
          marked_type: mark.marked_type,
          marked_id: mark.marked_id,
          page_number: mark.page_number,
          chapter_name_simple: word.verse.chapter.name_simple,
          chapter_name_arabic: word.verse.chapter.name_arabic,
          verse_number: word.verse.verse_number,
          snippet: word.qpc_uthmani_hafs,
        },
      ];
    }

    const verse = verseByKey.get(mark.marked_id);
    if (!verse) return [];

    return [
      {
        color: mark.mark_value,
        marked_type: mark.marked_type,
        marked_id: mark.marked_id,
        page_number: mark.page_number,
        chapter_name_simple: verse.chapter.name_simple,
        chapter_name_arabic: verse.chapter.name_arabic,
        verse_number: verse.verse_number,
        snippet: buildVerseSnippet(verse.Word),
      },
    ];
  });

  return jsonResponse({ data: items });
}
