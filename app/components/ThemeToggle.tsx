'use client';

import { useTheme } from "@hooks/use-theme";
import { Moon, Sun, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import useTranslations from "@hooks/use-translations";

const themes = [
  { value: 'light', icon: Sun, labelKey: 'themeLight', labelFallback: 'Light' },
  { value: 'dark', icon: Moon, labelKey: 'themeDark', labelFallback: 'Dark' },
  { value: 'gold', icon: Sparkles, labelKey: 'themeGold', labelFallback: 'Gold' },
] as const;

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9" />;
  }

  return (
    <div className="flex gap-2">
      {themes.map(({ value, icon: Icon, labelKey, labelFallback }) => (
        <Button
          key={value}
          variant={theme === value ? "default" : "ghost"}
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          aria-label={t(labelKey, labelFallback)}
        >
          <Icon className="size-4" />
          <span className="hidden sm:inline">{t(labelKey, labelFallback)}</span>
        </Button>
      ))}
    </div>
  );
};
