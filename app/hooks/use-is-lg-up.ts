"use client";

import { useEffect, useState } from "react";

const LG_QUERY = "(min-width: 1024px)";

export function useIsLgUp() {
  const [isLgUp, setIsLgUp] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(LG_QUERY);
    setIsLgUp(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setIsLgUp(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isLgUp;
}
