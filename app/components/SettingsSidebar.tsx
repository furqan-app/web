import { useState } from "react";
import { LanguageToggle } from "@components/LanguageToggle";
import { QuranFontScaleControls } from "@components/QuranFontScaleControls";
import { ThemeToggle } from "@components/ThemeToggle";
import { getLanguageDirection } from "../utils/i18n";
import { useLocale } from "next-intl";
import { SettingsIcon } from "./icons/SettingsIcon";
import useTranslations from "@hooks/use-translations";

export const SettingsSidebar = () => {
  const locale = useLocale();
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const isRTL = getLanguageDirection(locale) === "rtl";

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button onClick={toggleSidebar} className={isRTL ? "mr-4" : "ml-4"}>
        <SettingsIcon />
      </button>
      <div
        dir={getLanguageDirection(locale)}
        className={`fixed top-0 ${isRTL ? 'left-0' : 'right-0'} w-64 h-full bg-white dark:bg-gray-900 shadow-lg transition-transform transform ${
          isOpen 
            ? "translate-x-0" 
            : isRTL 
              ? "-translate-x-full"
              : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold">{t("settings", "Settings")}</h2>
          <button 
            onClick={toggleSidebar}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("language", "Language")}
            </h3>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <LanguageToggle />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("quranFontSize", "Quran Font Size")}
            </h3>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <QuranFontScaleControls />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("appearance", "Appearance")}
            </h3>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};