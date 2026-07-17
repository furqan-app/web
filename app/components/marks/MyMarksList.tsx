"use client";

import { useEffect, useRef, useState, MouseEvent } from "react";
import { useLocale } from "next-intl";
import { Bookmark, Check, ChevronDown, List, MessageSquare, Trash2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { useAllMarks } from "@hooks/use-all-marks";
import { deletePageMark } from "@/app/server/actions/deletePageMark";
import { MarkListItem } from "@/app/server/actions/getAllMarks";
import { MARK_CATEGORIES, COMMENT_PREVIEW_CHAR_LIMIT, markKey } from "@constants/marks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const commentPreview = (comment: string) =>
  comment.length > COMMENT_PREVIEW_CHAR_LIMIT
    ? `${comment.slice(0, COMMENT_PREVIEW_CHAR_LIMIT)}…`
    : comment;

// Solid chip class per category key, for the row icon (a mark's colour comes
// from its own category, independent of the active filter — matters in "All").
const chipByCategory: Record<string, string> = Object.fromEntries(
  MARK_CATEGORIES.map((c) => [c.key, c.chip])
);

// "All" + one filter per category. `chip: null` marks the All filter, which
// renders a list icon instead of a colour dot.
const FILTERS: Array<{
  key: string;
  labelKey: string;
  defaultLabel: string;
  chip: string | null;
}> = [
  { key: "all", labelKey: "marks.allLabel", defaultLabel: "All", chip: null },
  ...MARK_CATEGORIES.map((c) => ({
    key: c.key,
    labelKey: c.labelKey,
    defaultLabel: c.defaultLabel,
    chip: c.chip,
  })),
];

const FilterDot = ({ chip }: { chip: string | null }) =>
  chip ? (
    <span className={cn("size-3 rounded-full flex-none", chip)} />
  ) : (
    <List className="size-3.5 flex-none" strokeWidth={1.8} />
  );

type SurahGroup = {
  chapterNameSimple: string;
  chapterNameArabic: string;
  items: Array<MarkListItem>;
};

/**
 * `items` is already sorted (surah, verse, wordPos) by the API — pages arrive
 * in that order too, so surah runs stay contiguous across page boundaries.
 * This is a linear scan, not a re-sort.
 */
const groupBySurah = (items: Array<MarkListItem>): Array<SurahGroup> => {
  const groups: Array<SurahGroup> = [];

  for (const item of items) {
    const last = groups[groups.length - 1];
    if (!last || last.chapterNameSimple !== item.chapter_name_simple) {
      groups.push({
        chapterNameSimple: item.chapter_name_simple,
        chapterNameArabic: item.chapter_name_arabic,
        items: [item],
      });
    } else {
      last.items.push(item);
    }
  }

  return groups;
};

const MarkRowSkeleton = () => (
  <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 animate-pulse">
    <span className="size-6 rounded-md bg-muted flex-none" />
    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="h-4 w-40 rounded bg-muted" />
    </div>
  </div>
);

export const MyMarksList = () => {
  const t = useTranslations();
  const locale = useLocale();
  const [active, setActive] = useState("all");
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    reload,
  } = useAllMarks(active);
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set());
  const [failedKeys, setFailedKeys] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        fetchNextPage();
      }
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRemove = async (
    e: MouseEvent<HTMLButtonElement>,
    mark: MarkListItem
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const key = markKey(mark);
    setRemovingKeys((prev) => new Set(prev).add(key));
    setFailedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

    const ok = await deletePageMark({
      page_number: mark.page_number,
      marked_type: mark.marked_type,
      marked_id: mark.marked_id,
    });

    setRemovingKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

    if (ok) {
      reload();
    } else {
      setFailedKeys((prev) => new Set(prev).add(key));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <MarkRowSkeleton />
        <MarkRowSkeleton />
        <MarkRowSkeleton />
      </div>
    );
  }

  const activeItems = data?.pages.flatMap((page) => page.data) ?? [];

  // A page can come back with zero enriched items (its raw marks all failed
  // Quran lookup) while still carrying a nextCursor — don't treat that as
  // "no more marks" or the sentinel below would never get a chance to fetch
  // the pages after it.
  const exhausted = activeItems.length === 0 && !hasNextPage;

  // "all" tab empty means the user has zero marks at all — hide the tab
  // strip entirely, same as before pagination.
  if (active === "all" && exhausted) {
    return (
      <p className="text-center text-sm text-muted-foreground py-12">
        {t("marks.empty", "No marks yet.")}
      </p>
    );
  }

  const activeFilter = FILTERS.find((f) => f.key === active) ?? FILTERS[0];

  return (
    <>
      {/* Mobile: a compact dropdown so the 7 filters never overflow. */}
      <div className="md:hidden mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t("marks.filterLabel", "Filter marks")}
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <span className="flex items-center gap-2">
              <FilterDot chip={activeFilter.chip} />
              {t(activeFilter.labelKey, activeFilter.defaultLabel)}
            </span>
            <ChevronDown className="size-4 text-muted-foreground flex-none" strokeWidth={1.8} />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[--radix-dropdown-menu-trigger-width] max-h-72 overflow-y-auto"
          >
            {FILTERS.map((f) => (
              <DropdownMenuItem
                key={f.key}
                onSelect={() => setActive(f.key)}
                className="gap-2"
              >
                <FilterDot chip={f.chip} />
                <span className="text-sm">{t(f.labelKey, f.defaultLabel)}</span>
                {f.key === active ? (
                  <Check className="size-4 ms-auto text-primary flex-none" strokeWidth={2} />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: single-row pill chips; scrolls sideways if the labels
          exceed the column width so none are clipped. */}
      <div className="hidden md:flex flex-nowrap gap-2 mb-4 overflow-x-auto">
        {FILTERS.map((f) => {
          const isActive = f.key === active;
          return (
            <button
              key={f.key}
              onClick={() => setActive(f.key)}
              className={cn(
                "flex flex-none items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",
                isActive
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-muted text-muted-foreground border-transparent hover:bg-accent"
              )}
            >
              <FilterDot chip={f.chip} />
              {t(f.labelKey, f.defaultLabel)}
            </button>
          );
        })}
      </div>

      {exhausted ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          {t("marks.emptyCategory", "No marks in this category yet.")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {groupBySurah(activeItems).map((group) => (
            <div key={group.chapterNameSimple} className="flex flex-col gap-2">
              <div
                dir={locale === "ar" ? "rtl" : "ltr"}
                className="sticky top-0 z-10 px-4 py-2 bg-muted border-y border-border"
              >
                <span className="text-sm font-bold text-primary">
                  {locale === "ar" ? group.chapterNameArabic : group.chapterNameSimple}
                </span>
              </div>

              {group.items.map((mark) => {
                const key = markKey(mark);
                const isRemoving = removingKeys.has(key);
                const hasFailed = failedKeys.has(key);

                return (
                  <div
                    key={key}
                    className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <Link
                      href={`/pages/${mark.page_number}`}
                      locale={locale}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <span
                        className={cn(
                          "grid place-items-center size-6 rounded-md flex-none",
                          // Unknown key → neutral chip, not slate (slate is the
                          // real "Other" category). Not reachable today; keeps
                          // the reader's "unknown → no highlight" spirit (ADR 0024).
                          chipByCategory[mark.category] ?? "bg-muted-foreground/40"
                        )}
                      >
                        <Bookmark
                          className="size-3.5 text-white"
                          strokeWidth={2}
                          fill="currentColor"
                        />
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">
                          {locale === "ar"
                            ? mark.chapter_name_arabic
                            : mark.chapter_name_simple}{" "}
                          - {toLocaleNumeral(mark.verse_number, locale)}
                        </div>
                        <div
                          className="text-right font-uthmanic text-lg truncate"
                          dir="rtl"
                        >
                          {mark.snippet}
                        </div>
                        {mark.comment ? (
                          <div
                            dir="auto"
                            className="mt-1 flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5"
                          >
                            <MessageSquare className="size-3 text-primary fill-primary/20 flex-none" strokeWidth={1.8} />
                            <span className="text-sm text-foreground/80 truncate">
                              {commentPreview(mark.comment)}
                            </span>
                          </div>
                        ) : null}
                        {hasFailed && (
                          <div className="text-xs text-destructive mt-1">
                            {t("markModal.actionError", "Something went wrong. Try again.")}
                          </div>
                        )}
                      </div>

                      <span className="text-xs text-muted-foreground flex-none">
                        {t("page", "Page")} {toLocaleNumeral(mark.page_number, locale)}
                      </span>
                    </Link>

                    <button
                      onClick={(e) => handleRemove(e, mark)}
                      disabled={isRemoving}
                      aria-label={t("markModal.removeMark", "Remove Mark")}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-none disabled:opacity-50"
                    >
                      <Trash2 className="size-4" strokeWidth={1.8} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}

          {hasNextPage ? (
            <div ref={sentinelRef}>
              {isFetchingNextPage ? <MarkRowSkeleton /> : null}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
};
