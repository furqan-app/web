import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { appPrisma, quranPrisma } from "@/app/utils/db";
import { extractUser } from "@/app/api/request";
import {
  VERSE_SNIPPET_WORD_LIMIT,
  MARKS_PAGE_LIMIT,
  MARK_CATEGORIES,
  markKey,
} from "@/app/constants/marks";

export type MarkListItem = {
  // A mark is one row (ADR 0025): a category key (see MARK_CATEGORIES, e.g.
  // "forgetting"/"similar") plus an optional free-text comment.
  category: string;
  comment: string | null;
  marked_type: string;
  marked_id: string;
  page_number: number;
  chapter_name_simple: string;
  chapter_name_arabic: string;
  verse_number: number;
  snippet: string;
};

export type MarksPage = {
  data: Array<MarkListItem>;
  nextCursor: string | null;
};

const buildVerseSnippet = (words: Array<{ qpc_uthmani_hafs: string }>) => {
  const displayWords = words.map((w) => w.qpc_uthmani_hafs);
  return displayWords.length > VERSE_SNIPPET_WORD_LIMIT
    ? `${displayWords.slice(0, VERSE_SNIPPET_WORD_LIMIT).join(" ")} ...`
    : displayWords.join(" ");
};

/**
 * (surah, verse, wordPosition) so the list reads in natural Quran order.
 * `marked_id` is `location` ("s:v:w") for word marks, `verse_key` ("s:v")
 * for verse marks — a verse mark has no word segment, so it sorts after
 * every word of that verse (it's triggered at the end-of-verse glyph).
 */
const getSortKey = (item: { marked_type: string; marked_id: string }) => {
  const [surah, verse, word] = item.marked_id.split(":").map(Number);
  return [surah, verse, item.marked_type === "word" ? word : Infinity];
};

const VALID_CATEGORIES = new Set(MARK_CATEGORIES.map((c) => c.key));

/**
 * This request is protected by the global middleware in middleware.ts
 */
export async function GET(request: NextRequest) {
  const user = extractUser(request);

  if (!user) {
    return jsonResponse({ code: 401, message: "Unauthorized" });
  }

  const category = request.nextUrl.searchParams.get("category");
  const cursor = request.nextUrl.searchParams.get("cursor");

  if (category && category !== "all" && !VALID_CATEGORIES.has(category)) {
    return jsonResponse({ code: 422, message: "Invalid category" });
  }

  const marks = await appPrisma.mark.findMany({
    where: {
      to_user: user.id,
      ...(category && category !== "all" ? { category } : {}),
    },
  });

  marks.sort((a, b) => {
    const [aSurah, aVerse, aWord] = getSortKey(a);
    const [bSurah, bVerse, bWord] = getSortKey(b);
    // aWord/bWord are both Infinity when comparing two verse marks in the
    // same verse — Infinity - Infinity is NaN, which Array.sort treats as 0
    // (stable, no crash), but `|| 0` makes that explicit rather than relying
    // on sort's NaN handling.
    return aSurah - bSurah || aVerse - bVerse || (aWord - bWord || 0);
  });

  // Cursor not found (e.g. that mark was deleted mid-scroll) falls back to
  // the start rather than erroring — a safe restart, not expected in normal use.
  const startIndex = cursor
    ? Math.max(0, marks.findIndex((m) => markKey(m) === cursor) + 1)
    : 0;
  const pageMarks = marks.slice(startIndex, startIndex + MARKS_PAGE_LIMIT);
  const nextCursor =
    startIndex + MARKS_PAGE_LIMIT < marks.length
      ? markKey(pageMarks[pageMarks.length - 1])
      : null;

  const wordMarks = pageMarks.filter((m) => m.marked_type === "word");
  const verseMarks = pageMarks.filter((m) => m.marked_type === "verse");

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

  const items: Array<MarkListItem> = pageMarks.flatMap((mark) => {
    if (mark.marked_type === "word") {
      const word = wordByLocation.get(mark.marked_id);
      if (!word) return [];

      return [
        {
          category: mark.category,
          comment: mark.comment,
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
        category: mark.category,
        comment: mark.comment,
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

  const page: MarksPage = { data: items, nextCursor };

  return jsonResponse({ data: page });
}
