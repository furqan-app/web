"use client";

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
] as const;

export const LanguageToggle = () => {
  const router = useRouter();
  const pathname = usePathname();
  const currentLang = useLocale();

  const switchTo = (lang: string) => {
    if (lang === currentLang) return;
    const newPath = pathname.replace(/^\/[a-z]{2}/, `/${lang}`);
    router.push(newPath);
  };

  return (
    // A segmented control IS the well pattern: the unselected members read
    // as one dimmed group, the selected one is the only live thing on it.
    <div className="flex w-full items-center gap-1 rounded-lg border border-border bg-[hsl(var(--well)/var(--well-alpha))] p-1">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchTo(code)}
          className={cn(
            "fq-focus-ring flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            currentLang === code
              ? "bg-primary text-primary-foreground"
              : "text-[hsl(var(--control-inert))] hover:text-[hsl(var(--control-live))]"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
