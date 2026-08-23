import { NextRequest } from "next/server";
import { quranPrisma } from "@/app/utils/db";
import { jsonResponse } from "@/app/api/response";

// A juz is 8 consecutive rubs (240 rubs total across 30 juz). rub/hizb/juz are
// divisions of the TEXT, identical in every mushaf edition (ADR 0033), so this
// needs no mushaf param — unlike app/api/quran/pages/[pageId]/bounds, which is
// edition-specific.
const RUBS_PER_JUZ = 8;

// Resolves a juz's exact verse/chapter bounds for the Offline Recitation
// download feature (ADR 0046): the first/last verse of the juz, and every
// chapter it touches (a juz routinely spans a surah boundary — e.g. Juz 1
// starts in chapter 1, ends at 2:141 in chapter 2). Used once, at download
// time, to compute the PlaybackOverride bounds and the chapter list to
// download — never re-resolved at play time.
export async function GET(
  request: NextRequest,
  { params }: { params: { juzNumber: string } },
) {
  // A bare digit-string check before parseInt — parseInt alone accepts
  // leading-numeric garbage like "1foo" or "1.5" as valid.
  if (!/^[0-9]+$/.test(params.juzNumber)) {
    return jsonResponse({ code: 422, message: "Invalid juz number" });
  }
  const juzNumber = parseInt(params.juzNumber, 10);
  if (juzNumber < 1 || juzNumber > 30) {
    return jsonResponse({ code: 422, message: "Invalid juz number" });
  }

  const firstRubNumber = (juzNumber - 1) * RUBS_PER_JUZ + 1;
  const lastRubNumber = juzNumber * RUBS_PER_JUZ;

  const rubs = await quranPrisma.rub.findMany({
    where: { rub_number: { gte: firstRubNumber, lte: lastRubNumber } },
    include: {
      rubVerseMappings: true,
      startVerse: { select: { verse_key: true } },
      endVerse: { select: { verse_key: true, chapter_id: true } },
    },
    orderBy: { rub_number: "asc" },
  });

  const firstRub = rubs[0];
  const lastRub = rubs[rubs.length - 1];
  if (!firstRub || !lastRub) {
    return jsonResponse({ code: 404, message: "Juz not found" });
  }

  const chapterIds = Array.from(
    new Set(rubs.flatMap((rub) => rub.rubVerseMappings.map((m) => m.chapter_number))),
  ).sort((a, b) => a - b);

  return jsonResponse({
    data: {
      firstVerseKey: firstRub.startVerse.verse_key,
      lastVerseKey: lastRub.endVerse.verse_key,
      lastChapterId: lastRub.endVerse.chapter_id,
      chapterIds,
    },
  });
}
