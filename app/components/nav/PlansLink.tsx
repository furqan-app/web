"use client";

import { Target } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import useTranslations from "@hooks/use-translations";

/**
 * Always-visible navbar entry to the plans hub. Icon + label on desktop,
 * icon-only on mobile — mirrors MarksLink.
 */
export const PlansLink = () => {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <Link
      href="/plans"
      locale={locale}
      className="flex items-center gap-2 rounded-xl px-2 md:px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-accent/50 transition-colors"
    >
      <Target className="size-5 md:size-4 flex-none" strokeWidth={1.7} />
      <span className="hidden md:inline">
        {t("plans.navLink", "My Plans")}
      </span>
    </Link>
  );
};
