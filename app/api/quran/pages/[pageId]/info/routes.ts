import { jsonResponse } from "@/app/api/response";
import { prisma } from "@/app/utils/db";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: { pageId: string } }
) {
  try {
    const { pageId } = context.params;

    const lastVerse = await prisma.verse.findFirst({
      where: {
        page_number: Number(pageId),
      },
      orderBy: {
        verse_number: "desc",
      },
      select: {
        id: true,
        verse_number: true,
        page_number: true,
        hizb_number: true,
        rub_el_hizb_number: true,
        ruku_number: true,
        manzil_number: true,
        sajdah_number: true,
        chapter_id: true,
        juz_number: true,
      },
    });

    if (!lastVerse) {
      return jsonResponse({ code: 404, message: "Page not found" });
    }

    return jsonResponse({
      data: lastVerse,
      message: "Retrieve page info successfully",
    });
  } catch (error) {
    return jsonResponse({ code: 500, message: "Something went wrong" });
  }
}
