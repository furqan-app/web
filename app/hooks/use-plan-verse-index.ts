import { useQuery } from "@tanstack/react-query";
import { fetchChapters } from "@/app/utils/recitation-api";
import { fetchVersePages } from "@hooks/use-verse-pages";
import { DEFAULT_MUSHAF_ID } from "@/app/utils/mushaf-editions";

/**
 * Client-side mirror of app/lib/plans/verse-index.ts (which is server-only —
 * it reads files via `fs`). Same static assets, same algorithm, reusing the
 * existing fetch helpers (fetchChapters, fetchVersePages) so the ~73 KB
 * verse-pages file isn't downloaded/cached a second time under a separate
 * React Query key for users who also open the reader. Always resolves
 * against mushaf 2 (DEFAULT_MUSHAF_ID) — plan ranges are always expressed
 * against that edition's page layout (ADR 0038), independent of the reader's
 * own active-edition setting.
 *
 * Used only to *display* a verse-unit assignment's range and resolve its
 * reader deep-link / "in range" highlight; the actual assignment math always
 * happens server-side.
 */

export type PlanVerseIndex = {
  pageOf: (ordinal: number) => number | undefined;
  verseKeyOf: (ordinal: number) => string | undefined;
  /** The verse-ordinal span of a page's own verses, for range-overlap checks. */
  pageVerseSpan: (page: number) => { first: number; last: number } | undefined;
};

const buildIndex = async (): Promise<PlanVerseIndex> => {
  const [chapters, versePages] = await Promise.all([
    fetchChapters(),
    fetchVersePages(DEFAULT_MUSHAF_ID),
  ]);

  const ordinalToPage: (number | undefined)[] = [undefined];
  const ordinalToVerseKey: (string | undefined)[] = [undefined];
  const pageFirstOrdinal = new Map<number, number>();
  const pageLastOrdinal = new Map<number, number>();

  let ordinal = 0;
  for (const chapter of chapters) {
    for (let ayah = 1; ayah <= chapter.verses_count; ayah++) {
      ordinal += 1;
      const verseKey = `${chapter.id}:${ayah}`;
      const page = versePages[verseKey];
      ordinalToPage.push(page);
      ordinalToVerseKey.push(verseKey);
      if (page !== undefined) {
        if (!pageFirstOrdinal.has(page)) pageFirstOrdinal.set(page, ordinal);
        pageLastOrdinal.set(page, ordinal);
      }
    }
  }

  return {
    pageOf: (n) => ordinalToPage[n],
    verseKeyOf: (n) => ordinalToVerseKey[n],
    pageVerseSpan: (page) => {
      const first = pageFirstOrdinal.get(page);
      const last = pageLastOrdinal.get(page);
      return first !== undefined && last !== undefined ? { first, last } : undefined;
    },
  };
};

/**
 * `enabled` (default true) lets callers skip fetching/building the whole
 * 6236-entry index for page-unit rows, where it's never read.
 */
export const usePlanVerseIndex = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ["plan-verse-index"],
    queryFn: buildIndex,
    staleTime: Infinity,
    enabled: options?.enabled ?? true,
  });
