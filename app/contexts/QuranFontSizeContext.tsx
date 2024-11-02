"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { storage } from "@/app/utils/storage";
import { QuranFontSize } from "@types";

type QuranFontSizeContextType = {
  quranFontSize: QuranFontSize;
  setQuranFontSize: (quranFontSize: QuranFontSize) => void;
};

const QuranFontSizeContext = createContext<QuranFontSizeContextType | undefined>(undefined);

function getInitialQuranFontSize(): QuranFontSize {
  if (typeof window !== "undefined") {
    const storedQuranFontSize = storage.get("quranFontSize");

    if (
      typeof storedQuranFontSize === "number" &&
      storedQuranFontSize >= 1 &&
      storedQuranFontSize <= 10
    ) {
      return storedQuranFontSize as QuranFontSize;
    }
  }
  return 1; // default font size
}

export function QuranFontSizeProvider({ children }: { children: ReactNode }) {
  const [quranFontSize, setQuranFontSize] = useState<QuranFontSize>(getInitialQuranFontSize);

  const handleQuranFontSizeChange = (newQuranFontSize: QuranFontSize) => {
    setQuranFontSize(newQuranFontSize);
    storage.set("quranFontSize", newQuranFontSize);
  };

  return (
    <QuranFontSizeContext.Provider value={{ quranFontSize, setQuranFontSize: handleQuranFontSizeChange }}>
      {children}
    </QuranFontSizeContext.Provider>
  );
}

export function useQuranFontSize() {
  const context = useContext(QuranFontSizeContext);
  if (context === undefined) {
    throw new Error("useQuranFontSize must be used within a QuranFontSizeProvider");
  }

  return context;
}
