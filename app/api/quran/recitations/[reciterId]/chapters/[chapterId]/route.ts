import { jsonResponse } from "@/app/api/response";
import { QDC_BASE_URL } from "@/app/constants/recitation";
import { ChapterAudio, VerseTiming } from "@/app/types/recitation";

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

export async function GET(
  _request: Request,
  { params }: { params: { reciterId: string; chapterId: string } },
) {
  const { reciterId, chapterId } = params;

  if (!Number.isInteger(Number(reciterId)) || !Number.isInteger(Number(chapterId))) {
    return jsonResponse({ code: 422, message: "Invalid reciter or chapter id" });
  }

  const res = await fetch(
    `${QDC_BASE_URL}/audio/reciters/${reciterId}/audio_files?chapter=${chapterId}&segments=true`,
    { next: { revalidate: 86400 } },
  );

  if (!res.ok) {
    return jsonResponse({ code: 502, message: "Failed to fetch chapter audio" });
  }

  const { audio_files } = (await res.json()) as { audio_files: QdcAudioFile[] };
  const audioFile = audio_files[0];

  if (!audioFile) {
    return jsonResponse({ code: 404, message: "No audio found for this reciter/chapter" });
  }

  const verseTimings: VerseTiming[] = audioFile.verse_timings.map((vt) => ({
    verseKey: vt.verse_key,
    timestampFrom: vt.timestamp_from,
    timestampTo: vt.timestamp_to,
    segments: vt.segments,
  }));

  const data: ChapterAudio = {
    audioUrl: audioFile.audio_url,
    durationMs: audioFile.duration,
    verseTimings,
  };

  return jsonResponse({ data });
}
