"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Maximize2, Minimize2, PanelLeftOpen, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { SearchBar } from "@components/search/SearchBar";
import { ContinueReadingLink } from "./ContinueReadingLink";

import { UserMenu } from "./UserMenu";
import { NotificationBell } from "@components/notifications/NotificationBell";
import { SettingsSidebar } from "../SettingsSidebar";
import { FurqanLogo } from "./FurqanLogo";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { useIsDesktopUp } from "@/app/hooks/use-is-desktop-up";
import { useIsomorphicLayoutEffect } from "@/app/hooks/use-isomorphic-layout-effect";
import { getLanguageDirection, toLocaleNumeral } from "@/app/utils/i18n";
import useTranslations from "@hooks/use-translations";
import { cn } from "@/lib/utils";

export const Nav = () => {
  const t = useTranslations();
  const { overlayVisible } = useNavOverlay();
  const isDesktopUp = useIsDesktopUp();
  const { open, setOpen, currentSurah, currentJuzHizb } = useSidebar();
  const pathname = usePathname();
  const locale = useLocale();
  const isRTL = getLanguageDirection(locale) === "rtl";
  // Trailing slash required — a bare "/pages" substring match false-positives
  // on any route containing that string (e.g. a hypothetical /pages-list).
  const isOnPagesRoute = pathname?.includes("/pages/") ?? false;
  const isReaderLabRoute = pathname?.includes("/reader-lab/") ?? false;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenEnabled, setFullscreenEnabled] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  // The lab mounts its own chrome. Placed after every hook — React forbids a
  // conditional return above them.
  if (isReaderLabRoute) return null;

  return (
    <nav
      className={cn(
        // fq-chrome-bar: opaque face, rim and cast from one rule in every
        // theme. Replaces `bg-background/75 backdrop-blur-md` plus a hardcoded
        // rgba shadow — glass over a (7,15,23) desk is a hole, not a bar.
        "fq-chrome-bar relative z-10 text-foreground px-4",
        isOnPagesRoute && "fq-nav-overlay-page",
        isOnPagesRoute && overlayVisible && "fq-nav-visible",
      )}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="relative h-14 flex items-center gap-2">
        <FurqanLogo className="order-1 shrink-0" />
        {isOnPagesRoute && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            className="fq-nav-tab fq-surah-toggle fq-focus-ring order-2 shrink-0 flex items-center justify-center gap-1.5 h-9 px-2.5 max-w-[8rem] md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:z-10 md:h-auto md:max-w-none md:gap-2 md:px-10 md:py-[0.3rem] cursor-pointer transition-colors"
          >
            {currentSurah ? (
              <>
                {/* Mobile: compact single line */}
                <span className="md:hidden flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">
                    {toLocaleNumeral(currentSurah.id, locale)}
                  </span>
                  <span className="text-xs font-medium truncate leading-none">
                    {isRTL ? currentSurah.name_arabic : currentSurah.name_simple}
                  </span>
                  {open ? (
                    <ChevronUp className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} />
                  ) : (
                    <ChevronDown className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} />
                  )}
                </span>
                {/* Desktop: text block (ornament-flanked name over Juz/Hizb)
                    beside the chevron */}
                <span className="hidden md:flex md:items-center md:gap-2">
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs leading-none whitespace-nowrap">
                        {isRTL ? currentSurah.name_arabic : currentSurah.name_simple}
                      </span>
                    </span>
                    {currentJuzHizb && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                        {t("juz", "Juz")} {toLocaleNumeral(currentJuzHizb.juz, locale)}
                        {/* Identity, not state: juz/hizb is the page's own
                            metadata — where you are — so the separator takes
                            the warm accent. It was --primary, which is
                            reserved for something being live. */}
                        <span className="text-gold" aria-hidden="true">•</span>
                        {t("hizb", "Hizb")} {toLocaleNumeral(currentJuzHizb.hizb, locale)}
                      </span>
                    )}
                  </span>
                  {open ? (
                    <ChevronUp className="size-2.5 shrink-0" strokeWidth={2} />
                  ) : (
                    <ChevronDown className="size-2.5 shrink-0" strokeWidth={2} />
                  )}
                </span>
              </>
            ) : (
              <PanelLeftOpen className={cn("size-5", isRTL && "rotate-180")} strokeWidth={1.7} />
            )}
          </button>
        )}
        <ContinueReadingLink className={cn("order-3 shrink-0", isOnPagesRoute && "hidden md:flex")} />
        <div className="order-5 flex-1 min-w-0" aria-hidden="true" />

        {/* The secondary cluster. Grouped in one recessed well so it reads as a
            single dimmed group rather than three things that each look like
            the main action — the lab's navbar is the reference. Below md the
            well drops its border and fill (fq-chrome-well): its other members
            have already relocated into the account menu, and a lone icon in a
            pill outline is noise. */}
        <div className="fq-well fq-chrome-well order-6 shrink-0">
          <SearchBar />
          {isDesktopUp && fullscreenEnabled && (
            <button
              type="button"
              className="fq-chrome-btn fq-focus-ring hidden md:flex size-9"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit focus mode" : "Enter focus mode"}
              aria-pressed={isFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="size-5" strokeWidth={1.7} />
              ) : (
                <Maximize2 className="size-5" strokeWidth={1.7} />
              )}
            </button>
          )}
          <NotificationBell className="hidden md:flex" />
        </div>

        {/* The one live control on this surface, outside the well and warmer at
            rest, so which icon actually opens something is legible without
            hovering it. */}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label={t("settings", "Settings")}
          className="fq-chrome-btn-live fq-focus-ring hidden md:flex size-9 order-8 shrink-0 ms-1"
        >
          <Settings className="size-5" strokeWidth={1.7} />
        </button>

        <div className="order-10 shrink-0 ms-1">
          <UserMenu onOpenSettings={() => setSettingsOpen(true)} />
        </div>
      </div>
      <SettingsSidebar open={settingsOpen} onOpenChange={setSettingsOpen} />
    </nav>
  );
};
