"use client";

import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { PanelLeftOpen } from "lucide-react";
import { SearchBar } from "@components/search/SearchBar";
import { UserMenu } from "./UserMenu";
import { SharedMushafLink } from "./SharedMushafLink";
import { SettingsSidebar } from "../SettingsSidebar";
import { FurqanLogo } from "./FurqanLogo";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { getLanguageDirection } from "@/app/utils/i18n";
import { cn } from "@/lib/utils";

export const Nav = () => {
  const pathname = usePathname();
  const locale = useLocale();
  const isRTL = getLanguageDirection(locale) === "rtl";
  const { setOpen } = useSidebar();

  const isOnPagesRoute = pathname?.includes("/pages/");

  return (
    <nav className="bg-background text-foreground px-4 shadow h-14 flex items-center">
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

      {/* End: shared-mushaf link (always visible) + user menu (desktop only) + settings */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <SharedMushafLink />
        <div className="hidden md:flex items-center">
          <UserMenu />
        </div>
        <SettingsSidebar />
      </div>
    </nav>
  );
};

