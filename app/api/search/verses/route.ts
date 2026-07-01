import { NextResponse } from "next/server";
import { prisma } from "../../../utils/db";
import { isSearchQueryValid } from "../../../constants/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!isSearchQueryValid(query)) {
    return NextResponse.json({ results: [] });
  }
  const results = await prisma.verse.findMany({
    where: {
      text_imlaei_simple: {
        contains: query
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
