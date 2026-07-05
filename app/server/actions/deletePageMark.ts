export type DeleteMarkData = {
  page_number: number;
  marked_type: string;
  marked_id: string;
  mark_type: string;
};

export const deletePageMark = async (data: DeleteMarkData, grantId?: string) => {
  // page_number is only needed to build the [pageId] route path below —
  // the DELETE handler doesn't read it for scoping (deletion is keyed by
  // to_user + marked_type/marked_id/mark_type, which is page-independent),
  // so it's deliberately left out of the request body.
  const { page_number, ...rest } = data;
  const body = JSON.stringify(rest);
  const url = grantId
    ? `/api/mushaf/${grantId}/pages/${page_number}/marks`
    : `/api/quran/pages/${page_number}/marks`;

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    }).then((res) => res.json());

    return !!response.success;
  } catch (e) {
    console.error(e);
    return false;
  }
};
