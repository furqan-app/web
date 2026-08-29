import { ChapterAudio } from "@/app/types/recitation";

export class RecitationProviderError extends Error {}

export interface RecitationProvider {
  getChapterAudio(reciterId: number, chapterId: number): Promise<ChapterAudio | null>;
}
