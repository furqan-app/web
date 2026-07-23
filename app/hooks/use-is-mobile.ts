"use client";

import { useEffect, useLayoutEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

// useLayoutEffect runs synchronously before the browser paints, eliminating the
// false→true layout shift on swipe navigation. Falls back to useEffect on the
// server (where window/document are unavailable).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
