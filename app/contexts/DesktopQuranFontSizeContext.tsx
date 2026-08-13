"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { DEFAULT_DESKTOP_QURAN_FONT_SIZE } from "@constants/font";
import { DesktopQuranFontSize } from "@types";
import { storage } from "@utils/storage";

type DesktopQuranFontSizeContextType = {
  desktopQuranFontSize: DesktopQuranFontSize;
  setDesktopQuranFontSize: (size: DesktopQuranFontSize) => void;
};

const DesktopQuranFontSizeContext = createContext<DesktopQuranFontSizeContextType | undefined>(undefined);

function getInitialDesktopQuranFontSize(): DesktopQuranFontSize {
  const stored = storage.get("desktopQuranFontSize");
  return stored === "small" || stored === "medium" || stored === "large"
    ? stored
    : DEFAULT_DESKTOP_QURAN_FONT_SIZE;
}

export function DesktopQuranFontSizeProvider({ children }: { children: ReactNode }) {
  const [desktopQuranFontSize, setDesktopQuranFontSize] =
    useState<DesktopQuranFontSize>(DEFAULT_DESKTOP_QURAN_FONT_SIZE);

  useEffect(() => {
    setDesktopQuranFontSize(getInitialDesktopQuranFontSize());
  }, []);

  const change = (size: DesktopQuranFontSize) => {
    setDesktopQuranFontSize(size);
    storage.set("desktopQuranFontSize", size);
  };

  return (
    <DesktopQuranFontSizeContext.Provider value={{ desktopQuranFontSize, setDesktopQuranFontSize: change }}>
      {children}
    </DesktopQuranFontSizeContext.Provider>
  );
}

export function useDesktopQuranFontSize() {
  const context = useContext(DesktopQuranFontSizeContext);
  if (!context) {
    throw new Error("useDesktopQuranFontSize must be used within a DesktopQuranFontSizeProvider");
  }
  return context;
}
