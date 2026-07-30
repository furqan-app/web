import { NextRequest } from "next/server";
import { quranPrisma } from "@/app/utils/db";
import { jsonResponse } from "@/app/api/response";
import { DEFAULT_MUSHAF_ID, MUSHAF_EDITIONS } from "@/app/utils/mushaf-editions";

// Resolves the last verse of a given mushaf page, for the given edition — used
// by the "custom" stopPoint's page-type "to" target. A page number is only
// meaningful relative to an edition (ADR 0033), so this resolves through
// `mushaf_word_layouts`, not `Verse.page_number` (the default edition's page
// only). Mirrors the "page" scope's resolvePageStop in
// app/api/quran/verses/[verseKey]/stop-point/route.ts, but starting from a
// page number directly instead of deriving one from a verse. Only the last
// verse is returned (not the first) since nothing resolves a "from" from a
// page in this feature; the start verse is always whatever launched
// playback. See docs/plans/recitation-playback.md Addendum 9.
export async function GET(
  request: NextRequest,
  { params }: { params: { pageId: string } },
) {
  const pageId = parseInt(params.pageId);
  if (Number.isNaN(pageId)) {
    return jsonResponse({ code: 422, message: "Invalid page id" });
  }

  const requested = Number(request.nextUrl.searchParams.get("mushaf"));
  const mushafId = MUSHAF_EDITIONS[requested] ? requested : DEFAULT_MUSHAF_ID;

  const lastWord = await quranPrisma.mushafWordLayout.findFirst({
    where: { mushaf_id: mushafId, page_number: pageId },
    orderBy: [{ word: { verse_id: "desc" } }, { word: { position: "desc" } }],
    select: {
      word: {
        select: { verse_key: true, verse: { select: { chapter_id: true } } },
      },
    },
  });
  if (!lastWord) {
    return jsonResponse({ code: 404, message: "Page not found" });
  }

  return jsonResponse({
    data: {
      lastVerseKey: lastWord.word.verse_key,
      lastChapterId: lastWord.word.verse.chapter_id,
    },
  });
}
