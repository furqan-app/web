import { useQuery } from "@tanstack/react-query";
import { fetchPageBounds } from "@/app/utils/recitation-api";
import { CANONICAL_PAGE_MUSHAF_ID } from "@/app/utils/mushaf-editions";

// Plan assignments (rangeStart/rangeEnd) are page-canonical against
// CANONICAL_PAGE_MUSHAF_ID (mushaf 2) — the edition stored page numbers are
// expressed in (D3 of the Awrad & Learning Plans Engine decision predates
// ADR 0033's mushaf editions), NOT the reader's active edition and NOT
// DEFAULT_MUSHAF_ID, which moved to QCF V2 (ADR 0066). Content is immutable, so
// a page's verse bounds never change once fetched — mirrors usePage's
// staleTime: Infinity (use-quran-page.ts).
export const usePageVerseBounds = (pageId: number, { enabled }: { enabled: boolean }) => {
  return useQuery({
    queryKey: ["page-verse-bounds", CANONICAL_PAGE_MUSHAF_ID, pageId],
    queryFn: () => fetchPageBounds(pageId, CANONICAL_PAGE_MUSHAF_ID),
    staleTime: Infinity,
    enabled,
  });
};
