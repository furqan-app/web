import type { MarkListItem, MarksPage } from "@/app/api/marks/route";

export type { MarkListItem, MarksPage };

const EMPTY_PAGE: MarksPage = { data: [], nextCursor: null };

/**
 * Fetch one page of the caller's own color/note marks, enriched with the
 * marked word/verse's location (chapter, verse number, page) and a display
 * snippet. Self-marks only — there is no grant-scoped equivalent.
 */
export const getAllMarks = async ({
  category,
  cursor,
}: {
  category: string;
  cursor?: string;
}): Promise<MarksPage> => {
  try {
    const params = new URLSearchParams({ category });
    if (cursor) params.set("cursor", cursor);

    const { data, success }: { data: MarksPage; success: boolean } = await fetch(
      `/api/marks?${params.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((response) => response.json());

    return success && data ? data : EMPTY_PAGE;
  } catch (e) {
    console.error(e);
    return EMPTY_PAGE;
  }
};
