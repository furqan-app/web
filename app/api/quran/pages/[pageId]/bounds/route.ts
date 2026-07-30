import { NextRequest } from "next/server";
import { quranPrisma } from "@/app/utils/db";
import { jsonResponse } from "@/app/api/response";

// Resolves the last verse of a given mushaf page — used by the "custom"
// stopPoint's page-type "to" target. Only the last verse is returned (not
// the first) since nothing resolves a "from" from a page in this feature;
// the start verse is always whatever launched playback. See
// docs/plans/recitation-playback.md Addendum 9.
export async function GET(
  request: NextRequest,
  { params }: { params: { pageId: string } },
) {
  const pageId = parseInt(params.pageId);
  if (Number.isNaN(pageId)) {
    return jsonResponse({ code: 422, message: "Invalid page id" });
  }

  // Verse.page_number is not @unique — findFirst, never findUnique.
  const lastVerse = await quranPrisma.verse.findFirst({
    where: { page_number: pageId },
    orderBy: { id: "desc" },
  });
  if (!lastVerse) {
    return jsonResponse({ code: 404, message: "Page not found" });
  }

  return jsonResponse({
    data: { lastVerseKey: lastVerse.verse_key, lastChapterId: lastVerse.chapter_id },
  });
}
