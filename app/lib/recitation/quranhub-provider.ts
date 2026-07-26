import { RIWAYA_NARRATOR_MAP } from "@/app/constants/recitation";
import { RecitationProviderError } from "@/app/lib/recitation/provider";
import { Reciter, RiwayaChapterAudio, Riwaya } from "@/app/types/recitation";

const QURANHUB_BASE_URL = "https://api.quranhub.com/v1";

type QuranHubEdition = {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
  narratorIdentifier: string | null;
  recitationType: string | null;
};

type QuranHubAyah = {
  numberInSurah: number;
  audio: string;
  page: number;
};

// Every QuranHub response is wrapped in { code, status, data } — confirmed
// live against both endpoints used here.
type QuranHubEnvelope<T> = { code: number; status: string; data: T };

// quranhubRecitationProvider intentionally does NOT implement
// RecitationProvider — QuranHub has no single continuous audio file with a
// shared timeline to fill ChapterAudio.verseTimings with (confirmed: no
// word-level segments for any reciter, and includeTimings=true returns no
// timings field at all for non-Hafs editions). See ADR 0021 Addendum
// (2026-07-27) and docs/plans/recitation-playback.md Addendum 8.
async function getRiwayaReciters(riwaya: Riwaya, language: string): Promise<Reciter[]> {
  const res = await fetch(`${QURANHUB_BASE_URL}/edition/format/audio/type/surah`, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new RecitationProviderError("Failed to fetch riwaya reciters");
  }

  const { data: editions } = (await res.json()) as QuranHubEnvelope<QuranHubEdition[]>;
  const narratorIdentifier = RIWAYA_NARRATOR_MAP[riwaya];
  const seen = new Set<string>();
  const reciters: Reciter[] = [];

  for (const edition of editions) {
    if (edition.narratorIdentifier !== narratorIdentifier) continue;
    if (seen.has(edition.identifier)) continue;
    seen.add(edition.identifier);
    reciters.push({
      id: edition.identifier,
      name: edition.name,
      translatedName: language === "en" ? edition.englishName : edition.name,
      style: edition.recitationType
        ? edition.recitationType.charAt(0).toUpperCase() + edition.recitationType.slice(1)
        : null,
      riwaya,
    });
  }

  return reciters;
}

async function getChapterVerseAudio(
  editionIdentifier: string,
  chapterId: number,
): Promise<RiwayaChapterAudio> {
  const res = await fetch(`${QURANHUB_BASE_URL}/surah/${chapterId}/${editionIdentifier}`, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new RecitationProviderError("Failed to fetch riwaya chapter audio");
  }

  const { data } = (await res.json()) as QuranHubEnvelope<{ ayahs: QuranHubAyah[] }>;
  const { ayahs } = data;

  return {
    verses: ayahs.map((a) => ({
      verseKey: `${chapterId}:${a.numberInSurah}`,
      audioUrl: a.audio,
      page: a.page,
    })),
  };
}

export const quranhubRecitationProvider = {
  getRiwayaReciters,
  getChapterVerseAudio,
};
