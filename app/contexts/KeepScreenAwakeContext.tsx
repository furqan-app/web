"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { storage } from "@/app/utils/storage";

type KeepScreenAwakeContextType = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

const KeepScreenAwakeContext = createContext<
  KeepScreenAwakeContextType | undefined
>(undefined);

// Defaults to true so SSR and the first client render agree, then adopts the
// persisted value right after mount — same hydration pattern as
// LastReadPageContext.
export function KeepScreenAwakeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    const stored = storage.get("keepScreenAwake");
    if (typeof stored === "boolean") setEnabledState(stored);
  }, []);

  const setEnabled = (value: boolean) => {
    setEnabledState(value);
    storage.set("keepScreenAwake", value);
  };

  return (
    <KeepScreenAwakeContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </KeepScreenAwakeContext.Provider>
  );
}

export function useKeepScreenAwake() {
  const context = useContext(KeepScreenAwakeContext);
  if (context === undefined) {
    throw new Error(
      "useKeepScreenAwake must be used within a KeepScreenAwakeProvider",
    );
  }
  return context;
}
