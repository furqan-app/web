import type { appPrisma } from "@/app/utils/db";
import { isFractionalPage, type CustomWirdDefinition } from "@/app/constants/plans";
import { pageLastVerseOrdinal } from "@/app/lib/plans/verse-index";

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
  if (
    definition.cadence.type === "weekly" ||
    definition.cadence.type === "daily" ||
    (definition.cadence.type === "pace" && definition.cadence.repeat === true)
  ) {
    return false;
  }

  // Fractional page plans (0.5 page/day) store page bounds in definition (e.g. 1-604),
  // but log progress in verse ordinals (1-6236). Compare against the terminal verse ordinal.
  const targetEnd =
    definition.unit === "page" &&
    definition.cadence.type === "pace" &&
    isFractionalPage(definition.cadence.unitsPerDay)
      ? pageLastVerseOrdinal(definition.rangeEnd)
      : definition.rangeEnd;

  if (definition.activity === "memorize") {
    const entries = await db.planProgressEntry.findMany({
      where: { user_plan_id: planId, track_key: "custom" },
    });
    return entries.some((e) => Number(e.range_end) >= targetEnd);
  }

  const K = definition.cadence.type === "deadline" ? (definition.cadence.repetitions ?? 1) : 1;
  const endCount = await db.planProgressEntry.count({
    where: {
      user_plan_id: planId,
      track_key: "custom",
      range_end: String(targetEnd),
    },
  });
  return endCount >= K;
};

