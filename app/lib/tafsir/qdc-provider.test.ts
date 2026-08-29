import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { qdcTafsirProvider } from "./qdc-provider";
import { TafsirProviderError } from "./provider";

describe("qdcTafsirProvider", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("getTafsir", () => {
    it("fetches and maps verse tafsir successfully", async () => {
      const mockResponse = {
        tafsir: {
          resource_id: 16,
          resource_name: "المیسر",
          text: "أبتدئ قراءة القرآن باسم الله",
          translated_name: {
            name: "Tafsir Muyassar",
            language_name: "arabic",
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await qdcTafsirProvider.getTafsir(16, "1:1");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.qurancdn.com/api/qdc/tafsirs/16/by_ayah/1:1",
        { signal: undefined },
      );
      expect(result).toEqual({
        tafsirId: 16,
        verseKey: "1:1",
        resourceName: "المیسر",
        text: "أبتدئ قراءة القرآن باسم الله",
        languageName: "arabic",
      });
    });

    it("returns null on 404 response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await qdcTafsirProvider.getTafsir(16, "1:1");
      expect(result).toBeNull();
    });

    it("throws TafsirProviderError on HTTP 500 error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(qdcTafsirProvider.getTafsir(16, "1:1")).rejects.toThrow(TafsirProviderError);
    });

    it("throws TafsirProviderError on invalid verse key format", async () => {
      await expect(qdcTafsirProvider.getTafsir(16, "invalid:key")).rejects.toThrow(TafsirProviderError);
    });
  });

  describe("getEditions", () => {
    it("fetches and maps editions catalog with direction metadata", async () => {
      const mockResponse = {
        tafsirs: [
          {
            id: 16,
            name: "Tafsir Muyassar",
            author_name: "King Fahad Complex",
            slug: "ar-tafsir-muyassar",
            language_name: "arabic",
            translated_name: { name: "التفسير الميسر", language_name: "arabic" },
          },
          {
            id: 169,
            name: "Ibn Kathir (Abridged)",
            author_name: "Hafiz Ibn Kathir",
            slug: "en-tafisr-ibn-kathir",
            language_name: "english",
            translated_name: { name: "Ibn Kathir (Abridged)", language_name: "english" },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const editions = await qdcTafsirProvider.getEditions("ar");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.qurancdn.com/api/qdc/resources/tafsirs?language=ar",
        { signal: undefined },
      );
      expect(editions).toEqual([
        {
          id: 16,
          slug: "ar-tafsir-muyassar",
          name: "Tafsir Muyassar",
          authorName: "King Fahad Complex",
          languageName: "arabic",
          translatedName: "التفسير الميسر",
          direction: "rtl",
        },
        {
          id: 169,
          slug: "en-tafisr-ibn-kathir",
          name: "Ibn Kathir (Abridged)",
          authorName: "Hafiz Ibn Kathir",
          languageName: "english",
          translatedName: "Ibn Kathir (Abridged)",
          direction: "ltr",
        },
      ]);
    });
  });
});
