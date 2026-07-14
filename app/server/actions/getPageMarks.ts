export type PageMark = {
  marked_id: string;
  category: string;
  comment: string | null;
  from_user: number;
  author_name: string | null;
  is_own: boolean;
};

type ApiMark = {
  marked_id: string;
  category: string;
  comment: string | null;
  from_user: number;
  author_name: string | null;
  is_own: boolean;
};

/**
 * Fetch a page's marks, keyed by marked_id. The unique key
 * [marked_type, marked_id, to_user] guarantees at most one mark per spot per
 * mushaf (ADR 0025), so each marked_id maps to a single mark. When `grantId` is
 * set, reads against the granted mushaf (someone else's) instead of the
 * caller's own. Each mark carries its author name + is_own so the UI can show
 * who made it.
 */
export const getPageMarks = async (
  page: number,
  grantId?: string
): Promise<Record<string, PageMark>> => {
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

    if (!success || !marks?.length) {
      return {};
    }

    return Object.fromEntries(
      marks.map((mark) => [
        mark.marked_id,
        {
          marked_id: mark.marked_id,
          category: mark.category,
          comment: mark.comment,
          from_user: mark.from_user,
          author_name: mark.author_name,
          is_own: mark.is_own,
        },
      ])
    );
  } catch (e) {
    console.error(e);
    return {};
  }
};
