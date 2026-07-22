"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useIsTablet } from "@/app/hooks/use-is-tablet";

const AUTO_HIDE_MS = 3000;

type NavOverlayContextValue = {
  isOverlayMode: boolean;
  overlayVisible: boolean;
  toggleOverlay: () => void;
  hideOverlay: () => void;
};

const NavOverlayContext = createContext<NavOverlayContextValue>({
  isOverlayMode: false,
  overlayVisible: false,
  toggleOverlay: () => {},
  hideOverlay: () => {},
});

export function NavOverlayProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTablet = useIsTablet();
  const isOnPagesRoute = Boolean(pathname?.includes("/pages/"));
  const isOverlayMode = isTablet && isOnPagesRoute;

  const [overlayVisible, setOverlayVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideOverlay = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setOverlayVisible(false);
  }, []);

  const toggleOverlay = useCallback(() => {
    if (!isOverlayMode) return;

    setOverlayVisible((prev) => {
      if (prev) {
        // Hiding: clear any pending timer
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return false;
      } else {
        // Showing: start auto-hide timer
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setOverlayVisible(false);
          timerRef.current = null;
        }, AUTO_HIDE_MS);
        return true;
      }
    });
  }, [isOverlayMode]);

  return (
    <NavOverlayContext.Provider
      value={{ isOverlayMode, overlayVisible, toggleOverlay, hideOverlay }}
    >
      {children}
    </NavOverlayContext.Provider>
  );
}

export function useNavOverlay() {
  return useContext(NavOverlayContext);
}
