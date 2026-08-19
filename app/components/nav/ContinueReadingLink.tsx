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
      // nav triggers' footprint (search, overflow menu — both h-10 w-10);
      // md+ replicates navPillClassName's padded-pill look, but `md:-ms-3`
      // cancels the `md:px-3` start-side layout footprint (padding still
      // paints the hover background around the icon; the negative start
      // margin just stops that inset from also pushing the sidebar-toggle
      // pill further away) — otherwise this link's own invisible inset added
      // 12px on top of the row's `gap-2`, making the visible gap to the
      // toggle (20px) read wider than the gap between the logo and the
      // toggle (8px, neither has padding facing the other). The end side
      // (facing the search spacer) keeps its normal padding — nothing to
      // cancel there. See docs/plans/home-page-design-fixes.md, Addendum —
      // Universal nav menu.
      className={cn(
        "flex-none flex items-center justify-center size-10 rounded-md hover:bg-accent/50 transition-colors md:w-auto md:h-auto md:justify-start md:gap-2 md:rounded-xl md:px-3 md:py-1.5 md:-ms-3 md:text-sm md:font-semibold md:text-muted-foreground",
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
