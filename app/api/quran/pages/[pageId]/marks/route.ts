import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { prisma } from "@/app/utils/db";

export async function GET(
  request: NextRequest,
  context: { params: { pageId: string } }
) {
  const user = JSON.parse(request.headers.get("user") as string);

  const marks = await prisma.mark.findMany({
    where: {
      to: user.id,
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
  const user = JSON.parse(request.headers.get("user") as string);

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

  await prisma.mark.upsert({
    where: {
      marked_type_marked_id_mark_type_to: {
        to: toUser,
        marked_type,
        marked_id,
        mark_type,
      },
    },
    update: {
      from: fromUser,
      mark_value,
    },
    create: {
      page_number: Number(context.params.pageId),
      marked_type,
      marked_id,
      mark_type,
      mark_value,
      from: fromUser,
      to: toUser,
    },
  });

  return jsonResponse({ message: "Marked succesfully" });
}

