import { describe, expect, it } from "vitest";
import { addDays, isValidCalendarDate } from "./dates";

describe("dates", () => {
  describe("addDays", () => {
    it("adds positive and negative days across months and leap years", () => {
      expect(addDays("2026-09-11", 1)).toBe("2026-09-12");
      expect(addDays("2026-09-11", -1)).toBe("2026-09-10");
      expect(addDays("2026-02-28", 1)).toBe("2026-03-01"); // 2026 non-leap
      expect(addDays("2024-02-28", 1)).toBe("2024-02-29"); // 2024 leap year
      expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    });
  });

  describe("isValidCalendarDate", () => {
    it("accepts valid calendar dates in YYYY-MM-DD format", () => {
      expect(isValidCalendarDate("2026-09-11")).toBe(true);
      expect(isValidCalendarDate("2024-02-29")).toBe(true); // leap day
      expect(isValidCalendarDate("2026-12-31")).toBe(true);
      expect(isValidCalendarDate("2026-01-01")).toBe(true);
    });

    it("rejects malformed date strings", () => {
      expect(isValidCalendarDate("")).toBe(false);
      expect(isValidCalendarDate("invalid")).toBe(false);
      expect(isValidCalendarDate("2026/09/11")).toBe(false);
      expect(isValidCalendarDate("2026-9-11")).toBe(false);
      expect(isValidCalendarDate("11-09-2026")).toBe(false);
    });

    it("rejects non-existent calendar dates that match regex", () => {
      expect(isValidCalendarDate("2026-99-99")).toBe(false);
      expect(isValidCalendarDate("2026-02-29")).toBe(false); // 2026 not leap
      expect(isValidCalendarDate("2026-02-30")).toBe(false);
      expect(isValidCalendarDate("2026-04-31")).toBe(false); // April has 30 days
      expect(isValidCalendarDate("2026-13-01")).toBe(false);
      expect(isValidCalendarDate("2026-00-10")).toBe(false);
      expect(isValidCalendarDate("2026-01-00")).toBe(false);
    });
  });
});
