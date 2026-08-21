"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type SurahSlim = { id: number; name_arabic: string; name_simple: string };

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  currentSurah: SurahSlim | null;
  setCurrentSurah: (surah: SurahSlim | null) => void;
  // Juz/Hizb for the page currently open in the reader — derived from the
  // same currentRub lookup Sidebar already computes for the Rub tab
  // (rub_number is 1-240; 8 rubs/juz, 4 rubs/hizb — arithmetic, no extra
  // fetch needed). Nav's surah-selector control reads this to show
  // "Juz N • Hizb M" under the surah name.
  currentJuzHizb: { juz: number; hizb: number } | null;
  setCurrentJuzHizb: (value: { juz: number; hizb: number } | null) => void;
  // Set by SurahListItem on an explicit tap, so Sidebar can show the surah the
  // reader actually picked instead of re-deriving one from the page number —
  // page-derivation alone can't disambiguate a page that hosts more than one
  // surah (see docs/plans/sidebar-surah-indicator.md, Addendum). Sidebar
  // clears it once the current page leaves the pinned surah's own range.
  pinnedSurahId: number | null;
  setPinnedSurahId: (id: number | null) => void;
  // Published by Sidebar while its Sheet is open, mirroring how
  // ReaderNavigationContext exposes jumpTo from ReaderPager. Callers that
  // close the sidebar and navigate in the same click (SurahListItem) must
  // call this synchronously, before setOpen(false) — it tells
  // useCloseOnBackGesture's cleanup a competing navigation is already
  // underway, so it skips its timing-based history check instead of racing
  // it (see docs/plans/close-overlays-on-back-swipe.md, Addendum — surah
  // Sidebar was missed by the notifyNavigating fix).
  notifyNavigating: (() => void) | null;
  setNotifyNavigating: (fn: (() => void) | null) => void;
};

const SidebarContext = createContext<SidebarContextValue>({
  open: false,
  setOpen: () => {},
  currentSurah: null,
  setCurrentSurah: () => {},
  currentJuzHizb: null,
  setCurrentJuzHizb: () => {},
  pinnedSurahId: null,
  setPinnedSurahId: () => {},
  notifyNavigating: null,
  setNotifyNavigating: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [currentSurah, setCurrentSurah] = useState<SurahSlim | null>(null);
  const [currentJuzHizb, setCurrentJuzHizb] = useState<{ juz: number; hizb: number } | null>(null);
  const [pinnedSurahId, setPinnedSurahId] = useState<number | null>(null);
  const [notifyNavigating, setNotifyNavigatingState] = useState<(() => void) | null>(null);
  // A function value passed to useState's setter is treated as an updater, so
  // storing one requires this () => fn wrapper — done ONCE, here. Callers pass
  // the raw function straight to setNotifyNavigating; wrapping it again at the
  // call site would store a function that RETURNS it instead of one that
  // calls it (see ReaderNavigationContext's identical setJumpTo for the bug
  // this exact shape caused once — docs/plans/fix-reader-nav-infinite-loop.md).
  const setNotifyNavigating = useCallback(
    (fn: (() => void) | null) => setNotifyNavigatingState(() => fn),
    [],
  );
  return (
    <SidebarContext.Provider
      value={{
        open,
        setOpen,
        currentSurah,
        setCurrentSurah,
        currentJuzHizb,
        setCurrentJuzHizb,
        pinnedSurahId,
        setPinnedSurahId,
        notifyNavigating,
        setNotifyNavigating,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
