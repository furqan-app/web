import { NextResponse } from "next/server";
import { prisma } from "../../../utils/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ results: [] });
  }
  const results = await prisma.verse.findMany({
    where: {
      text_imlaei_simple: {
        contains: query
      }
    },
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
      }
    }
  });

  return NextResponse.json({ results });
}
