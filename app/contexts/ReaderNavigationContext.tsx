"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

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
  // storing one requires this () => fn wrapper — done ONCE, here. Callers
  // pass the raw function straight to setJumpTo (e.g. setJumpTo(jumpTo)); a
  // caller that wraps it again (setJumpTo(() => jumpTo)) stores a function
  // that RETURNS jumpTo instead of one that calls it, silently breaking every
  // jumpTo() call site (see ReaderPager's registration effect). Stable
  // identity (useCallback) is also required — that same effect depends on
  // this reference, and an unstable one there re-triggers the effect every
  // render, which re-triggers this state update, forever.
  const setJumpTo = useCallback((fn: JumpTo | null) => setJumpToState(() => fn), []);
  const value = useMemo(() => ({ jumpTo, setJumpTo }), [jumpTo, setJumpTo]);

  return (
    <ReaderNavigationContext.Provider value={value}>
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
