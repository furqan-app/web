import { redirectToRemovedGrant } from "./mushaf/accessGrants";

export type AddMarkData = {
  page_number: number;
  marked_type: string;
  marked_id: string;
  category: string;
  comment?: string | null;
  updated_at?: number | Date | string | null;
};

export type MarkActionResult = {
  success: boolean;
  status: number;
  code?: number;
  message?: string | null;
};

export function addPageMark(
  data: AddMarkData,
  grantId?: string,
  options?: { detailed?: false }
): Promise<boolean>;
export function addPageMark(
  data: AddMarkData,
  grantId: string | undefined,
  options: { detailed: true }
): Promise<MarkActionResult>;
export async function addPageMark(
  data: AddMarkData,
  grantId?: string,
  options?: { detailed?: boolean }
): Promise<boolean | MarkActionResult> {
  const body = JSON.stringify(data);
  const url = grantId
    ? `/api/mushaf/${grantId}/pages/${data.page_number}/marks`
    : `/api/quran/pages/${data.page_number}/marks`;

  try {
    const res = await fetch(url, {
      method: "POST",
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

    if (response.success) {
      return true;
    }
    return false;
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

