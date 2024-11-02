'use client';

import { useTheme } from "@hooks/use-theme";
import { ThemeIcon } from "@components/ThemeIcon";
import { useEffect, useState } from "react";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-12 h-9" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded transition-colors"
      aria-label="Toggle theme"
    >
      <ThemeIcon theme={theme} />
    </button>
  );
};