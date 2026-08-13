"use client";

import { Users } from "lucide-react";
import { useLocale } from "next-intl";
import { NavPillLink } from "./NavPillLink";
import useTranslations from "@hooks/use-translations";
import { cn } from "@/lib/utils";

type Props = {
  // Renders as a full-width menu row (NavOverflowMenu's shared row template,
  // label always visible) instead of the compact desktop pill (label hidden
  // below `md`).
  menuRow?: boolean;
  // Called on navigation — NavOverflowMenu passes its own closeMenu so
  // the enclosing Sheet doesn't stay open after the route change (Nav never
  // remounts across in-app navigation, so an uncontrolled Sheet wouldn't
  // close itself).
  onNavigate?: () => void;
};

/**
 * Link to the shared-mushaf hub. Shown signed in *or* out — the /mushaf page
 * renders the sign-in prompt for signed-out users. Icon + label on desktop;
 * on mobile it moves into NavOverflowMenu instead of rendering directly in
 * the nav row.
 */
export const SharedMushafLink = ({ menuRow, onNavigate }: Props = {}) => {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <NavPillLink href="/mushaf" locale={locale} menuRow={menuRow} onClick={onNavigate}>
      <Users className={cn("flex-none", menuRow ? "size-5" : "size-5 md:size-4")} strokeWidth={1.7} />
      <span className={cn(!menuRow && "hidden md:inline")}>
        {t("mushaf.navLink", "Shared mushaf")}
      </span>
    </NavPillLink>
  );
};
