import { describe, expect, it } from "vitest";
import {
  TIME_OPTIONS,
  formatTimeOption,
} from "@/components/ui/time-combobox";

describe("TimeCombobox logic & formatting", () => {
  it("generates exactly 96 15-minute intervals across 24 hours", () => {
    expect(TIME_OPTIONS.length).toBe(96);
    expect(TIME_OPTIONS[0]).toBe("00:00");
    expect(TIME_OPTIONS[1]).toBe("00:15");
    expect(TIME_OPTIONS[2]).toBe("00:30");
    expect(TIME_OPTIONS[3]).toBe("00:45");
    expect(TIME_OPTIONS[4]).toBe("01:00");
    expect(TIME_OPTIONS[95]).toBe("23:45");
  });

  it("formats 12-hour time correctly in English", () => {
    expect(formatTimeOption("00:00", "en")).toBe("12:00 AM");
    expect(formatTimeOption("08:30", "en")).toBe("08:30 AM");
    expect(formatTimeOption("12:00", "en")).toBe("12:00 PM");
    expect(formatTimeOption("14:15", "en")).toBe("02:15 PM");
    expect(formatTimeOption("23:45", "en")).toBe("11:45 PM");
  });

  it("formats 12-hour time with Arabic-Indic numerals and localized AM/PM in Arabic", () => {
    expect(formatTimeOption("08:30", "ar")).toBe("٠٨:٣٠ ص");
    expect(formatTimeOption("14:15", "ar")).toBe("٠٢:١٥ م");
    expect(formatTimeOption("00:00", "ar")).toBe("١٢:٠٠ ص");
    expect(formatTimeOption("12:00", "ar")).toBe("١٢:٠٠ م");
    expect(formatTimeOption("23:45", "ar")).toBe("١١:٤٥ م");
  });
});
