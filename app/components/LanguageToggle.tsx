"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { ChevronDown, Check } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
] as const;

export const LanguageToggle = () => {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const currentLang = useLocale();
  const t = useTranslations();

  const activeLabel = LANGUAGES.find((l) => l.code === currentLang)?.label ?? currentLang;

  const switchTo = (lang: "ar" | "en") => {
    setExpanded(false);
    if (lang === currentLang) return;
    // Preserve the query string across the locale switch (e.g. ?highlight=…
    // deep links). Read from window at click time: next-intl's usePathname()
    // strips the query, and a useSearchParams() hook would force a
    // Suspense/CSR bailout on these statically generated pages.
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.push(`${pathname}${search}`, { locale: lang });
  };

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
            {t("language", "Language")}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
            {activeLabel}
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
          {LANGUAGES.map(({ code, label }) => {
            const isActive = currentLang === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => switchTo(code)}
                className="fq-section-drawer-row"
              >
                <span
                  className={cn(
                    "text-[12px] font-medium",
                    isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
                <span
                  className="fq-radio-circle"
                  data-state={isActive ? "checked" : "unchecked"}
                >
                  {isActive && <Check className="size-2.5 stroke-[3]" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
