import { describe, it, expect } from "vitest";

import { toLogDetail } from "./auth-log";

describe("toLogDetail", () => {
  it("expands Error instances to plain name/message/stack", () => {
    const err = new Error("state_mismatch");
    const [out] = toLogDetail([err]) as Array<{
      name: string;
      message: string;
      stack?: string;
    }>;
    expect(out?.name).toBe("Error");
    expect(out?.message).toBe("state_mismatch");
    expect(typeof out?.stack).toBe("string");
  });

  it("passes strings and metadata objects through untouched", () => {
    expect(toLogDetail(["OAUTH_CALLBACK_ERROR"])).toEqual([
      "OAUTH_CALLBACK_ERROR",
    ]);
    expect(toLogDetail([{ providerId: "google" }])).toEqual([
      { providerId: "google" },
    ]);
  });

  it("handles mixed and empty payloads", () => {
    expect(toLogDetail([])).toEqual([]);
    const out = toLogDetail([
      "x",
      new TypeError("bad"),
      7,
    ]) as Array<unknown>;
    expect(out).toHaveLength(3);
    expect(out[0]).toBe("x");
    expect(out[2]).toBe(7);
    expect((out[1] as { name: string }).name).toBe("TypeError");
  });
});
