"use client";

import { RectangleVertical, BookOpen } from "lucide-react";
import { useQuranSafhaView } from "@/app/contexts/QuranSafhaViewContext";

export const QuranSafhaViewToggle = () => {
  const { view, setView } = useQuranSafhaView();

  const buttonClass = (active: boolean) =>
    `flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
      active ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="hidden lg:flex gap-0.5 p-1 rounded-xl border border-border bg-card">
      <button
        type="button"
        aria-label="Single page view"
        aria-pressed={view === "single"}
        className={buttonClass(view === "single")}
        onClick={() => setView("single")}
      >
        <RectangleVertical className="w-[18px] h-[18px]" strokeWidth={1.8} />
      </button>
      <button
        type="button"
        aria-label="Double page view"
        aria-pressed={view === "double"}
        className={buttonClass(view === "double")}
        onClick={() => setView("double")}
      >
        <BookOpen className="w-[18px] h-[18px]" strokeWidth={1.8} />
      </button>
    </div>
  );
};
