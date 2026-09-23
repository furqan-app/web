import { describe, expect, it } from "vitest";
import { filterAndSortMarks } from "./use-all-marks";
import type { LocalMark } from "@/app/lib/marks/store";

const createSampleMark = (
  marked_type: "word" | "verse",
  marked_id: string,
  category = "forgetting",
  page_number = 1,
  deleted = false
): LocalMark => ({
  marked_type,
  marked_id,
  page_number,
  category,
  comment: null,
  snippet: "آية",
  chapter_name_simple: "Al-Fatihah",
  chapter_name_arabic: "الفاتحة",
  verse_number: 1,
  deleted,
  updated_at: 1000,
  sync: "synced",
});

describe("useAllMarks - filterAndSortMarks (ADR 0061 / #551)", () => {
  it("sorts marks in natural Quran order: surah -> verse -> word", () => {
    const raw: Record<string, LocalMark> = {
      "word:2:10:1": createSampleMark("word", "2:10:1", "similar", 2),
      "verse:1:1": createSampleMark("verse", "1:1", "forgetting", 1),
      "word:1:1:2": createSampleMark("word", "1:1:2", "forgetting", 1),
      "word:1:1:1": createSampleMark("word", "1:1:1", "forgetting", 1),
    };

    const sorted = filterAndSortMarks(raw, "all");
    expect(sorted.map((m) => m.marked_id)).toEqual([
      "1:1:1",
      "1:1:2",
      "1:1",
      "2:10:1",
    ]);
  });

  it("filters out deleted marks (tombstones)", () => {
    const raw: Record<string, LocalMark> = {
      "word:1:1:1": createSampleMark("word", "1:1:1", "forgetting", 1, true),
      "word:1:1:2": createSampleMark("word", "1:1:2", "forgetting", 1, false),
    };

    const result = filterAndSortMarks(raw, "all");
    expect(result.length).toBe(1);
    expect(result[0].marked_id).toBe("1:1:2");
  });

  it("filters marks by category", () => {
    const raw: Record<string, LocalMark> = {
      "word:1:1:1": createSampleMark("word", "1:1:1", "forgetting", 1),
      "word:1:1:2": createSampleMark("word", "1:1:2", "similar", 1),
      "word:1:1:3": createSampleMark("word", "1:1:3", "forgetting", 1),
    };

    const forgetting = filterAndSortMarks(raw, "forgetting");
    expect(forgetting.map((m) => m.marked_id)).toEqual(["1:1:1", "1:1:3"]);

    const similar = filterAndSortMarks(raw, "similar");
    expect(similar.map((m) => m.marked_id)).toEqual(["1:1:2"]);

    const all = filterAndSortMarks(raw, "all");
    expect(all.length).toBe(3);
  });

  it("handles empty store cleanly", () => {
    const result = filterAndSortMarks({}, "all");
    expect(result).toEqual([]);
  });

  it("places verse-level mark after words of the same verse", () => {
    const raw: Record<string, LocalMark> = {
      "verse:2:255": createSampleMark("verse", "2:255", "other", 42),
      "word:2:255:1": createSampleMark("word", "2:255:1", "linking", 42),
      "word:2:255:50": createSampleMark("word", "2:255:50", "linking", 42),
    };

    const sorted = filterAndSortMarks(raw, "all");
    expect(sorted.map((m) => `${m.marked_type}:${m.marked_id}`)).toEqual([
      "word:2:255:1",
      "word:2:255:50",
      "verse:2:255",
    ]);
  });
});
