"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { usePathname } from "next/navigation";
import { useIsTablet } from "@/app/hooks/use-is-tablet";

type NavOverlayContextValue = {
  isOverlayMode: boolean;
  overlayVisible: boolean;
  toggleOverlay: () => void;
};

const NavOverlayContext = createContext<NavOverlayContextValue>({
  isOverlayMode: false,
  overlayVisible: false,
  toggleOverlay: () => {},
});

export function NavOverlayProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTablet = useIsTablet();
  const isOnPagesRoute = Boolean(pathname?.includes("/pages/"));
  const isOverlayMode = isTablet && isOnPagesRoute;

  const [overlayVisible, setOverlayVisible] = useState(false);

  const toggleOverlay = useCallback(() => {
    if (!isOverlayMode) return;
    setOverlayVisible((prev) => !prev);
  }, [isOverlayMode]);

  return (
    <NavOverlayContext.Provider
      value={{ isOverlayMode, overlayVisible, toggleOverlay }}
    >
      {children}
    </NavOverlayContext.Provider>
  );
}

export function useNavOverlay() {
  return useContext(NavOverlayContext);
}
