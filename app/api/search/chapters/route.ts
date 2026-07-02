import { NextResponse } from "next/server";
import { quranPrisma } from "../../../utils/db";
import { isSearchQueryValid } from "../../../constants/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!isSearchQueryValid(query)) {
    return NextResponse.json({ results: [] });
  }

  const results = await quranPrisma.chapter.findMany({
    where: {
      OR: [
        { name_arabic: { contains: query } },
        { name_simple: { contains: query } }
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
