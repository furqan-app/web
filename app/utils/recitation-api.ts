import { ChapterAudio, Reciter } from "@/app/types/recitation";

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

export const fetchReciters = async (): Promise<Reciter[]> => {
  const res = await fetch("/api/quran/recitations/reciters");
  return unwrap<Reciter[]>(res);
};

export const fetchChapterAudio = async (
  reciterId: number,
  chapterId: number,
): Promise<ChapterAudio> => {
  const res = await fetch(`/api/quran/recitations/${reciterId}/chapters/${chapterId}`);
  return unwrap<ChapterAudio>(res);
};

export const fetchChapterVersePages = async (
  chapterId: number,
): Promise<Record<string, number>> => {
  const res = await fetch(`/api/quran/chapters/${chapterId}/verse-pages`);
  return unwrap<Record<string, number>>(res);
};
