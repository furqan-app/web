"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Maximize2, Minimize2, PanelLeftOpen, ChevronDown, ChevronUp } from "lucide-react";
import { SearchBar } from "@components/search/SearchBar";
import { ContinueReadingLink } from "./ContinueReadingLink";
import { NavOverflowMenu } from "./NavOverflowMenu";
import { UserMenu } from "./UserMenu";
import { FurqanLogo } from "./FurqanLogo";
import { Button } from "@/components/ui/button";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { useIsDesktopUp } from "@/app/hooks/use-is-desktop-up";
import { getLanguageDirection, toLocaleNumeral } from "@/app/utils/i18n";
import { cn } from "@/lib/utils";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const Nav = () => {
  const { isOverlayMode, overlayVisible } = useNavOverlay();
  const isDesktopUp = useIsDesktopUp();
  const { open, setOpen, currentSurah } = useSidebar();
  const pathname = usePathname();
  const locale = useLocale();
  const isRTL = getLanguageDirection(locale) === "rtl";
  // Trailing slash required — a bare "/pages" substring match false-positives
  // on any route containing that string (e.g. a hypothetical /pages-list).
  const isOnPagesRoute = pathname?.includes("/pages/") ?? false;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenEnabled, setFullscreenEnabled] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setFullscreenEnabled(!!document.fullscreenEnabled);
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <nav
      className={cn(
        // Translucent glass everywhere (Correction Round — desktop included, not
        // just the toggle-hide overlay; matches RecitationPlayerBar exactly so the
        // two bars read as one consistent floating-chrome style, both letting the
        // Mushaf show through underneath).
        "relative z-10 text-foreground px-4 shadow bg-background/75 backdrop-blur-md border-b border-border/50",
        isOverlayMode && "fixed top-0 inset-x-0 z-50 transition-transform duration-300",
        isOverlayMode && !overlayVisible && "-translate-y-full",
      )}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        ...(isOverlayMode ? { transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" } : {}),
      }}
    >
      {/* Single flat flex row — every item is a direct child, positioned via
          `order` (+ `md:order-*` override), so the two breakpoints can group
          items differently without rendering any component twice:
          - Mobile (<md): logo alone on one side; sidebar toggle, continue
            reading, search, and the overflow menu grouped on the other side.
            One shared `gap-2` on the row gives every adjacent pair in that
            group the same spacing — no per-item margin needed.
          - Desktop/tablet (md+): logo · sidebar toggle · continue reading ·
            spacerA · search · spacerB · fullscreen · menu — spacerA/spacerB
            are equal `flex-1` items so the whitespace immediately flanking
            search stays equal regardless of how wide either cluster is
            (centering search on the spacers, not the full row, avoids a
            lopsided gap when the clusters differ in width).
          SharedMushafLink/NotificationBell/SettingsSidebar never render
          directly in this row — they live inside NavOverflowMenu's hamburger
          sheet at every breakpoint. UserMenu is the one exception: shown
          directly in the row at md+ (its own dropdown, not menuRow) for
          one-click access to My Marks/My Plans; still inside the menu on
          mobile, where space is tight (docs/plans/home-page-design-fixes.md,
          Addendum — Universal nav menu). */}
      <div className="h-14 flex items-center gap-2">
        <FurqanLogo className="order-1 shrink-0" />
        {isOnPagesRoute && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            className="order-3 md:order-2 h-9 shrink-0 gap-1.5 px-2.5 rounded-full max-w-[8rem]"
          >
            {currentSurah ? (
              <>
                <span className="text-xs font-medium text-muted-foreground shrink-0">
                  {toLocaleNumeral(currentSurah.id, locale)}
                </span>
                <span className="text-sm font-medium truncate leading-none">
                  {isRTL ? currentSurah.name_arabic : currentSurah.name_simple}
                </span>
                {open ? (
                  <ChevronUp className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} />
                ) : (
                  <ChevronDown className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} />
                )}
              </>
            ) : (
              <PanelLeftOpen className={cn("size-5", isRTL && "rotate-180")} strokeWidth={1.7} />
            )}
          </Button>
        )}
        <ContinueReadingLink className="order-4 md:order-3 shrink-0" />
        <div className="order-2 md:order-4 flex-1 min-w-0" aria-hidden="true" />
        <div className="order-5 min-w-0 shrink md:basis-[36rem] flex justify-center">
          <SearchBar />
        </div>
        <div className="hidden md:block md:order-6 md:flex-1 min-w-0" aria-hidden="true" />
        <div className="hidden md:block md:order-7 shrink-0">
          <UserMenu />
        </div>
        {isDesktopUp && fullscreenEnabled && (
          <Button
            variant="ghost"
            size="icon"
            className="md:order-8 shrink-0"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit focus mode" : "Enter focus mode"}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="size-5" strokeWidth={1.7} />
            ) : (
              <Maximize2 className="size-5" strokeWidth={1.7} />
            )}
          </Button>
        )}
        <NavOverflowMenu className="order-6 md:order-9 shrink-0" />
      </div>
    </nav>
  );
};
