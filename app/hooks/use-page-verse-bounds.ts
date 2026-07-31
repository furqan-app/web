import { useQuery } from "@tanstack/react-query";
import { fetchPageBounds } from "@/app/utils/recitation-api";
import { DEFAULT_MUSHAF_ID } from "@/app/utils/mushaf-editions";

// Plan assignments (rangeStart/rangeEnd) are page-canonical against the
// DEFAULT_MUSHAF_ID edition only (D3 of the Awrad & Learning Plans Engine
// decision predates ADR 0033's mushaf editions) — always resolved against
// the default edition, not the reader's currently-active one. Content is
// immutable, so a page's verse bounds never change once fetched — mirrors
// usePage's staleTime: Infinity (use-quran-page.ts).
export const usePageVerseBounds = (pageId: number, { enabled }: { enabled: boolean }) => {
  return useQuery({
    queryKey: ["page-verse-bounds", DEFAULT_MUSHAF_ID, pageId],
    queryFn: () => fetchPageBounds(pageId, DEFAULT_MUSHAF_ID),
    staleTime: Infinity,
    enabled,
  });
};
