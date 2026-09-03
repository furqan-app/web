import { TafsirEdition, VerseTafsir } from "@/app/types/tafsir";

export class TafsirProviderError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "TafsirProviderError";
    this.statusCode = statusCode;
  }
}

export interface TafsirProvider {
  getTafsir(tafsirId: number, verseKey: string, signal?: AbortSignal): Promise<VerseTafsir | null>;
  getEditions(language?: string, signal?: AbortSignal): Promise<TafsirEdition[]>;
}
