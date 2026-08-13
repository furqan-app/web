"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { useLocale } from "next-intl";
import { NavPillLink } from "./NavPillLink";
import useTranslations from "@hooks/use-translations";
import { useLastReadPage } from "@/app/contexts/LastReadPageContext";
import { useReaderNavigation } from "@/app/contexts/ReaderNavigationContext";
import { isStandaloneDisplayMode } from "@/app/utils/platform";
import { useIsDesktopUp } from "@/app/hooks/use-is-desktop-up";

/**
 * Always-visible navbar entry back to the last-read mushaf page — except on
 * standalone/fullscreen mobile/tablet PWA, where AppLaunchRedirect already
 * puts the user on that page every cold launch, making this link redundant.
 * Desktop and browser tabs (no auto-redirect there) always keep it. Reads
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
  const { jumpTo } = useReaderNavigation();
  const isDesktopUp = useIsDesktopUp();
  // Display mode doesn't change mid-session, so a one-time read on mount
  // (matching usePwaPrecache's isStandalone) is sufficient — no live
  // subscription needed here.
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplayMode());
  }, []);

  if (isStandalone && !isDesktopUp) return null;

  return (
    <NavPillLink
      href={`/pages/${lastReadPage}`}
      locale={locale}
      onClick={(e) => {
        // Same client-side handoff as SurahListItem — see there.
        if (!jumpTo || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        jumpTo(lastReadPage);
      }}
    >
      <BookOpen className="size-5 md:size-4 flex-none" strokeWidth={1.7} />
      <span className="hidden md:inline">
        {t("continueReading.navLink", "Continue Reading")}
      </span>
    </NavPillLink>
  );
};
