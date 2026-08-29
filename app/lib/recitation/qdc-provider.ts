import { ChapterAudio, VerseSegment, VerseTiming } from "@/app/types/recitation";
import { RecitationProvider, RecitationProviderError } from "@/app/lib/recitation/provider";

const QDC_BASE_URL = "https://api.qurancdn.com/api/qdc";

type QdcVerseTiming = {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
  // Deliberately `number[][]`, not the 3-tuple the domain type uses: QDC really
  // does serve malformed entries — one- and two-element arrays such as reciter
  // 7's `[30, 2466306]` at 2:114 and reciter 161's `[610700]` at 18:31. Typed
  // honestly here and filtered to real triples when mapping below, so
  // `VerseSegment` stays a true 3-tuple everywhere downstream. Destructured as
  // `[, startMs, endMs]` a short entry yields `endMs === undefined`, every
  // comparison against it is false, and that word silently never highlights.
  segments?: number[][];
};

type QdcAudioFile = {
  audio_url: string;
  duration: number;
  verse_timings: QdcVerseTiming[];
};

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
    segments: (vt.segments ?? []).filter(
      (segment): segment is VerseSegment => segment.length === 3,
    ),
  }));

  return {
    audioUrl: audioFile.audio_url,
    durationMs: audioFile.duration,
    verseTimings,
  };
}

export const qdcRecitationProvider: RecitationProvider = {
  getChapterAudio,
};
