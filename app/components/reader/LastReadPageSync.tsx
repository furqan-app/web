"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReaderPage } from "@/app/contexts/ReaderPageContext";
import { useLastReadPage } from "@/app/contexts/LastReadPageContext";

// Null-rendering effect leaf, mirroring PlansWidget/RecitationFollow: consumes
// ReaderPageContext.visiblePages (already [rightPage, leftPage] in double view,
// [anchor] in single view — ReaderPageSync) and persists the right page to
// resume from, via LastReadPageContext (so ContinueReadingLink stays live).
// Excludes the shared-mushaf grant reader (basePath check, same convention as
// Nav's isOnPagesRoute) — a grant page isn't the user's own reading position.
export function LastReadPageSync() {
  const { visiblePages } = useReaderPage();
  const { setLastReadPage } = useLastReadPage();
  const pathname = usePathname();

  useEffect(() => {
    if (!visiblePages) return;
    if (pathname?.includes("/mushaf/") || pathname?.includes("/reader-lab/")) return;
    setLastReadPage(visiblePages[0]);
  }, [visiblePages, pathname, setLastReadPage]);

  return null;
}
