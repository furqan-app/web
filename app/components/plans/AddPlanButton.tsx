"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { PlansBrowseDialog } from "./PlansBrowseDialog";
import { cn } from "@/lib/utils";

export interface AddPlanButtonProps {
  variant?: "header" | "card";
  className?: string;
}

// Consolidated entry point — opens PlansBrowseDialog, which drills
// into enroll or edit per template. Supports compact header variant or
// full-width dashed card variant.
export const AddPlanButton = ({ variant = "card", className }: AddPlanButtonProps) => {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "header" ? (
        <button
          type="button"
          data-testid="add-plan-button"
          onClick={() => setOpen(true)}
          className={cn(
            "fq-focus-ring min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs md:text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.97] hover:bg-primary/90 flex-none",
            className
          )}
        >
          <Plus className="size-4" strokeWidth={2.2} />
          <span>{t("plans.browse.addNew", "New wird")}</span>
        </button>
      ) : (
        <button
          type="button"
          data-testid="add-plan-button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-4 py-3.5 text-start hover:bg-accent/40 transition-colors active:scale-[0.99] duration-150",
            className
          )}
        >
          <span className="grid size-9 flex-none place-items-center rounded-[11px] bg-primary/10 text-lg font-bold text-primary">
            <Plus className="size-[18px]" strokeWidth={2} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">
              {t("plans.browse.addNew", "New wird")}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("plans.browse.addNewDescription", "Explore available awrad and learning plans")}
            </div>
          </div>
        </button>
      )}
      <PlansBrowseDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
