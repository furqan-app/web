import { PLAN_DATE_RE } from "@/app/constants/plans";

/** Shared "YYYY-MM-DD" date-string math for the plan engine (no Date-object leakage). */

export const addDays = (date: string, delta: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

/** Validates that a string is a valid real calendar date in YYYY-MM-DD format. */
export const isValidCalendarDate = (date: string): boolean => {
  if (!PLAN_DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(dt.getTime())) return false;
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};
