// `Word.audio_url` (QDC-seeded) is a relative path (e.g. "wbw/001_001_001.mp3"),
// not a full URL — unlike chapter recitation's audioUrl, which QDC already
// returns absolute. Confirmed live: this base resolves it to a playable MP3.
export const WORD_AUDIO_BASE_URL = "https://audio.qurancdn.com/";

export const getWordAudioUrl = (audioUrl: string) => `${WORD_AUDIO_BASE_URL}${audioUrl}`;
