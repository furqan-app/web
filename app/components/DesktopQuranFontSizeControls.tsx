"use client";

import { useState } from "react";
import { useDesktopQuranFontSize } from "@contexts/DesktopQuranFontSizeContext";
import { DesktopQuranFontSize } from "@types";
import { ChevronDown, Check } from "lucide-react";
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
              : "bg-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

export const DesktopQuranFontSizeControls = () => {
  const [expanded, setExpanded] = useState(false);
  const { desktopQuranFontSize, setDesktopQuranFontSize } =
    useDesktopQuranFontSize();
  const t = useTranslations();

  const activeStep: 0 | 1 | 2 =
    desktopQuranFontSize === "small"
      ? 0
      : desktopQuranFontSize === "large"
        ? 2
        : 1;

  const activeKey =
    desktopQuranFontSize === "small"
      ? "small"
      : desktopQuranFontSize === "large"
        ? "large"
        : "medium";

  const activeLabel = t(
    `fontSize.${activeKey}`,
    activeKey === "small"
      ? "صغير (٢٦)"
      : activeKey === "large"
        ? "كبير (٣٠)"
        : "متوسط (٢٨)"
  );

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "fq-section-row fq-focus-ring w-full text-start transition-colors",
          expanded && "bg-muted/30",
        )}
      >
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-foreground leading-tight">
            {t("quranFontSize", "Quran Font Size")}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <ScaleMarks active={activeStep} />
            <p className="text-[11px] text-muted-foreground leading-tight">
              {activeLabel}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 flex-none text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180",
          )}
          strokeWidth={1.8}
        />
      </button>

      {expanded && (
        <div className="fq-section-drawer">
          {SIZES.map(({ value, key, step }) => {
            const isActive = desktopQuranFontSize === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setDesktopQuranFontSize(value);
                  setExpanded(false);
                }}
                className="fq-section-drawer-row"
              >
                <div className="flex items-center gap-2.5">
                  <ScaleMarks active={step} />
                  <span
                    className={cn(
                      "text-[12px] font-medium",
                      isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {t(
                      `fontSize.${key}`,
                      key === "small"
                        ? "صغير (٢٦)"
                        : key === "large"
                          ? "كبير (٣٠)"
                          : "متوسط (٢٨)"
                    )}
                  </span>
                </div>
                <span
                  className="fq-radio-circle"
                  data-state={isActive ? "checked" : "unchecked"}
                >
                  {isActive && <Check className="size-2.5 stroke-[3]" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
