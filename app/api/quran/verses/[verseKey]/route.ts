import { NextRequest } from "next/server";
import { quranPrisma } from "@/app/utils/db";
import { jsonResponse } from "@/app/api/response";
import { normalizeVerseKey } from "@/app/utils/quran-navigation";
import { toVersePlainText } from "@/app/utils/share-verse";

export async function GET(
  _request: NextRequest,
  { params }: { params: { verseKey: string } },
) {
  const rawKey = decodeURIComponent(params.verseKey).trim();
  if (!/^(\d{1,3})\s*[:_]\s*(\d{1,3})$/.test(rawKey)) {
    return jsonResponse({ code: 422, message: "Invalid verse key format" });
  }

  const normalizedKey = normalizeVerseKey(rawKey);
  if (!normalizedKey) {
    return jsonResponse({ code: 404, message: "Verse not found" });
  }

  // Per DECISIONS.md & docs/standards/quran-rendering.md:
  // Reconstruct verse text by joining word.qpc_uthmani_hafs filtered to char_type_name === 'word'
  // so it pairs with UthmanicHafs1Ver18 (font-uthmanic) without unrendered marker circles.
  // text_plain = Verse.text_uthmani run through toVersePlainText (rub-el-hizb
  // marker stripped, whitespace collapsed) — standard Unicode, safe for sharing
  // outside the app. Same transform the /share/verse OG description uses.
  const [words, verse] = await Promise.all([
    quranPrisma.word.findMany({
      where: { verse_key: normalizedKey, char_type_name: "word" },
      orderBy: { position: "asc" },
      select: { qpc_uthmani_hafs: true },
    }),
    quranPrisma.verse.findFirst({
      where: { verse_key: normalizedKey },
      select: { text_uthmani: true },
    }),
  ]);

  if (!words.length) {
    return jsonResponse({ code: 404, message: "Verse not found" });
  }

  const text_uthmani = words.map((w) => w.qpc_uthmani_hafs).join(" ");

  return jsonResponse({
    data: {
      verse_key: normalizedKey,
      text_uthmani,
      text_plain: verse?.text_uthmani ? toVersePlainText(verse.text_uthmani) : text_uthmani,
    },
  });
}
