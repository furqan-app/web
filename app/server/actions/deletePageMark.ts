export type DeleteMarkData = {
  page_number: number;
  marked_type: string;
  marked_id: string;
  mark_type: string;
};

export const deletePageMark = async (data: DeleteMarkData) => {
  const { page_number, ...rest } = data;
  const body = JSON.stringify(rest);

  try {
    const response = await fetch(`/api/quran/pages/${page_number}/marks`, {
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
