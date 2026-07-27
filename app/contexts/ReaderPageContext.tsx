"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ReaderPageContextType = {
  // Every mushaf page number currently on screen in the reader (one in
  // single-page view, two in a double-page spread) — null outside the
  // reader (or on reader routes that don't mount ReaderPager, e.g.
  // /pages/vertical). Kept separate from RecitationContext: this is generic
  // reader state, not recitation state — see docs/plans/daily-awrad-ui.md.
  visiblePages: number[] | null;
  setVisiblePages: (pages: number[] | null) => void;
};

const ReaderPageContext = createContext<ReaderPageContextType | undefined>(undefined);

export function ReaderPageProvider({ children }: { children: ReactNode }) {
  const [visiblePages, setVisiblePages] = useState<number[] | null>(null);

  return (
    <ReaderPageContext.Provider value={{ visiblePages, setVisiblePages }}>
      {children}
    </ReaderPageContext.Provider>
  );
}

export function useReaderPage() {
  const context = useContext(ReaderPageContext);
  if (context === undefined) {
    throw new Error("useReaderPage must be used within a ReaderPageProvider");
  }
  return context;
}
