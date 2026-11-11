import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";

export type MemorizationRecordItem = {
  chapter_id: number;
  page_number: number;
  status: "mastered" | "needs_review";
};

export type MemorizationApiResponse = {
  records: MemorizationRecordItem[];
};

/**
 * GET /api/plans/memorization — Returns all memorization records for the authenticated user.
 * Protected by auth middleware.
 */
export async function GET(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  const records = await appPrisma.userSurahPageMemorization.findMany({
    where: { user_id: user.id },
    select: {
      chapter_id: true,
      page_number: true,
      status: true,
    },
    orderBy: [
      { chapter_id: "asc" },
      { page_number: "asc" },
    ],
  });

  return jsonResponse({
    data: {
      records: records as MemorizationRecordItem[],
    },
  });
}
