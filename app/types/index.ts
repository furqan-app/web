export type Word = {
  id: number;
  position: number;
  audio_url: string;
  verse_key: string;
  verse_id: number;
  location: string;
  text_uthmani: string;
  code_v1: string;
  code_v2: string;
  code_v4: string;
  qpc_uthmani_hafs: string;
  char_type_name: string;
  page_number: number;
  line_number: number;
  text: string;
  translation: {
    text: string;
    language_name: string;
    language_id: number;
  };
};

export type Verse = {
  id: number;
  verse_number: number;
  verse_key: string;
  hizb_number: number;
  rub_el_hizb_number: number;
  ruku_number: number;
  manzil_number: number;
  sajdah_number?: number;
  text_uthmani: string;
  chapter_id: number;
  text_imlaei_simple: string;
  page_number: number;
  juz_number: number;
  words: Array<Word>;
  timestamps: {
    timestamp_from: 6517950;
  };
};

export type Surah = {
  id: number;
  name_arabic: string;
  name_simple: string;
  name_complex: string;
  verses_count: number;
  revelation_place: string;
  revelation_order: number;
  pages: number[];
  slug: {
    slug: string;
    locale: string;
  };
  translated_name: {
    language_name: string;
    text: string;
  };
};


export type VerseResult = {
  verse_key: string;
  text_imlaei_simple: string;
  text_uthmani: string;
  page_number: number;
  chapter_name: string;
};

export type SurahResult = {
  id: number;
  name_arabic: string;
  name_simple: string;
  verses_count: number;
  pages: string;
};

export type Mark = {
  id: number;
  marked_id: number;
  marked_type: string;
  mark_type: string;
  mark_value: string;
  from_user: number;
  to_user: number;
  page_number: number;
};

export type QuranFontScale = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
