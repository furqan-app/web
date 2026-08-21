"use client";

import { useState } from "react";
import { useTranslations as useIntlTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { MUSHAF_EDITION_IDS } from "@utils/mushaf-editions";
import { MushafLayoutRow } from "@components/mushaf/MushafLayoutRow";
import { SettingsSection } from "@components/settings/SettingsSection";
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

  // Same section shape as every other setting — it was the last block in the
  // sheet still carrying its own <h3> and bg-muted slab. The disclosure list
  // stays inside the group so however many editions are registered, they read
  // as rows of one surface rather than a stack of cards; the picker is not
  // sized for exactly the two that exist today.
  return (
    <SettingsSection title={t("mushafLayout.title", "Mushaf Layout")}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="fq-section-row fq-focus-ring w-full text-start"
      >
        <span className="text-sm font-medium truncate">{activeName}</span>
        {expanded ? (
          <ChevronUp className="size-4 flex-none text-[hsl(var(--control-inert))]" strokeWidth={1.8} />
        ) : (
          <ChevronDown className="size-4 flex-none text-[hsl(var(--control-inert))]" strokeWidth={1.8} />
        )}
      </button>
      {expanded &&
        MUSHAF_EDITION_IDS.map((mushafId) => (
          <MushafLayoutRow key={mushafId} mushafId={mushafId} />
        ))}
    </SettingsSection>
  );
};
