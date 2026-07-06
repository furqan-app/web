"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { storage } from "@/app/utils/storage";
import { QuranSafhaView } from "@types";

type QuranSafhaViewContextType = {
  view: QuranSafhaView;
  setView: (view: QuranSafhaView) => void;
};

const QuranSafhaViewContext = createContext<QuranSafhaViewContextType | undefined>(undefined);

function getInitialView(): QuranSafhaView {
  if (typeof window !== "undefined") {
    const storedView = storage.get("quranSafhaView");
    if (storedView === "single" || storedView === "double") {
      return storedView;
    }
  }
  return "double"; // default view
}

export function QuranSafhaViewProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<QuranSafhaView>("double");

  useEffect(() => {
    setViewState(getInitialView());
  }, []);

  const setView = (newView: QuranSafhaView) => {
    setViewState(newView);
    storage.set("quranSafhaView", newView);
  };

  return (
    <QuranSafhaViewContext.Provider value={{ view, setView }}>
      {children}
    </QuranSafhaViewContext.Provider>
  );
}

export function useQuranSafhaView() {
  const context = useContext(QuranSafhaViewContext);
  if (context === undefined) {
    throw new Error("useQuranSafhaView must be used within a QuranSafhaViewProvider");
  }

  return context;
}
