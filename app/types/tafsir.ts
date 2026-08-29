export interface TafsirEdition {
  id: number;
  name: string;
  authorName: string;
  slug: string;
  languageName: string;
  translatedName?: string;
  direction?: "rtl" | "ltr";
}

export interface VerseTafsir {
  tafsirId: number;
  verseKey: string;
  resourceName: string;
  text: string;
  languageName?: string;
}

export type TafsirSegmentType = "text" | "quran" | "reference";

export interface TafsirSegment {
  type: TafsirSegmentType;
  text: string;
}

export interface UseTafsirOptions {
  tafsirId: number;
  verseKey?: string | null;
  enabled?: boolean;
}
