import { NextRequest } from "next/server";
import { quranPrisma } from "@/app/utils/db";
import { jsonResponse } from "@/app/api/response";

const SCOPE_FIELD = {
  page: "page_number",
  rub: "rub_el_hizb_number",
  hizb: "hizb_number",
  juz: "juz_number",
} as const;

type Scope = keyof typeof SCOPE_FIELD;

// Resolves the last verse of the range startVerseKey belongs to, for the
// given scope (page/rub/hizb/juz) — the verse that should end playback for
// that stopPoint. May be in a later chapter than startVerseKey (e.g. a juz
// or page can span a surah boundary) — see docs/plans/recitation-playback.md
// Addendum 5.
export async function GET(
  request: NextRequest,
  { params }: { params: { verseKey: string } },
) {
  const verseKey = decodeURIComponent(params.verseKey);
  const scope = request.nextUrl.searchParams.get("scope");

  if (!scope || !Object.prototype.hasOwnProperty.call(SCOPE_FIELD, scope)) {
    return jsonResponse({ code: 422, message: "Missing or invalid scope" });
  }

  // Verse.verse_key is not @unique — findFirst, never findUnique.
  const startVerse = await quranPrisma.verse.findFirst({ where: { verse_key: verseKey } });
  if (!startVerse) {
    return jsonResponse({ code: 404, message: "Verse not found" });
  }

  const field = SCOPE_FIELD[scope as Scope];
  const scopeValue = startVerse[field];

  const lastVerse = await quranPrisma.verse.findFirst({
    where: { [field]: scopeValue },
    orderBy: { id: "desc" },
  });
  if (!lastVerse) {
    return jsonResponse({ code: 404, message: "Stop verse not found" });
  }

  return jsonResponse({
    data: { verseKey: lastVerse.verse_key, chapterId: lastVerse.chapter_id },
  });
}
