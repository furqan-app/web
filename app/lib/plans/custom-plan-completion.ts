import type { appPrisma } from "@/app/utils/db";
import type { CustomWirdDefinition } from "@/app/constants/plans";

export type ProgressDbClient = Pick<typeof appPrisma, "planProgressEntry">;

/**
 * Whether a custom wird enrollment is terminally complete from its progress
 * log. Weekly-recurring custom wirds (ADR 0070) reuse fixed_cycle's
 * onComplete: "wrap" semantics — they recur indefinitely and never
 * terminal-complete, no matter how many full-range entries are logged.
 */
export const isCustomPlanCompleted = async (
  planId: number,
  definition: CustomWirdDefinition,
  db: ProgressDbClient
): Promise<boolean> => {
  if (definition.cadence.type === "weekly") {
    return false;
  }

  if (definition.activity === "memorize") {
    const entries = await db.planProgressEntry.findMany({
      where: { user_plan_id: planId, track_key: "custom" },
    });
    return entries.some((e) => Number(e.range_end) >= definition.rangeEnd);
  }

  const K = definition.cadence.type === "deadline" ? (definition.cadence.repetitions ?? 1) : 1;
  const endCount = await db.planProgressEntry.count({
    where: {
      user_plan_id: planId,
      track_key: "custom",
      range_end: String(definition.rangeEnd),
    },
  });
  return endCount >= K;
};
