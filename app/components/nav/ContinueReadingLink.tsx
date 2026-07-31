"use client";

import { BookOpen } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import useTranslations from "@hooks/use-translations";
import { useLastReadPage } from "@/app/contexts/LastReadPageContext";

/**
 * Always-visible navbar entry back to the last-read mushaf page. Reads
 * LastReadPageContext (live state, kept in sync by LastReadPageSync) rather
 * than localStorage directly — Nav never remounts during in-app navigation,
 * so a one-shot localStorage read would go stale the moment the reader saves
 * a new page. Starts at page 1 (Al-Fatiha) for SSR/hydration agreement, same
 * as the context's own initial value. Icon + label on desktop, icon-only on
 * mobile, mirrors MarksLink/PlansLink.
 */
export const ContinueReadingLink = () => {
  const t = useTranslations();
  const locale = useLocale();
  const { lastReadPage } = useLastReadPage();

  return (
    <Link
      href={`/pages/${lastReadPage}`}
      locale={locale}
      className="flex items-center gap-2 rounded-xl px-2 md:px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-accent/50 transition-colors"
    >
      <BookOpen className="size-5 md:size-4 flex-none" strokeWidth={1.7} />
      <span className="hidden md:inline">
        {t("continueReading.navLink", "Continue Reading")}
      </span>
    </Link>
  );
};
