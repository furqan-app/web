import { NextRequest } from "next/server";
import { quranPrisma } from "../../../utils/db";
import { DEFAULT_VERSE_TAKE, MAX_VERSE_TAKE, isSearchQueryValid } from "../../../constants/search";
import { normalizeArabicQuery } from "../../../utils/arabic-search";
import { jsonResponse } from "../../response";

const parseTakeSkip = (searchParams: URLSearchParams) => {
  const rawTake = Number(searchParams.get("take") ?? DEFAULT_VERSE_TAKE);
  const rawSkip = Number(searchParams.get("skip") ?? 0);
  const take = Number.isFinite(rawTake)
    ? Math.min(Math.max(Math.floor(rawTake), 1), MAX_VERSE_TAKE)
    : DEFAULT_VERSE_TAKE;
  const skip = Number.isFinite(rawSkip) ? Math.max(Math.floor(rawSkip), 0) : 0;
  return { take, skip };
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!isSearchQueryValid(query)) {
    return jsonResponse({ data: { results: [], total: 0 } });
  }
  const where = {
    text_imlaei_simple: {
      contains: normalizeArabicQuery(query)
    }
  };
  const { take, skip } = parseTakeSkip(searchParams);
  const [total, results] = await Promise.all([
    quranPrisma.verse.count({ where }),
    quranPrisma.verse.findMany({
      where,
      take,
      skip,
      orderBy: { id: 'asc' },
      select: {
        verse_key: true,
        text_imlaei_simple: true,
        text_uthmani: true,
        page_number: true,
        chapter: {
          select: {
            name_arabic: true,
            name_simple: true
          }
        },
        Word: {
          select: {
            qpc_uthmani_hafs: true
          },
          orderBy: { position: 'asc' }
        }
      }
    }),
  ]);

  return jsonResponse({ data: { results, total } });
}
