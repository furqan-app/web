"use client";

import { useState } from "react";
import { useTranslations as useIntlTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { MUSHAF_EDITION_IDS } from "@utils/mushaf-editions";
import { MushafLayoutRow } from "@components/mushaf/MushafLayoutRow";
import { useQuranMushaf } from "@contexts/QuranMushafContext";

/**
 * Settings section replacing both the old "Tajweed Colors" switch and the
 * "Offline Access" section — one row per registered mushaf edition, each with
 * an independent download action and switch action. See
 * docs/plans/mushaf-layout-settings.md.
 *
 * Collapsed by default: a single edition name at the old "Tajweed Colors"
 * switch's width truncated badly (long bibliographic names), so the section
 * now opens on tap — same local-`expanded`-state disclosure idiom as
 * UserMenu's inline Account expand/collapse — giving the open rows the full
 * row width to show each edition's full title.
 *
 * The collapsed header is styled as the same `bg-muted` card every other
 * Settings row uses (not bare text), so it reads as a tappable control rather
 * than a static label, and shows the active edition's name as a subtitle so
 * the user's current choice is visible without opening it.
 */
export const MushafLayoutSection = () => {
  const t = useTranslations();
  const tml = useIntlTranslations("mushafLayout");
  const [expanded, setExpanded] = useState(false);
  const { mushafId: activeMushafId } = useQuranMushaf();
  const activeName = tml(`editions.${activeMushafId}.name`);

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {t("mushafLayout.title", "Mushaf Layout")}
      </h3>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 rounded-lg bg-muted flex items-center justify-between gap-3 text-start active:scale-[0.99] transition-transform duration-150"
      >
        <span className="text-sm font-medium truncate">{activeName}</span>
        {expanded ? (
          <ChevronUp className="size-4 text-muted-foreground flex-none" strokeWidth={1.8} />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground flex-none" strokeWidth={1.8} />
        )}
      </button>
      {expanded && (
        <div className="space-y-2 mt-2">
          {MUSHAF_EDITION_IDS.map((mushafId) => (
            <MushafLayoutRow key={mushafId} mushafId={mushafId} />
          ))}
        </div>
      )}
    </div>
  );
};
