"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BookOpen, FileText, Search, SearchX, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { SurahResult } from "@types";
import { useReaderBasePath } from "@hooks/use-reader-base-path";
import { useReaderNavigation } from "@contexts/ReaderNavigationContext";
import { useVersePages } from "@hooks/use-verse-pages";
import { useJuzStarts } from "@hooks/use-juz-starts";
import {
  jumpRows,
  NAV_SEARCH,
  pageOfVerseKey,
  parseNavQuery,
  rangeHint,
  surahMatchesQuery,
} from "@utils/nav-search";
import { toLocaleNumeral } from "@utils/i18n";
import { SurahList } from "@components/SurahList";
import { cn } from "@/lib/utils";

type Props = {
  surahs: SurahResult[];
  query: string;
  onQueryChange: (value: string) => void;
};

// Navigation search for the home page: filters the surah grid by name/number
// and offers Juz/Page jump rows. Verse-text search stays in the global nav
// SearchBar — this surface never queries an API.
export const HomeSearch = ({ surahs, query, onQueryChange }: Props) => {
  const t = useTranslations("home");
  const locale = useLocale();
  const router = useRouter();
  const basePath = useReaderBasePath();
  const { jumpTo } = useReaderNavigation();

  // Lazy: the ~73KB verse-pages map is only fetched once a juz intent
  // appears; page jumps need no data at all.
  const parsed = useMemo(() => parseNavQuery(query), [query]);
  const needsJuzData =
    parsed.number !== null &&
    parsed.number >= 1 &&
    parsed.number <= NAV_SEARCH.juzCount &&
    (parsed.prefix === "juz" || parsed.prefix === null);
  const { data: juzStarts } = useJuzStarts(needsJuzData);
  const { data: versePages } = useVersePages(needsJuzData);

  const rows = useMemo(() => jumpRows(parsed), [parsed]);
  const filtered = useMemo(
    () => (parsed.text ? surahs.filter((s) => surahMatchesQuery(s, parsed)) : surahs),
    [surahs, parsed],
  );
  const hint = rangeHint(parsed);
  const isFiltering = parsed.text.length > 0;

  // null = not resolvable yet (juz data still loading) — rows render without
  // a page and Enter skips them rather than navigating to a wrong target.
  const rowPage = (kind: "juz" | "page", n: number): number | null => {
    if (kind === "page") return n;
    const start = juzStarts?.find((j) => j.juz === n);
    if (!start) return null;
    return pageOfVerseKey(versePages, start.verse_key, start.defaultPage);
  };

  const navigateToPage = (page: number) => router.push(`${basePath}/${page}`);

  // Enter activates the most specific target: first jump row, else first card.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onQueryChange("");
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    const firstRow = rows[0];
    if (firstRow) {
      const page = rowPage(firstRow.kind, firstRow.n);
      if (page !== null) navigateToPage(page);
      return;
    }
    const firstCard = filtered[0];
    if (firstCard) navigateToPage(Number(firstCard.pages.split("-")[0]));
  };

  const showGrid = !isFiltering || filtered.length > 0 || rows.length === 0;

  return (
    <section aria-label={t("searchLabel")} className="relative">
      {/* Static control bar — scrolls with the page (sticky rejected in live
          review: cards showed through around the bar's edges). */}
      <div className="py-1">
        <div className="relative flex items-center">
          <Search
            className="size-4 text-muted-foreground absolute start-3 pointer-events-none"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            dir="auto"
            className="fq-focus-ring w-full h-10 rounded-xl border border-border bg-card ps-9 pe-10 text-sm text-foreground placeholder:text-muted-foreground font-tajawal transition-colors duration-150 hover:border-primary/40 focus:border-primary/60 outline-none"
          />
          {isFiltering && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label={t("searchClear")}
              className="absolute end-2 size-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--well)/var(--well-alpha))] transition-colors duration-150 fq-focus-ring"
            >
              <X className="size-4" strokeWidth={1.8} />
            </button>
          )}
        </div>

        {/* Live result count */}
        {isFiltering && filtered.length > 0 && (
          <p className="mt-1.5 text-xs text-muted-foreground" role="status">
            {t("resultsCount", { count: toLocaleNumeral(filtered.length, locale) })}
          </p>
        )}

        {/* Out-of-range hint ("page 999" → Pages 1–604) */}
        {hint && (
          <p className="mt-1.5 text-xs text-muted-foreground" role="status">
            {hint === "juz"
              ? t("juzRangeHint", {
                  min: toLocaleNumeral(1, locale),
                  max: toLocaleNumeral(NAV_SEARCH.juzCount, locale),
                })
              : t("pageRangeHint", {
                  min: toLocaleNumeral(1, locale),
                  max: toLocaleNumeral(NAV_SEARCH.lastPage, locale),
                })}
          </p>
        )}

        {/* Jump rows — suggestions only, never auto-committed */}
        {rows.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1.5">
            {rows.map((row) => {
              const isJuz = row.kind === "juz";
              const Icon = isJuz ? BookOpen : FileText;
              const page = rowPage(row.kind, row.n);
              return (
                <li key={row.kind}>
                  <Link
                    href={`${basePath}/${page ?? 1}`}
                    locale={locale}
                    aria-disabled={page === null}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                      // Juz data still loading — inert rather than wrong.
                      if (page === null) {
                        e.preventDefault();
                        return;
                      }
                      if (!jumpTo) return;
                      e.preventDefault();
                      jumpTo(page);
                    }}
                    className="fq-focus-ring flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors duration-150 text-sm text-foreground"
                  >
                    <Icon className="size-4 shrink-0 text-primary" strokeWidth={1.7} aria-hidden="true" />
                    {isJuz
                      ? page !== null
                        ? t("juzRow", {
                            n: toLocaleNumeral(row.n, locale),
                            page: toLocaleNumeral(page, locale),
                          })
                        : t("juzRowShort", { n: toLocaleNumeral(row.n, locale) })
                      : t("pageRow", { n: toLocaleNumeral(row.n, locale) })}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!showGrid ? null : filtered.length > 0 ? (
        <SurahList surahs={filtered} className="mt-4" />
      ) : (
        isFiltering && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="fq-well grid size-12 place-items-center rounded-2xl text-muted-foreground">
              <SearchX className="size-6" strokeWidth={1.6} />
            </span>
            <p className="text-sm font-medium text-foreground">{t("noMatches")}</p>
            <p className={cn("text-xs text-muted-foreground max-w-xs")}>{t("verseSearchHint")}</p>
          </div>
        )
      )}
    </section>
  );
};
