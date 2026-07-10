import { ChapterAudio, Reciter, VerseTiming } from "@/app/types/recitation";
import { RecitationProvider, RecitationProviderError } from "@/app/lib/recitation/provider";

const QDC_BASE_URL = "https://api.qurancdn.com/api/qdc";

type QdcReciter = {
  id: number;
  name: string;
  translated_name?: { name: string; language_name: string } | null;
  style?: { name: string; language_name: string; description: string } | null;
};

type QdcVerseTiming = {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
  segments: Array<[number, number, number]>;
};

type QdcAudioFile = {
  audio_url: string;
  duration: number;
  verse_timings: QdcVerseTiming[];
};

async function getReciters(): Promise<Reciter[]> {
  const res = await fetch(`${QDC_BASE_URL}/audio/reciters`, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new RecitationProviderError("Failed to fetch reciters");
  }

  const { reciters } = (await res.json()) as { reciters: QdcReciter[] };

  return reciters.map((r) => ({
    id: r.id,
    name: r.name,
    translatedName: r.translated_name?.name ?? r.name,
    style: r.style?.name ?? null,
  }));
}

async function getChapterAudio(
  reciterId: number,
  chapterId: number,
): Promise<ChapterAudio | null> {
  const res = await fetch(
    `${QDC_BASE_URL}/audio/reciters/${reciterId}/audio_files?chapter=${chapterId}&segments=true`,
    { next: { revalidate: 86400 } },
  );

  if (!res.ok) {
    throw new RecitationProviderError("Failed to fetch chapter audio");
  }

  const { audio_files } = (await res.json()) as { audio_files: QdcAudioFile[] };
  const audioFile = audio_files[0];

  if (!audioFile) return null;

  const verseTimings: VerseTiming[] = audioFile.verse_timings.map((vt) => ({
    verseKey: vt.verse_key,
    timestampFrom: vt.timestamp_from,
    timestampTo: vt.timestamp_to,
    segments: vt.segments,
  }));

  return {
    audioUrl: audioFile.audio_url,
    durationMs: audioFile.duration,
    verseTimings,
  };
}

export const qdcRecitationProvider: RecitationProvider = {
  getReciters,
  getChapterAudio,
};
