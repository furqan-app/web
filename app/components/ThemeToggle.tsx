"use client";

import { useTheme } from "@hooks/use-theme";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import useTranslations from "@hooks/use-translations";

const THEME_OPTIONS = ["light", "gold", "dark"] as const;

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-32" />;
  }

  const themeLabels: Record<string, string> = {
    light: t("light"),
    gold: t("gold"),
    dark: t("dark"),
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("appearance", "المظهر")}
      className="flex flex-col w-full"
    >
      {THEME_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={theme === option}
          onClick={() => setTheme(option)}
          className="fq-theme-row fq-focus-ring"
        >
          <span
            aria-hidden="true"
            data-theme={option}
            className="fq-theme-swatch"
          />
          <span className="min-w-0 flex-1 text-start text-[13px] font-medium text-foreground leading-tight">
            {themeLabels[option]}
          </span>
          <span aria-hidden="true" className="fq-theme-check">
            <Check className="size-3 stroke-[3]" />
          </span>
        </button>
      ))}
    </div>
  );
};
