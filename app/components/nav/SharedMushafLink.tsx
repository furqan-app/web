"use client";

import { Users } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
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
    <Link
      href="/mushaf"
      locale={locale}
      className="flex items-center gap-2 rounded-xl px-2 md:px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-accent/50 transition-colors"
    >
      <Users className="size-5 md:size-4 flex-none" strokeWidth={1.7} />
      <span className="hidden md:inline">
        {t("mushaf.navLink", "Shared mushaf")}
      </span>
    </Link>
  );
};
