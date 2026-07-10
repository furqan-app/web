import { quranPrisma } from "@/app/utils/db";
import { jsonResponse } from "@/app/api/response";

export async function GET(
  _request: Request,
  { params }: { params: { chapterId: string } },
) {
  const chapterId = Number(params.chapterId);

  if (!Number.isInteger(chapterId)) {
    return jsonResponse({ code: 422, message: "Invalid chapter id" });
  }

  const verses = await quranPrisma.verse.findMany({
    where: { chapter_id: chapterId },
    select: { verse_key: true, page_number: true },
  });

  const data: Record<string, number> = Object.fromEntries(
    verses.map((v) => [v.verse_key, v.page_number]),
  );

  return jsonResponse({ data });
}
