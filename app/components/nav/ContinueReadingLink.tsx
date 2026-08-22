"use client";

import { BookOpen } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import useTranslations from "@hooks/use-translations";
import { useLastReadPage } from "@/app/contexts/LastReadPageContext";
import { useReaderNavigation } from "@/app/contexts/ReaderNavigationContext";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Always-visible navbar entry back to the last-read mushaf page, on every
 * breakpoint and display mode (ADR 0042 Addendum, 2026-08-18) — standalone
 * mobile/tablet PWA is no longer special-cased, since home is a legitimate
 * mid-session screen there with no other way back to the reading position.
 * Reads LastReadPageContext (live state, kept in sync by LastReadPageSync)
 * rather than localStorage directly — Nav never remounts during in-app
 * navigation, so a one-shot localStorage read would go stale the moment the
 * reader saves a new page. Starts at page 1 (Al-Fatiha) for SSR/hydration
 * agreement, same as the context's own initial value. Icon + label on
 * desktop, icon-only on mobile, mirrors MarksLink/PlansLink.
 */
export const ContinueReadingLink = ({ className }: Props = {}) => {
  const t = useTranslations();
  const locale = useLocale();
  const { lastReadPage } = useLastReadPage();
  const { jumpTo } = useReaderNavigation();

  return (
    <Link
      href={`/pages/${lastReadPage}`}
      locale={locale}
      onClick={(e) => {
        // Same client-side handoff as SurahListItem — see there.
        if (!jumpTo || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        jumpTo(lastReadPage);
      }}
      // Bespoke (not NavPillLink's shared navPillClassName) so mobile can be
      // a true size-10 square icon button matching the other mobile-visible
      // nav triggers' footprint (search, overflow menu — both h-10 w-10).
      // Plain icon control, no fq-nav-tab background — only the surah
      // selector and user menu ("my account") keep a resting background.
      // flex-row-reverse (user request): visually swaps icon/label sides
      // without touching DOM order (icon is still the first child, so
      // screen readers hit it before "Continue Reading" either way).
      // Resuming where you left off is the one genuinely LIVE thing in the
      // chrome, and on home it is the page's single live element — so it takes
      // --primary. It does not collide with the settings gear, which is
      // --control-live, a neutral tone rather than the state accent.
      className={cn(
        "fq-focus-ring flex-none flex flex-row-reverse items-center justify-center rounded-lg size-10 md:w-auto md:h-auto md:justify-start md:gap-2 md:px-3 md:py-1.5 md:text-xs md:font-medium",
        className,
      )}
    >
      <BookOpen className="size-5 md:size-4 flex-none" strokeWidth={1.7} />
      <span className="hidden md:inline">
        {t("continueReading.navLink", "Continue Reading")}
      </span>
    </Link>
  );
};
