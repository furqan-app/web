import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { appPrisma } from "@/app/utils/db";
import { extractUser } from "@/app/api/request";
import {
  withAuthorNames,
  upsertMark,
  deleteMark,
} from "@/app/api/mushaf/access";

export async function GET(
  request: NextRequest,
  context: { params: { pageId: string } }
) {
  const user = extractUser(request);

  if (!user) {
    return jsonResponse({ code: 401, message: "Unauthorized" });
  }

  const marks = await appPrisma.mark.findMany({
    where: {
      to_user: user.id,
      page_number: parseInt(context.params.pageId),
    },
  });

  // Attach author name + is_own so the owner can see who made each mark
  // (e.g. marks a teacher added to their mushaf). See ADR 0012.
  return jsonResponse({ data: await withAuthorNames(marks, user.id) });
}

/**
 *
 * This request is protected by the global middleware in middleware.ts
 */
export async function POST(
  request: NextRequest,
  context: { params: { pageId: string } }
) {
  const body = await request.json();
  const user = extractUser(request);

  if (!user) {
    return jsonResponse({ code: 401, message: "Unauthorized" });
  }

  const ok = await upsertMark(
    user.id,
    user.id,
    Number(context.params.pageId),
    body
  );
  if (!ok) {
    return jsonResponse({ code: 422, message: "Missing required fields" });
  }

  return jsonResponse({ message: "Marked succesfully" });
}

/**
 *
 * This request is protected by the global middleware in middleware.ts
 *
 * The `[pageId]` route segment is intentionally unused here: a mark's
 * Prisma unique key (`marked_type_marked_id_mark_type_to_user`) is
 * page-independent, so deletion is scoped by `to_user` + that compound
 * key only, not by page.
 */
export async function DELETE(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ code: 422, message: "Invalid request body" });
  }
  const user = extractUser(request);

  if (!user) {
    return jsonResponse({ code: 401, message: "Unauthorized" });
  }

  const ok = await deleteMark(user.id, body);
  if (!ok) {
    return jsonResponse({ code: 422, message: "Missing required fields" });
  }

  return jsonResponse({ message: "Mark removed succesfully" });
}

