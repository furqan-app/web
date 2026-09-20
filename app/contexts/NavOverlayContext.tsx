"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useIsCoarsePointer } from "@/app/hooks/use-is-coarse-pointer";
import { useIsTablet } from "@/app/hooks/use-is-tablet";
import { useIsMobile } from "@/app/hooks/use-is-mobile";

type NavOverlayContextValue = {
  // Layout: width + pages-route. Drives chrome positioning (CSS-gated per
  // ADR 0043) and which transform rules apply. Unchanged by ADR 0071.
  isOverlayMode: boolean;
  // Interaction: overlay layout AND a coarse primary pointer (ADR 0071).
  // Drives the QuranWord click-vs-long-press branch and the ReaderPager
  // strip tap-toggle. A fine-pointer laptop in the tablet band reads false
  // here while isOverlayMode stays true — desktop interaction, tablet shape.
  isTouchOverlay: boolean;
  overlayVisible: boolean;
  toggleOverlay: () => void;
  // Fine-pointer band only (ADR 0071): background-click chrome toggle — the
  // mouse equivalent of the touch tap-toggle. Touch uses toggleOverlay;
  // desktop has no overlay chrome to toggle, so this stays unwired there.
  toggleFineChrome: () => void;
};

const NavOverlayContext = createContext<NavOverlayContextValue>({
  isOverlayMode: false,
  isTouchOverlay: false,
  overlayVisible: false,
  toggleOverlay: () => {},
  toggleFineChrome: () => {},
});

export function NavOverlayProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTablet = useIsTablet();
  const isMobile = useIsMobile();
  const isCoarse = useIsCoarsePointer();
  const isOnPagesRoute = Boolean(pathname?.includes("/pages/"));
  const isOverlayMode = (isMobile || isTablet) && isOnPagesRoute;
  const isTouchOverlay = isOverlayMode && isCoarse;

  const [overlayVisibleRaw, setOverlayVisible] = useState(false);
  // A fine-pointer band user can dismiss the pinned chrome (see
  // toggleFineChrome). Reset on band entry/exit so a stale dismissed flag
  // can never strand the nav invisible where no toggle can recover it.
  const [fineHidden, setFineHidden] = useState(false);
  useEffect(() => {
    setFineHidden(false);
  }, [isOverlayMode, isCoarse]);
  // Fine-pointer devices in the overlay band keep their chrome visible: with
  // no tap-toggle available (toggleOverlay no-ops below), reporting the raw
  // state would strand the nav hidden forever. Positioning is still pure CSS;
  // only the visible class resolves post-hydration, which ADR 0043 allows.
  const overlayVisible =
    overlayVisibleRaw || (isOverlayMode && !isCoarse && !fineHidden);

  const toggleOverlay = useCallback(() => {
    if (!isTouchOverlay) return;
    setOverlayVisible((prev) => !prev);
  }, [isTouchOverlay]);

  const toggleFineChrome = useCallback(() => {
    setFineHidden((prev) => !prev);
  }, []);

  return (
    <NavOverlayContext.Provider
      value={{
        isOverlayMode,
        isTouchOverlay,
        overlayVisible,
        toggleOverlay,
        toggleFineChrome,
      }}
    >
      {children}
    </NavOverlayContext.Provider>
  );
}

export function useNavOverlay() {
  return useContext(NavOverlayContext);
}
