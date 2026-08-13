"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { storage } from "@/app/utils/storage";

type LastReadPageContextType = {
  lastReadPage: number;
  setLastReadPage: (page: number) => void;
};

const LastReadPageContext = createContext<LastReadPageContextType | undefined>(
  undefined,
);

// Starts at 1 (Al-Fatiha) so SSR and the first client render agree — same
// hydration pattern as QuranMushafContext — then adopts the persisted value
// right after mount. Kept as live React state (not a plain localStorage read
// in the navbar link) so ContinueReadingLink stays current as the reader
// navigates: Nav never remounts during in-app browsing, so a component that
// only reads localStorage once on mount goes stale the moment
// LastReadPageSync writes a new value — confirmed live, see
// docs/plans/save-last-read-page.md.
export function LastReadPageProvider({ children }: { children: ReactNode }) {
  const [lastReadPage, setLastReadPageState] = useState(1);

  useEffect(() => {
    const stored = storage.get("lastReadPage");
    if (typeof stored === "number") setLastReadPageState(stored);
  }, []);

  const setLastReadPage = (page: number) => {
    setLastReadPageState(page);
    storage.set("lastReadPage", page);
  };

  return (
    <LastReadPageContext.Provider value={{ lastReadPage, setLastReadPage }}>
      {children}
    </LastReadPageContext.Provider>
  );
}

export function useLastReadPage() {
  const context = useContext(LastReadPageContext);
  if (context === undefined) {
    throw new Error("useLastReadPage must be used within a LastReadPageProvider");
  }
  return context;
}
