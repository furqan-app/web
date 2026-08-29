import { describe, expect, it, vi } from "vitest";
import { fetchTafsir, tafsirQueryKey } from "./use-tafsir";
import { qdcTafsirProvider } from "@/app/lib/tafsir/qdc-provider";

describe("use-tafsir hook utilities", () => {
  describe("tafsirQueryKey", () => {
    it("generates normalized cache query keys", () => {
      expect(tafsirQueryKey(16, "1:1")).toEqual(["tafsir", 16, "1:1"]);
      expect(tafsirQueryKey(16, "002:005")).toEqual(["tafsir", 16, "2:5"]);
      expect(tafsirQueryKey(91, "  18 : 31 ")).toEqual(["tafsir", 91, "18:31"]);
    });

    it("handles null or invalid verse keys cleanly in key tuple", () => {
      expect(tafsirQueryKey(16, null)).toEqual(["tafsir", 16, null]);
      expect(tafsirQueryKey(16, undefined)).toEqual(["tafsir", 16, null]);
      expect(tafsirQueryKey(16, "invalid")).toEqual(["tafsir", 16, null]);
    });
  });

  describe("fetchTafsir", () => {
    it("delegates to qdcTafsirProvider.getTafsir forwarding AbortSignal", async () => {
      const mockResult = {
        tafsirId: 16,
        verseKey: "1:1",
        resourceName: "المیسر",
        text: "باسم الله",
      };

      const controller = new AbortController();
      const spy = vi.spyOn(qdcTafsirProvider, "getTafsir").mockResolvedValue(mockResult);

      const result = await fetchTafsir(16, "1:1", controller.signal);

      expect(spy).toHaveBeenCalledWith(16, "1:1", controller.signal);
      expect(result).toEqual(mockResult);

      spy.mockRestore();
    });
  });
});
