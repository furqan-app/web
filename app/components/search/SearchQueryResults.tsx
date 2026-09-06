import { highlight } from "@utils/highlight";
import { SurahResult, VerseResult } from "@types";
import useTranslations from "@hooks/use-translations";
import { useLocale } from "next-intl";
import { toLocaleNumeral } from "@utils/i18n";
import { useReaderBasePath } from "@hooks/use-reader-base-path";
import { SearchSurahRow, SearchVerseRow } from "./SearchResultRows";
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
        "fq-panel-cast absolute w-full mt-2 bg-popover rounded-lg border border-border max-h-96 overflow-auto z-50",
        className,
      )}
    >
      {chapters && chapters.length > 0 && (
        <div className="border-b border-border">
          {/* Result-group headings are the same overline register as every
              other section in the app, and they say what you are looking at —
              identity, not state. */}
          <div className="fq-section-heading !rounded-none px-4 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("surahs", "Surahs")} (
              {toLocaleNumeral(chapters.length, locale)})
            </span>
          </div>
          {chapters.map((chapter) => (
            <SearchSurahRow
              key={chapter.id}
              chapter={chapter}
              href={`${basePath}/${chapter.pages.split("-")[0]}`}
              onNavigate={() => setIsOpen(false)}
            />
          ))}
        </div>
      )}

      {verses && verses.length > 0 && (
        <div>
          <div className="fq-section-heading !rounded-none px-4 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {toLocaleNumeral(verses.length, locale)}{" "}
              {verses.length > 10
                ? t("count_verses", "Verses")
                : t("verses", "Verses")}
            </span>
          </div>
          {verses.map((verse) => (
            <SearchVerseRow
              key={verse.verse_key}
              verse={verse}
              href={highlight.addToUrl({
                verseKey: verse.verse_key,
                pageNumber: verse.page_number,
                basePath,
              })}
              onNavigate={() => setIsOpen(false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

