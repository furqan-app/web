import { NextRequest } from "next/server";
import { quranPrisma } from "@/app/utils/db";
import { jsonResponse } from "@/app/api/response";
import { DEFAULT_MUSHAF_ID, MUSHAF_EDITIONS } from "@/app/utils/mushaf-editions";

// Resolves the first and last verse of a given mushaf page, for the given
// edition. A page number is only meaningful relative to an edition (ADR
// 0033), so this resolves through `mushaf_word_layouts`, not
// `Verse.page_number` (the default edition's page only). Mirrors the "page"
// scope's resolvePageStop in app/api/quran/verses/[verseKey]/stop-point/route.ts,
// but starting from a page number directly instead of deriving one from a
// verse. `lastVerseKey`/`lastChapterId` originally served only the "custom"
// stopPoint's page-type "to" target (recitation-playback.md Addendum 9),
// which never needed a "from"; `firstVerseKey` was added for
// listening-wird's inline playback, which needs an exact page-range start
// too. See docs/plans/listening-wird-inline-playback.md.
//
// A page's first/last WORD may belong to a verse that starts on the previous
// page or ends on the next, so first/lastVerseKey can spill one verse past
// the page boundary. That is intentional: recitation audio is addressable
// per verse, never per word, so a straddling verse must be played in full.
// Consecutive wird days therefore overlap by at most one verse at each seam
// — accepted (better a repeat than a gap).
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

  const [firstWord, lastWord] = await Promise.all([
    quranPrisma.mushafWordLayout.findFirst({
      where: { mushaf_id: mushafId, page_number: pageId },
      orderBy: [{ word: { verse_id: "asc" } }, { word: { position: "asc" } }],
      select: { word: { select: { verse_key: true } } },
    }),
    quranPrisma.mushafWordLayout.findFirst({
      where: { mushaf_id: mushafId, page_number: pageId },
      orderBy: [{ word: { verse_id: "desc" } }, { word: { position: "desc" } }],
      select: {
        word: {
          select: { verse_key: true, verse: { select: { chapter_id: true } } },
        },
      },
    }),
  ]);
  if (!firstWord || !lastWord) {
    return jsonResponse({ code: 404, message: "Page not found" });
  }

  return jsonResponse({
    data: {
      firstVerseKey: firstWord.word.verse_key,
      lastVerseKey: lastWord.word.verse_key,
      lastChapterId: lastWord.word.verse.chapter_id,
    },
  });
}
