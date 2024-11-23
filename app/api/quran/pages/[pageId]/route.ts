import { NextResponse } from "next/server";
import { groupBy } from "../../../../utils/groupBy";
import { prisma } from "@/app/utils/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(
  request: Request,
  context: { params: { pageId: string } }
) {
  const { pageId } = context.params;

  const words = await prisma.word.findMany({
    include: {
      verse: true,
    },
    where: {
      page_number: Number(pageId),
    },
    orderBy: [
      {
        verse_id: "asc",
      },
      {
        position: "asc",
      },
    ],
  });

  return NextResponse.json(groupBy(words, "line_number"));
}

