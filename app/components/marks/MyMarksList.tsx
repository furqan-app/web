"use client";

import { useEffect, useRef, useState, MouseEvent } from "react";
import { useLocale } from "next-intl";
import type { LucideIcon } from "lucide-react";
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

// Map categories by key for instant lookup of icon, badgeBg, and badgeText
const categoryByKey = Object.fromEntries(
  MARK_CATEGORIES.map((c) => [c.key, c])
);

// "All" + one filter per category with distinct icon and badge styling.
const FILTERS: Array<{
  key: string;
  labelKey: string;
  defaultLabel: string;
  icon?: LucideIcon;
  badgeBg?: string;
  badgeText?: string;
}> = [
  { key: "all", labelKey: "marks.allLabel", defaultLabel: "All" },
  ...MARK_CATEGORIES.map((c) => ({
    key: c.key,
    labelKey: c.labelKey,
    defaultLabel: c.defaultLabel,
    icon: c.icon,
    badgeBg: c.badgeBg,
    badgeText: c.badgeText,
  })),
];

const FilterIcon = ({
  icon: Icon,
  badgeBg,
  badgeText,
}: {
  icon?: LucideIcon;
  badgeBg?: string;
  badgeText?: string;
}) =>
  Icon ? (
    <span
      className={cn(
        "size-5 rounded-md flex items-center justify-center flex-none",
        badgeBg,
        badgeText
      )}
    >
      <Icon className="size-3" strokeWidth={2} />
    </span>
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

// Skeleton mirrors the real row's shape inside one group surface, so the
// loading state does not restructure the page the moment data lands.
const MarkRowSkeleton = () => (
  <div className="fq-section-row animate-pulse">
    <span className="size-6 rounded-md bg-muted flex-none" />
    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="h-4 w-40 rounded bg-muted" />
    </div>
  </div>
);

// Empty states are designed here rather than left as a bare centred sentence —
// the language spec never covered them, and a list screen is where they are
// most often seen.
const MarksEmptyState = ({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) => (
  <div className="fq-section-group flex flex-col items-center gap-3 px-6 py-14 text-center">
    <span className="fq-well grid size-12 place-items-center rounded-2xl text-[hsl(var(--control-inert))]">
      <Bookmark className="size-6" strokeWidth={1.6} />
    </span>
    <p className="text-sm font-medium text-foreground">{title}</p>
    {hint ? <p className="max-w-xs text-xs text-muted-foreground">{hint}</p> : null}
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
      <div className="fq-section-group">
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
      <MarksEmptyState
        title={t("marks.empty", "No marks yet.")}
        hint={t(
          "marks.emptyHint",
          "Mark a word or a verse while reading and it will appear here.",
        )}
      />
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
            className="fq-focus-ring w-full flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground"
          >
            <span className="flex items-center gap-2">
              <FilterIcon
                icon={activeFilter.icon}
                badgeBg={activeFilter.badgeBg}
                badgeText={activeFilter.badgeText}
              />
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
                <FilterIcon
                  icon={f.icon}
                  badgeBg={f.badgeBg}
                  badgeText={f.badgeText}
                />
                <span className="text-sm">{t(f.labelKey, f.defaultLabel)}</span>
                {f.key === active ? (
                  <Check className="size-4 ms-auto text-primary flex-none" strokeWidth={2} />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: wrapping pill chips without horizontal scrolling */}
      <div className="hidden md:flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map((f) => {
          const isActive = f.key === active;
          return (
            <button
              key={f.key}
              onClick={() => setActive(f.key)}
              // Selected IS live state, so --primary is right here. The inert
              // ones sit at the well's recessed value rather than --muted, so
              // one filter reads as chosen and the rest read as one group.
              className={cn(
                "fq-focus-ring flex flex-none items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all duration-150 active:scale-[0.98]",
                isActive
                  ? "bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/20"
                  : "border-transparent bg-[hsl(var(--well)/var(--well-alpha))] text-[hsl(var(--control-inert))] hover:text-[hsl(var(--control-live))]"
              )}
            >
              <FilterIcon
                icon={f.icon}
                badgeBg={f.badgeBg}
                badgeText={f.badgeText}
              />
              {t(f.labelKey, f.defaultLabel)}
            </button>
          );
        })}
      </div>

      {exhausted ? (
        <MarksEmptyState
          title={t("marks.emptyCategory", "No marks in this category yet.")}
        />
      ) : (
        // One surface per surah with hairline-separated rows, not a stack of
        // identical floating cards — N cards is N competing objects, and it is
        // what made this inventory unscannable.
        <div className="flex flex-col gap-4">
          {groupBySurah(activeItems).map((group) => (
            <div key={group.chapterNameSimple} className="fq-section-group fq-section-group-open">
              <div
                dir={locale === "ar" ? "rtl" : "ltr"}
                className="fq-section-heading px-4 py-2"
              >
                {/* Which surah you are looking at is identity — where you are —
                    so it takes the warm accent, not --primary. */}
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {locale === "ar" ? group.chapterNameArabic : group.chapterNameSimple}
                </span>
              </div>

              {group.items.map((mark) => {
                const key = markKey(mark);
                const isRemoving = removingKeys.has(key);
                const hasFailed = failedKeys.has(key);
                const categoryInfo = categoryByKey[mark.category];
                const CategoryIcon = categoryInfo?.icon ?? Bookmark;

                return (
                  <div
                    key={key}
                    className="fq-section-row items-start transition-colors hover:bg-[hsl(var(--well)/var(--well-alpha))]"
                  >
                    <Link
                      href={`/pages/${mark.page_number}`}
                      locale={locale}
                      className="fq-focus-ring-inset flex items-center gap-3 flex-1 min-w-0 rounded-md"
                    >
                      <span
                        className={cn(
                          "grid place-items-center size-7 rounded-lg flex-none",
                          categoryInfo
                            ? cn(categoryInfo.badgeBg, categoryInfo.badgeText)
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <CategoryIcon className="size-3.5" strokeWidth={2} />
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
                          // A comment is content, not live state. It carried
                          // --primary on its border, fill and icon, which put
                          // the state accent on every row that happened to
                          // have a note. Hairline and a muted tone instead.
                          <div
                            dir="auto"
                            className="mt-1 flex items-center gap-1.5 rounded-md border border-border bg-[hsl(var(--well)/var(--well-alpha))] px-2.5 py-1.5"
                          >
                            <MessageSquare className="size-3 flex-none text-[hsl(var(--control-inert))]" strokeWidth={1.8} />
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
                      className="fq-chrome-btn fq-focus-ring size-8 hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="size-4" strokeWidth={1.8} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}

          {hasNextPage ? (
            <div ref={sentinelRef} className={isFetchingNextPage ? "fq-section-group" : undefined}>
              {isFetchingNextPage ? <MarkRowSkeleton /> : null}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
};
