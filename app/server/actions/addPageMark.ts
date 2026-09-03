import { redirectToRemovedGrant } from "./mushaf/accessGrants";

export type AddMarkData = {
  page_number: number;
  marked_type: string;
  marked_id: string;
  category: string;
  comment?: string | null;
};

export const addPageMark = async (data: AddMarkData, grantId?: string) => {
  const body = JSON.stringify(data);
  const url = grantId
    ? `/api/mushaf/${grantId}/pages/${data.page_number}/marks`
    : `/api/quran/pages/${data.page_number}/marks`;

  try {
    const res = await fetch(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      }
    );

    if (grantId && res.status === 403) {
      redirectToRemovedGrant();
      return false;
    }

    const response = await res.json();

    if (grantId && response.code === 403) {
      redirectToRemovedGrant();
      return false;
    }

    if (response.success) {
      return true;
    }
    return false;
  } catch (e) {
    console.error(e);
    return false;
  }
};

