"use client";

import { useEffect, useState, MouseEvent, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { signIn, useSession } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  AlertTriangle,
  Bookmark,
  Check,
  ChevronDown,
  List,
  LogIn,
  MessageSquare,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { useAllMarks } from "@hooks/use-all-marks";
import { useMarksSync } from "@/app/hooks/use-marks-sync";
import { clearDroppedMarks } from "@/app/lib/marks/sync";
import {
  tombstoneLocalMark,
  getOwnerSnapshot,
  getServerOwnerSnapshot,
  subscribe as subscribeStore,
  type LocalMark,
} from "@/app/lib/marks/store";
import {
  MARK_CATEGORIES,
  COMMENT_PREVIEW_CHAR_LIMIT,
  markKey,
} from "@constants/marks";
import { isStandaloneDisplayMode } from "@/app/utils/platform";
import { useOnlineStatus } from "@/app/hooks/use-online-status";
import { evaluateMarkModalGates } from "@/app/lib/marks/gates";
import { MarksSignedOutPrompt } from "./MarksSignedOutPrompt";
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
  items: Array<LocalMark>;
};

/**
 * Groups already sorted marks by surah. Natural reading order is preserved.
 * Fallbacks are provided if denormalized chapter names are missing.
 */
const groupBySurah = (items: Array<LocalMark>): Array<SurahGroup> => {
  const groups: Array<SurahGroup> = [];

  for (const item of items) {
    const last = groups[groups.length - 1];
    const itemChapter =
      item.chapter_name_simple ||
      item.chapter_name_arabic ||
      `Page ${item.page_number}`;

    if (!last || last.chapterNameSimple !== itemChapter) {
      groups.push({
        chapterNameSimple: item.chapter_name_simple || itemChapter,
        chapterNameArabic: item.chapter_name_arabic || itemChapter,
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

// Empty states are designed here rather than left as a bare centred sentence.
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

export const MyMarksList = ({
  initialSessionUser,
}: {
  initialSessionUser?: unknown;
} = {}) => {
  const t = useTranslations();
  const locale = useLocale();
  const [active, setActive] = useState("all");

  const { data: session, status } = useSession();
  const sessionUser =
    status === "loading"
      ? initialSessionUser
      : status === "authenticated"
        ? session?.user
        : undefined;

  const ownerStamp = useSyncExternalStore(
    subscribeStore,
    getOwnerSnapshot,
    getServerOwnerSnapshot
  );

  const [isStandalone, setIsStandalone] = useState(() =>
    typeof window !== "undefined" ? isStandaloneDisplayMode() : false
  );
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsStandalone(isStandaloneDisplayMode());
  }, []);

  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;

  const { canMark } = evaluateMarkModalGates({
    sessionUser,
    ownerStamp,
    isOffline,
    isStandalone,
  });

  const { marks, totalCount, hasMore, loadMore, isLoading } =
    useAllMarks(active);
  const { status: syncStatus, droppedMarks } = useMarksSync();

  // If not authenticated and not in standalone PWA, show the sign-in prompt
  if (isMounted && !canMark) {
    return <MarksSignedOutPrompt />;
  }

  const handleRemove = (e: MouseEvent<HTMLButtonElement>, mark: LocalMark) => {
    e.preventDefault();
    e.stopPropagation();

    // Local-first removal: write tombstone immediately and sync in background
    tombstoneLocalMark(mark.marked_type, mark.marked_id, {
      page_number: mark.page_number,
      category: mark.category,
      comment: mark.comment,
      snippet: mark.snippet,
      chapter_name_simple: mark.chapter_name_simple,
      chapter_name_arabic: mark.chapter_name_arabic,
      verse_number: mark.verse_number,
      from_user: mark.from_user,
      author_name: mark.author_name,
    });
    void import("@/app/lib/marks/sync").then(({ syncMarks }) => syncMarks());
  };

  const renderFailureAlerts = () => (
    <>
      {/* 401 Session expired warning banner (#547 / #551) */}
      {syncStatus === "session-expired" && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="size-4 flex-none text-warning" strokeWidth={1.9} />
            <p className="text-xs font-medium text-foreground">
              {t("marks.sessionExpired", "Session expired — sign in to sync your marks.")}
            </p>
          </div>
          <button
            onClick={() => signIn()}
            className="fq-focus-ring flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-transform duration-150 active:scale-95 flex-none"
          >
            <LogIn className="size-3.5" strokeWidth={1.8} />
            {t("signIn", "Sign in")}
          </button>
        </div>
      )}

      {/* 422 Permanently failed dropped marks warning banner (#547 / #551) */}
      {droppedMarks.length > 0 && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="size-4 flex-none text-destructive" strokeWidth={1.9} />
            <p className="text-xs font-medium text-foreground">
              {t(
                "marks.syncFailedPermanently",
                "Some marks couldn't be saved due to invalid data and were removed."
              )}
            </p>
          </div>
          <button
            onClick={() => clearDroppedMarks()}
            aria-label={t("close", "Close")}
            className="fq-focus-ring flex-none rounded-lg p-1 text-destructive hover:bg-destructive/15 transition-[background-color,transform] duration-150 active:scale-95"
          >
            <X className="size-4" strokeWidth={1.8} />
          </button>
        </div>
      )}
    </>
  );

  if (isLoading) {
    return (
      <div className="fq-section-group">
        <MarkRowSkeleton />
        <MarkRowSkeleton />
        <MarkRowSkeleton />
      </div>
    );
  }

  // "all" tab empty means the user has zero marks at all — hide the tab
  // strip entirely, same as before pagination.
  if (active === "all" && totalCount === 0) {
    return (
      <>
        {renderFailureAlerts()}
        <MarksEmptyState
          title={t("marks.empty", "No marks yet.")}
          hint={t(
            "marks.emptyHint",
            "Mark a word or a verse while reading and it will appear here."
          )}
        />
      </>
    );
  }

  const activeFilter = FILTERS.find((f) => f.key === active) ?? FILTERS[0];

  return (
    <>
      {renderFailureAlerts()}

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

      {marks.length === 0 ? (
        <MarksEmptyState
          title={t("marks.emptyCategory", "No marks in this category yet.")}
        />
      ) : (
        // One surface per surah with hairline-separated rows, not a stack of
        // identical floating cards
        <div className="flex flex-col gap-4">
          {groupBySurah(marks).map((group) => (
            <div key={group.chapterNameSimple} className="fq-section-group fq-section-group-open">
              <div
                dir={locale === "ar" ? "rtl" : "ltr"}
                className="fq-section-heading px-4 py-2"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {locale === "ar"
                    ? group.chapterNameArabic || group.chapterNameSimple
                    : group.chapterNameSimple || group.chapterNameArabic}
                </span>
              </div>

              {group.items.map((mark) => {
                const key = markKey(mark);
                const categoryInfo = categoryByKey[mark.category];
                const CategoryIcon = categoryInfo?.icon ?? Bookmark;

                const chapterName =
                  locale === "ar"
                    ? mark.chapter_name_arabic || mark.chapter_name_simple
                    : mark.chapter_name_simple || mark.chapter_name_arabic;

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
                        {chapterName && mark.verse_number ? (
                          <div className="text-xs text-muted-foreground">
                            {chapterName} - {toLocaleNumeral(mark.verse_number, locale)}
                          </div>
                        ) : null}
                        {mark.snippet ? (
                          <div
                            className="text-right font-uthmanic text-lg truncate"
                            dir="rtl"
                          >
                            {mark.snippet}
                          </div>
                        ) : null}
                        {mark.comment ? (
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
                      </div>

                      <span className="text-xs text-muted-foreground flex-none">
                        {t("page", "Page")} {toLocaleNumeral(mark.page_number, locale)}
                      </span>
                    </Link>

                    <button
                      onClick={(e) => handleRemove(e, mark)}
                      aria-label={t("markModal.removeMark", "Remove Mark")}
                      className="fq-chrome-btn fq-focus-ring size-8 hover:text-destructive"
                    >
                      <Trash2 className="size-4" strokeWidth={1.8} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center py-2">
              <button
                onClick={loadMore}
                className="fq-focus-ring text-xs text-muted-foreground hover:text-foreground py-2 px-4 rounded-lg bg-[hsl(var(--well)/var(--well-alpha))] transition-colors"
              >
                {t("marks.loadMore", "Load more")}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
