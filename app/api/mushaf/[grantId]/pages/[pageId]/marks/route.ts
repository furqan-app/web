import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import {
  getGrantForViewer,
  withAuthorNames,
  upsertMark,
  deleteMark,
} from "@/app/api/mushaf/access";

/**
 * Grant-scoped mirror of /api/quran/pages/[pageId]/marks. Every method first
 * verifies the caller is the grant's viewer, then reads/writes against the
 * grant OWNER's mushaf (to_user = owner), attributing writes to the caller
 * (from_user = self). Protected by the global middleware. See ADR 0012.
 */
export async function GET(
  request: NextRequest,
  context: { params: { grantId: string; pageId: string } }
) {
  const user = extractUser(request);
  if (!user) {
    return jsonResponse({ code: 401, message: "Unauthorized" });
  }

  const grant = await getGrantForViewer(context.params.grantId, user.id);
  if (!grant) {
    return jsonResponse({ code: 403, message: "Forbidden" });
  }

  const marks = await appPrisma.mark.findMany({
    where: {
      to_user: grant.owner_user,
      page_number: Number(context.params.pageId),
    },
  });

  return jsonResponse({ data: await withAuthorNames(marks, user.id) });
}

export async function POST(
  request: NextRequest,
  context: { params: { grantId: string; pageId: string } }
) {
  const user = extractUser(request);
  if (!user) {
    return jsonResponse({ code: 401, message: "Unauthorized" });
  }

  const grant = await getGrantForViewer(context.params.grantId, user.id);
  if (!grant) {
    return jsonResponse({ code: 403, message: "Forbidden" });
  }

  const body = await request.json();

  const ok = await upsertMark(
    grant.owner_user,
    user.id,
    Number(context.params.pageId),
    body
  );
  if (!ok) {
    return jsonResponse({ code: 422, message: "Missing required fields" });
  }

  return jsonResponse({ message: "Marked succesfully" });
}

export async function DELETE(
  request: NextRequest,
  context: { params: { grantId: string; pageId: string } }
) {
  const user = extractUser(request);
  if (!user) {
    return jsonResponse({ code: 401, message: "Unauthorized" });
  }

  const grant = await getGrantForViewer(context.params.grantId, user.id);
  if (!grant) {
    return jsonResponse({ code: 403, message: "Forbidden" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ code: 422, message: "Invalid request body" });
  }

  const ok = await deleteMark(grant.owner_user, body);
  if (!ok) {
    return jsonResponse({ code: 422, message: "Missing required fields" });
  }

  return jsonResponse({ message: "Mark removed succesfully" });
}
