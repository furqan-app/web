"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { storage } from "@/app/utils/storage";
import {
  DEFAULT_MUSHAF_ID,
  MUSHAF_EDITIONS,
  TAJWEED_MUSHAF_ID,
  getMushafEdition,
  type MushafEdition,
} from "@/app/utils/mushaf-editions";

// Which mushaf edition the reader is displaying. An id rather than a
// `tajweedMode` boolean so a further print edition needs no new flag and no new
// branch — selecting an edition selects its word placement, glyph data and fonts
// as one unit (ADR 0033).
type QuranMushafContextType = {
  mushafId: number;
  setMushafId: (mushafId: number) => void;
  edition: MushafEdition;
};

const QuranMushafContext = createContext<QuranMushafContextType | undefined>(
  undefined,
);

const STORAGE_KEY = "quranMushafId";
const LEGACY_TAJWEED_KEY = "quranTajweedMode";

function getInitialMushafId(): number {
  if (typeof window === "undefined") return DEFAULT_MUSHAF_ID;

  const stored = storage.get(STORAGE_KEY);
  if (typeof stored === "number" && MUSHAF_EDITIONS[stored]) return stored;

  // Migrate the pre-ADR-0033 boolean so an existing reader keeps their choice.
  const legacy = storage.get(LEGACY_TAJWEED_KEY);
  if (typeof legacy === "boolean") {
    const migrated = legacy ? TAJWEED_MUSHAF_ID : DEFAULT_MUSHAF_ID;
    storage.set(STORAGE_KEY, migrated);
    return migrated;
  }

  return DEFAULT_MUSHAF_ID;
}

export function QuranMushafProvider({ children }: { children: ReactNode }) {
  // Starts at the default so SSR and hydration agree; the effect syncs the
  // persisted choice on mount.
  const [mushafId, setMushafIdState] = useState<number>(DEFAULT_MUSHAF_ID);

  useEffect(() => {
    setMushafIdState(getInitialMushafId());
  }, []);

  const handleMushafIdChange = (newMushafId: number) => {
    if (!MUSHAF_EDITIONS[newMushafId]) return;
    setMushafIdState(newMushafId);
    storage.set(STORAGE_KEY, newMushafId);
  };

  return (
    <QuranMushafContext.Provider
      value={{
        mushafId,
        setMushafId: handleMushafIdChange,
        edition: getMushafEdition(mushafId),
      }}
    >
      {children}
    </QuranMushafContext.Provider>
  );
}

export function useQuranMushaf() {
  const context = useContext(QuranMushafContext);
  if (context === undefined) {
    throw new Error("useQuranMushaf must be used within a QuranMushafProvider");
  }

  return context;
}
