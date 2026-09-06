"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations as useNextIntlTranslations } from "next-intl";
import { Loader2, Search, SearchX } from "lucide-react";

import { Input } from "@/components/ui/input";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { highlight } from "@utils/highlight";
import { isSearchQueryValid } from "@/app/constants/search";
import { useSearchChapters } from "@hooks/use-search";
import { useSearchInfiniteVerses } from "@hooks/use-search-infinite";
import { useVersePages } from "@hooks/use-verse-pages";
import { useReaderBasePath } from "@hooks/use-reader-base-path";
import { SearchSurahRow, SearchVerseRow } from "./SearchResultRows";
import type { ReactNode } from "react";

// Same shape for idle, loading, empty and error so the page never
// restructures itself as the query changes — only its contents do
// (mirrors the overlay's SearchState in SearchBar.tsx).
const ResultsState = ({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
    <span className="fq-well grid size-12 place-items-center rounded-2xl text-[hsl(var(--control-inert))]">
      {icon}
    </span>
    <p className="text-sm font-medium text-foreground">{title}</p>
    {hint ? <p className="max-w-xs text-xs text-muted-foreground">{hint}</p> : null}
    {action}
  </div>
);

// Skeleton mirrors a verse row's two lines so the loading state does not
// restructure the list the moment a chunk lands.
const VerseRowSkeleton = () => (
  <div className="border-b border-border/70 px-4 py-2 animate-pulse" aria-hidden="true">
    <div className="h-3 w-28 rounded bg-muted" />
    <div className="mt-2 h-5 w-3/4 rounded bg-muted ms-auto" />
  </div>
);

export default function SearchResultsPage() {
  const t = useTranslations();
  // Placeholder-bearing count copy goes through next-intl directly with
  // values — the project wrapper calls t(key) with no values (i18n.md).
  const tSearch = useNextIntlTranslations("search");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const basePath = useReaderBasePath();
  const { data: versePages } = useVersePages();

  // Seeded client-side from ?q= so the server route stays static (no
  // searchParams read at SSR — that would force dynamic rendering).
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get("q") ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Keep ?q= shareable across refresh without growing browser history —
  // replaceState adds no entry, so back-button stepping through refinements
  // is explicitly not promised.
  useEffect(() => {
    const path = window.location.pathname;
    window.history.replaceState(
      null,
      "",
      debouncedQuery ? `${path}?q=${encodeURIComponent(debouncedQuery)}` : path,
    );
  }, [debouncedQuery]);

  const chapters = useSearchChapters(debouncedQuery);
  const verses = useSearchInfiniteVerses(debouncedQuery);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = verses;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const queryValid = isSearchQueryValid(debouncedQuery);
  const isLoading = chapters.isLoading || verses.isLoading;
  const isError = chapters.isError || verses.isError;
  const surahs = chapters.data?.results ?? [];
  const items = (verses.data?.pages ?? []).flatMap((page) => page.results);
  const total = verses.data?.pages[0]?.total ?? 0;

  const retry = () => {
    if (chapters.isError) chapters.refetch();
    if (verses.isError) verses.refetch();
  };

  return (
    <main className="container mx-auto px-4 py-8 md:py-10 max-w-2xl min-h-[calc(100dvh-3.5rem)]">
      <header className="text-center mb-6">
        <div className="flex items-center justify-center gap-4">
          <span className="fq-rule-mark" aria-hidden="true" />
          <h1 className="font-tajawal font-extrabold text-3xl md:text-4xl text-foreground">
            {t("search.pageTitle", "Search results")}
          </h1>
          <span className="fq-rule-mark fq-rule-mark--flip" aria-hidden="true" />
        </div>
      </header>

      <div className="relative mb-6">
        {isLoading && (
          <div className="absolute end-3 top-1/2 -translate-y-1/2 z-10">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder", "Search the Quran...")}
          aria-label={t("search.placeholder", "Search the Quran...")}
          className="font-tajawal pe-9 bg-muted border-0 focus-visible:ring-0"
        />
      </div>

      {!queryValid ? (
        <ResultsState
          icon={<Search className="size-6" strokeWidth={1.6} />}
          title={t("search.idleTitle", "Search the Quran")}
          hint={t("search.idleHint", "Type a surah name, a verse number, or a phrase.")}
        />
      ) : isError ? (
        <ResultsState
          icon={<SearchX className="size-6" strokeWidth={1.6} />}
          title={t("search.errorTitle", "Search failed")}
          hint={t("search.errorHint", "Check your connection and try again.")}
          action={
            <button
              onClick={retry}
              className="fq-chrome-btn fq-focus-ring rounded-lg px-4 py-2 min-h-11 text-sm font-medium"
            >
              {t("search.retry", "Retry")}
            </button>
          }
        />
      ) : isLoading ? (
        <div aria-hidden="true">
          <VerseRowSkeleton />
          <VerseRowSkeleton />
          <VerseRowSkeleton />
          <VerseRowSkeleton />
          <VerseRowSkeleton />
        </div>
      ) : surahs.length === 0 && items.length === 0 ? (
        <ResultsState
          icon={<SearchX className="size-6" strokeWidth={1.6} />}
          title={t("search.noResults", "Nothing found")}
          hint={t("search.noResultsHint", "Try a different spelling, or search by surah number.")}
        />
      ) : (
        <>
          {surahs.length > 0 && (
            <section aria-label={t("surahs", "Surahs")} className="mb-6">
              <div className="fq-section-heading !rounded-none px-4 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {t("surahs", "Surahs")} ({toLocaleNumeral(surahs.length, locale)})
                </span>
              </div>
              {surahs.map((chapter) => (
                <SearchSurahRow
                  key={chapter.id}
                  chapter={chapter}
                  // Edition-resolved first page (ADR 0033) — never the raw
                  // default-edition chapter.pages range.
                  href={`${basePath}/${versePages?.[`${chapter.id}:1`] ?? chapter.pages.split("-")[0]}`}
                />
              ))}
            </section>
          )}

          {items.length > 0 && (
            <section aria-label={t("verses", "Verses")}>
              <div className="fq-section-heading !rounded-none px-4 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {tSearch("resultsCount", {
                    count: toLocaleNumeral(total, locale),
                  })}
                </span>
              </div>
              {items.map((verse) => (
                <SearchVerseRow
                  key={verse.verse_key}
                  verse={verse}
                  href={highlight.addToUrl({
                    verseKey: verse.verse_key,
                    pageNumber: verse.page_number,
                    basePath,
                  })}
                />
              ))}
              {hasNextPage ? (
                <div ref={sentinelRef}>
                  {isFetchingNextPage && (
                    <div aria-hidden="true">
                      <VerseRowSkeleton />
                      <VerseRowSkeleton />
                    </div>
                  )}
                </div>
              ) : (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                  {t("search.endOfResults", "No more results")}
                </p>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
