import type { MarkListItem } from "@/app/api/marks/route";

export type { MarkListItem };

/**
 * Fetch every color mark on the caller's own mushaf, enriched with the
 * marked word/verse's location (chapter, verse number, page) and a display
 * snippet. Self-marks only — there is no grant-scoped equivalent.
 */
export const getAllMarks = async (): Promise<Array<MarkListItem>> => {
  try {
    const { data, success }: { data: Array<MarkListItem>; success: boolean } =
      await fetch("/api/marks", {
        headers: {
          "Content-Type": "application/json",
        },
      }).then((response) => response.json());

    return success && data ? data : [];
  } catch (e) {
    console.error(e);
    return [];
  }
};
