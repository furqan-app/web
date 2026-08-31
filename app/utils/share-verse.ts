import { toLocaleNumeral } from "@/app/utils/i18n";

// Never cuts mid-word: slices to the budget, then backs off to the last space.
// Returns "" when no word boundary fits (e.g. a single long word) so the
// caller can drop the verse text entirely rather than show a broken fragment.
function truncateAtWordBoundary(text: string, budget: number): string {
  if (budget <= 0) return "";
  if (text.length <= budget) return text;
  const lastSpace = text.slice(0, budget).lastIndexOf(" ");
  return lastSpace > 0 ? text.slice(0, lastSpace) : "";
}

export function formatVerseSharePayload({
  verseText,
  surahName,
  ayahNum,
  locale,
  maxLength,
  continueReadingLabel,
}: {
  verseText: string;
  surahName: string;
  ayahNum: number;
  locale: string;
  // Both required together — caps the assembled payload (verse text budget only;
  // the caller appends the deep link separately) for platforms like X/Twitter
  // that have a hard character limit. Omit both for the unbounded default.
  maxLength?: number;
  continueReadingLabel?: string;
}): string {
  const surahPrefix = locale === "ar" ? "سورة" : "Surah";
  const localizedAyah = toLocaleNumeral(ayahNum, locale);
  const attribution = `${surahPrefix} ${surahName}: ${localizedAyah}`;
  const unbounded = `﴿ ${verseText} ﴾\n${attribution}`;

  if (
    maxLength === undefined ||
    continueReadingLabel === undefined ||
    unbounded.length <= maxLength
  ) {
    return unbounded;
  }

  // "﴿ " + "… ﴾" wrapper = 5 chars once the verse text is truncated with an ellipsis.
  const budget =
    maxLength - attribution.length - continueReadingLabel.length - 5 - 2; // 2 newlines joining the 3 lines
  const truncated = truncateAtWordBoundary(verseText, budget);
  const versePart = truncated ? `﴿ ${truncated}… ﴾\n` : "";
  return `${versePart}${attribution}\n${continueReadingLabel}`;
}
