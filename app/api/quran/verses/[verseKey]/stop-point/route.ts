import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import {
  getStaticPageBounds,
  getStaticRubs,
  getStaticVersePages,
  getStaticVerses,
  RUBS_PER_HIZB,
  RUBS_PER_JUZ,
} from "@/app/lib/quran/static-data";
import {
  DEFAULT_MUSHAF_ID,
  MUSHAF_EDITIONS,
} from "@/app/utils/mushaf-editions";

// rub / hizb / juz are divisions of the TEXT, identical in every mushaf
// edition, so they resolve from static verse division numbers. `page` is not —
// it is a property of one printed edition — and reads that edition's
// `verse-pages` and `page-bounds` indexes (ADR 0033).
// `rub-first` returns the FIRST verse of the verse's rub instead of the last
// (recitation-playback.md Addendum 12).
const isTextScope = (scope: string): scope is "rub" | "hizb" | "juz" =>
  scope === "rub" || scope === "hizb" || scope === "juz";

/**
 * Last verse of the page `verseKey` sits on, in the given mushaf edition.
 *
 * A verse's page is the page holding its FIRST word — matching how
 * `verse-pages/{mushafId}.json` is generated.
 */
async function resolvePageStop(verseKey: string, mushafId: number) {
  const [versePages, pageBounds] = await Promise.all([
    getStaticVersePages(mushafId),
    getStaticPageBounds(mushafId),
  ]);

  const pageNumber = versePages[verseKey];
  if (pageNumber === undefined) return null;

  const bounds = pageBounds[String(pageNumber)];
  if (!bounds) return null;

  return {
    verseKey: bounds.lastVerseKey,
    chapterId: bounds.lastChapterId,
  };
}

// Resolves the last verse of the range startVerseKey belongs to, for the
// given scope (page/rub/hizb/juz) — the verse that should end playback for
// that stopPoint.
export async function GET(
  request: NextRequest,
  { params }: { params: { verseKey: string } },
) {
  const verseKey = decodeURIComponent(params.verseKey);
  const scope = request.nextUrl.searchParams.get("scope");

  if (scope === "rub-first") {
    const [verses, rubs] = await Promise.all([getStaticVerses(), getStaticRubs()]);
    const startVerse = verses[verseKey];
    if (!startVerse) {
      return jsonResponse({ code: 404, message: "Verse not found" });
    }
    const rub = rubs[startVerse.rub_el_hizb_number - 1];
    const firstVerse = rub ? verses[rub.startVerse.verse_key] : undefined;
    if (!rub || !firstVerse) {
      return jsonResponse({ code: 404, message: "Start verse not found" });
    }
    return jsonResponse({
      data: {
        verseKey: rub.startVerse.verse_key,
        chapterId: firstVerse.chapter_id,
      },
    });
  }

  if (!scope || (scope !== "page" && !isTextScope(scope))) {
    return jsonResponse({ code: 422, message: "Missing or invalid scope" });
  }

  if (scope === "page") {
    const requested = Number(request.nextUrl.searchParams.get("mushaf"));
    const mushafId = MUSHAF_EDITIONS[requested] ? requested : DEFAULT_MUSHAF_ID;
    const stop = await resolvePageStop(verseKey, mushafId);
    if (!stop) {
      return jsonResponse({ code: 404, message: "Stop verse not found" });
    }
    return jsonResponse({ data: stop });
  }

  const [verses, rubs] = await Promise.all([getStaticVerses(), getStaticRubs()]);
  const startVerse = verses[verseKey];
  if (!startVerse) {
    return jsonResponse({ code: 404, message: "Verse not found" });
  }

  const lastRubNumber =
    scope === "rub"
      ? startVerse.rub_el_hizb_number
      : scope === "hizb"
        ? startVerse.hizb_number * RUBS_PER_HIZB
        : startVerse.juz_number * RUBS_PER_JUZ;

  const lastRub = rubs[lastRubNumber - 1];
  if (!lastRub) {
    return jsonResponse({ code: 404, message: "Stop verse not found" });
  }

  return jsonResponse({
    data: {
      verseKey: lastRub.endVerse.verse_key,
      chapterId: lastRub.endVerse.chapter_id,
    },
  });
}
