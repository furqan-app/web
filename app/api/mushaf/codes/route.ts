import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { extractUser } from "@/app/api/request";
import { appPrisma } from "@/app/utils/db";
import { generateShareCode } from "@/app/utils/share-code";
import { Prisma } from "@/app/generated/app-client";

/**
 * List the caller's unredeemed (still-active) one-time codes.
 * Protected by the global middleware (see middleware.ts / auth-middleware).
 */
export async function GET(request: NextRequest) {
  const user = extractUser(request);

  if (!user) {
    return jsonResponse({ code: 401, message: "Unauthorized" });
  }

  const codes = await appPrisma.mushafShareCode.findMany({
    where: { owner_user: user.id, redeemed_at: null },
    orderBy: { created_at: "desc" },
    select: { code: true, created_at: true },
  });

  return jsonResponse({ data: codes });
}

/**
 * Generate a new one-time share code for the caller's mushaf. Whoever redeems
 * it gains persistent access (the code is the consent — see ADR 0012).
 */
export async function POST(request: NextRequest) {
  const user = extractUser(request);

  if (!user) {
    return jsonResponse({ code: 401, message: "Unauthorized" });
  }

  // Retry on the (rare) unique-code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const created = await appPrisma.mushafShareCode.create({
        data: { code: generateShareCode(), owner_user: user.id },
        select: { code: true },
      });
      return jsonResponse({ data: created });
    } catch (error) {
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (!isUniqueViolation) throw error;
    }
  }

  return jsonResponse({ code: 500, message: "Could not generate a code" });
}
