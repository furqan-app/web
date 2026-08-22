"use client";

import { useState } from "react";
import { RectangleVertical, BookOpen, ChevronDown, ChevronUp, Check } from "lucide-react";
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
    <>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="fq-section-row fq-focus-ring w-full text-start"
      >
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground">
            {t("pageView", "Page View")}
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeLabel}
          </p>
        </div>
        {expanded ? (
          <ChevronUp
            className="size-4 flex-none text-[hsl(var(--control-inert))]"
            strokeWidth={1.8}
          />
        ) : (
          <ChevronDown
            className="size-4 flex-none text-[hsl(var(--control-inert))]"
            strokeWidth={1.8}
          />
        )}
      </button>

      {expanded && (
        <div className="bg-[hsl(var(--well)/0.15)] divide-y divide-border/40">
          <button
            type="button"
            onClick={() => {
              setView("single");
              setExpanded(false);
            }}
            className="fq-section-row w-full text-start py-2.5 px-6 hover:bg-[hsl(var(--well)/0.3)] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <RectangleVertical className="size-4 text-muted-foreground" strokeWidth={1.8} />
              <span
                className={cn(
                  "text-xs font-medium",
                  view === "single" ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {t("reader.singlePageView", "Single page view")}
              </span>
            </div>
            {view === "single" ? (
              <span className="size-4 rounded-full bg-primary grid place-items-center text-primary-foreground">
                <Check className="size-2.5 stroke-[3]" />
              </span>
            ) : (
              <span className="size-4 rounded-full border border-border" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setView("double");
              setExpanded(false);
            }}
            className="fq-section-row w-full text-start py-2.5 px-6 hover:bg-[hsl(var(--well)/0.3)] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="size-4 text-muted-foreground" strokeWidth={1.8} />
              <span
                className={cn(
                  "text-xs font-medium",
                  view === "double" ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {t("reader.doublePageView", "Double page view")}
              </span>
            </div>
            {view === "double" ? (
              <span className="size-4 rounded-full bg-primary grid place-items-center text-primary-foreground">
                <Check className="size-2.5 stroke-[3]" />
              </span>
            ) : (
              <span className="size-4 rounded-full border border-border" />
            )}
          </button>
        </div>
      )}
    </>
  );
};
