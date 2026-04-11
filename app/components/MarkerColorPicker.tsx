import { Bookmark } from "lucide-react";
import React from "react";
import useTranslations from "../hooks/use-translations";
import { getLanguageDirection } from "../utils/i18n";
import { useLocale } from "next-intl";

type Props = {
  onMark: (color: string) => void;
};

export const MarkerColorPicker = ({ onMark }: Props) => {
  const t = useTranslations();
  const locale = useLocale();

  const handlePickColor = (color: string) => {
    onMark(color);
  };
  return (
    <div className="flex flex-col gap-4" dir={getLanguageDirection(locale)}>
      <button
        onClick={() => handlePickColor("red")}
        className="flex gap-2 text-foreground"
      >
        <Bookmark className="text-red-600 w-6 h-6" fill="currentColor" />
        {t("markModal.redMark", "Red Mark")}
      </button>
      <button
        onClick={() => handlePickColor("blue")}
        className="flex gap-2 text-foreground"
      >
        <Bookmark className="text-blue-600 w-6 h-6" fill="currentColor" />
        {t("markModal.blueMark", "Blue Mark")}
      </button>
      <button
        onClick={() => handlePickColor("green")}
        className="flex gap-2 text-foreground"
      >
        <Bookmark className="text-green-600 w-6 h-6" fill="currentColor" />
        {t("markModal.greenMark", "Green Mark")}
      </button>
    </div>
  );
};
