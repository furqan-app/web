"use client";

import { useState } from "react";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";

// Primary-input capability, not a breakpoint (ADR 0071): true when the
// primary pointer is coarse (touch-first devices). SSR default is false —
// interaction may resolve one frame late (ADR 0043 allows it for anything
// that isn't position/display), and the fine-pointer branch is the safe
// default (click opens the mark modal instead of swallowing the tap).
const COARSE_POINTER_QUERY = "(pointer: coarse)";

export function useIsCoarsePointer() {
  const [isCoarse, setIsCoarse] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const mql = window.matchMedia(COARSE_POINTER_QUERY);
    setIsCoarse(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setIsCoarse(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isCoarse;
}
