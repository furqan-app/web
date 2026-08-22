"use client";

import { useState } from "react";
import { useTranslations as useIntlTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { MUSHAF_EDITION_IDS } from "@utils/mushaf-editions";
import { MushafLayoutRow } from "@components/mushaf/MushafLayoutRow";
import { useQuranMushaf } from "@contexts/QuranMushafContext";

export const MushafLayoutSection = () => {
  const t = useTranslations();
  const tml = useIntlTranslations("mushafLayout");
  const [expanded, setExpanded] = useState(false);
  const { mushafId: activeMushafId } = useQuranMushaf();
  const activeName = tml(`editions.${activeMushafId}.name`);

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
            {t("mushafLayout.title", "Mushaf Layout")}
          </span>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {activeName}
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
          {MUSHAF_EDITION_IDS.map((mushafId) => (
            <MushafLayoutRow
              key={mushafId}
              mushafId={mushafId}
              onSelect={() => setExpanded(false)}
            />
          ))}
        </div>
      )}
    </>
  );
};
