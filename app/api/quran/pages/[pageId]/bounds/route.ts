import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { getStaticPageBounds } from "@/app/lib/quran/static-data";
import { DEFAULT_MUSHAF_ID, MUSHAF_EDITIONS } from "@/app/utils/mushaf-editions";

// Resolves the first and last verse of a given mushaf page, for the given
// edition. A page number is only meaningful relative to an edition (ADR
// 0033), so this reads `page-bounds/{mushafId}.json` rather than canonical
// `Verse.page_number`. Mirrors the "page" scope's resolvePageStop in
// app/api/quran/verses/[verseKey]/stop-point/route.ts, starting from a page
// number directly instead of deriving one from a verse. See
// docs/plans/listening-wird-inline-playback.md.
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

  const pageBounds = await getStaticPageBounds(mushafId);
  const bounds = pageBounds[String(pageId)];
  if (!bounds) {
    return jsonResponse({ code: 404, message: "Page not found" });
  }

  return jsonResponse({
    data: {
      firstVerseKey: bounds.firstVerseKey,
      lastVerseKey: bounds.lastVerseKey,
      lastChapterId: bounds.lastChapterId,
    },
  });
}
