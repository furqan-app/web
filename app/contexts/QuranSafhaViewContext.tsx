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
    const initial = getInitialView();
    setViewState(initial);
    // Keep the pre-paint <html data-safha-view> attribute (set by the inline
    // script in app/layout.tsx) in sync with the resolved preference — the CSS
    // display gate keys off it, not off React state. See ADR 0013 Addendum 4.
    document.documentElement.setAttribute("data-safha-view", initial);
  }, []);

  const setView = (newView: QuranSafhaView) => {
    setViewState(newView);
    storage.set("quranSafhaView", newView);
    // Re-drive the CSS display gate live on toggle, without a reload.
    document.documentElement.setAttribute("data-safha-view", newView);
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
