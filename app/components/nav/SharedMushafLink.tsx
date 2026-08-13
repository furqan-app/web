"use client";

import { Users } from "lucide-react";
import { useLocale } from "next-intl";
import { NavPillLink } from "./NavPillLink";
import useTranslations from "@hooks/use-translations";

/**
 * Always-visible navbar entry to the shared-mushaf hub. Shown signed in *or* out —
 * the /mushaf page renders the sign-in prompt for signed-out users. Icon + label on
 * desktop, icon-only on mobile (matches the nav's icon-first shrink on small screens).
 */
export const SharedMushafLink = () => {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <NavPillLink href="/mushaf" locale={locale}>
      <Users className="size-5 md:size-4 flex-none" strokeWidth={1.7} />
      <span className="hidden md:inline">
        {t("mushaf.navLink", "Shared mushaf")}
      </span>
    </NavPillLink>
  );
};
