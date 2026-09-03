import { describe, expect, it } from "vitest";
import {
  formatTafsirHtml,
  normalizeQuranBracket,
  normalizeVerseKey,
  parseTafsirSegments,
} from "./tafsir-formatter";

describe("normalizeVerseKey", () => {
  it("normalizes standard verse keys", () => {
    expect(normalizeVerseKey("1:1")).toBe("1:1");
    expect(normalizeVerseKey("2:255")).toBe("2:255");
    expect(normalizeVerseKey("114:6")).toBe("114:6");
  });

  it("strips leading zeros and extra whitespace", () => {
    expect(normalizeVerseKey("001:001")).toBe("1:1");
    expect(normalizeVerseKey("002:005")).toBe("2:5");
    expect(normalizeVerseKey("  18 : 31  ")).toBe("18:31");
    expect(normalizeVerseKey("2_255")).toBe("2:255");
  });

  it("returns null for invalid keys or out-of-bounds surahs", () => {
    expect(normalizeVerseKey("")).toBeNull();
    expect(normalizeVerseKey(null)).toBeNull();
    expect(normalizeVerseKey(undefined)).toBeNull();
    expect(normalizeVerseKey("0:1")).toBeNull();
    expect(normalizeVerseKey("115:1")).toBeNull();
    expect(normalizeVerseKey("2:0")).toBeNull();
    expect(normalizeVerseKey("2:999")).toBeNull();
    expect(normalizeVerseKey("invalid")).toBeNull();
  });
});

describe("normalizeQuranBracket", () => {
  it("wraps and cleans various bracket and quote styles", () => {
    expect(normalizeQuranBracket("{ بِسْمِ اللَّهِ }")).toBe("﴿بِسْمِ اللَّهِ﴾");
    expect(normalizeQuranBracket("( الرَّحْمَنِ )")).toBe("﴿الرَّحْمَنِ﴾");
    expect(normalizeQuranBracket('" قل هو الله أحد "')).toBe("﴿قل هو الله أحد﴾");
    expect(normalizeQuranBracket("« الحمد لله »")).toBe("﴿الحمد لله﴾");
    expect(normalizeQuranBracket("﴿ الم ﴾")).toBe("﴿الم﴾");
  });

  it("decodes HTML entities during normalization", () => {
    expect(normalizeQuranBracket("&quot; إنا أعطيناك الكوثر &quot;")).toBe("﴿إنا أعطيناك الكوثر﴾");
  });

  it("returns empty string for blank input", () => {
    expect(normalizeQuranBracket("")).toBe("");
    expect(normalizeQuranBracket("   ")).toBe("");
  });
});

describe("parseTafsirSegments", () => {
  it("handles null, undefined, and empty string safely", () => {
    expect(parseTafsirSegments(null)).toEqual([]);
    expect(parseTafsirSegments(undefined)).toEqual([]);
    expect(parseTafsirSegments("")).toEqual([]);
    expect(parseTafsirSegments("   ")).toEqual([]);
  });

  it("parses Al-Muyassar format with green spans", () => {
    const raw = 'أبتدئ قراءة القرآن باسم الله مستعينا به، <span class="green">(اللهِ)</span> علم على الرب.';
    const segments = parseTafsirSegments(raw);

    expect(segments).toEqual([
      { type: "text", text: "أبتدئ قراءة القرآن باسم الله مستعينا به، " },
      { type: "quran", text: "﴿اللهِ﴾" },
      { type: "text", text: " علم على الرب." },
    ]);
  });

  it("parses Al-Saadi format with curly braces and arabic qpc-hafs spans", () => {
    const raw = '<span class="arabic qpc-hafs brown">{ بِسْمِ اللَّهِ }</span> أي: أبتدئ بكل اسم لله تعالى.';
    const segments = parseTafsirSegments(raw);

    expect(segments).toEqual([
      { type: "quran", text: "﴿بِسْمِ اللَّهِ﴾" },
      { type: "text", text: " أي: أبتدئ بكل اسم لله تعالى." },
    ]);
  });

  it("parses Ibn Kathir format with narrator spans and quotes", () => {
    const raw = '<span class="blue">عن أنس قال :</span> <span class="arabic qpc-hafs">( قل هو الله أحد )</span> يعني : هو الواحد الأحد.';
    const segments = parseTafsirSegments(raw);

    expect(segments).toEqual([
      { type: "text", text: "عن أنس قال : " },
      { type: "quran", text: "﴿قل هو الله أحد﴾" },
      { type: "text", text: " يعني : هو الواحد الأحد." },
    ]);
  });

  it("extracts volume and verse references", () => {
    const raw = 'قوله تعالى <span class="arabic qpc-hafs green">( كما يعرفون أبناءهم )</span> <span class="reference">[ سورة البقرة : 146 ]</span> [ ص: 132 ]';
    const segments = parseTafsirSegments(raw);

    expect(segments).toEqual([
      { type: "text", text: "قوله تعالى " },
      { type: "quran", text: "﴿كما يعرفون أبناءهم﴾" },
      { type: "reference", text: "[ سورة البقرة : 146 ]" },
      { type: "reference", text: "[ ص: 132 ]" },
    ]);
  });
});

describe("formatTafsirHtml", () => {
  it("formats segments into sanitized HTML string", () => {
    const raw = '<span class="green">(الرَّحْمَنِ)</span> ذي الرحمة العامة.';
    const html = formatTafsirHtml(raw);

    expect(html).toContain('class="font-uthmanic text-primary"');
    expect(html).toContain("﴿الرَّحْمَنِ﴾");
    expect(html).toContain("ذي الرحمة العامة.");
  });

  it("returns empty string for null input", () => {
    expect(formatTafsirHtml(null)).toBe("");
  });
});
