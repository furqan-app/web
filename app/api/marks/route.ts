import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { appPrisma, quranPrisma } from "@/app/utils/db";
import { extractUser } from "@/app/api/request";
import { withAuthorNames, type MarkWithAuthor } from "@/app/api/mushaf/access";
import {
  VERSE_SNIPPET_WORD_LIMIT,
  MARKS_PAGE_LIMIT,
  MARK_CATEGORIES,
  markKey,
  getSortKey,
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
  // Author attribution. A grant holder can write marks INTO your mushaf
  // (ADR 0012), so a mark on your OWN mushaf is not necessarily yours — the
  // reader must be able to render "Marked by X" from the local store, which
  // is only possible if the full-sync pull carries the author. #548.
  from_user: number;
  author_name: string | null;
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

const VALID_CATEGORIES = new Set(MARK_CATEGORIES.map((c) => c.key));

/**
 * Enrich raw mark rows with Quran data (surah names, verse number, snippet).
 * Shared by the paginated and full-sync paths so both modes return identical
 * enrichment (#546's local record denormalizes exactly these fields).
 */
const enrichMarks = async (
  marks: Array<MarkWithAuthor>
): Promise<Array<MarkListItem>> => {
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

  return marks.flatMap((mark) => {
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
          from_user: mark.from_user,
          author_name: mark.author_name,
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
        from_user: mark.from_user,
        author_name: mark.author_name,
      },
    ];
  });
};

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
  // Full-sync mode for #547's pull: one request returns every mark, enriched,
  // with no cursor — walking the cursor would be ~25 round-trips per sync.
  const all = request.nextUrl.searchParams.get("all") === "true";

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

  if (all) {
    const page: MarksPage = {
      data: await enrichMarks(await withAuthorNames(marks, user.id)),
      nextCursor: null,
    };
    return jsonResponse({ data: page });
  }

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

  const page: MarksPage = {
    data: await enrichMarks(await withAuthorNames(pageMarks, user.id)),
    nextCursor,
  };

  return jsonResponse({ data: page });
}
