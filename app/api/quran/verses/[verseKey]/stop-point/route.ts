import { NextRequest } from "next/server";
import { quranPrisma } from "@/app/utils/db";
import { jsonResponse } from "@/app/api/response";
import {
  DEFAULT_MUSHAF_ID,
  MUSHAF_EDITIONS,
} from "@/app/utils/mushaf-editions";

// rub / hizb / juz are divisions of the TEXT, identical in every mushaf
// edition, so they resolve from Verse columns. `page` is not — it is a property
// of one printed edition — and is handled separately below. See ADR 0033.
const SCOPE_FIELD = {
  rub: "rub_el_hizb_number",
  hizb: "hizb_number",
  juz: "juz_number",
} as const;

type Scope = keyof typeof SCOPE_FIELD;
const isTextScope = (scope: string): scope is Scope =>
  Object.prototype.hasOwnProperty.call(SCOPE_FIELD, scope);

/**
 * Last verse of the page `verseKey` sits on, in the given mushaf edition.
 *
 * Resolved through `mushaf_word_layouts` rather than `Verse.page_number`, which
 * is only the default edition's page. Using it while reading another edition
 * ended playback at the wrong verse: starting an "end of page" recitation on
 * tajweed page 586 resolved the start verse to DEFAULT page 585 and stopped at
 * that page's last verse, cutting the safha short.
 *
 * A verse's page is the page holding its FIRST word — matching how the
 * per-edition verse-pages map is generated, so the two never disagree.
 */
async function resolvePageStop(verseKey: string, mushafId: number) {
  const firstWord = await quranPrisma.mushafWordLayout.findFirst({
    where: { mushaf_id: mushafId, word: { verse_key: verseKey } },
    orderBy: { word: { position: "asc" } },
    select: { page_number: true },
  });
  if (!firstWord) return null;

  const lastWord = await quranPrisma.mushafWordLayout.findFirst({
    where: { mushaf_id: mushafId, page_number: firstWord.page_number },
    orderBy: [{ word: { verse_id: "desc" } }, { word: { position: "desc" } }],
    select: {
      word: {
        select: { verse_key: true, verse: { select: { chapter_id: true } } },
      },
    },
  });
  if (!lastWord) return null;

  return {
    verseKey: lastWord.word.verse_key,
    chapterId: lastWord.word.verse.chapter_id,
  };
}

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

  // Verse.verse_key is not @unique — findFirst, never findUnique.
  const startVerse = await quranPrisma.verse.findFirst({
    where: { verse_key: verseKey },
  });
  if (!startVerse) {
    return jsonResponse({ code: 404, message: "Verse not found" });
  }

  const field = SCOPE_FIELD[scope];
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
