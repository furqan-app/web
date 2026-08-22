"use client";

import { useState } from "react";
import { useTranslations as useIntlTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { MUSHAF_EDITION_IDS } from "@utils/mushaf-editions";
import { MushafLayoutRow } from "@components/mushaf/MushafLayoutRow";
import { useQuranMushaf } from "@contexts/QuranMushafContext";
import { cn } from "@/lib/utils";

export const MushafLayoutSection = () => {
  const t = useTranslations();
  const tml = useIntlTranslations("mushafLayout");
  const [expanded, setExpanded] = useState(false);
  const { mushafId: activeMushafId } = useQuranMushaf();
  const activeName = tml(`editions.${activeMushafId}.name`);

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
            {t("mushafLayout.title", "Mushaf Layout")}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate leading-tight">
            {activeName}
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
          {MUSHAF_EDITION_IDS.map((mushafId) => (
            <MushafLayoutRow
              key={mushafId}
              mushafId={mushafId}
              onSelect={() => setExpanded(false)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
