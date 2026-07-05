import { groupBy } from "@/app/utils/groupBy";

export type PageMark = {
  name: string;
  value: string;
  marked_id: string;
  from_user: number;
  author_name: string | null;
  is_own: boolean;
};

type ApiMark = {
  mark_type: string;
  mark_value: string;
  marked_id: string;
  from_user: number;
  author_name: string | null;
  is_own: boolean;
};

/**
 * Fetch a page's marks, grouped by marked_id. When `grantId` is set, reads
 * against the granted mushaf (someone else's) instead of the caller's own.
 * Each mark carries its author name + is_own so the UI can show who made it.
 */
export const getPageMarks = async (
  page: number,
  grantId?: string
): Promise<Record<string, Array<PageMark>>> => {
  const url = grantId
    ? `/api/mushaf/${grantId}/pages/${page}/marks`
    : `/api/quran/pages/${page}/marks`;

  try {
    const { data: marks, success }: { data: Array<ApiMark>; success: boolean } =
      await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
      }).then((response) => response.json());

    if (!success) {
      return {};
    }

    return marks?.length
      ? groupBy(
          marks.map((mark) => ({
            name: mark.mark_type,
            value: mark.mark_value,
            marked_id: mark.marked_id,
            from_user: mark.from_user,
            author_name: mark.author_name,
            is_own: mark.is_own,
          })),
          "marked_id"
        )
      : {};
  } catch (e) {
    console.error(e);
    return {};
  }
};
