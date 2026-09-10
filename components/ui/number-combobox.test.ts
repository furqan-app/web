import { describe, expect, it } from "vitest";
import {
  computeNumberOptions,
  formatNumberDisplay,
} from "@/components/ui/number-combobox";
import { toLocaleNumeral } from "@/app/utils/i18n";

describe("NumberCombobox logic & formatting", () => {
  it("computes default 1..604 page range when no explicit values provided", () => {
    const defaultRange = computeNumberOptions({});
    expect(defaultRange.length).toBe(604);
    expect(defaultRange[0]).toBe(1);
    expect(defaultRange[603]).toBe(604);
  });

  it("computes custom ranges with custom min, max, and step", () => {
    const steppedRange = computeNumberOptions({ min: 10, max: 30, step: 5 });
    expect(steppedRange).toEqual([10, 15, 20, 25, 30]);
  });

  it("prefers explicit values array if provided", () => {
    const explicit = [1, 2, 3, 5, 8, 13];
    expect(computeNumberOptions({ values: explicit, min: 10, max: 20 })).toEqual(explicit);
  });

  it("formats numbers with localized numerals and optional prefix", () => {
    expect(formatNumberDisplay(5, "ar")).toBe("٥");
    expect(formatNumberDisplay(5, "en")).toBe("5");
    expect(formatNumberDisplay(5, "ar", "ص")).toBe("ص ٥");
    expect(formatNumberDisplay(5, "en", "p.")).toBe("p. 5");
  });

  it("respects custom format callbacks", () => {
    expect(
      formatNumberDisplay(12, "ar", undefined, (v) => `الجزء ${toLocaleNumeral(v, "ar")}`)
    ).toBe("الجزء ١٢");
  });
});
