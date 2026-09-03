export interface TafsirEdition {
  id: number;
  name: string;
  authorName: string;
  slug: string;
  languageName: string;
  translatedName?: string;
  direction?: "rtl" | "ltr";
  /**
   * Approximate stored size (MiB) of a full 114-surah offline download (ADR
   * 0060). Only the curated catalog editions carry it; editions mapped live
   * from the QDC resources endpoint leave it undefined.
   */
  downloadSizeMb?: number;
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

/**
 * One deliberately-downloaded tafsir edition (ADR 0060). Source of truth for
 * what the user chose to keep offline — Cache Storage alone can't say which
 * `/__fq-tafsir/*` blobs were an intentional whole-edition download. Every read
 * still validates it against a live 114-chapter count (iOS eviction).
 */
export interface TafsirDownloadItem {
  editionId: number;
  editionName: string;
  sizeBytes: number;
  downloadedAt: number;
}
