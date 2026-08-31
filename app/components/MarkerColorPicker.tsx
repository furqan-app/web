import React from "react";
import useTranslations from "../hooks/use-translations";
import { getLanguageDirection } from "../utils/i18n";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MARK_CATEGORIES } from "@/app/constants/marks";
import { Check } from "lucide-react";

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
      className="grid grid-cols-2 gap-2"
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
                "relative flex min-h-12 items-center gap-2 rounded-lg border border-border/80 bg-card/60 px-3 py-2 cursor-pointer transition-[background-color,color,transform] duration-150 focus-within:ring-2 focus-within:ring-ring active:scale-[0.98]",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-foreground hover:bg-accent/60",
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
              <span className="text-xs font-medium truncate select-none">
                {label}
              </span>
              {isSelected ? (
                <Check className="ms-auto size-3.5 shrink-0 text-primary" strokeWidth={2.2} />
              ) : null}
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
