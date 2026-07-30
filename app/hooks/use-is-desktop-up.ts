"use client";

import { useEffect, useLayoutEffect, useState } from "react";

const DESKTOP_QUERY = "(min-width: 1367px)";

// useLayoutEffect runs synchronously before the browser paints, eliminating the
// false→true layout shift on swipe navigation. Falls back to useEffect on the
// server (where window/document are unavailable).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Width-only (>=1367px), deliberately independent of the Desktop Reading
// Group's dual >=1367px-and->=800px-tall gate (ADR 0034) — a short desktop
// window still gets the focus-mode toggle, it just keeps the existing
// full-width bottom recitation bar.
export function useIsDesktopUp() {
  const [isDesktopUp, setIsDesktopUp] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    setIsDesktopUp(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setIsDesktopUp(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktopUp;
}
