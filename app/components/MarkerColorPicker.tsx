import React from "react";
import useTranslations from "../hooks/use-translations";
import { getLanguageDirection } from "../utils/i18n";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MARK_CATEGORIES } from "@/app/constants/marks";

type Props = {
  value?: string;
  onChange: (color: string) => void;
  disabled?: boolean;
};

export const MarkerColorPicker = ({ value, onChange, disabled }: Props) => {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      className="grid grid-cols-2 sm:grid-cols-3 gap-2"
      dir={getLanguageDirection(locale)}
    >
      {MARK_CATEGORIES.map(
        ({ key, badgeBg, badgeText, icon: Icon, labelKey, defaultLabel }) => {
          const isSelected = value === key;
          const label = t(labelKey, defaultLabel);

          return (
            <label
              key={key}
              htmlFor={`mark-color-${key}`}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-2.5 py-2 cursor-pointer transition-all duration-150 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 active:scale-[0.97]",
                isSelected
                  ? "border-primary bg-primary/10 ring-2 ring-primary/25 shadow-xs"
                  : "border-border/80 bg-card/60 hover:bg-accent/60 hover:border-border",
                disabled && "opacity-50 cursor-not-allowed pointer-events-none",
              )}
            >
              <span
                className={cn(
                  "size-6 rounded-lg flex items-center justify-center shrink-0",
                  badgeBg,
                  badgeText,
                )}
              >
                <Icon className="size-3.5" strokeWidth={2} />
              </span>
              <span className="text-xs font-medium text-foreground truncate select-none">
                {label}
              </span>
              <RadioGroupItem
                id={`mark-color-${key}`}
                value={key}
                aria-label={label}
                className="sr-only"
              />
            </label>
          );
        },
      )}
    </RadioGroup>
  );
};

