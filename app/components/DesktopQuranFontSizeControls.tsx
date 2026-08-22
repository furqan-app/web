"use client";

import { useDesktopQuranFontSize } from "@contexts/DesktopQuranFontSizeContext";
import { DesktopQuranFontSize } from "@types";
import useTranslations from "@hooks/use-translations";
import { cn } from "@/lib/utils";

const SIZES: Array<{
  value: DesktopQuranFontSize;
  key: "small" | "medium" | "large";
  step: 0 | 1 | 2;
}> = [
  { value: "small", key: "small", step: 0 },
  { value: "medium", key: "medium", step: 1 },
  { value: "large", key: "large", step: 2 },
];

function ScaleMarks({ active }: { active: 0 | 1 | 2 }) {
  return (
    <span aria-hidden="true" className="flex items-end gap-[3px]">
      {[5, 8, 11].map((h, i) => (
        <span
          key={h}
          style={{ height: `${h}px` }}
          className={cn(
            "w-[3px] rounded-full transition-colors",
            i === active
              ? "bg-primary"
              : "bg-[hsl(var(--border))]",
          )}
        />
      ))}
    </span>
  );
}

export const DesktopQuranFontSizeControls = () => {
  const { desktopQuranFontSize, setDesktopQuranFontSize } =
    useDesktopQuranFontSize();
  const t = useTranslations();

  const activeStep: 0 | 1 | 2 =
    desktopQuranFontSize === "small"
      ? 0
      : desktopQuranFontSize === "large"
        ? 2
        : 1;

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label={t("quranFontSize", "Quran font size")}
    >
      <ScaleMarks active={activeStep} />
      <div className="flex items-center gap-1 rounded-lg border border-border bg-[hsl(var(--well)/var(--well-alpha))] p-1">
        {SIZES.map(({ value, key }) => (
          <button
            key={value}
            type="button"
            onClick={() => setDesktopQuranFontSize(value)}
            className={cn(
              "fq-focus-ring rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              desktopQuranFontSize === value
                ? "bg-primary text-primary-foreground"
                : "text-[hsl(var(--control-inert))] hover:text-[hsl(var(--control-live))]",
            )}
          >
            {t(
              `fontSize.${key}`,
              key === "small" ? "صغير" : key === "large" ? "كبير" : "متوسط",
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
