import React from "react";
import { Bookmark } from "lucide-react";
import useTranslations from "../hooks/use-translations";
import { getLanguageDirection } from "../utils/i18n";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Props = {
  value?: string;
  onChange: (color: string) => void;
  disabled?: boolean;
};

const COLORS: Array<{ key: string; chip: string; labelKey: string; defaultLabel: string }> = [
  { key: "red", chip: "bg-red-600", labelKey: "markModal.redMark", defaultLabel: "Red Mark" },
  { key: "blue", chip: "bg-blue-600", labelKey: "markModal.blueMark", defaultLabel: "Blue Mark" },
  { key: "green", chip: "bg-green-600", labelKey: "markModal.greenMark", defaultLabel: "Green Mark" },
];

export const MarkerColorPicker = ({ value, onChange, disabled }: Props) => {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      className="grid grid-cols-3 gap-3"
      dir={getLanguageDirection(locale)}
    >
      {COLORS.map(({ key, chip, labelKey, defaultLabel }) => {
        const isSelected = value === key;
        const label = t(labelKey, defaultLabel);

        return (
          <label
            key={key}
            htmlFor={`mark-color-${key}`}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border p-2 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              isSelected
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border/60 hover:border-border shadow-sm",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none",
            )}
          >
            <span className={cn("w-6 h-6 rounded-md flex items-center justify-center", chip)}>
              <Bookmark className="w-3.5 h-3.5 text-white" strokeWidth={2} fill="currentColor" />
            </span>
            <span className="text-xs font-medium text-foreground">{label}</span>
            <RadioGroupItem id={`mark-color-${key}`} value={key} aria-label={label} className="sr-only" />
          </label>
        );
      })}
    </RadioGroup>
  );
};
