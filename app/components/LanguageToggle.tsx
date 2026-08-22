"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
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

  const switchTo = (lang: string) => {
    if (lang === currentLang) {
      setExpanded(false);
      return;
    }
    const newPath = pathname.replace(/^\/[a-z]{2}/, `/${lang}`);
    router.push(newPath);
    setExpanded(false);
  };

  return (
    <>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="fq-section-row fq-focus-ring w-full text-start"
      >
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-foreground">
            {t("language", "Language")}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {activeLabel}
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
          {LANGUAGES.map(({ code, label }) => {
            const isActive = currentLang === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => switchTo(code)}
                className="fq-section-row w-full text-start py-2.5 px-6 hover:bg-[hsl(var(--well)/0.3)] transition-colors"
              >
                <span
                  className={cn(
                    "text-xs font-medium",
                    isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
                {isActive ? (
                  <span className="size-4 rounded-full bg-primary grid place-items-center text-primary-foreground">
                    <Check className="size-2.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className="size-4 rounded-full border border-border" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};
