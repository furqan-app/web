import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import { SURAH_PAGE_BOUNDS } from "@/app/constants/surah-page-bounds";

export type BatchMemorizationUpdatePayload = {
  chapter_id: number;
  updates: Array<{
    page_number: number;
    status: "mastered" | "needs_review" | "unmemorized";
  }>;
};

/**
 * POST /api/plans/memorization/batch — Atomically updates or deletes memorization records
 * for a surah's pages for the authenticated user.
 */
export async function POST(request: NextRequest) {
  const user = extractUser(request);
  if (!user) return jsonResponse({ code: 401, message: "Unauthorized" });

  let body: BatchMemorizationUpdatePayload;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ code: 400, message: "Invalid JSON payload" });
  }

  const { chapter_id, updates } = body;
  if (!Number.isInteger(chapter_id) || !Array.isArray(updates)) {
    return jsonResponse({ code: 422, message: "Missing or invalid chapter_id or updates" });
  }

  const bounds = SURAH_PAGE_BOUNDS[chapter_id];
  if (!bounds) {
    return jsonResponse({ code: 422, message: "Invalid chapter_id" });
  }

  if (updates.length > bounds.totalPages) {
    return jsonResponse({
      code: 422,
      message: `Too many updates: ${updates.length} exceeds chapter total pages (${bounds.totalPages})`,
    });
  }

  // Validate all updates
  const seenPages = new Set<number>();
  for (const item of updates) {
    if (
      !Number.isInteger(item.page_number) ||
      item.page_number < bounds.startPage ||
      item.page_number > bounds.endPage
    ) {
      return jsonResponse({
        code: 422,
        message: `Page ${item.page_number} is out of bounds for chapter ${chapter_id} (${bounds.startPage}–${bounds.endPage})`,
      });
    }

    if (seenPages.has(item.page_number)) {
      return jsonResponse({
        code: 422,
        message: `Duplicate update for page ${item.page_number}`,
      });
    }
    seenPages.add(item.page_number);

    if (
      item.status !== "mastered" &&
      item.status !== "needs_review" &&
      item.status !== "unmemorized"
    ) {
      return jsonResponse({
        code: 422,
        message: `Invalid status: ${item.status}`,
      });
    }
  }

  const toUpsert = updates.filter((u) => u.status === "mastered" || u.status === "needs_review");
  const toDelete = updates.filter((u) => u.status === "unmemorized");

  await appPrisma.$transaction(async (tx) => {
    // 1. Delete unmemorized pages
    if (toDelete.length > 0) {
      await tx.userSurahPageMemorization.deleteMany({
        where: {
          user_id: user.id,
          chapter_id,
          page_number: { in: toDelete.map((d) => d.page_number) },
        },
      });
    }

    // 2. Upsert mastered / needs_review pages
    for (const item of toUpsert) {
      await tx.userSurahPageMemorization.upsert({
        where: {
          user_id_chapter_id_page_number: {
            user_id: user.id,
            chapter_id,
            page_number: item.page_number,
          },
        },
        create: {
          user_id: user.id,
          chapter_id,
          page_number: item.page_number,
          status: item.status,
        },
        update: {
          status: item.status,
        },
      });
    }
  });

  return jsonResponse({
    data: {
      success: true,
      updatedCount: updates.length,
    },
  });
}
