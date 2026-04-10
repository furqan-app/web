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
    <div className="flex items-center gap-1 rounded-lg bg-background p-1">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchTo(code)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            currentLang === code
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
