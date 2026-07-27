"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { PLAN_TEMPLATES } from "@constants/plans";
import { PLAN_TEMPLATE_UI } from "@constants/plan-ui";
import { PlanEnrollForm } from "./PlanEnrollForm";
import { cn } from "@/lib/utils";

// The 3 shipped templates, each expanding into its enroll form. Only one
// expanded at a time.
export const TemplateCatalog = () => {
  const t = useTranslations();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {Object.keys(PLAN_TEMPLATES).map((templateKey) => {
        const ui = PLAN_TEMPLATE_UI[templateKey];
        const Icon = ui?.icon;
        const isExpanded = expanded === templateKey;

        return (
          <div
            key={templateKey}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : templateKey)}
              className="w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-accent/50 transition-colors"
            >
              <span className="grid place-items-center size-9 rounded-lg bg-primary/10 text-primary flex-none">
                {Icon ? <Icon className="size-5" strokeWidth={1.6} /> : null}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {ui ? t(ui.labelKey, ui.defaultLabel) : templateKey}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {ui ? t(ui.descriptionKey, ui.defaultDescription) : null}
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="size-4 text-muted-foreground flex-none" strokeWidth={1.8} />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground flex-none" strokeWidth={1.8} />
              )}
            </button>

            <div className={cn("px-4 pb-4", !isExpanded && "hidden")}>
              <PlanEnrollForm templateKey={templateKey} onEnrolled={() => setExpanded(null)} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
