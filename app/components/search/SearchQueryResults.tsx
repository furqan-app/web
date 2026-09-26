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
  notifyNavigating,
  className,
}: {
  chapters: SurahResult[];
  verses: VerseResult[];
  setIsOpen: (isOpen: boolean) => void;
  // Back-guard navigation signal (ADR 0055's 2026-08-16 addendum): the
  // overlay's useCloseOnBackGesture cleanup races Next's own pushState for a
  // tapped result link, so the tap must call this synchronously before
  // closing — otherwise the cleanup history.back()s over the in-flight
  // navigation. Optional so the full-results page's direct row usage (no
  // guard there) stays untouched.
  notifyNavigating?: () => void;
  className?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const basePath = useReaderBasePath();
  // Synchronous with setIsOpen(false) — no setTimeout/rAF defer (same rule
  // as SurahListItem's notifyNavigating call).
  const closeForNavigation = () => {
    notifyNavigating?.();
    setIsOpen(false);
  };

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
              onNavigate={() => closeForNavigation()}
            />
          ))}
        </div>
      )}

      {verses && verses.length > 0 && (
        <div>
          <div className="fq-section-heading !rounded-none px-4 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {toLocaleNumeral(verses.length, locale)}{" "}
              {/* Overlay caps verses at 10 (take: 10) — always the plural form.
                  The full count lives on the dedicated results page. */}
              {t("verses", "Verses")}
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
              onNavigate={() => closeForNavigation()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

