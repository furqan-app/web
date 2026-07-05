export type AddMarkData = {
  page_number: number;
  marked_type: string;
  marked_id: string;
  mark_type: string;
  mark_value: string;
};

export const addPageMark = async (data: AddMarkData, grantId?: string) => {
  const body = JSON.stringify(data);
  const url = grantId
    ? `/api/mushaf/${grantId}/pages/${data.page_number}/marks`
    : `/api/quran/pages/${data.page_number}/marks`;

  try {
    const response = await fetch(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      }
    ).then((res) => res.json());

    if (response.success) {
      return true;
    }
  } catch (e) {
    console.error(e);
    return false;
  }
};

