import { highlight } from "@utils/highlight";
import Link from "next/link";
import { SurahResult, VerseResult } from "@types";
import useTranslations from "@hooks/use-translations";
import { useLocale } from "next-intl";
import { toLocaleNumeral } from "@utils/i18n";
import { useReaderBasePath } from "@hooks/use-reader-base-path";
import { cn } from "@/lib/utils";

export default function SearchQueryResults({
  chapters,
  verses,
  setIsOpen,
  className,
}: {
  chapters: SurahResult[];
  verses: VerseResult[];
  setIsOpen: (isOpen: boolean) => void;
  className?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const basePath = useReaderBasePath();

  return (
    <div
      className={cn(
        "absolute w-full mt-2 bg-popover rounded-lg shadow-lg border border-border max-h-96 overflow-auto z-50",
        className,
      )}
    >
      {chapters && chapters.length > 0 && (
        <div className="border-b border-border">
          <div className="px-4 py-2 bg-muted">
            <span className="font-medium text-foreground">
              {t("surahs", "Surahs")} (
              {toLocaleNumeral(chapters.length, locale)})
            </span>
          </div>
          {chapters.map((chapter) => (
            <Link
              locale={locale}
              key={chapter.id}
              href={`${basePath}/${chapter.pages.split("-")[0]}`}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 hover:bg-accent"
            >
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  {chapter.name_simple}
                </span>
                <span className="font-surahnames text-xl">
                  {chapter.name_arabic}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {verses && verses.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-muted">
            <span className="font-medium text-foreground">
              {toLocaleNumeral(verses.length, locale)}{" "}
              {verses.length > 10
                ? t("count_verses", "Verses")
                : t("verses", "Verses")}
            </span>
          </div>
          {verses.map((verse) => (
            <Link
              locale={locale}
              key={verse.verse_key}
              href={highlight.addToUrl({
                verseKey: verse.verse_key,
                pageNumber: verse.page_number,
                basePath,
              })}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 hover:bg-accent"
            >
              <div className="text-sm text-muted-foreground">
                {locale === "ar"
                  ? verse.chapter.name_arabic
                  : verse.chapter.name_simple}{" "}
                -{" "}
                {toLocaleNumeral(Number(verse.verse_key.split(":")[1]), locale)}
              </div>
              <div className="text-right font-uthmanic text-lg" dir="rtl">
                {verse.Word.map((w) => w.qpc_uthmani_hafs).join(" ")}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

