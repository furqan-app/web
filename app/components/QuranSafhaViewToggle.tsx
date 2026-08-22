"use client";

import { RectangleVertical, BookOpen } from "lucide-react";
import { useQuranSafhaView } from "@/app/contexts/QuranSafhaViewContext";
import useTranslations from "@hooks/use-translations";
import { cn } from "@/lib/utils";

export const QuranSafhaViewToggle = ({ className }: { className?: string }) => {
  const { view, setView } = useQuranSafhaView();
  const t = useTranslations();

  const buttonClass = (active: boolean) =>
    cn(
      "fq-focus-ring flex items-center justify-center size-7 rounded-md transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-[hsl(var(--control-inert))] hover:text-[hsl(var(--control-live))]",
    );

  return (
    <div
      className={cn(
        "flex gap-1 p-1 rounded-lg border border-border bg-[hsl(var(--well)/var(--well-alpha))]",
        className,
      )}
    >
      <button
        type="button"
        aria-label={t("reader.singlePageView", "Single page view")}
        aria-pressed={view === "single"}
        className={buttonClass(view === "single")}
        onClick={() => setView("single")}
      >
        <RectangleVertical className="size-4" strokeWidth={1.8} />
      </button>
      <button
        type="button"
        aria-label={t("reader.doublePageView", "Double page view")}
        aria-pressed={view === "double"}
        className={buttonClass(view === "double")}
        onClick={() => setView("double")}
      >
        <BookOpen className="size-4" strokeWidth={1.8} />
      </button>
    </div>
  );
};
