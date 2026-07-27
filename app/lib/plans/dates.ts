/** Shared "YYYY-MM-DD" date-string math for the plan engine (no Date-object leakage). */

export const addDays = (date: string, delta: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};
