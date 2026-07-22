"use client";

import { useEffect, useState } from "react";

const TABLET_QUERY = "(min-width: 1024px) and (max-width: 1366px)";

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(TABLET_QUERY);
    setIsTablet(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isTablet;
}
