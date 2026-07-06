"use client";

import { LanguageToggle } from "@components/LanguageToggle";
import { QuranFontScaleControls } from "@components/QuranFontScaleControls";
import { ThemeToggle } from "@components/ThemeToggle";
import { AccountCard } from "@components/nav/AccountCard";
import { getLanguageDirection } from "../utils/i18n";
import { useLocale } from "next-intl";
import { Settings } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { usePwaPrecache } from "@hooks/use-pwa-precache";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const SettingsSidebar = () => {
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = getLanguageDirection(locale) === "rtl";
  const { isStandalone, cached, total } = usePwaPrecache();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={"hover:bg-accent " + (isRTL ? "mr-4" : "ml-4")}
        >
          <Settings className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isRTL ? "left" : "right"}
        dir={getLanguageDirection(locale)}
      >
        <SheetHeader>
          <SheetTitle>{t("settings", "Settings")}</SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-6 mt-2">
          {/* Account section: mobile only */}
          <div className="md:hidden">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t("account", "Account")}
            </h3>
            <AccountCard />
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t("language", "Language")}
            </h3>
            <div className="p-4 rounded-lg bg-muted">
              <LanguageToggle />
            </div>
          </div>
          <div className="hidden md:block">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t("quranFontSize", "Quran Font Size")}
            </h3>
            <div className="p-4 rounded-lg bg-muted">
              <QuranFontScaleControls />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t("appearance", "Appearance")}
            </h3>
            <div className="p-4 rounded-lg bg-muted">
              <ThemeToggle />
            </div>
          </div>
          {isStandalone ? (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {t("offlineAccess", "Offline Access")}
              </h3>
              <div className="p-4 rounded-lg bg-muted space-y-2">
                <div className="h-2 rounded-full bg-background overflow-hidden">
                  <div
                    className="h-full bg-primary transition-[width] duration-300"
                    style={{ width: `${(cached / total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("offlinePagesReady", "{cached} of {total} pages ready offline")
                    .replace("{cached}", String(cached))
                    .replace("{total}", String(total))}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};
