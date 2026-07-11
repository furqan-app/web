import { ChapterAudio, Reciter } from "@/app/types/recitation";

export class RecitationProviderError extends Error {}

export interface RecitationProvider {
  getReciters(language: string): Promise<Reciter[]>;
  getChapterAudio(reciterId: number, chapterId: number): Promise<ChapterAudio | null>;
}
