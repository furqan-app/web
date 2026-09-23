import { redirectToRemovedGrant } from "./mushaf/accessGrants";
import type { MarkActionResult } from "./addPageMark";

export type DeleteMarkData = {
  page_number: number;
  marked_type: string;
  marked_id: string;
};

export function deletePageMark(
  data: DeleteMarkData,
  grantId?: string,
  options?: { detailed?: false }
): Promise<boolean>;
export function deletePageMark(
  data: DeleteMarkData,
  grantId: string | undefined,
  options: { detailed: true }
): Promise<MarkActionResult>;
export async function deletePageMark(
  data: DeleteMarkData,
  grantId?: string,
  options?: { detailed?: boolean }
): Promise<boolean | MarkActionResult> {
  // page_number is only needed to build the [pageId] route path below —
  // the DELETE handler doesn't read it for scoping (deletion is keyed by
  // to_user + marked_type/marked_id, which is page-independent),
  // so it's deliberately left out of the request body.
  const { page_number, ...rest } = data;
  const body = JSON.stringify(rest);
  const url = grantId
    ? `/api/mushaf/${grantId}/pages/${page_number}/marks`
    : `/api/quran/pages/${page_number}/marks`;

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    if (grantId && res.status === 403) {
      redirectToRemovedGrant();
      return options?.detailed
        ? { success: false, status: 403, code: 403 }
        : false;
    }

    const response = await res.json();
    const code = response.code ?? res.status;

    if (grantId && (code === 403 || res.status === 403)) {
      redirectToRemovedGrant();
      return options?.detailed
        ? { success: false, status: 403, code: 403 }
        : false;
    }

    if (options?.detailed) {
      return {
        success: !!response.success,
        status: res.status,
        code,
        message: response.message,
      };
    }

    return !!response.success;
  } catch (e) {
    console.error(e);
    if (options?.detailed) {
      return {
        success: false,
        status: 0,
        message: e instanceof Error ? e.message : "Network error",
      };
    }
    return false;
  }
}
