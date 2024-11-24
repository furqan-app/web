import { NextResponse } from "next/server";
import { prisma } from "../../../utils/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const results = await prisma.chapter.findMany({
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
    }
  });

  return NextResponse.json({ results });
}
