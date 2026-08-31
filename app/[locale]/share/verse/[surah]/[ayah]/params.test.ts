import { describe, expect, it } from "vitest";

import { parseSegment } from "./params";

describe("parseSegment", () => {
  it("accepts 1–3 digit positive integers", () => {
    expect(parseSegment("1")).toBe(1);
    expect(parseSegment("114")).toBe(114);
    expect(parseSegment("255")).toBe(255);
  });

  it("rejects non-numeric, zero, negative, overflowing, decimal and empty input", () => {
    expect(parseSegment("0")).toBeNull();
    expect(parseSegment("abc")).toBeNull();
    expect(parseSegment("-1")).toBeNull();
    expect(parseSegment("1234")).toBeNull();
    expect(parseSegment("1.5")).toBeNull();
    expect(parseSegment("")).toBeNull();
  });

  it("rejects zero-padded segments so /007/1 can't shadow /7/1", () => {
    expect(parseSegment("007")).toBeNull();
    expect(parseSegment("01")).toBeNull();
  });
});
