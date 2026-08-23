"use client";

import { useState } from "react";
import { RectangleVertical, BookOpen, ChevronDown, Check } from "lucide-react";
import { useQuranSafhaView } from "@/app/contexts/QuranSafhaViewContext";
import useTranslations from "@hooks/use-translations";
import { cn } from "@/lib/utils";

export const QuranSafhaViewToggle = () => {
  const [expanded, setExpanded] = useState(false);
  const { view, setView } = useQuranSafhaView();
  const t = useTranslations();

  const activeLabel =
    view === "single"
      ? t("reader.singlePageView", "Single page view")
      : t("reader.doublePageView", "Double page view");

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
            {t("pageView", "Page View")}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
            {activeLabel}
          </p>
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
          <button
            type="button"
            onClick={() => {
              setView("single");
              setExpanded(false);
            }}
            className="fq-section-drawer-row"
          >
            <div className="flex items-center gap-2.5">
              <RectangleVertical className="size-3.5 text-muted-foreground" strokeWidth={1.8} />
              <span
                className={cn(
                  "text-[12px] font-medium",
                  view === "single" ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {t("reader.singlePageView", "Single page view")}
              </span>
            </div>
            <span
              className="fq-radio-circle"
              data-state={view === "single" ? "checked" : "unchecked"}
            >
              {view === "single" && <Check className="size-2.5 stroke-[3]" />}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setView("double");
              setExpanded(false);
            }}
            className="fq-section-drawer-row"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="size-3.5 text-muted-foreground" strokeWidth={1.8} />
              <span
                className={cn(
                  "text-[12px] font-medium",
                  view === "double" ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {t("reader.doublePageView", "Double page view")}
              </span>
            </div>
            <span
              className="fq-radio-circle"
              data-state={view === "double" ? "checked" : "unchecked"}
            >
              {view === "double" && <Check className="size-2.5 stroke-[3]" />}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
