import { NextRequest } from "next/server";
import { quranPrisma } from "../../../utils/db";
import { isSearchQueryValid } from "../../../constants/search";
import { normalizeDigits } from "../../../utils/arabic-search";
import { jsonResponse } from "../../response";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!isSearchQueryValid(query)) {
    return jsonResponse({ data: { results: [], total: 0 } });
  }

  const trimmed = query.trim();
  const normalized = normalizeDigits(trimmed);
  const numericId = /^\d+$/.test(normalized) ? parseInt(normalized, 10) : null;
  const isIdInRange = numericId !== null && numericId >= 1 && numericId <= 114;

  const where = {
    OR: [
      ...(isIdInRange ? [{ id: numericId }] : []),
      { name_arabic: { contains: trimmed } },
      { name_simple: { contains: trimmed } }
    ]
  };
  // 114 rows total — no pagination; the full list is the result set.
  const [total, results] = await Promise.all([
    quranPrisma.chapter.count({ where }),
    quranPrisma.chapter.findMany({
      where,
      select: {
        id: true,
        name_arabic: true,
        name_simple: true,
        verses_count: true,
        pages: true
      },
      orderBy: {
        id: 'asc'
      },
      take: 10
    }),
  ]);

  return jsonResponse({ data: { results, total } });
}
