"use client";

import { usePathname } from "next/navigation";

// True on the self reader (`/{locale}/pages/[id]`) and the shared-access grant
// reader (`/{locale}/mushaf/[grant]/pages/[id]`). The trailing slash is
// load-bearing — a bare "/pages" substring would false-positive on any route
// containing that string (DECISIONS.md, "Navigation / nav chrome").
//
// One definition for a predicate several always-mounted chrome components branch
// on — the sidebar trigger's gate, the recitation player bar's render gate, the
// recitation return pill's placement, the plans widget's visibility (ADR 0050
// added the recitation cases; the rest predate it).
export function useIsReaderRoute(): boolean {
  const pathname = usePathname();
  return pathname?.includes("/pages/") ?? false;
}
