import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { appPrisma } from "@/app/utils/db";
import { extractUser } from "@/app/api/request";

export async function GET(
  request: NextRequest,
  context: { params: { pageId: string } }
) {
  const user = extractUser(request);

  const marks = await appPrisma.mark.findMany({
    where: {
      to_user: user.id,
      page_number: parseInt(context.params.pageId),
    },
  });

  return jsonResponse({ data: marks });
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

  const { marked_type, marked_id, mark_type, mark_value } = body;
  const fromUser = user.id;
  const toUser = user.id;

  // FIXME: validate the input
  if (!marked_type || !marked_id || !mark_type || !mark_value) {
    return jsonResponse({
      code: 422,
      message: "Missing required fields",
    });
  }

  await appPrisma.mark.upsert({
    where: {
      marked_type_marked_id_mark_type_to_user: {
        to_user: toUser,
        marked_type,
        marked_id,
        mark_type,
      },
    },
    update: {
      from_user: fromUser,
      mark_value,
    },
    create: {
      page_number: Number(context.params.pageId),
      marked_type,
      marked_id,
      mark_type,
      mark_value,
      from_user: fromUser,
      to_user: toUser,
    },
  });

  return jsonResponse({ message: "Marked succesfully" });
}

/**
 *
 * This request is protected by the global middleware in middleware.ts
 */
export async function DELETE(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ code: 422, message: "Invalid request body" });
  }
  const user = extractUser(request);

  const { marked_type, marked_id, mark_type } = body;

  if (!marked_type || !marked_id || !mark_type) {
    return jsonResponse({
      code: 422,
      message: "Missing required fields",
    });
  }

  await appPrisma.mark.deleteMany({
    where: {
      to_user: user.id,
      marked_type,
      marked_id,
      mark_type,
    },
  });

  return jsonResponse({ message: "Mark removed succesfully" });
}

