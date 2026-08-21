"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LabTheme = "light" | "gold" | "dark";

export const LAB_THEMES: readonly LabTheme[] = ["light", "gold", "dark"] as const;

// Mirrors the class contract in app/layout.tsx's pre-paint script and
// use-theme.ts (ADR 0003): dark carries `dark` alongside `theme-dark`.
const THEME_CLASSES: Record<LabTheme, readonly string[]> = {
  light: ["theme-light"],
  gold: ["theme-gold"],
  dark: ["theme-dark", "dark"],
};

const ALL_CLASSES = ["theme-light", "theme-gold", "theme-dark", "dark"];

function readTheme(): LabTheme {
  const el = document.documentElement;
  if (el.classList.contains("theme-dark")) return "dark";
  if (el.classList.contains("theme-gold")) return "gold";
  return "light";
}

function applyTheme(theme: LabTheme) {
  const el = document.documentElement;
  el.classList.remove(...ALL_CLASSES);
  el.classList.add(...THEME_CLASSES[theme]);
}

// Route-local theme switching for the lab. It moves the real theme class on
// <html> — nothing else would exercise the three token sets honestly — but it
// deliberately does NOT write `theme` to storage, and it restores whatever was
// applied on entry when the route unmounts. The lab is a sandbox; it must not
// leave a preference behind (design-migration/INDEX.md).
export function useLabTheme() {
  const [theme, setThemeState] = useState<LabTheme>("dark");
  const enteredWith = useRef<LabTheme | null>(null);

  useEffect(() => {
    const initial = readTheme();
    enteredWith.current = initial;
    setThemeState(initial);
    return () => {
      if (enteredWith.current) applyTheme(enteredWith.current);
    };
  }, []);

  const setTheme = useCallback((next: LabTheme) => {
    applyTheme(next);
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}
