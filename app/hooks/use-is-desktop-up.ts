"use client";

import { useEffect, useLayoutEffect, useState } from "react";

const DESKTOP_UP_QUERY = "(min-width: 1367px)";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useIsDesktopUp() {
  const [isDesktopUp, setIsDesktopUp] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const mql = window.matchMedia(DESKTOP_UP_QUERY);
    setIsDesktopUp(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setIsDesktopUp(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktopUp;
}
