"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Maximize2, Minimize2, PanelLeftOpen } from "lucide-react";
import { SearchBar } from "@components/search/SearchBar";
import { UserMenu } from "./UserMenu";
import { SharedMushafLink } from "./SharedMushafLink";
import { MarksLink } from "./MarksLink";
import { PlansLink } from "./PlansLink";
import { NotificationBell } from "@components/notifications/NotificationBell";
import { SettingsSidebar } from "../SettingsSidebar";
import { FurqanLogo } from "./FurqanLogo";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";
import { useIsDesktopUp } from "@/app/hooks/use-is-desktop-up";
import { getLanguageDirection } from "@/app/utils/i18n";
import { cn } from "@/lib/utils";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const Nav = () => {
  const pathname = usePathname();
  const locale = useLocale();
  const isRTL = getLanguageDirection(locale) === "rtl";
  const { setOpen } = useSidebar();
  const { isOverlayMode, overlayVisible } = useNavOverlay();
  const isDesktopUp = useIsDesktopUp();

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

  const isOnPagesRoute = pathname?.includes("/pages/");

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
      <div className="h-14 flex items-center">
        {/* Start: sidebar trigger (mobile, pages route only) + logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <FurqanLogo />

          {isOnPagesRoute && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <PanelLeftOpen
                className={cn("size-5", isRTL && "rotate-180")}
                strokeWidth={1.7}
              />
            </Button>
          )}
        </div>

        {/* Center: SearchBar — desktop shows inline input, mobile shows icon */}
        <div className="flex-1 flex justify-center px-2 md:px-4">
          <SearchBar />
        </div>

        {/* End: shared-mushaf + marks + plans links (always visible) + user menu (desktop only) + settings */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <SharedMushafLink />
          <MarksLink />
          <PlansLink />
          <NotificationBell />
          <div className="hidden md:flex items-center">
            <UserMenu />
          </div>
          {isDesktopUp && fullscreenEnabled && (
            <Button
              variant="ghost"
              size="icon"
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
          <SettingsSidebar />
        </div>
      </div>
    </nav>
  );
};

