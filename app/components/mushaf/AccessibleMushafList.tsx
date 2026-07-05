"use client";

import { BookOpen, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import useTranslations from "@hooks/use-translations";
import { getLanguageDirection } from "@/app/utils/i18n";
import { useLocale } from "next-intl";
import { GrantSummary } from "@/app/server/actions/mushaf/accessGrants";
import { SectionCard } from "./SectionCard";
import { PersonAvatar } from "./PersonAvatar";

type Props = {
  grants: GrantSummary[];
};

export const AccessibleMushafList = ({ grants }: Props) => {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = getLanguageDirection(locale) === "rtl";

  return (
    <SectionCard
      icon={BookOpen}
      title={t("mushaf.accessible.title", "Mushafs I can access")}
      description={t(
        "mushaf.accessible.description",
        "Mushafs others have shared with you.",
      )}
    >
      {grants.length === 0 ? (
        <p className="rounded-xl bg-muted px-4 py-6 text-center text-xs text-muted-foreground">
          {t("mushaf.accessible.empty", "No shared mushafs yet.")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {grants.map((grant) => (
            <li key={grant.grantId}>
              <Link
                locale={locale}
                href={`/mushaf/${grant.grantId}/pages/1`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 hover:border-primary/40 hover:bg-accent/40 transition-colors"
              >
                <PersonAvatar name={grant.user?.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {grant.user?.name ??
                      t("mushaf.unknownUser", "Unknown user")}
                  </p>
                </div>
                <span className="flex-none flex items-center gap-1 text-xs font-medium text-primary">
                  {t("mushaf.accessible.open", "Open")}
                  <ArrowRight
                    className={`size-3.5 transition-transform group-hover:translate-x-0.5 ${
                      isRTL ? "rotate-180 group-hover:-translate-x-0.5" : ""
                    }`}
                    strokeWidth={2}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
};
