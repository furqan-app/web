"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { PlansBrowseDialog } from "./PlansBrowseDialog";

// Single consolidated entry point — opens PlansBrowseDialog, which drills
// into enroll or edit per template. Replaces the old always-expanded
// TemplateCatalog accordion.
export const AddPlanButton = () => {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-4 py-3.5 text-start hover:bg-accent/40 transition-colors active:scale-[0.99] duration-150"
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
      <PlansBrowseDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
