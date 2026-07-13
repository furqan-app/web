"use client";

import { LanguageToggle } from "@components/LanguageToggle";
import { QuranFontScaleControls } from "@components/QuranFontScaleControls";
import { ThemeToggle } from "@components/ThemeToggle";
import { AccountCard } from "@components/nav/AccountCard";
import { getLanguageDirection, toLocaleNumeral } from "../utils/i18n";
import { useLocale } from "next-intl";
import { Settings } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { usePwaPrecache } from "@hooks/use-pwa-precache";
import { useQuranTajweed } from "@contexts/QuranTajweedContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

export const SettingsSidebar = () => {
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = getLanguageDirection(locale) === "rtl";
  const { isStandalone, cached, total } = usePwaPrecache();
  const { tajweedMode, setTajweedMode } = useQuranTajweed();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("settings", "Settings")}
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
          <SheetDescription className="sr-only">
            {t(
              "settingsDescription",
              "Adjust language, font size, appearance, and offline access.",
            )}
          </SheetDescription>
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
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t("tajweedMode", "Tajweed Colors")}
            </h3>
            <div className="p-4 rounded-lg bg-muted flex items-center justify-between gap-3">
              <label htmlFor="tajweed-mode-switch" className="cursor-pointer">
                <span className="text-sm font-medium">
                  {t("tajweedModeLabel", "Color-code Tajweed rules")}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(
                    "tajweedModeDescription",
                    "Highlight recitation rules like idgham, ikhfa, qalqalah, and madd with color",
                  )}
                </p>
              </label>
              <Switch
                id="tajweed-mode-switch"
                checked={tajweedMode}
                onCheckedChange={setTajweedMode}
              />
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
                    .replace("{cached}", toLocaleNumeral(cached, locale))
                    .replace("{total}", toLocaleNumeral(total, locale))}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};
