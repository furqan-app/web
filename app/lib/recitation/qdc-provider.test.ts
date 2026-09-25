import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { qdcRecitationProvider } from "./qdc-provider";
import { RecitationProviderError } from "./provider";

describe("qdcRecitationProvider", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("getChapterAudio", () => {
    it("fetches and maps chapter audio, clamping overlapping timestampTo (#695)", async () => {
      const mockResponse = {
        audio_files: [
          {
            id: 1,
            chapter_id: 2,
            file_size: 1000,
            format: "mp3",
            audio_url: "https://audio.example.com/2.mp3",
            duration: 120000,
            verse_timings: [
              {
                verse_key: "2:5",
                timestamp_from: 30000,
                // Overlaps with 2:6 by 9ms (ends at 40613, next starts at 40604)
                timestamp_to: 40613,
                duration: 10613,
                segments: [[1, 30000, 40613]],
              },
              {
                verse_key: "2:6",
                timestamp_from: 40604,
                timestamp_to: 55000,
                duration: 14396,
                segments: [[1, 40604, 55000]],
              },
            ],
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await qdcRecitationProvider.getChapterAudio(10, 2);

      expect(result).not.toBeNull();
      expect(result?.audioUrl).toBe("https://audio.example.com/2.mp3");
      expect(result?.durationMs).toBe(120000);
      expect(result?.verseTimings).toHaveLength(2);

      // Verify verse 2:5 timestampTo was clamped to 40604 (verse 2:6 timestampFrom)
      expect(result?.verseTimings[0]).toEqual({
        verseKey: "2:5",
        timestampFrom: 30000,
        timestampTo: 40604,
        segments: [[1, 30000, 40613]],
      });

      // Verify verse 2:6 was unaffected
      expect(result?.verseTimings[1]).toEqual({
        verseKey: "2:6",
        timestampFrom: 40604,
        timestampTo: 55000,
        segments: [[1, 40604, 55000]],
      });
    });

    it("throws RecitationProviderError when response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(qdcRecitationProvider.getChapterAudio(10, 2)).rejects.toThrow(
        RecitationProviderError,
      );
    });

    it("returns null when audio_files is empty", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ audio_files: [] }),
      });

      const result = await qdcRecitationProvider.getChapterAudio(10, 2);
      expect(result).toBeNull();
    });
  });
});
