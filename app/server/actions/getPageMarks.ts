import { redirectToRemovedGrant } from "./mushaf/accessGrants";

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
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (grantId && res.status === 403) {
      redirectToRemovedGrant();
      return {};
    }

    const json = await res.json();
    const {
      data: marks,
      success,
      code,
    }: { data: Array<ApiMark>; success: boolean; code?: number } = json;

    if (grantId && code === 403) {
      redirectToRemovedGrant();
      return {};
    }

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

export type FullMarksResult = {
  success: boolean;
  data?: import("@/app/api/marks/route").MarkListItem[];
  status: number;
  code?: number;
};

/**
 * Fetch all marks for the current user in full-sync mode (ADR 0061 / #545 / #547).
 * Used by the sync engine's pull phase to reconcile local marks with server truth.
 */
export const fetchAllMarks = async (): Promise<FullMarksResult> => {
  try {
    const res = await fetch("/api/marks?all=true", {
      headers: {
        "Content-Type": "application/json",
      },
    });

    let json: {
      data?: { data?: import("@/app/api/marks/route").MarkListItem[] };
      success?: boolean;
      code?: number;
    } = {};

    try {
      json = await res.json();
    } catch {
      // Non-JSON or empty response body
    }

    const code = json.code ?? res.status;

    if (code === 401 || res.status === 401) {
      return { success: false, status: 401, code: 401 };
    }

    if (!res.ok || (!json.success && (code >= 400 || res.status >= 400))) {
      return { success: false, status: res.status || code, code };
    }

    return {
      success: true,
      status: res.status,
      code: 200,
      data: json.data?.data ?? [],
    };
  } catch (e) {
    console.error(e);
    return { success: false, status: 0 };
  }
};
