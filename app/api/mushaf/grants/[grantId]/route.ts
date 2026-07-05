import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";

/**
 * Revoke an access grant. Allowed for either party: the owner removing a viewer,
 * or the viewer dropping themselves. Immediate — the grant row is deleted, so
 * every subsequent grant-scoped request fails its viewer check. See ADR 0012.
 * Protected by the global middleware.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { grantId: string } }
) {
  const user = extractUser(request);

  if (!user) {
    return jsonResponse({ code: 401, message: "Unauthorized" });
  }

  const grant = await appPrisma.mushafAccessGrant.findUnique({
    where: { id: context.params.grantId },
  });

  if (!grant) {
    return jsonResponse({ code: 404, message: "Grant not found" });
  }

  if (grant.owner_user !== user.id && grant.viewer_user !== user.id) {
    return jsonResponse({ code: 403, message: "Forbidden" });
  }

  await appPrisma.mushafAccessGrant.delete({ where: { id: grant.id } });

  return jsonResponse({ message: "Access revoked" });
}
