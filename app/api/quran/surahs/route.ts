import { NextResponse } from "next/server";
import { prisma } from "@/app/utils/db";

export async function GET() {
  const results = await prisma.chapter.findMany({
    select: {
      id: true,
      name_arabic: true,
      name_simple: true,
      verses_count: true,
      revelation_place: true,
      pages: true
    },
    orderBy: {
      id: 'asc'
    }
  });

  return NextResponse.json(results);
}
