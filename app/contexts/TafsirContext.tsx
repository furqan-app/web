"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { TafsirSheet } from "@/app/components/tafsir/TafsirSheet";

interface TafsirContextValue {
  isOpen: boolean;
  verseKey: string | null;
  verseText: string | null;
  openTafsir: (verseKey: string, verseText?: string) => void;
  closeTafsir: () => void;
  setVerseKey: (verseKey: string, verseText?: string) => void;
}

const TafsirContext = createContext<TafsirContextValue | undefined>(undefined);

export function TafsirProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [verseKey, setVerseKey] = useState<string | null>(null);
  const [verseText, setVerseText] = useState<string | null>(null);

  const openTafsir = useCallback((targetVerseKey: string, targetVerseText?: string) => {
    setVerseKey(targetVerseKey);
    setVerseText(targetVerseText ?? null);
    setIsOpen(true);
  }, []);

  const closeTafsir = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSetVerseKey = useCallback((targetVerseKey: string, targetVerseText?: string) => {
    setVerseKey(targetVerseKey);
    setVerseText(targetVerseText ?? null);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      verseKey,
      verseText,
      openTafsir,
      closeTafsir,
      setVerseKey: handleSetVerseKey,
    }),
    [isOpen, verseKey, verseText, openTafsir, closeTafsir, handleSetVerseKey]
  );

  return (
    <TafsirContext.Provider value={value}>
      {children}
      <TafsirSheet
        isOpen={isOpen}
        onClose={closeTafsir}
        verseKey={verseKey}
        verseText={verseText}
        onNavigateVerseKey={handleSetVerseKey}
      />
    </TafsirContext.Provider>
  );
}

export function useTafsirModal() {
  const context = useContext(TafsirContext);
  if (!context) {
    throw new Error("useTafsirModal must be used within a TafsirProvider");
  }
  return context;
}
