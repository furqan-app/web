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
        <span className="hidden md:block h-4 w-px bg-border shrink-0 order-2 mx-1" aria-hidden="true" />
        {isOnPagesRoute && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            className="fq-nav-tab fq-focus-ring order-2 shrink-0 flex items-center justify-center gap-1.5 h-9 px-2.5 max-w-[8rem] md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:z-10 md:h-auto md:max-w-none md:gap-3 md:px-3 md:py-1 md:bg-transparent md:border-transparent md:shadow-none hover:opacity-85 cursor-pointer transition-opacity"
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
                {/* Desktop: drawn green ornaments flanking the surah name & metadata */}
                <span className="hidden md:flex md:items-center md:gap-3">
                  <span className="fq-nav-ornament" aria-hidden="true" />
                  <span className="flex flex-col items-center gap-1">
                    <span className="flex items-center gap-1.5">
                      {isRTL ? (
                        <span
                          className="font-surahnames text-[26px] leading-none whitespace-nowrap text-foreground"
                          translate="no"
                        >
                          {String(currentSurah.id).padStart(3, "0")}
                        </span>
                      ) : (
                        <span className="text-[17px] font-semibold leading-none whitespace-nowrap text-foreground">
                          {currentSurah.name_simple}
                        </span>
                      )}
                      {open ? (
                        <ChevronUp className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                      ) : (
                        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                      )}
                    </span>
                    {currentJuzHizb && (
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground tracking-[0.06em] whitespace-nowrap">
                        {t("juz", "Juz")} {toLocaleNumeral(currentJuzHizb.juz, locale)}
                        {/* Identity, not state: juz/hizb is the page's own
                            metadata — where you are — so the separator takes
                            the warm accent. */}
                        <span className="text-primary" aria-hidden="true">•</span>
                        {t("hizb", "Hizb")} {toLocaleNumeral(currentJuzHizb.hizb, locale)}
                      </span>
                    )}
                  </span>
                  <span className="fq-nav-ornament fq-nav-ornament--flip" aria-hidden="true" />
                </span>
              </>
            ) : (
              <PanelLeftOpen className={cn("size-4", isRTL && "rotate-180")} strokeWidth={1.8} />
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
              className="fq-chrome-btn fq-focus-ring hidden md:flex size-7"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit focus mode" : "Enter focus mode"}
              aria-pressed={isFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="size-4" strokeWidth={1.8} />
              ) : (
                <Maximize2 className="size-4" strokeWidth={1.8} />
              )}
            </button>
          )}
          <NotificationBell className="hidden md:flex" />
        </div>

        <span className="hidden md:block h-4 w-px bg-border shrink-0 order-7 mx-1" aria-hidden="true" />

        {/* The one live control on this surface, outside the well and warmer at
            rest, so which icon actually opens something is legible without
            hovering it. */}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label={t("settings", "Settings")}
          className="fq-chrome-btn-live fq-focus-ring hidden md:flex size-7 order-8 shrink-0"
        >
          <Settings className="size-[18px]" strokeWidth={1.8} />
        </button>

        <span className="hidden md:block h-4 w-px bg-border shrink-0 order-9 mx-1" aria-hidden="true" />

        <div className="order-10 shrink-0">
          <UserMenu onOpenSettings={() => setSettingsOpen(true)} />
        </div>
      </div>
      <SettingsSidebar open={settingsOpen} onOpenChange={setSettingsOpen} />
    </nav>
  );
};
