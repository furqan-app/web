import { NextResponse } from "next/server";
import { groupBy } from "../../../../utils/groupBy";
import { quranPrisma } from "@/app/utils/db";

export async function GET(
  request: Request,
  context: { params: { pageId: string } }
) {
  const { pageId } = context.params;
  const pageNumber = Number(pageId);

  const [words, pageMetadata] = await Promise.all([
    quranPrisma.word.findMany({
      include: {
        verse: {
          include: { chapter: true },
        },
      },
      where: {
        page_number: pageNumber,
      },
      orderBy: [{ verse_id: "asc" }, { position: "asc" }],
    }),
    quranPrisma.pageMetadata.findUniqueOrThrow({
      where: { page_number: pageNumber },
      include: { chapter: true },
    }),
  ]);

  return NextResponse.json({ lines: groupBy(words, "line_number"), pageMetadata });
}
