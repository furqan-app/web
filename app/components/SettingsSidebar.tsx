"use client";

import { LanguageToggle } from "@components/LanguageToggle";
import { DesktopQuranFontSizeControls } from "@components/DesktopQuranFontSizeControls";
import { ThemeToggle } from "@components/ThemeToggle";
import { getLanguageDirection } from "../utils/i18n";
import { useLocale } from "next-intl";
import { Settings } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { OfflineRecitationSection } from "@components/offline/OfflineRecitationSection";
import { MushafLayoutSection } from "@components/mushaf/MushafLayoutSection";
import { useIsTablet } from "@hooks/use-is-tablet";
import { QuranSafhaViewToggle } from "@components/QuranSafhaViewToggle";
import { EnablePushToggle } from "@components/notifications/EnablePushToggle";
import { SettingsSection } from "@components/settings/SettingsSection";
import { useIsMobile } from "@hooks/use-is-mobile";
import { useKeepScreenAwake } from "@contexts/KeepScreenAwakeContext";
import { usePushSubscription } from "@/app/hooks/use-push-subscription";
import { isStandaloneDisplayMode } from "@/app/utils/platform";
import { useEffect, useState } from "react";
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const SettingsSidebar = ({ open, onOpenChange }: Props = {}) => {
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = getLanguageDirection(locale) === "rtl";
  const isTablet = useIsTablet();
  const isMobile = useIsMobile();
  const { enabled: keepScreenAwake, setEnabled: setKeepScreenAwake } =
    useKeepScreenAwake();
  const { supported: pushSupported } = usePushSubscription();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplayMode());
  }, []);

  const controlled = onOpenChange !== undefined;
  useCloseOnBackGesture(open ?? false, () => onOpenChange?.(false));

  const hasDeviceSettings = (isMobile || isTablet) || pushSupported || isStandalone;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {!controlled && (
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("settings", "Settings")}
            className={isRTL ? "mr-4" : "ml-4"}
          >
            <Settings className="size-5" />
          </Button>
        </SheetTrigger>
      )}
      <SheetContent
        side={isRTL ? "left" : "right"}
        dir={getLanguageDirection(locale)}
        className="w-full sm:max-w-[408px] gap-0 p-0 flex flex-col"
      >
        <SheetHeader className="relative shrink-0 px-5 pb-3.5 pt-5 border-b border-border/70 text-start">
          <SheetTitle className="text-[15px] font-semibold leading-none text-foreground">
            {t("settings", "Settings")}
          </SheetTitle>
          <SheetDescription className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {t(
              "settingsDescription",
              "Adjust language, font size, appearance, and offline access.",
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Grouped sections with identity overlines and hairline rows — matching
            the Reader Lab's structure. Three cohesive categories: Reading,
            Appearance, and Device & Recitation. */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <SettingsSection
            title={t("settingsSectionReading", "Reading")}
          >
            <LanguageToggle />

            {!isTablet && (
              <div className="hidden lg:block">
                <DesktopQuranFontSizeControls />
              </div>
            )}

            {!isTablet && (
              <div className="hidden lg:block">
                <QuranSafhaViewToggle />
              </div>
            )}

            <MushafLayoutSection />
          </SettingsSection>

          <SettingsSection
            title={t("appearance", "Appearance")}
            className="p-0"
          >
            <ThemeToggle />
          </SettingsSection>

          {hasDeviceSettings && (
            <SettingsSection
              title={t("settingsSectionDevice", "Device & Recitation")}
            >
              {(isMobile || isTablet) && (
                <div className="fq-section-row">
                  <label
                    htmlFor="keep-screen-awake-switch"
                    className="cursor-pointer flex-1 min-w-0"
                  >
                    <span className="text-[13px] font-medium text-foreground leading-tight">
                      {t("keepScreenAwakeLabel", "Keep screen awake")}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
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
              )}

              <EnablePushToggle />
              <OfflineRecitationSection />
            </SettingsSection>
          )}

          {/* Closes the inventory with the terminal identity mark */}
          <div className="flex justify-center pt-2">
            <span className="fq-rule-mark !inline-block" aria-hidden="true" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
