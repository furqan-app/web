import { useState, useEffect } from 'react';
import { storage } from '@/app/utils/storage';

type Theme = 'light' | 'dark' | 'gold';

function getInitialTheme(): Theme {
  if (typeof window !== "undefined") {
    const storedTheme = storage.get("theme");
    if (storedTheme === "dark" || storedTheme === "light" || storedTheme === "gold") {
      return storedTheme;
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  }

  return "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    storage.set("theme", newTheme);
  };

  useEffect(() => {
    const el = document.documentElement;
    if (theme === "dark") {
      el.classList.add("dark", "theme-dark");
      el.classList.remove("theme-light", "theme-gold");
    } else if (theme === "gold") {
      el.classList.add("theme-gold");
      el.classList.remove("dark", "theme-dark", "theme-light");
    } else {
      el.classList.add("theme-light");
      el.classList.remove("dark", "theme-dark", "theme-gold");
    }
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (): void => {
      const storedTheme = storage.get("theme");
      if (!storedTheme) {
        handleThemeChange(mediaQuery.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return {
    theme,
    setTheme: handleThemeChange,
  };
}