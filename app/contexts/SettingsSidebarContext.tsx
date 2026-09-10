"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type SettingsSectionTarget = "reading" | "appearance" | "device" | "wird-reminder" | null;

type SettingsSidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  targetSection: SettingsSectionTarget;
  openSettings: (target?: SettingsSectionTarget) => void;
  closeSettings: () => void;
  clearTarget: () => void;
};

const SettingsSidebarContext = createContext<SettingsSidebarContextValue>({
  open: false,
  setOpen: () => {},
  targetSection: null,
  openSettings: () => {},
  closeSettings: () => {},
  clearTarget: () => {},
});

export function SettingsSidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [targetSection, setTargetSection] = useState<SettingsSectionTarget>(null);

  const openSettings = useCallback((target?: SettingsSectionTarget) => {
    setTargetSection(target ?? null);
    setOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setOpen(false);
    setTargetSection(null);
  }, []);

  const clearTarget = useCallback(() => {
    setTargetSection(null);
  }, []);

  return (
    <SettingsSidebarContext.Provider
      value={{
        open,
        setOpen,
        targetSection,
        openSettings,
        closeSettings,
        clearTarget,
      }}
    >
      {children}
    </SettingsSidebarContext.Provider>
  );
}

export function useSettingsSidebar() {
  return useContext(SettingsSidebarContext);
}
