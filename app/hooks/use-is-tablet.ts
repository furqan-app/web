"use client";

import { useState } from "react";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";

const TABLET_QUERY = "(min-width: 1024px) and (max-width: 1366px)";

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
