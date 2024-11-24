import { NextResponse } from "next/server";
import { prisma } from "@/app/utils/db";

export async function GET() {
  const rubs = await prisma.rub.findMany({
    include: {
      rubVerseMappings: true,
      startVerse: {
        select: {
          text_uthmani: true,
          page_number: true,
        },
      },
      endVerse: {
        select: {
          text_uthmani: true,
          page_number: true,
        },
      },
    },
    orderBy: {
      rub_number: 'asc',
    },
  });

  return NextResponse.json(rubs);
}
