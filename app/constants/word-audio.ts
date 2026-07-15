// `Word.audio_url` (QDC-seeded) is a relative path (e.g. "wbw/001_001_001.mp3"),
// not a full URL — unlike chapter recitation's audioUrl, which QDC already
// returns absolute. Confirmed live: this base resolves it to a playable MP3.
export const WORD_AUDIO_BASE_URL = "https://audio.qurancdn.com/";

export const getWordAudioUrl = (audioUrl: string) => `${WORD_AUDIO_BASE_URL}${audioUrl}`;

// QDC includes non-word tokens (e.g. Rub el hizb ۞) in verse position numbering,
// so `audio_url` values for actual words in those verses are off-by-N on the CDN
// (which numbers files by actual words only). This helper decrements the trailing
// zero-padded number in the path by `offset` to get the correct CDN file number.
export function adjustWordAudioUrl(audioUrl: string, offset: number): string {
  return audioUrl.replace(
    /(\d+)(\.mp3)$/,
    (_, num, ext) =>
      `${String(parseInt(num, 10) - offset).padStart(num.length, "0")}${ext}`,
  );
}
