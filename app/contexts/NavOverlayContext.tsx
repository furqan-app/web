"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useIsTablet } from "@/app/hooks/use-is-tablet";
import { useIsMobile } from "@/app/hooks/use-is-mobile";
import { useIsDesktopUp } from "@/app/hooks/use-is-desktop-up";
import { storage } from "@/app/utils/storage";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type NavOverlayContextValue = {
  isOverlayMode: boolean;
  // True only for the mobile/tablet tap-to-toggle band — this is what
  // isOverlayMode meant before desktop focus mode existed. QuranWord's
  // click-vs-long-press disambiguation must key off this, not isOverlayMode,
  // which now also turns true for desktop-focus-on (where there is no touch
  // gesture to disambiguate — see the bug this fixed, caught in review).
  isTouchOverlayMode: boolean;
  overlayVisible: boolean;
  isDesktopUp: boolean;
  desktopFocusEnabled: boolean;
  // Tap-to-toggle (mobile/tablet only). Guarded internally to isMobile ||
  // isTablet, per ADR 0034 — isOverlayMode alone is not a safe proxy for
  // "the click gesture should fire," since it is also true when only
  // desktop-focus is on.
  toggleOverlay: () => void;
  // Explicit button (desktop only), persisted in localStorage.
  toggleDesktopFocus: () => void;
  // Hover-reveal (desktop only) — top hotzone / Nav mouseleave.
  showOverlay: () => void;
  hideOverlay: () => void;
};

const NavOverlayContext = createContext<NavOverlayContextValue>({
  isOverlayMode: false,
  isTouchOverlayMode: false,
  overlayVisible: false,
  isDesktopUp: false,
  desktopFocusEnabled: false,
  toggleOverlay: () => {},
  toggleDesktopFocus: () => {},
  showOverlay: () => {},
  hideOverlay: () => {},
});

export function NavOverlayProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTablet = useIsTablet();
  const isMobile = useIsMobile();
  const isDesktopUp = useIsDesktopUp();
  const isOnPagesRoute = Boolean(pathname?.includes("/pages/"));

  const [desktopFocusEnabled, setDesktopFocusEnabled] = useState(false);
  // Isomorphic (pre-paint on client), matching isDesktopUp/isTablet/isMobile's
  // own pattern in this same context — a plain useEffect here would resolve a
  // tick after those, so a returning user with focus mode already on would see
  // Nav flash visible for a frame before snapping hidden.
  useIsomorphicLayoutEffect(() => {
    setDesktopFocusEnabled(storage.get("desktopFocusMode") ?? false);
  }, []);

  const isTouchOverlayMode = (isMobile || isTablet) && isOnPagesRoute;
  const isOverlayMode =
    (isTouchOverlayMode || (isDesktopUp && desktopFocusEnabled)) && isOnPagesRoute;

  const [overlayVisible, setOverlayVisible] = useState(false);

  const toggleOverlay = useCallback(() => {
    if (!isOverlayMode) return;
    // Click-to-toggle is a touch gesture only — never let a desktop click
    // (e.g. selecting Quran text) fall through to it, per ADR 0034.
    if (!(isMobile || isTablet)) return;
    setOverlayVisible((prev) => !prev);
  }, [isOverlayMode, isMobile, isTablet]);

  const toggleDesktopFocus = useCallback(() => {
    setDesktopFocusEnabled((prev) => {
      const next = !prev;
      storage.set("desktopFocusMode", next);
      return next;
    });
  }, []);

  const showOverlay = useCallback(() => {
    if (!isDesktopUp || !desktopFocusEnabled || !isOnPagesRoute) return;
    setOverlayVisible(true);
  }, [isDesktopUp, desktopFocusEnabled, isOnPagesRoute]);

  const hideOverlay = useCallback(() => {
    if (!isDesktopUp || !desktopFocusEnabled || !isOnPagesRoute) return;
    setOverlayVisible(false);
  }, [isDesktopUp, desktopFocusEnabled, isOnPagesRoute]);

  return (
    <NavOverlayContext.Provider
      value={{
        isOverlayMode,
        isTouchOverlayMode,
        overlayVisible,
        isDesktopUp,
        desktopFocusEnabled,
        toggleOverlay,
        toggleDesktopFocus,
        showOverlay,
        hideOverlay,
      }}
    >
      {children}
    </NavOverlayContext.Provider>
  );
}

export function useNavOverlay() {
  return useContext(NavOverlayContext);
}
