"use client";

import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { PanelLeftOpen } from "lucide-react";
import { SearchBar } from "@components/search/SearchBar";
import { UserMenu } from "./UserMenu";
import { SharedMushafLink } from "./SharedMushafLink";
import { MarksLink } from "./MarksLink";
import { SettingsSidebar } from "../SettingsSidebar";
import { FurqanLogo } from "./FurqanLogo";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";
import { getLanguageDirection } from "@/app/utils/i18n";
import { cn } from "@/lib/utils";

export const Nav = () => {
  const pathname = usePathname();
  const locale = useLocale();
  const isRTL = getLanguageDirection(locale) === "rtl";
  const { setOpen } = useSidebar();
  const { isOverlayMode, overlayVisible } = useNavOverlay();

  const isOnPagesRoute = pathname?.includes("/pages/");

  return (
    <nav
      className={cn(
        // Translucent glass everywhere (Correction Round — desktop included, not
        // just the toggle-hide overlay; matches RecitationPlayerBar exactly so the
        // two bars read as one consistent floating-chrome style, both letting the
        // Mushaf show through underneath).
        "text-foreground px-4 shadow h-14 flex items-center bg-background/75 backdrop-blur-md border-b border-border/50",
        isOverlayMode && "fixed top-0 inset-x-0 z-50 transition-transform duration-300",
        isOverlayMode && !overlayVisible && "-translate-y-full",
      )}
      style={isOverlayMode ? { transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" } : undefined}
    >
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

      {/* End: shared-mushaf + marks links (always visible) + user menu (desktop only) + settings */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <SharedMushafLink />
        <MarksLink />
        <div className="hidden md:flex items-center">
          <UserMenu />
        </div>
        <SettingsSidebar />
      </div>
    </nav>
  );
};

