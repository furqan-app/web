"use client";

import { createContext, useContext, useState } from "react";

export type SurahSlim = { id: number; name_arabic: string; name_simple: string };

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  currentSurah: SurahSlim | null;
  setCurrentSurah: (surah: SurahSlim | null) => void;
  // Set by SurahListItem on an explicit tap, so Sidebar can show the surah the
  // reader actually picked instead of re-deriving one from the page number —
  // page-derivation alone can't disambiguate a page that hosts more than one
  // surah (see docs/plans/sidebar-surah-indicator.md, Addendum). Sidebar
  // clears it once the current page leaves the pinned surah's own range.
  pinnedSurahId: number | null;
  setPinnedSurahId: (id: number | null) => void;
};

const SidebarContext = createContext<SidebarContextValue>({
  open: false,
  setOpen: () => {},
  currentSurah: null,
  setCurrentSurah: () => {},
  pinnedSurahId: null,
  setPinnedSurahId: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [currentSurah, setCurrentSurah] = useState<SurahSlim | null>(null);
  const [pinnedSurahId, setPinnedSurahId] = useState<number | null>(null);
  return (
    <SidebarContext.Provider
      value={{ open, setOpen, currentSurah, setCurrentSurah, pinnedSurahId, setPinnedSurahId }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
