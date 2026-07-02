import { NextResponse } from "next/server";
import { quranPrisma } from "../../../utils/db";
import { isSearchQueryValid } from "../../../constants/search";
import { normalizeArabicQuery } from "../../../utils/arabic-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!isSearchQueryValid(query)) {
    return NextResponse.json({ results: [] });
  }
  const results = await quranPrisma.verse.findMany({
    where: {
      text_imlaei_simple: {
        contains: normalizeArabicQuery(query)
      }
    },
    take: 10,
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
  });

  return NextResponse.json({ results });
}
