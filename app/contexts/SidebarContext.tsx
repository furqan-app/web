"use client";

import { createContext, useContext, useState } from "react";

export type SurahSlim = { id: number; name_arabic: string; name_simple: string };

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  currentSurah: SurahSlim | null;
  setCurrentSurah: (surah: SurahSlim | null) => void;
};

const SidebarContext = createContext<SidebarContextValue>({
  open: false,
  setOpen: () => {},
  currentSurah: null,
  setCurrentSurah: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [currentSurah, setCurrentSurah] = useState<SurahSlim | null>(null);
  return (
    <SidebarContext.Provider value={{ open, setOpen, currentSurah, setCurrentSurah }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
