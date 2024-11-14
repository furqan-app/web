"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { storage } from "@/app/utils/storage";
import { QuranFontScale } from "@types";

type QuranFontScaleContextType = {
  quranFontScale: QuranFontScale;
  setQuranFontScale: (quranFontScale: QuranFontScale) => void;
};

const QuranFontScaleContext = createContext<QuranFontScaleContextType | undefined>(undefined);

function getInitialQuranFontScale(): QuranFontScale {
  if (typeof window !== "undefined") {
    const storedQuranFontScale = storage.get("quranFontScale");

    if (
      typeof storedQuranFontScale === "number" &&
      storedQuranFontScale >= 1 &&
      storedQuranFontScale <= 10
    ) {
      return storedQuranFontScale as QuranFontScale;
    }
  }
  return 1; // default font scale
}

export function QuranFontScaleProvider({ children }: { children: ReactNode }) {
  const [quranFontScale, setQuranFontScale] = useState<QuranFontScale>(1);

  useEffect(() => {
    setQuranFontScale(getInitialQuranFontScale());
  }, [])

  const handleQuranFontScaleChange = (newQuranFontScale: QuranFontScale) => {
    setQuranFontScale(newQuranFontScale);
    storage.set("quranFontScale", newQuranFontScale);
  };

  return (
    <QuranFontScaleContext.Provider value={{ quranFontScale, setQuranFontScale: handleQuranFontScaleChange }}>
      {children}
    </QuranFontScaleContext.Provider>
  );
}

export function useQuranFontScale() {
  const context = useContext(QuranFontScaleContext);
  if (context === undefined) {
    throw new Error("useQuranFontScale must be used within a QuranFontScaleProvider");
  }

  return context;
}
