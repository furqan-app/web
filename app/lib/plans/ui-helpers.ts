import type { PlanQuantity } from "@/app/constants/plans";
import { toLocaleNumeral } from "@/app/utils/i18n";

/**
 * Extracts numeric quantity from raw number or ADR 0038 { unit, amount } object.
 * Safely guards null and undefined.
 */
export const quantityAmount = (
  q: PlanQuantity | null | undefined,
  fallback: number
): number => {
  if (q == null) return fallback;
  if (typeof q === "number") return q;
  if (typeof q === "object" && typeof q.amount === "number") return q.amount;
  return fallback;
};

/**
 * Derives pace summary string (e.g. "5 صفحة/يوم" or "10 آية/يوم") adhering to trackUnits.
 */
export const getPlanPaceSummary = (
  pace: number,
  unit: string | undefined,
  locale: string,
  t: (key: string, defaultValue?: string) => string
): string => {
  const paceNum = toLocaleNumeral(pace, locale);
  const unitLabel =
    unit === "verse"
      ? t("plans.versesPerDay", "verses/day")
      : t("plans.pagesPerDay", "pages/day");
  return `${paceNum} ${unitLabel}`;
};

/**
 * Aggregates pending and total daily tasks across all active plans.
 */
export const computeTodayTaskCounts = (
  todayData?: Array<{ assignments: Array<{ completed: boolean }> }> | null
) => {
  const todayRows = (todayData ?? []).flatMap((p) => p.assignments);
  const totalTasks = todayRows.length;
  const pendingTasks = todayRows.filter((a) => !a.completed).length;
  return { totalTasks, pendingTasks };
};
