"use client";

import { useEffect, useLayoutEffect, useState } from "react";

const TABLET_QUERY = "(min-width: 1024px) and (max-width: 1366px)";

// useLayoutEffect runs synchronously before the browser paints, eliminating the
// false→true layout shift on swipe navigation. Falls back to useEffect on the
// server (where window/document are unavailable).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const mql = window.matchMedia(TABLET_QUERY);
    setIsTablet(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isTablet;
}
