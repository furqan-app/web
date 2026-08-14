"use client";

import { useState } from "react";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";

// Duplicated verbatim in public/launch.html, which runs before React and cannot
// import — keep the two in sync (ADR 0042).
const DESKTOP_UP_QUERY = "(min-width: 1367px)";

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
