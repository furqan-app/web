import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import { getLogger } from "@/lib/fq-logger";

/**
 * Redeem a one-time share code. On success the code is spent and a persistent
 * access grant (owner → caller) is created/kept. Returns the grant id, which
 * the caller uses to open the mushaf at /mushaf/[grant]. See ADR 0012.
 * Protected by the global middleware.
 */
export async function POST(request: NextRequest) {
  const user = extractUser(request);

  if (!user) {
    getLogger().warn("mushaf.codes.redeem.unauthorized");
    return jsonResponse({ code: 401, message: "Unauthorized" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    getLogger().warn("mushaf.codes.redeem.invalid_body", { userId: user.id });
    return jsonResponse({ code: 422, message: "Invalid request body" });
  }

  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code) {
    getLogger().warn("mushaf.codes.redeem.missing_code", { userId: user.id });
    return jsonResponse({ code: 422, message: "Missing code" });
  }

  const shareCode = await appPrisma.mushafShareCode.findUnique({
    where: { code },
  });

  if (!shareCode || shareCode.redeemed_at) {
    getLogger().warn("mushaf.codes.redeem.invalid_or_used", { userId: user.id });
    return jsonResponse({
      code: 404,
      message: "This code is invalid or has already been used",
    });
  }

  if (shareCode.owner_user === user.id) {
    getLogger().warn("mushaf.codes.redeem.self_redeem", { userId: user.id });
    return jsonResponse({
      code: 422,
      message: "You can't redeem your own code",
    });
  }

  // Spend the code and create the grant atomically. The conditional updateMany
  // only succeeds if the code is still unredeemed (so two concurrent redemptions
  // can't both win); wrapping it with the upsert means a failure anywhere rolls
  // back the spend, so a one-time code is never consumed without a grant.
  const grant = await appPrisma.$transaction(async (tx) => {
    const spent = await tx.mushafShareCode.updateMany({
      where: { id: shareCode.id, redeemed_at: null },
      data: { redeemed_at: new Date(), redeemed_by: user.id },
    });

    if (spent.count === 0) return null;

    // Upsert the grant so re-granting after a prior revoke is idempotent.
    return tx.mushafAccessGrant.upsert({
      where: {
        owner_user_viewer_user: {
          owner_user: shareCode.owner_user,
          viewer_user: user.id,
        },
      },
      update: {},
      create: { owner_user: shareCode.owner_user, viewer_user: user.id },
      select: { id: true },
    });
  });

  if (!grant) {
    getLogger().warn("mushaf.codes.redeem.race_lost", { userId: user.id });
    return jsonResponse({
      code: 404,
      message: "This code is invalid or has already been used",
    });
  }

  return jsonResponse({ data: { grantId: grant.id } });
}
