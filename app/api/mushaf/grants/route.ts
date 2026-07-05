import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";

/**
 * The caller's access relationships, both directions:
 *  - `accessible`: mushafs the caller can open (caller is the viewer)
 *  - `viewers`:    people who can access the caller's mushaf (caller is owner)
 * Protected by the global middleware.
 */
export async function GET(request: NextRequest) {
  const user = extractUser(request);

  if (!user) {
    return jsonResponse({ code: 401, message: "Unauthorized" });
  }

  const [asViewer, asOwner] = await Promise.all([
    appPrisma.mushafAccessGrant.findMany({
      where: { viewer_user: user.id },
      orderBy: { created_at: "desc" },
    }),
    appPrisma.mushafAccessGrant.findMany({
      where: { owner_user: user.id },
      orderBy: { created_at: "desc" },
    }),
  ]);

  const userIds = Array.from(
    new Set([
      ...asViewer.map((g) => g.owner_user),
      ...asOwner.map((g) => g.viewer_user),
    ])
  );

  // Name only — never email. Once a grant exists the counterparty's display
  // name is expected, but exposing email would breach ADR 0012 ("no name/email
  // exposure"; the owner controls exposure by whom they hand a code to).
  const users = userIds.length
    ? await appPrisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));

  const accessible = asViewer.map((g) => ({
    grantId: g.id,
    user: byId.get(g.owner_user) ?? null,
    created_at: g.created_at,
  }));

  const viewers = asOwner.map((g) => ({
    grantId: g.id,
    user: byId.get(g.viewer_user) ?? null,
    created_at: g.created_at,
  }));

  return jsonResponse({ data: { accessible, viewers } });
}
