import { toLocaleNumeral } from "@/app/utils/i18n";

/**
 * Normalises a verse's `text_uthmani` for plain-text use (share payloads,
 * `og:description`): drops the rub-el-hizb divider (۞, U+06DE) and collapses
 * whitespace. Standard Unicode, safe to render outside the app.
 */
export function toVersePlainText(textUthmani: string): string {
  return textUthmani.replace(/۞/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Assembles the plain-text share payload for a verse: the verse in Quranic
 * brackets, then a localized "Surah <name>: <ayah>" attribution line. The
 * caller appends the share link separately. The full verse text is always
 * included — no length cap (see MarkModal `buildPlatformHref`).
 */
export function formatVerseSharePayload({
  verseText,
  surahName,
  ayahNum,
  locale,
}: {
  verseText: string;
  surahName: string;
  ayahNum: number;
  locale: string;
}): string {
  const surahPrefix = locale === "ar" ? "سورة" : "Surah";
  const localizedAyah = toLocaleNumeral(ayahNum, locale);
  return `﴿ ${verseText} ﴾\n${surahPrefix} ${surahName}: ${localizedAyah}`;
}
