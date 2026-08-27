import { NextResponse } from "next/server";
import { quranPrisma } from "../../../utils/db";
import { isSearchQueryValid } from "../../../constants/search";
import { normalizeDigits } from "../../../utils/arabic-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!isSearchQueryValid(query)) {
    return NextResponse.json({ results: [] });
  }

  const trimmed = query.trim();
  const normalized = normalizeDigits(trimmed);
  const numericId = /^\d+$/.test(normalized) ? parseInt(normalized, 10) : null;
  const isIdInRange = numericId !== null && numericId >= 1 && numericId <= 114;

  const results = await quranPrisma.chapter.findMany({
    where: {
      OR: [
        ...(isIdInRange ? [{ id: numericId }] : []),
        { name_arabic: { contains: trimmed } },
        { name_simple: { contains: trimmed } }
      ]
    },
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
  });

  return NextResponse.json({ results });
}
