import { describe, expect, it, vi } from "vitest";
import { getSurahPageRange } from "./resolve-units";
import { quranPrisma } from "@/app/utils/db";

vi.mock("@/app/utils/db", () => {
  return {
    quranPrisma: {
      verse: {
        aggregate: vi.fn(),
      },
      pageMetadata: {
        aggregate: vi.fn(),
      },
    },
    appPrisma: {},
  };
});

describe("resolve-units", () => {
  it("getSurahPageRange returns null for invalid surah inputs", async () => {
    expect(await getSurahPageRange(0)).toBeNull();
    expect(await getSurahPageRange(115)).toBeNull();
    expect(await getSurahPageRange(10, 5)).toBeNull();
    expect(await getSurahPageRange(1.5 as unknown as number)).toBeNull();
  });

  it("getSurahPageRange aggregates verse page numbers", async () => {
    vi.mocked(quranPrisma.verse.aggregate).mockResolvedValueOnce({
      _min: { page_number: 293 },
      _max: { page_number: 304 },
    } as unknown as Awaited<ReturnType<typeof quranPrisma.verse.aggregate>>);

    const range = await getSurahPageRange(18);
    expect(range).toEqual({ startPage: 293, endPage: 304 });
    expect(quranPrisma.verse.aggregate).toHaveBeenCalledWith({
      where: { chapter_id: { gte: 18, lte: 18 } },
      _min: { page_number: true },
      _max: { page_number: true },
    });
  });

  it("getSurahPageRange returns null if aggregate returns null page_number", async () => {
    vi.mocked(quranPrisma.verse.aggregate).mockResolvedValueOnce({
      _min: { page_number: null },
      _max: { page_number: null },
    } as unknown as Awaited<ReturnType<typeof quranPrisma.verse.aggregate>>);

    const range = await getSurahPageRange(50);
    expect(range).toBeNull();
  });
});
