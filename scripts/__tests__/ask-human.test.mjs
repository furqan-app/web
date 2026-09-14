import { describe, expect, it } from "vitest";
import { classifyReply, isHumanReply, normalizeDigits } from "../ask-human.mjs";

const N = 3;

describe("classifyReply — bare selections", () => {
  for (const text of ["2", "#2", " 2 ", "2.", "2)", "option 2", "Option 2"]) {
    it(`answered choice 2: ${JSON.stringify(text)}`, () => {
      expect(classifyReply(text, N)).toEqual({ kind: "choice", choice: 2 });
    });
  }
});

describe("classifyReply — prose falls through to freeform", () => {
  for (const text of [
    "2 is broken, do 1 instead",
    "2 problems with this",
    "no, do the second one",
    "looking into it...",
  ]) {
    it(`freeform: ${JSON.stringify(text)}`, () => {
      expect(classifyReply(text, N)).toEqual({ kind: "freeform" });
    });
  }

  it("out-of-range bare numbers are freeform, not choices", () => {
    expect(classifyReply("9", N)).toEqual({ kind: "freeform" });
    expect(classifyReply("0", N)).toEqual({ kind: "freeform" });
  });
});

describe("classifyReply — Arabic-Indic digits", () => {
  it("٢ is choice 2", () => {
    expect(classifyReply("٢", N)).toEqual({ kind: "choice", choice: 2 });
  });

  it("١ is choice 1", () => {
    expect(classifyReply("١", N)).toEqual({ kind: "choice", choice: 1 });
  });

  it("Extended Arabic-Indic ۲ is choice 2", () => {
    expect(classifyReply("۲", N)).toEqual({ kind: "choice", choice: 2 });
  });

  it("رقم ٢ is choice 2", () => {
    expect(classifyReply("رقم ٢", N)).toEqual({ kind: "choice", choice: 2 });
  });

  it("normalizeDigits maps both ranges to ASCII", () => {
    expect(normalizeDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(normalizeDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
  });
});

describe("classifyReply — empty replies are not answers", () => {
  it("empty string is empty", () => {
    expect(classifyReply("", N)).toEqual({ kind: "empty" });
  });

  it("whitespace-only is empty", () => {
    expect(classifyReply("   ", N)).toEqual({ kind: "empty" });
  });

  it("missing text is empty", () => {
    expect(classifyReply(undefined, N)).toEqual({ kind: "empty" });
    expect(classifyReply(null, N)).toEqual({ kind: "empty" });
  });
});

describe("isHumanReply", () => {
  const base = { ts: "2", user: "Uhuman" };
  const threadTs = "1";
  const self = "Uself";

  it("accepts a plain human reply", () => {
    expect(isHumanReply({ ...base }, threadTs, self)).toBe(true);
  });

  it("accepts thread_broadcast and file_share", () => {
    expect(isHumanReply({ ...base, subtype: "thread_broadcast" }, threadTs, self)).toBe(true);
    expect(isHumanReply({ ...base, subtype: "file_share" }, threadTs, self)).toBe(true);
  });

  it("rejects the root message, bots, self, and other subtypes", () => {
    expect(isHumanReply({ ...base, ts: threadTs }, threadTs, self)).toBe(false);
    expect(isHumanReply({ ...base, bot_id: "B1" }, threadTs, self)).toBe(false);
    expect(isHumanReply({ ...base, user: self }, threadTs, self)).toBe(false);
    expect(isHumanReply({ ...base, subtype: "channel_join" }, threadTs, self)).toBe(false);
  });
});

describe("classifyReply — a later bare number is a correction", () => {
  // The poll loop takes the LATEST bare selection, so "1" then "2" resolves to 2.
  it("both parse as choices so the loop can prefer the latest", () => {
    expect(classifyReply("1", N)).toEqual({ kind: "choice", choice: 1 });
    expect(classifyReply("2", N)).toEqual({ kind: "choice", choice: 2 });
  });

  it("prose mentioning a number never becomes a choice", () => {
    expect(classifyReply("1 sec, checking", N)).toEqual({ kind: "freeform" });
    expect(classifyReply("go with 2 please", N)).toEqual({ kind: "freeform" });
  });
});

describe("importing the module is side-effect free", () => {
  it("exports the pure helpers without running main()", () => {
    expect(typeof classifyReply).toBe("function");
    expect(typeof isHumanReply).toBe("function");
    expect(typeof normalizeDigits).toBe("function");
  });
});
