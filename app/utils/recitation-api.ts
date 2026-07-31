import { ChapterAudio, Reciter } from "@/app/types/recitation";
import { SurahResult } from "@/app/types";

// Local envelope shape (mirrors app/api/response.ts's ApiResponse<T>) — not
// imported from there directly since that module is a route helper that
// pulls in `next/server`, which client code shouldn't bundle.
type Envelope<T> = { data: T | null; success: boolean; message: string | null };

async function unwrap<T>(res: Response): Promise<T> {
  const body = (await res.json()) as Envelope<T>;
  if (!body.success || body.data == null) {
    throw new Error(body.message ?? "Request failed");
  }
  return body.data;
}

export const fetchReciters = async (language: string): Promise<Reciter[]> => {
  const res = await fetch(`/api/quran/recitations/reciters?language=${language}`);
  return unwrap<Reciter[]>(res);
};

export const fetchChapterAudio = async (
  reciterId: number,
  chapterId: number,
): Promise<ChapterAudio> => {
  const res = await fetch(`/api/quran/recitations/${reciterId}/chapters/${chapterId}`);
  return unwrap<ChapterAudio>(res);
};

export const fetchStopPoint = async (
  verseKey: string,
  scope: "page" | "rub" | "hizb" | "juz",
  // Only meaningful for scope="page" — a page belongs to one mushaf edition,
  // while rub/hizb/juz are divisions of the text and identical in all of them
  // (ADR 0033). Harmless to send for the others.
  mushafId: number,
): Promise<{ verseKey: string; chapterId: number }> => {
  const res = await fetch(
    `/api/quran/verses/${encodeURIComponent(verseKey)}/stop-point?scope=${scope}&mushaf=${mushafId}`,
  );
  return unwrap<{ verseKey: string; chapterId: number }>(res);
};

// A page is only meaningful relative to a mushaf edition (ADR 0033) — pageId
// is resolved against mushafId's own pagination, not the default edition's.
export const fetchPageBounds = async (
  pageId: number,
  mushafId: number,
): Promise<{ firstVerseKey: string; lastVerseKey: string; lastChapterId: number }> => {
  const res = await fetch(`/api/quran/pages/${pageId}/bounds?mushaf=${mushafId}`);
  return unwrap<{ firstVerseKey: string; lastVerseKey: string; lastChapterId: number }>(res);
};

// Static committed file (Static Generation Strategy decision), not an API
// route — fetched directly, no jsonResponse envelope to unwrap. Used by the
// "custom" stopPoint's verse-type "to" picker for surah names + verses_count
// caps.
export const fetchChapters = async (): Promise<SurahResult[]> => {
  const res = await fetch("/quran/chapters.json");
  return res.json();
};
