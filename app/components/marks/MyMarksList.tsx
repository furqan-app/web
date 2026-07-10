"use client";

import { useState, MouseEvent } from "react";
import { useLocale } from "next-intl";
import { Bookmark, Trash2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { useAllMarks } from "@hooks/use-all-marks";
import { deletePageMark } from "@/app/server/actions/deletePageMark";
import { MarkListItem } from "@/app/server/actions/getAllMarks";
import { MARK_COLORS } from "@constants/marks";
import { cn } from "@/lib/utils";

const markKey = (mark: MarkListItem) => `${mark.marked_type}:${mark.marked_id}`;

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
  const { data: marks, isLoading, reload } = useAllMarks();
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set());
  const [failedKeys, setFailedKeys] = useState<Set<string>>(new Set());

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
      mark_type: "color",
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

  const buckets = MARK_COLORS.map((color) => ({
    ...color,
    items: (marks ?? []).filter((m) => m.color === color.key),
  }));

  const hasAnyMarks = buckets.some((bucket) => bucket.items.length > 0);

  if (!hasAnyMarks) {
    return (
      <p className="text-center text-sm text-muted-foreground py-12">
        {t("marks.empty", "No marks yet.")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {buckets
        .filter((bucket) => bucket.items.length > 0)
        .map((bucket) => (
          <section key={bucket.key} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className={cn("size-3 rounded-full", bucket.chip)} />
              {t(bucket.labelKey, bucket.defaultLabel)}
            </h2>

            <div className="flex flex-col gap-2">
              {bucket.items.map((mark) => {
                const key = markKey(mark);
                const isRemoving = removingKeys.has(key);
                const hasFailed = failedKeys.has(key);

                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <Link
                      href={`/pages/${mark.page_number}`}
                      locale={locale}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <span
                        className={cn(
                          "grid place-items-center size-6 rounded-md flex-none",
                          bucket.chip
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
          </section>
        ))}
    </div>
  );
};
