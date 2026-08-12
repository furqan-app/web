"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type JumpTo = (page: number) => void;

type ReaderNavigationContextType = {
  // Set by ReaderPager while mounted, null otherwise. Lets a Link that would
  // otherwise trigger a full navigation (SurahListItem, RubList,
  // ContinueReadingLink) instead move the already-mounted pager client-side —
  // the same mechanism swipe/arrows use, so it needs no network and works
  // offline for any precached page (ADR 0014 Addendum 3).
  jumpTo: JumpTo | null;
  setJumpTo: (fn: JumpTo | null) => void;
};

const ReaderNavigationContext = createContext<ReaderNavigationContextType | undefined>(
  undefined,
);

export function ReaderNavigationProvider({ children }: { children: ReactNode }) {
  const [jumpTo, setJumpToState] = useState<JumpTo | null>(null);
  // A function value passed to useState's setter is treated as an updater, so
  // storing one requires the () => fn wrapper form on every call site.
  const setJumpTo = (fn: JumpTo | null) => setJumpToState(() => fn);

  return (
    <ReaderNavigationContext.Provider value={{ jumpTo, setJumpTo }}>
      {children}
    </ReaderNavigationContext.Provider>
  );
}

export function useReaderNavigation() {
  const context = useContext(ReaderNavigationContext);
  if (context === undefined) {
    throw new Error("useReaderNavigation must be used within a ReaderNavigationProvider");
  }
  return context;
}
