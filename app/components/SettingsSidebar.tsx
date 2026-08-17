"use client";

import { LanguageToggle } from "@components/LanguageToggle";
import { DesktopQuranFontSizeControls } from "@components/DesktopQuranFontSizeControls";
import { ThemeToggle } from "@components/ThemeToggle";
import { getLanguageDirection } from "../utils/i18n";
import { useLocale } from "next-intl";
import { Settings } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { MushafLayoutSection } from "@components/mushaf/MushafLayoutSection";
import { useIsTablet } from "@hooks/use-is-tablet";
import { QuranSafhaViewToggle } from "@components/QuranSafhaViewToggle";
import { EnablePushToggle } from "@components/notifications/EnablePushToggle";
import { useIsMobile } from "@hooks/use-is-mobile";
import { useKeepScreenAwake } from "@contexts/KeepScreenAwakeContext";
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
import { useCloseOnBackGesture } from "@/app/hooks/use-close-on-back-gesture";

type Props = {
  // Controlled mode — used by NavOverflowMenu, which renders its own trigger
  // row and toggles this Sheet from outside. Required for that case: this
  // component's Sheet must NOT be nested inside NavOverflowMenu's own
  // SheetContent, because closing that outer Sheet unmounts everything in
  // it — including a nested Sheet that was just told to open on the same
  // click, wiping its state before it can render. So when controlled, this
  // component renders ONLY <Sheet><SheetContent> (no trigger at all); the
  // caller owns open state and where/how the trigger appears.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const SettingsSidebar = ({ open, onOpenChange }: Props = {}) => {
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = getLanguageDirection(locale) === "rtl";
  // On tablet the safha auto-fits the font to the page, so the manual font-size
  // control does nothing — hide it there (still shown on desktop lg+).
  const isTablet = useIsTablet();
  const isMobile = useIsMobile();
  const { enabled: keepScreenAwake, setEnabled: setKeepScreenAwake } =
    useKeepScreenAwake();
  const controlled = onOpenChange !== undefined;
  useCloseOnBackGesture(open ?? false, () => onOpenChange?.(false));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {!controlled && (
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
      )}
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
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t("language", "Language")}
            </h3>
            <div className="p-4 rounded-lg bg-muted">
              <LanguageToggle />
            </div>
          </div>
          {!isTablet && (
            <div className="hidden lg:block">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {t("quranFontSize", "Quran Font Size")}
              </h3>
              <div className="p-4 rounded-lg bg-muted">
                <DesktopQuranFontSizeControls />
              </div>
            </div>
          )}
          {!isTablet && (
            <div className="hidden lg:block">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {t("pageView", "Page View")}
              </h3>
              <div className="p-4 rounded-lg bg-muted">
                <QuranSafhaViewToggle />
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t("appearance", "Appearance")}
            </h3>
            <div className="p-4 rounded-lg bg-muted">
              <ThemeToggle />
            </div>
          </div>
          <MushafLayoutSection />
          {(isMobile || isTablet) && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {t("keepScreenAwake", "Screen")}
              </h3>
              <div className="p-4 rounded-lg bg-muted flex items-center justify-between gap-3">
                <label
                  htmlFor="keep-screen-awake-switch"
                  className="cursor-pointer"
                >
                  <span className="text-sm font-medium">
                    {t("keepScreenAwakeLabel", "Keep screen awake")}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(
                      "keepScreenAwakeDescription",
                      "Prevent your device screen from sleeping while the app is open",
                    )}
                  </p>
                </label>
                <Switch
                  id="keep-screen-awake-switch"
                  checked={keepScreenAwake}
                  onCheckedChange={setKeepScreenAwake}
                />
              </div>
            </div>
          )}
          <EnablePushToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
};
