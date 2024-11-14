import { useState, useEffect } from 'react';
import { storage } from '@/app/utils/storage';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window !== "undefined") {
    const storedTheme = storage.get("theme");
    if (storedTheme === "dark" || storedTheme === "light") {
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
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
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