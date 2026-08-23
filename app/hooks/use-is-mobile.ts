"use client";

import { useState } from "react";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";

// 1023, not 767 (subtask 5.1c). The design recognises three device classes —
// compact <1024, spread 1024–1366, desk >=1367 — and production's old 768–1023
// in-between band produced a fourth screen nobody had designed. Keep this
// numerically identical to the compact blocks in globals.css.
const MOBILE_QUERY = "(max-width: 1023px)";

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
