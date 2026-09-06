import { Link } from "@/i18n/routing";
import { SurahResult, VerseResult } from "@types";
import { useLocale } from "next-intl";
import { toLocaleNumeral } from "@utils/i18n";

// Shared surah/verse result rows — one design, two surfaces. The overlay
// (SearchQueryResults) and the full-results page (SearchResultsPage) render
// these; only the resolved href and the navigate callback differ per caller.
// Callers resolve hrefs themselves: the overlay keeps its current
// default-edition surah links untouched, while the page resolves every page
// through the active edition's verse-pages map (ADR 0033).

type SurahRowProps = {
  chapter: SurahResult;
  href: string;
  onNavigate?: () => void;
};

export function SearchSurahRow({ chapter, href, onNavigate }: SurahRowProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="fq-focus-ring-inset block border-b border-border/70 px-4 py-2 transition-colors last:border-b-0 hover:bg-[hsl(var(--well)/var(--well-alpha))]"
    >
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">{chapter.name_simple}</span>
        <span className="font-surahnames text-xl">{chapter.name_arabic}</span>
      </div>
    </Link>
  );
}

type VerseRowProps = {
  verse: VerseResult;
  href: string;
  onNavigate?: () => void;
};

export function SearchVerseRow({ verse, href, onNavigate }: VerseRowProps) {
  const locale = useLocale();

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="fq-focus-ring-inset block border-b border-border/70 px-4 py-2 transition-colors last:border-b-0 hover:bg-[hsl(var(--well)/var(--well-alpha))]"
    >
      <div className="text-sm text-muted-foreground">
        {locale === "ar" ? verse.chapter.name_arabic : verse.chapter.name_simple}{" "}
        - {toLocaleNumeral(Number(verse.verse_key.split(":")[1]), locale)}
      </div>
      <div className="text-right font-uthmanic text-lg" dir="rtl">
        {verse.Word.length > 0
          ? verse.Word.map((w) => w.qpc_uthmani_hafs).join(" ")
          : (verse.display_uthmani ?? "")}
      </div>
    </Link>
  );
}
