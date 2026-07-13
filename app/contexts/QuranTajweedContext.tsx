"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { storage } from "@/app/utils/storage";

type QuranTajweedContextType = {
  tajweedMode: boolean;
  setTajweedMode: (tajweedMode: boolean) => void;
};

const QuranTajweedContext = createContext<QuranTajweedContextType | undefined>(undefined);

function getInitialTajweedMode(): boolean {
  if (typeof window !== "undefined") {
    const storedTajweedMode = storage.get("quranTajweedMode");
    if (typeof storedTajweedMode === "boolean") {
      return storedTajweedMode;
    }
  }
  return false; // default: tajweed mode off
}

export function QuranTajweedProvider({ children }: { children: ReactNode }) {
  const [tajweedMode, setTajweedModeState] = useState<boolean>(false);

  useEffect(() => {
    setTajweedModeState(getInitialTajweedMode());
  }, [])

  const handleTajweedModeChange = (newTajweedMode: boolean) => {
    setTajweedModeState(newTajweedMode);
    storage.set("quranTajweedMode", newTajweedMode);
  };

  return (
    <QuranTajweedContext.Provider value={{ tajweedMode, setTajweedMode: handleTajweedModeChange }}>
      {children}
    </QuranTajweedContext.Provider>
  );
}

export function useQuranTajweed() {
  const context = useContext(QuranTajweedContext);
  if (context === undefined) {
    throw new Error("useQuranTajweed must be used within a QuranTajweedProvider");
  }

  return context;
}
